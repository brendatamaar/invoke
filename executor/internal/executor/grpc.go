package executor

import (
	"context"
	"encoding/base64"
	"fmt"
	"net"
	"sort"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/encoding/gzip"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/metadata"
	reflectionv1 "google.golang.org/grpc/reflection/grpc_reflection_v1"
	reflectionpb "google.golang.org/grpc/reflection/grpc_reflection_v1alpha"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protodesc"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/descriptorpb"
	"google.golang.org/protobuf/types/dynamicpb"
)

func (s *Service) GrpcReflect(ctx context.Context, req *GrpcReflectRequest) (*GrpcReflectResponse, error) {
	address := strings.TrimSpace(req.GetAddress())
	if address == "" {
		return &GrpcReflectResponse{Error: "address is required"}, nil
	}

	timeout := time.Duration(req.GetTimeoutMs()) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// Protoset path: skip reflection entirely.
	if ps := strings.TrimSpace(req.GetProtosetBase64()); ps != "" {
		files, err := registryFromProtosetBase64(ps)
		if err != nil {
			return &GrpcReflectResponse{Error: err.Error()}, nil
		}
		methods, err := reflectGrpcMethodsFromRegistry(files)
		if err != nil {
			return &GrpcReflectResponse{Error: err.Error()}, nil
		}
		return &GrpcReflectResponse{Methods: methods}, nil
	}

	conn, err := grpcClientConn(ctx, address, req.GetTls(), req.GetVerifySsl(), req.GetTlsClientConfig(), false)
	if err != nil {
		return &GrpcReflectResponse{Error: err.Error()}, nil
	}
	defer conn.Close()

	ctx = metadata.NewOutgoingContext(ctx, outgoingMetadata(req.GetMetadata()))
	methods, err := reflectGrpcMethods(ctx, conn)
	if err != nil {
		return &GrpcReflectResponse{Error: err.Error()}, nil
	}
	return &GrpcReflectResponse{Methods: methods}, nil
}

