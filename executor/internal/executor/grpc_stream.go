package executor

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/types/dynamicpb"
)

// grpcManagedStream holds a live gRPC client stream across multiple HTTP calls.
type grpcManagedStream struct {
	stream   grpc.ClientStream
	conn     *grpc.ClientConn
	cancel   context.CancelFunc
	method   protoreflect.MethodDescriptor
	mu       sync.Mutex
	messages []*GrpcStreamMessage
	done     bool
	lastUsed time.Time
}

func newStreamID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "gs_" + hex.EncodeToString(b)
}

func (s *Service) startGrpcStreamCleanupTicker() {
	go func() {
		t := time.NewTicker(2 * time.Minute)
		defer t.Stop()
		for range t.C {
			s.grpcStreamMu.Lock()
			cutoff := time.Now().Add(-10 * time.Minute)
			for id, ms := range s.grpcStreams {
				ms.mu.Lock()
				stale := ms.done || ms.lastUsed.Before(cutoff)
				ms.mu.Unlock()
				if stale {
					ms.cancel()
					_ = ms.conn.Close()
					delete(s.grpcStreams, id)
					delete(s.grpcStreamSenders, id)
					delete(s.grpcStreamClosers, id)
				}
			}
			s.grpcStreamMu.Unlock()
		}
	}()
}

func (s *Service) grpcStreamByID(id string) (*grpcManagedStream, bool) {
	s.grpcStreamMu.Lock()
	defer s.grpcStreamMu.Unlock()
	ms, ok := s.grpcStreams[id]
	return ms, ok
}

// GrpcStreamOpen opens a client or bidi gRPC stream and returns a stream_id.
func (s *Service) GrpcStreamOpen(ctx context.Context, req *GrpcExecuteRequest) (*GrpcStreamOpenResponse, error) {
	address := strings.TrimSpace(req.GetAddress())
	if address == "" {
		return &GrpcStreamOpenResponse{Error: "address is required"}, nil
	}
	fullMethod := strings.TrimSpace(req.GetFullMethod())
	serviceName, methodName, err := splitFullMethod(fullMethod)
	if err != nil {
		return &GrpcStreamOpenResponse{Error: err.Error()}, nil
	}

	// Use a long-lived context for the stream (not bounded by the HTTP request).
	streamCtx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)

	conn, err := grpcClientConn(ctx, address, req.GetTls(), req.GetVerifySsl(), req.GetTlsClientConfig(), req.GetAllowPrivate())
	if err != nil {
		cancel()
		return &GrpcStreamOpenResponse{Error: err.Error()}, nil
	}

	// Resolve method descriptor: from protoset → reflection → well-known fallback.
	reflectCtx, reflectCancel := context.WithTimeout(streamCtx, 30*time.Second)
	reflectCtx = metadata.NewOutgoingContext(reflectCtx, outgoingMetadata(req.GetMetadata()))
	files, err := registryForService(reflectCtx, conn, req.GetProtosetBase64(), serviceName)
	reflectCancel()
	if err != nil {
		cancel()
		_ = conn.Close()
		return &GrpcStreamOpenResponse{Error: err.Error()}, nil
	}
	methodDesc, err := findGrpcMethod(files, serviceName, methodName)
	if err != nil {
		cancel()
		_ = conn.Close()
		return &GrpcStreamOpenResponse{Error: err.Error()}, nil
	}
	if !methodDesc.IsStreamingClient() {
		cancel()
		_ = conn.Close()
		return &GrpcStreamOpenResponse{Error: "method is not client-streaming; use GrpcExecute or GrpcServerStream"}, nil
	}

	outMD := outgoingMetadata(req.GetMetadata())
	streamCtx = metadata.NewOutgoingContext(streamCtx, outMD)
	isBidi := methodDesc.IsStreamingServer()

	clientStream, err := conn.NewStream(streamCtx, &grpc.StreamDesc{
		ClientStreams: true,
		ServerStreams: isBidi,
	}, fullMethod)
	if err != nil {
		cancel()
		_ = conn.Close()
		return &GrpcStreamOpenResponse{Error: err.Error()}, nil
	}

	ms := &grpcManagedStream{
		stream:   clientStream,
		conn:     conn,
		cancel:   cancel,
		method:   methodDesc,
		messages: make([]*GrpcStreamMessage, 0),
		lastUsed: time.Now(),
	}

	// For bidi-streaming: spawn reader that buffers inbound messages.
	if isBidi {
		go func() {
			for {
				output := dynamicpb.NewMessage(methodDesc.Output())
				recvErr := clientStream.RecvMsg(output)
				ms.mu.Lock()
				if recvErr != nil {
					done := &GrpcStreamMessage{Done: true}
					if st, ok := status.FromError(recvErr); ok {
						done.StatusCode = int32(st.Code())
						done.StatusMessage = st.Message()
					}
					if recvErr.Error() != "EOF" {
						done.Error = recvErr.Error()
					}
					done.Trailers = metadataToHeaders(clientStream.Trailer())
					ms.messages = append(ms.messages, done)
					ms.done = true
					ms.mu.Unlock()
					return
				}
				bodyJSON, _ := protojson.MarshalOptions{Multiline: true}.Marshal(output)
				ms.messages = append(ms.messages, &GrpcStreamMessage{BodyJson: string(bodyJSON)})
				ms.mu.Unlock()
			}
		}()
	}

	// Send initial body if provided.
	body := strings.TrimSpace(req.GetBodyJson())
	if body != "" && body != "{}" {
		input := dynamicpb.NewMessage(methodDesc.Input())
		if merr := protojson.Unmarshal([]byte(body), input); merr == nil {
			_ = clientStream.SendMsg(input)
		}
	}

	// Build per-stream sender and closer closures.
	sender := func(bodyJSON string) error {
		bj := strings.TrimSpace(bodyJSON)
		if bj == "" {
			bj = "{}"
		}
		input := dynamicpb.NewMessage(methodDesc.Input())
		if err := protojson.Unmarshal([]byte(bj), input); err != nil {
			return fmt.Errorf("invalid request JSON: %w", err)
		}
		return clientStream.SendMsg(input)
	}

	closer := func() (*GrpcStreamCloseResponse, error) {
		if serr := clientStream.CloseSend(); serr != nil {
			return &GrpcStreamCloseResponse{Error: serr.Error()}, nil
		}
		if !isBidi {
			// Client-streaming: wait for single server response.
			output := dynamicpb.NewMessage(methodDesc.Output())
			start := time.Now()
			initialMD, _ := clientStream.Header()
			recvErr := clientStream.RecvMsg(output)
			durationMs := floatMs(time.Since(start))
			trailer := clientStream.Trailer()
			if recvErr != nil {
				sc := int32(codes.Unknown)
				sm := recvErr.Error()
				if st, ok := status.FromError(recvErr); ok {
					sc = int32(st.Code())
					sm = st.Message()
				}
				return &GrpcStreamCloseResponse{
					Metadata:      metadataToHeaders(initialMD),
					Trailers:      metadataToHeaders(trailer),
					StatusCode:    sc,
					StatusMessage: sm,
					DurationMs:    durationMs,
					Error:         recvErr.Error(),
				}, nil
			}
			bodyJSON, _ := protojson.MarshalOptions{Multiline: true}.Marshal(output)
			return &GrpcStreamCloseResponse{
				BodyJson:      string(bodyJSON),
				Metadata:      metadataToHeaders(initialMD),
				Trailers:      metadataToHeaders(trailer),
				StatusCode:    int32(codes.OK),
				StatusMessage: codes.OK.String(),
				DurationMs:    durationMs,
			}, nil
		}
		// Bidi: just CloseSend; server finishes when it sees no more client messages.
		return &GrpcStreamCloseResponse{StatusCode: int32(codes.OK), StatusMessage: codes.OK.String()}, nil
	}

	streamID := newStreamID()
	s.grpcStreamMu.Lock()
	s.grpcStreams[streamID] = ms
	s.grpcStreamSenders[streamID] = sender
	s.grpcStreamClosers[streamID] = closer
	s.grpcStreamMu.Unlock()

	return &GrpcStreamOpenResponse{StreamId: streamID}, nil
}

