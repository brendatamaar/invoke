package executor

import "github.com/brendatama/invoke/executor/internal/executorpb"

type Certificate = executorpb.Certificate
type Header = executorpb.Header
type GrpcExecuteRequest = executorpb.GrpcExecuteRequest
type GrpcExecuteResponse = executorpb.GrpcExecuteResponse
type GrpcStreamMessage = executorpb.GrpcStreamMessage
type GrpcServerStreamServer = executorpb.HttpExecutor_GrpcServerStreamServer
type GrpcMethod = executorpb.GrpcMethod
type GrpcReflectRequest = executorpb.GrpcReflectRequest
type GrpcReflectResponse = executorpb.GrpcReflectResponse
type HttpRequest = executorpb.HttpRequest
type HttpResponse = executorpb.HttpResponse
type PingRequest = executorpb.PingRequest
type PingResponse = executorpb.PingResponse
type Redirect = executorpb.Redirect
type ResponseChunk = executorpb.ResponseChunk
type Timing = executorpb.Timing
type TimingAttempt = executorpb.TimingAttempt
type TimingPhase = executorpb.TimingPhase
type TlsClientConfig = executorpb.TlsClientConfig
type TlsInfo = executorpb.TlsInfo
type WebSocketCloseRequest = executorpb.WebSocketCloseRequest
type WebSocketCloseResponse = executorpb.WebSocketCloseResponse
type WebSocketConnectRequest = executorpb.WebSocketConnectRequest
type WebSocketConnectResponse = executorpb.WebSocketConnectResponse
type WebSocketMessage = executorpb.WebSocketMessage
type WebSocketPollRequest = executorpb.WebSocketPollRequest
type WebSocketPollResponse = executorpb.WebSocketPollResponse
type WebSocketSendRequest = executorpb.WebSocketSendRequest
type WebSocketSendResponse = executorpb.WebSocketSendResponse