func (s *Service) GrpcServerStream(req *GrpcExecuteRequest, stream GrpcServerStreamServer) error {
	address := strings.TrimSpace(req.GetAddress())
	if address == "" {
		return stream.Send(&GrpcStreamMessage{Done: true, Error: "address is required"})
	}

	fullMethod := strings.TrimSpace(req.GetFullMethod())
	serviceName, methodName, err := splitFullMethod(fullMethod)
	if err != nil {
		return stream.Send(&GrpcStreamMessage{Done: true, Error: err.Error()})
	}

	timeout := time.Duration(req.GetTimeoutMs()) * time.Millisecond
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	ctx, cancel := context.WithTimeout(stream.Context(), timeout)
	defer cancel()

	conn, err := grpcClientConn(ctx, address, req.GetTls(), req.GetVerifySsl(), req.GetTlsClientConfig(), false)
	if err != nil {
		return stream.Send(&GrpcStreamMessage{Done: true, Error: err.Error()})
	}
	defer conn.Close()

	ctx = metadata.NewOutgoingContext(ctx, outgoingMetadata(req.GetMetadata()))
	var files *protoregistry.Files
	if ps := strings.TrimSpace(req.GetProtosetBase64()); ps != "" {
		files, err = registryFromProtosetBase64(ps)
	} else {
		files, err = descriptorRegistryForSymbols(ctx, conn, []string{serviceName})
	}
	if err != nil {
		return stream.Send(&GrpcStreamMessage{Done: true, Error: err.Error()})
	}
	method, err := findGrpcMethod(files, serviceName, methodName)
	if err != nil {
		return stream.Send(&GrpcStreamMessage{Done: true, Error: err.Error()})
	}
	if !method.IsStreamingServer() {
		return stream.Send(&GrpcStreamMessage{Done: true, Error: "method is not server-streaming; use GrpcExecute instead"})
	}

	input := dynamicpb.NewMessage(method.Input())
	body := strings.TrimSpace(req.GetBodyJson())
	if body == "" {
		body = "{}"
	}
	if err := protojson.Unmarshal([]byte(body), input); err != nil {
		return stream.Send(&GrpcStreamMessage{Done: true, Error: fmt.Sprintf("invalid request JSON: %v", err)})
	}

	var header, trailer metadata.MD
	start := time.Now()
	streamCallOpts := []grpc.CallOption{grpc.Header(&header), grpc.Trailer(&trailer)}
	if opt := compressionCallOption(req.GetCompression()); opt != nil {
		streamCallOpts = append(streamCallOpts, opt)
	}
	clientStream, err := conn.NewStream(ctx, &grpc.StreamDesc{ServerStreams: true}, fullMethod, streamCallOpts...)
	if err != nil {
		return stream.Send(&GrpcStreamMessage{Done: true, Error: err.Error()})
	}

	if err := clientStream.SendMsg(input); err != nil {
		return stream.Send(&GrpcStreamMessage{Done: true, Error: err.Error()})
	}
	if err := clientStream.CloseSend(); err != nil {
		return stream.Send(&GrpcStreamMessage{Done: true, Error: err.Error()})
	}

	// Send initial metadata as first message once headers arrive.
	if initialMD, err := clientStream.Header(); err == nil && len(initialMD) > 0 {
		header = initialMD
		_ = stream.Send(&GrpcStreamMessage{InitialMetadata: metadataToHeaders(header)})
	}

	for {
		output := dynamicpb.NewMessage(method.Output())
		recvErr := clientStream.RecvMsg(output)
		if recvErr != nil {
			durationMs := floatMs(time.Since(start))
			statusCode := int32(codes.OK)
			statusMessage := ""
			if st, ok := status.FromError(recvErr); ok {
				statusCode = int32(st.Code())
				statusMessage = st.Message()
			}
			done := &GrpcStreamMessage{
				Done:              true,
				DurationMs:        durationMs,
				StatusCode:        statusCode,
				StatusMessage:     statusMessage,
				Trailers:          metadataToHeaders(trailer),
				StatusDetailsJson: statusDetailsJSON(recvErr),
			}
			if recvErr.Error() != "EOF" && statusCode != int32(codes.OK) {
				done.Error = recvErr.Error()
			}
			return stream.Send(done)
		}

		bodyJSON, err := protojson.MarshalOptions{Multiline: true}.Marshal(output)
		if err != nil {
			bodyJSON = []byte("{}")
		}
		if err := stream.Send(&GrpcStreamMessage{BodyJson: string(bodyJSON)}); err != nil {
			return err
		}
	}
}