// GrpcStreamSend sends a single message on an open client stream.
func (s *Service) GrpcStreamSend(ctx context.Context, req *GrpcStreamSendRequest) (*GrpcStreamSendResponse, error) {
	id := req.GetStreamId()
	s.grpcStreamMu.Lock()
	sender, ok := s.grpcStreamSenders[id]
	ms := s.grpcStreams[id]
	s.grpcStreamMu.Unlock()
	if !ok {
		return &GrpcStreamSendResponse{Error: "stream not found: " + id}, nil
	}
	ms.mu.Lock()
	ms.lastUsed = time.Now()
	ms.mu.Unlock()
	if err := sender(req.GetBodyJson()); err != nil {
		return &GrpcStreamSendResponse{Error: err.Error()}, nil
	}
	return &GrpcStreamSendResponse{}, nil
}

// GrpcStreamClose closes the client-send side and returns the server response for client-streaming.
func (s *Service) GrpcStreamClose(ctx context.Context, req *GrpcStreamCloseRequest) (*GrpcStreamCloseResponse, error) {
	id := req.GetStreamId()
	s.grpcStreamMu.Lock()
	closer, ok := s.grpcStreamClosers[id]
	ms := s.grpcStreams[id]
	delete(s.grpcStreams, id)
	delete(s.grpcStreamSenders, id)
	delete(s.grpcStreamClosers, id)
	s.grpcStreamMu.Unlock()
	if !ok {
		return &GrpcStreamCloseResponse{Error: "stream not found: " + id}, nil
	}
	res, err := closer()
	if ms != nil {
		ms.cancel()
		_ = ms.conn.Close()
	}
	if err != nil {
		return &GrpcStreamCloseResponse{Error: err.Error()}, nil
	}
	return res, nil
}

// GrpcStreamPoll returns buffered inbound messages for a bidi stream.
func (s *Service) GrpcStreamPoll(ctx context.Context, req *GrpcStreamPollRequest) (*GrpcStreamPollResponse, error) {
	id := req.GetStreamId()
	ms, ok := s.grpcStreamByID(id)
	if !ok {
		return &GrpcStreamPollResponse{Error: "stream not found: " + id, Connected: false}, nil
	}
	max := int(req.GetMaxMessages())
	if max <= 0 {
		max = 50
	}
	ms.mu.Lock()
	n := max
	if n > len(ms.messages) {
		n = len(ms.messages)
	}
	drained := make([]*GrpcStreamMessage, n)
	copy(drained, ms.messages[:n])
	ms.messages = ms.messages[n:]
	connected := !ms.done
	ms.lastUsed = time.Now()
	ms.mu.Unlock()

	return &GrpcStreamPollResponse{Messages: drained, Connected: connected}, nil
}
