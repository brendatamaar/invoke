package executor

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/websocket"
)

type wsConnection struct {
	conn     *websocket.Conn
	mu       sync.Mutex
	messages []*WebSocketMessage
	closed   bool
	lastUsed time.Time
}

type websocketFrame struct {
	body        []byte
	payloadType byte
}

var websocketFrameCodec = websocket.Codec{
	Marshal: func(v interface{}) ([]byte, byte, error) {
		switch value := v.(type) {
		case string:
			return []byte(value), websocket.TextFrame, nil
		case []byte:
			return value, websocket.BinaryFrame, nil
		default:
			return nil, websocket.UnknownFrame, websocket.ErrNotSupported
		}
	},
	Unmarshal: func(data []byte, payloadType byte, v interface{}) error {
		frame, ok := v.(*websocketFrame)
		if !ok {
			return websocket.ErrNotSupported
		}
		frame.body = data
		frame.payloadType = payloadType
		return nil
	},
}

func (s *Service) WebSocketConnect(ctx context.Context, req *WebSocketConnectRequest) (*WebSocketConnectResponse, error) {
	rawURL := strings.TrimSpace(req.GetUrl())
	if rawURL == "" {
		return &WebSocketConnectResponse{Error: "url is required"}, nil
	}

	timeout := time.Duration(req.GetTimeoutMs()) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	connectCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	config, err := websocket.NewConfig(rawURL, websocketOrigin(rawURL))
	if err != nil {
		return &WebSocketConnectResponse{Error: err.Error()}, nil
	}
	config.Protocol = cleanedStrings(req.GetProtocols())
	config.Header = make(http.Header)
	for _, header := range req.GetHeaders() {
		if strings.TrimSpace(header.GetKey()) != "" {
			config.Header.Add(header.GetKey(), header.GetValue())
		}
	}
	tlsConfig, err := tlsConfigFor(req.GetVerifySsl(), req.GetTlsClientConfig())
	if err != nil {
		return &WebSocketConnectResponse{Error: err.Error()}, nil
	}
	config.TlsConfig = tlsConfig

	type dialResult struct {
		conn *websocket.Conn
		err  error
	}
	result := make(chan dialResult, 1)
	go func() {
		conn, dialErr := websocket.DialConfig(config)
		result <- dialResult{conn: conn, err: dialErr}
	}()

	var conn *websocket.Conn
	select {
	case <-connectCtx.Done():
		return &WebSocketConnectResponse{Error: connectCtx.Err().Error()}, nil
	case res := <-result:
		if res.err != nil {
			return &WebSocketConnectResponse{Error: res.err.Error()}, nil
		}
		conn = res.conn
	}

	connectionID := newConnectionID()
	wrapped := &wsConnection{conn: conn, messages: []*WebSocketMessage{}, lastUsed: time.Now()}
	s.wsMu.Lock()
	s.cleanupWebSocketsLocked()
	s.wsConnections[connectionID] = wrapped
	s.wsMu.Unlock()

	go s.readWebSocket(connectionID, wrapped)
	return &WebSocketConnectResponse{ConnectionId: connectionID}, nil
}

func (s *Service) WebSocketSend(_ context.Context, req *WebSocketSendRequest) (*WebSocketSendResponse, error) {
	conn, ok := s.websocketByID(req.GetConnectionId())
	if !ok {
		return &WebSocketSendResponse{Error: "connection not found"}, nil
	}

	conn.mu.Lock()
	closed := conn.closed
	conn.mu.Unlock()
	if closed {
		return &WebSocketSendResponse{Error: "connection is closed"}, nil
	}

	var err error
	if req.GetBinary() {
		err = websocket.Message.Send(conn.conn, []byte(req.GetBody()))
	} else {
		err = websocket.Message.Send(conn.conn, req.GetBody())
	}
	conn.mu.Lock()
	conn.lastUsed = time.Now()
	conn.messages = appendWebSocketMessage(conn.messages, &WebSocketMessage{
		Direction: "out",
		Type:      websocketMessageType(req.GetBinary()),
		Body:      req.GetBody(),
		CreatedAt: time.Now().UnixMilli(),
	})
	if err != nil {
		conn.closed = true
	}
	conn.mu.Unlock()

	if err != nil {
		return &WebSocketSendResponse{Error: err.Error()}, nil
	}
	return &WebSocketSendResponse{}, nil
}