func (s *Service) GrpcExecute(ctx context.Context, req *GrpcExecuteRequest) (*GrpcExecuteResponse, error) {
	address := strings.TrimSpace(req.GetAddress())
	if address == "" {
		return &GrpcExecuteResponse{Error: "address is required"}, nil
	}

	fullMethod := strings.TrimSpace(req.GetFullMethod())
	serviceName, methodName, err := splitFullMethod(fullMethod)
	if err != nil {
		return &GrpcExecuteResponse{Error: err.Error()}, nil
	}

	timeout := time.Duration(req.GetTimeoutMs()) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	conn, err := grpcClientConn(ctx, address, req.GetTls(), req.GetVerifySsl(), req.GetTlsClientConfig(), false)
	if err != nil {
		return &GrpcExecuteResponse{Error: err.Error()}, nil
	}
	defer conn.Close()

	ctx = metadata.NewOutgoingContext(ctx, outgoingMetadata(req.GetMetadata()))
	var files *protoregistry.Files
	if ps := strings.TrimSpace(req.GetProtosetBase64()); ps != "" {
		files, err = registryFromProtosetBase64(ps)
	} else {
		files, err = descriptorRegistryForSymbols(ctx, conn, []string{serviceName})
	}
	if err != nil {
		return &GrpcExecuteResponse{Error: err.Error()}, nil
	}
	method, err := findGrpcMethod(files, serviceName, methodName)
	if err != nil {
		return &GrpcExecuteResponse{Error: err.Error()}, nil
	}
	if method.IsStreamingClient() {
		return &GrpcExecuteResponse{Error: "client-streaming gRPC methods are not yet supported"}, nil
	}
	if method.IsStreamingServer() {
		return &GrpcExecuteResponse{Error: "use /api/grpc/server-stream for server-streaming methods"}, nil
	}

	input := dynamicpb.NewMessage(method.Input())
	body := strings.TrimSpace(req.GetBodyJson())
	if body == "" {
		body = "{}"
	}
	if err := protojson.Unmarshal([]byte(body), input); err != nil {
		return &GrpcExecuteResponse{Error: fmt.Sprintf("invalid request JSON: %v", err)}, nil
	}

	output := dynamicpb.NewMessage(method.Output())
	var header metadata.MD
	var trailer metadata.MD
	start := time.Now()
	callOpts := []grpc.CallOption{grpc.Header(&header), grpc.Trailer(&trailer)}
	if opt := compressionCallOption(req.GetCompression()); opt != nil {
		callOpts = append(callOpts, opt)
	}
	err = conn.Invoke(ctx, fullMethod, input, output, callOpts...)
	durationMs := floatMs(time.Since(start))
	if err != nil {
		statusCode := int32(codes.Unknown)
		statusMessage := err.Error()
		if st, ok := status.FromError(err); ok {
			statusCode = int32(st.Code())
			statusMessage = st.Message()
		}
		return &GrpcExecuteResponse{
			Metadata:          metadataToHeaders(header),
			Trailers:          metadataToHeaders(trailer),
			StatusCode:        statusCode,
			StatusMessage:     statusMessage,
			DurationMs:        durationMs,
			Error:             err.Error(),
			StatusDetailsJson: statusDetailsJSON(err),
		}, nil
	}

	bodyJSON, err := protojson.MarshalOptions{Multiline: true}.Marshal(output)
	if err != nil {
		return &GrpcExecuteResponse{Error: err.Error(), DurationMs: durationMs}, nil
	}
	return &GrpcExecuteResponse{
		BodyJson:      string(bodyJSON),
		Metadata:      metadataToHeaders(header),
		Trailers:      metadataToHeaders(trailer),
		StatusCode:    int32(codes.OK),
		StatusMessage: codes.OK.String(),
		DurationMs:    durationMs,
	}, nil
}

func grpcClientConn(ctx context.Context, address string, useTLS bool, verify bool, clientConfig *TlsClientConfig, allowPrivate bool) (*grpc.ClientConn, error) {
	var transportCredentials credentials.TransportCredentials
	if useTLS {
		tlsConfig, err := tlsConfigFor(verify, clientConfig)
		if err != nil {
			return nil, err
		}
		transportCredentials = credentials.NewTLS(tlsConfig)
	} else {
		transportCredentials = insecure.NewCredentials()
	}

	ssrfDial := ssrfDialContext(&net.Dialer{}, allowPrivate)
	conn, err := grpc.NewClient(address,
		grpc.WithTransportCredentials(transportCredentials),
		grpc.WithContextDialer(func(ctx context.Context, addr string) (net.Conn, error) {
			return ssrfDial(ctx, "tcp", addr)
		}),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time:                30 * time.Second,
			Timeout:             10 * time.Second,
			PermitWithoutStream: true,
		}),
	)
	if err != nil {
		return nil, err
	}
	conn.Connect()
	for {
		state := conn.GetState()
		if state == connectivity.Ready {
			return conn, nil
		}
		if state == connectivity.TransientFailure || state == connectivity.Shutdown {
			_ = conn.Close()
			return nil, fmt.Errorf("connection failed (state=%s): check address, TLS settings, and network", state)
		}
		if !conn.WaitForStateChange(ctx, state) {
			_ = conn.Close()
			return nil, ctx.Err()
		}
	}
}

