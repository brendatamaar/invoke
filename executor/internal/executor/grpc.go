package executor

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
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

	conn, err := grpcClientConn(ctx, address, req.GetTls(), req.GetVerifySsl(), req.GetTlsClientConfig())
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

	conn, err := grpcClientConn(ctx, address, req.GetTls(), req.GetVerifySsl(), req.GetTlsClientConfig())
	if err != nil {
		return &GrpcExecuteResponse{Error: err.Error()}, nil
	}
	defer conn.Close()

	ctx = metadata.NewOutgoingContext(ctx, outgoingMetadata(req.GetMetadata()))
	files, err := descriptorRegistryForSymbols(ctx, conn, []string{serviceName})
	if err != nil {
		return &GrpcExecuteResponse{Error: err.Error()}, nil
	}
	method, err := findGrpcMethod(files, serviceName, methodName)
	if err != nil {
		return &GrpcExecuteResponse{Error: err.Error()}, nil
	}
	if method.IsStreamingClient() || method.IsStreamingServer() {
		return &GrpcExecuteResponse{Error: "streaming gRPC methods are not supported yet"}, nil
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
	err = conn.Invoke(ctx, fullMethod, input, output, grpc.Header(&header), grpc.Trailer(&trailer))
	durationMs := floatMs(time.Since(start))
	if err != nil {
		statusCode := int32(codes.Unknown)
		statusMessage := err.Error()
		if st, ok := status.FromError(err); ok {
			statusCode = int32(st.Code())
			statusMessage = st.Message()
		}
		return &GrpcExecuteResponse{
			Metadata:      metadataToHeaders(header),
			Trailers:      metadataToHeaders(trailer),
			StatusCode:    statusCode,
			StatusMessage: statusMessage,
			DurationMs:    durationMs,
			Error:         err.Error(),
		}, nil
	}

	bodyJSON, err := protojson.MarshalOptions{Multiline: true, EmitUnpopulated: true}.Marshal(output)
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

func grpcClientConn(ctx context.Context, address string, useTLS bool, verify bool, clientConfig *TlsClientConfig) (*grpc.ClientConn, error) {
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

	conn, err := grpc.NewClient(address, grpc.WithTransportCredentials(transportCredentials))
	if err != nil {
		return nil, err
	}
	conn.Connect()
	for {
		state := conn.GetState()
		if state == connectivity.Ready {
			return conn, nil
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
				Service:    string(serviceDescriptor.FullName()),
				Method:     string(method.Name()),
				FullMethod: "/" + string(serviceDescriptor.FullName()) + "/" + string(method.Name()),
				InputType:  string(method.Input().FullName()),
				OutputType: string(method.Output().FullName()),
				InputJson:  grpcMessageTemplate(method.Input()),
			})
		}
	}
	sort.Slice(methods, func(left, right int) bool {
		return methods[left].FullMethod < methods[right].FullMethod
	})
	return methods, nil
}

func listGrpcServices(ctx context.Context, conn *grpc.ClientConn) ([]string, error) {
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
			return nil, fmt.Errorf("reflection error for %s: %s", symbol, response.GetErrorResponse().GetErrorMessage())
		}
		for _, rawFile := range response.GetFileDescriptorResponse().GetFileDescriptorProto() {
			file := new(descriptorpb.FileDescriptorProto)
			if err := proto.Unmarshal(rawFile, file); err != nil {
				return nil, err
			}
			filesByName[file.GetName()] = file
		}
	}

	files := make([]*descriptorpb.FileDescriptorProto, 0, len(filesByName))
	for _, file := range filesByName {
		files = append(files, file)
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
	values := make([]string, 0, len(headers)*2)
	for _, header := range headers {
		key := strings.ToLower(strings.TrimSpace(header.GetKey()))
		if key == "" {
			continue
		}
		values = append(values, key, header.GetValue())
	}
	if len(values) == 0 {
		return metadata.MD{}
	}
	return metadata.Pairs(values...)
}

func metadataToHeaders(values metadata.MD) []*Header {
	headers := make([]*Header, 0, len(values))
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		headers = append(headers, &Header{Key: key, Value: strings.Join(values.Get(key), ", ")})
	}
	return headers
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