func (s *Service) WebSocketPoll(_ context.Context, req *WebSocketPollRequest) (*WebSocketPollResponse, error) {
	conn, ok := s.websocketByID(req.GetConnectionId())
	if !ok {
		return &WebSocketPollResponse{Error: "connection not found"}, nil
	}

	maxMessages := int(req.GetMaxMessages())
	if maxMessages <= 0 || maxMessages > 100 {
		maxMessages = 100
	}

	conn.mu.Lock()
	count := min(maxMessages, len(conn.messages))
	messages := append([]*WebSocketMessage(nil), conn.messages[:count]...)
	conn.messages = conn.messages[count:]
	conn.lastUsed = time.Now()
	connected := !conn.closed
	conn.mu.Unlock()

	return &WebSocketPollResponse{Messages: messages, Connected: connected}, nil
}

func (s *Service) WebSocketClose(_ context.Context, req *WebSocketCloseRequest) (*WebSocketCloseResponse, error) {
	s.wsMu.Lock()
	conn, ok := s.wsConnections[req.GetConnectionId()]
	if ok {
		delete(s.wsConnections, req.GetConnectionId())
	}
	s.wsMu.Unlock()
	if !ok {
		return &WebSocketCloseResponse{}, nil
	}

	conn.mu.Lock()
	conn.closed = true
	conn.mu.Unlock()
	if err := conn.conn.Close(); err != nil {
		return &WebSocketCloseResponse{Error: err.Error()}, nil
	}
	return &WebSocketCloseResponse{}, nil
}

func (s *Service) readWebSocket(_ string, conn *wsConnection) {
	for {
		var frame websocketFrame
		err := websocketFrameCodec.Receive(conn.conn, &frame)
		now := time.Now()

		conn.mu.Lock()
		conn.lastUsed = now
		if err != nil {
			conn.closed = true
			if err != io.EOF {
				conn.messages = appendWebSocketMessage(conn.messages, &WebSocketMessage{
					Direction: "system",
					Type:      "error",
					Body:      err.Error(),
					CreatedAt: now.UnixMilli(),
				})
			}
			conn.mu.Unlock()
			return
		}
		messageType := "text"
		body := string(frame.body)
		if frame.payloadType == websocket.BinaryFrame {
			messageType = "binary"
			body = base64.StdEncoding.EncodeToString(frame.body)
		}
		conn.messages = appendWebSocketMessage(conn.messages, &WebSocketMessage{
			Direction: "in",
			Type:      messageType,
			Body:      body,
			CreatedAt: now.UnixMilli(),
		})
		conn.mu.Unlock()
	}
}

func (s *Service) websocketByID(connectionID string) (*wsConnection, bool) {
	s.wsMu.Lock()
	defer s.wsMu.Unlock()
	conn, ok := s.wsConnections[connectionID]
	return conn, ok
}

func (s *Service) cleanupWebSocketsLocked() {
	cutoff := time.Now().Add(-30 * time.Minute)
	for id, conn := range s.wsConnections {
		conn.mu.Lock()
		expired := conn.closed || conn.lastUsed.Before(cutoff)
		conn.mu.Unlock()
		if expired {
			_ = conn.conn.Close()
			delete(s.wsConnections, id)
		}
	}
}

func appendWebSocketMessage(messages []*WebSocketMessage, message *WebSocketMessage) []*WebSocketMessage {
	messages = append(messages, message)
	if len(messages) > 500 {
		return messages[len(messages)-500:]
	}
	return messages
}

func websocketOrigin(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Host == "" {
		return "http://localhost"
	}
	scheme := "http"
	if parsed.Scheme == "wss" {
		scheme = "https"
	}
	return scheme + "://" + parsed.Host
}

func cleanedStrings(values []string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func websocketMessageType(binary bool) string {
	if binary {
		return "binary"
	}
	return "text"
}

func newConnectionID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err == nil {
		return "ws_" + hex.EncodeToString(bytes)
	}
	return fmt.Sprintf("ws_%d", time.Now().UnixNano())
}