func reflectGrpcMethods(ctx context.Context, conn *grpc.ClientConn) ([]*GrpcMethod, error) {
	services, err := listGrpcServices(ctx, conn)
	if err != nil {
		return nil, err
	}

	symbols := make([]string, 0, len(services))
	for _, service := range services {
		if !isReflectionService(service) {
			symbols = append(symbols, service)
		}
	}
	files, err := descriptorRegistryForSymbols(ctx, conn, symbols)
	if err != nil {
		return nil, err
	}

	methods := make([]*GrpcMethod, 0)
	for _, service := range symbols {
		descriptor, err := files.FindDescriptorByName(protoreflect.FullName(service))
		if err != nil {
			continue
		}
		serviceDescriptor, ok := descriptor.(protoreflect.ServiceDescriptor)
		if !ok {
			continue
		}
		for index := 0; index < serviceDescriptor.Methods().Len(); index += 1 {
			method := serviceDescriptor.Methods().Get(index)
			methods = append(methods, &GrpcMethod{
				Service:         string(serviceDescriptor.FullName()),
				Method:          string(method.Name()),
				FullMethod:      "/" + string(serviceDescriptor.FullName()) + "/" + string(method.Name()),
				InputType:       string(method.Input().FullName()),
				OutputType:      string(method.Output().FullName()),
				InputJson:       grpcMessageTemplate(method.Input()),
				ClientStreaming:  method.IsStreamingClient(),
				ServerStreaming:  method.IsStreamingServer(),
			})
		}
	}
	sort.Slice(methods, func(left, right int) bool {
		return methods[left].FullMethod < methods[right].FullMethod
	})
	return methods, nil
}

func listGrpcServices(ctx context.Context, conn *grpc.ClientConn) ([]string, error) {
	// Try reflection v1 first; fall back to v1alpha on Unimplemented.
	services, err := listGrpcServicesV1(ctx, conn)
	if err != nil {
		if st, ok := status.FromError(err); ok && st.Code() == codes.Unimplemented {
			return listGrpcServicesV1Alpha(ctx, conn)
		}
		return nil, err
	}
	return services, nil
}

func listGrpcServicesV1(ctx context.Context, conn *grpc.ClientConn) ([]string, error) {
	client := reflectionv1.NewServerReflectionClient(conn)
	stream, err := client.ServerReflectionInfo(ctx)
	if err != nil {
		return nil, err
	}
	defer stream.CloseSend() //nolint:errcheck

	if err := stream.Send(&reflectionv1.ServerReflectionRequest{
		MessageRequest: &reflectionv1.ServerReflectionRequest_ListServices{ListServices: "*"},
	}); err != nil {
		return nil, err
	}
	response, err := stream.Recv()
	if err != nil {
		return nil, err
	}
	if response.GetErrorResponse() != nil {
		return nil, fmt.Errorf("reflection error: %s", response.GetErrorResponse().GetErrorMessage())
	}
	list := response.GetListServicesResponse()
	if list == nil {
		return nil, fmt.Errorf("reflection list services returned no services")
	}
	services := make([]string, 0, len(list.GetService()))
	for _, service := range list.GetService() {
		if strings.TrimSpace(service.GetName()) != "" {
			services = append(services, service.GetName())
		}
	}
	sort.Strings(services)
	return services, nil
}

func listGrpcServicesV1Alpha(ctx context.Context, conn *grpc.ClientConn) ([]string, error) {
	client := reflectionpb.NewServerReflectionClient(conn)
	stream, err := client.ServerReflectionInfo(ctx)
	if err != nil {
		return nil, err
	}
	defer stream.CloseSend() //nolint:errcheck

	if err := stream.Send(&reflectionpb.ServerReflectionRequest{
		MessageRequest: &reflectionpb.ServerReflectionRequest_ListServices{ListServices: "*"},
	}); err != nil {
		return nil, err
	}
	response, err := stream.Recv()
	if err != nil {
		return nil, err
	}
	list := response.GetListServicesResponse()
	if list == nil {
		return nil, fmt.Errorf("reflection list services returned no services")
	}
	services := make([]string, 0, len(list.GetService()))
	for _, service := range list.GetService() {
		if strings.TrimSpace(service.GetName()) != "" {
			services = append(services, service.GetName())
		}
	}
	sort.Strings(services)
	return services, nil
}

func descriptorRegistryForSymbols(ctx context.Context, conn *grpc.ClientConn, symbols []string) (*protoregistry.Files, error) {
	// Try reflection v1 first; fall back to v1alpha on Unimplemented.
	files, err := descriptorRegistryForSymbolsV1(ctx, conn, symbols)
	if err != nil {
		if st, ok := status.FromError(err); ok && st.Code() == codes.Unimplemented {
			return descriptorRegistryForSymbolsV1Alpha(ctx, conn, symbols)
		}
		return nil, err
	}
	return files, nil
}

func descriptorRegistryForSymbolsV1(ctx context.Context, conn *grpc.ClientConn, symbols []string) (*protoregistry.Files, error) {
	client := reflectionv1.NewServerReflectionClient(conn)
	stream, err := client.ServerReflectionInfo(ctx)
	if err != nil {
		return nil, err
	}
	defer stream.CloseSend() //nolint:errcheck

	filesByName := make(map[string]*descriptorpb.FileDescriptorProto)
	for _, symbol := range symbols {
		if strings.TrimSpace(symbol) == "" {
			continue
		}
		if err := stream.Send(&reflectionv1.ServerReflectionRequest{
			MessageRequest: &reflectionv1.ServerReflectionRequest_FileContainingSymbol{FileContainingSymbol: symbol},
		}); err != nil {
			return nil, err
		}
		response, err := stream.Recv()
		if err != nil {
			return nil, err
		}
		if response.GetErrorResponse() != nil {
			code := codes.Code(response.GetErrorResponse().GetErrorCode())
			return nil, status.Errorf(code, "reflection error for %s: %s", symbol, response.GetErrorResponse().GetErrorMessage())
		}
		for _, rawFile := range response.GetFileDescriptorResponse().GetFileDescriptorProto() {
			file := new(descriptorpb.FileDescriptorProto)
			if err := proto.Unmarshal(rawFile, file); err != nil {
				return nil, err
			}
			filesByName[file.GetName()] = file
		}
	}

	// Recursively fetch transitive dependencies not yet in filesByName.
	if err := fetchMissingDepsV1(ctx, stream, filesByName); err != nil {
		return nil, err
	}

	return buildFileRegistry(filesByName)
}

func fetchMissingDepsV1(ctx context.Context, stream reflectionv1.ServerReflection_ServerReflectionInfoClient, filesByName map[string]*descriptorpb.FileDescriptorProto) error {
	for {
		var missing []string
		for _, file := range filesByName {
			for _, dep := range file.GetDependency() {
				if _, ok := filesByName[dep]; !ok {
					missing = append(missing, dep)
				}
			}
		}
		if len(missing) == 0 {
			return nil
		}
		for _, filename := range missing {
			// Mark as seen immediately to avoid infinite loops on cycles.
			filesByName[filename] = nil
			if err := stream.Send(&reflectionv1.ServerReflectionRequest{
				MessageRequest: &reflectionv1.ServerReflectionRequest_FileByFilename{FileByFilename: filename},
			}); err != nil {
				return err
			}
			response, err := stream.Recv()
			if err != nil {
				return err
			}
			if response.GetErrorResponse() != nil {
				code := codes.Code(response.GetErrorResponse().GetErrorCode())
				if code == codes.NotFound {
					continue // Well-known deps (e.g. google/protobuf/empty.proto) may not be served — skip gracefully.
				}
				return status.Errorf(code, "reflection error for %s: %s", filename, response.GetErrorResponse().GetErrorMessage())
			}
			for _, rawFile := range response.GetFileDescriptorResponse().GetFileDescriptorProto() {
				file := new(descriptorpb.FileDescriptorProto)
				if err := proto.Unmarshal(rawFile, file); err != nil {
					return err
				}
				filesByName[file.GetName()] = file
			}
		}
	}
}

func descriptorRegistryForSymbolsV1Alpha(ctx context.Context, conn *grpc.ClientConn, symbols []string) (*protoregistry.Files, error) {
	client := reflectionpb.NewServerReflectionClient(conn)
	stream, err := client.ServerReflectionInfo(ctx)
	if err != nil {
		return nil, err
	}
	defer stream.CloseSend() //nolint:errcheck

	filesByName := make(map[string]*descriptorpb.FileDescriptorProto)
	for _, symbol := range symbols {
		if strings.TrimSpace(symbol) == "" {
			continue
		}
		if err := stream.Send(&reflectionpb.ServerReflectionRequest{
			MessageRequest: &reflectionpb.ServerReflectionRequest_FileContainingSymbol{FileContainingSymbol: symbol},
		}); err != nil {
			return nil, err
		}
		response, err := stream.Recv()
		if err != nil {
			return nil, err
		}
		if response.GetErrorResponse() != nil {
			code := codes.Code(response.GetErrorResponse().GetErrorCode())
			return nil, status.Errorf(code, "reflection error for %s: %s", symbol, response.GetErrorResponse().GetErrorMessage())
		}
		for _, rawFile := range response.GetFileDescriptorResponse().GetFileDescriptorProto() {
			file := new(descriptorpb.FileDescriptorProto)
			if err := proto.Unmarshal(rawFile, file); err != nil {
				return nil, err
			}
			filesByName[file.GetName()] = file
		}
	}

	// Recursively fetch transitive dependencies not yet in filesByName.
	if err := fetchMissingDepsV1Alpha(ctx, stream, filesByName); err != nil {
		return nil, err
	}

	return buildFileRegistry(filesByName)
}

func fetchMissingDepsV1Alpha(ctx context.Context, stream reflectionpb.ServerReflection_ServerReflectionInfoClient, filesByName map[string]*descriptorpb.FileDescriptorProto) error {
	for {
		var missing []string
		for _, file := range filesByName {
			for _, dep := range file.GetDependency() {
				if _, ok := filesByName[dep]; !ok {
					missing = append(missing, dep)
				}
			}
		}
		if len(missing) == 0 {
			return nil
		}
		for _, filename := range missing {
			filesByName[filename] = nil
			if err := stream.Send(&reflectionpb.ServerReflectionRequest{
				MessageRequest: &reflectionpb.ServerReflectionRequest_FileByFilename{FileByFilename: filename},
			}); err != nil {
				return err
			}
			response, err := stream.Recv()
			if err != nil {
				return err
			}
			if response.GetErrorResponse() != nil {
				code := codes.Code(response.GetErrorResponse().GetErrorCode())
				if code == codes.NotFound {
					continue
				}
				return status.Errorf(code, "reflection error for %s: %s", filename, response.GetErrorResponse().GetErrorMessage())
			}
			for _, rawFile := range response.GetFileDescriptorResponse().GetFileDescriptorProto() {
				file := new(descriptorpb.FileDescriptorProto)
				if err := proto.Unmarshal(rawFile, file); err != nil {
					return err
				}
				filesByName[file.GetName()] = file
			}
		}
	}
}

func buildFileRegistry(filesByName map[string]*descriptorpb.FileDescriptorProto) (*protoregistry.Files, error) {
	files := make([]*descriptorpb.FileDescriptorProto, 0, len(filesByName))
	for _, file := range filesByName {
		if file != nil {
			files = append(files, file)
		}
	}
	sort.Slice(files, func(left, right int) bool {
		return files[left].GetName() < files[right].GetName()
	})
	return protodesc.NewFiles(&descriptorpb.FileDescriptorSet{File: files})
}

func findGrpcMethod(files *protoregistry.Files, serviceName string, methodName string) (protoreflect.MethodDescriptor, error) {
	descriptor, err := files.FindDescriptorByName(protoreflect.FullName(serviceName))
	if err != nil {
		return nil, err
	}
	service, ok := descriptor.(protoreflect.ServiceDescriptor)
	if !ok {
		return nil, fmt.Errorf("%s is not a service", serviceName)
	}
	method := service.Methods().ByName(protoreflect.Name(methodName))
	if method == nil {
		return nil, fmt.Errorf("method %s not found on %s", methodName, serviceName)
	}
	return method, nil
}

func splitFullMethod(fullMethod string) (string, string, error) {
	trimmed := strings.Trim(fullMethod, "/")
	parts := strings.Split(trimmed, "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf("full method must look like /package.Service/Method")
	}
	return parts[0], parts[1], nil
}

func outgoingMetadata(headers []*Header) metadata.MD {
	md := metadata.MD{}
	for _, header := range headers {
		key := strings.ToLower(strings.TrimSpace(header.GetKey()))
		if key == "" {
			continue
		}
		val := header.GetValue()
		// Binary metadata keys end in "-bin"; value must be base64-decoded bytes.
		if strings.HasSuffix(key, "-bin") {
			decoded, err := base64.StdEncoding.DecodeString(val)
			if err == nil {
				val = string(decoded)
			}
		}
		md[key] = append(md[key], val)
	}
	return md
}

func metadataToHeaders(values metadata.MD) []*Header {
	headers := make([]*Header, 0)
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		// Emit one Header per value to avoid multi-value join corruption.
		for _, v := range values.Get(key) {
			// Binary keys: base64-encode the raw bytes for display.
			if strings.HasSuffix(key, "-bin") {
				v = base64.StdEncoding.EncodeToString([]byte(v))
			}
			headers = append(headers, &Header{Key: key, Value: v})
		}
	}
	return headers
}

// statusDetailsJSON marshals the google.rpc.Status details to JSON when present.
func statusDetailsJSON(err error) string {
	st, ok := status.FromError(err)
	if !ok {
		return ""
	}
	p := st.Proto()
	if p == nil || len(p.GetDetails()) == 0 {
		return ""
	}
	b, merr := protojson.MarshalOptions{EmitUnpopulated: false}.Marshal(p)
	if merr != nil {
		return ""
	}
	return string(b)
}

// compressionCallOption returns a grpc.CallOption for the requested codec name, or nil.
func compressionCallOption(name string) grpc.CallOption {
	if strings.ToLower(name) == "gzip" {
		return grpc.UseCompressor(gzip.Name)
	}
	return nil
}

// registryFromProtosetBase64 parses a base64-encoded FileDescriptorSet binary.
func registryFromProtosetBase64(b64 string) (*protoregistry.Files, error) {
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		// Try URL-safe base64 as a fallback.
		raw, err = base64.URLEncoding.DecodeString(b64)
		if err != nil {
			return nil, fmt.Errorf("invalid protoset base64: %w", err)
		}
	}
	var fds descriptorpb.FileDescriptorSet
	if err := proto.Unmarshal(raw, &fds); err != nil {
		return nil, fmt.Errorf("invalid FileDescriptorSet: %w", err)
	}
	filesByName := make(map[string]*descriptorpb.FileDescriptorProto, len(fds.GetFile()))
	for _, f := range fds.GetFile() {
		filesByName[f.GetName()] = f
	}
	return buildFileRegistry(filesByName)
}

// reflectGrpcMethodsFromRegistry enumerates all services from a pre-built registry.
func reflectGrpcMethodsFromRegistry(files *protoregistry.Files) ([]*GrpcMethod, error) {
	methods := make([]*GrpcMethod, 0)
	files.RangeFiles(func(fd protoreflect.FileDescriptor) bool {
		for i := 0; i < fd.Services().Len(); i++ {
			svc := fd.Services().Get(i)
			if isReflectionService(string(svc.FullName())) {
				continue
			}
			for j := 0; j < svc.Methods().Len(); j++ {
				m := svc.Methods().Get(j)
				methods = append(methods, &GrpcMethod{
					Service:        string(svc.FullName()),
					Method:         string(m.Name()),
					FullMethod:     "/" + string(svc.FullName()) + "/" + string(m.Name()),
					InputType:      string(m.Input().FullName()),
					OutputType:     string(m.Output().FullName()),
					InputJson:      grpcMessageTemplate(m.Input()),
					ClientStreaming: m.IsStreamingClient(),
					ServerStreaming: m.IsStreamingServer(),
				})
			}
		}
		return true
	})
	sort.Slice(methods, func(i, j int) bool { return methods[i].FullMethod < methods[j].FullMethod })
	return methods, nil
}

func isReflectionService(service string) bool {
	return strings.HasPrefix(service, "grpc.reflection.") || strings.HasPrefix(service, "grpc.reflection.v1")
}

func grpcMessageTemplate(descriptor protoreflect.MessageDescriptor) string {
	message := dynamicpb.NewMessage(descriptor)
	body, err := protojson.MarshalOptions{Multiline: true, EmitUnpopulated: true}.Marshal(message)
	if err != nil {
		return "{}"
	}
	return string(body)
}
