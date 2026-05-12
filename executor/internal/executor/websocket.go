package executor

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	maxFrameBytes  = 4 * 1024 * 1024  // 4 MB per incoming frame
	maxBufferBytes = 16 * 1024 * 1024 // 16 MB total buffered per connection
	pingInterval   = 30 * time.Second
	pongWait       = 90 * time.Second // conn is dead if no pong within this window
)

type wsConnection struct {
	conn       *websocket.Conn
	mu         sync.Mutex
	messages   []*WebSocketMessage
	totalBytes int64
	closed     bool
	lastUsed   time.Time
}

func (s *Service) startWsCleanupTicker() {
	ticker := time.NewTicker(60 * time.Second)
	go func() {
		for range ticker.C {
			s.wsMu.Lock()
			s.cleanupWebSocketsLocked()
			s.wsMu.Unlock()
		}
	}()
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

	tlsConfig, err := tlsConfigFor(req.GetVerifySsl(), req.GetTlsClientConfig())
	if err != nil {
		return &WebSocketConnectResponse{Error: err.Error()}, nil
	}

	// Build request headers; allow user-supplied Origin to override the derived one.
	reqHeaders := make(http.Header)
	userOrigin := ""
	for _, h := range req.GetHeaders() {
		key := strings.TrimSpace(h.GetKey())
		if key == "" {
			continue
		}
		if strings.EqualFold(key, "origin") {
			userOrigin = h.GetValue()
		} else {
			reqHeaders.Add(key, h.GetValue())
		}
	}
	if userOrigin == "" {
		userOrigin = websocketOrigin(rawURL)
	}
	reqHeaders.Set("Origin", userOrigin)

	dialer := websocket.Dialer{
		TLSClientConfig:  tlsConfig,
		HandshakeTimeout: timeout,
		Subprotocols:     cleanedStrings(req.GetProtocols()),
	}

	connectCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	conn, _, connErr := dialer.DialContext(connectCtx, rawURL, reqHeaders)
	if connErr != nil {
		return &WebSocketConnectResponse{Error: connErr.Error()}, nil
	}

	conn.SetReadLimit(maxFrameBytes)
	conn.SetReadDeadline(time.Now().Add(pongWait)) //nolint:errcheck
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	connectionID := newConnectionID()
	wrapped := &wsConnection{
		conn:     conn,
		messages: []*WebSocketMessage{},
		lastUsed: time.Now(),
	}
	s.wsMu.Lock()
	s.cleanupWebSocketsLocked()
	s.wsConnections[connectionID] = wrapped
	s.wsMu.Unlock()

	go s.readWebSocket(wrapped)
	go s.pingWebSocket(wrapped)
	return &WebSocketConnectResponse{ConnectionId: connectionID}, nil
}

func (s *Service) pingWebSocket(conn *wsConnection) {
	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()
	for range ticker.C {
		conn.mu.Lock()
		closed := conn.closed
		conn.mu.Unlock()
		if closed {
			return
		}
		deadline := time.Now().Add(10 * time.Second)
		if err := conn.conn.WriteControl(websocket.PingMessage, []byte{}, deadline); err != nil {
			conn.mu.Lock()
			conn.closed = true
			conn.mu.Unlock()
			return
		}
	}
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

	logBody := req.GetBody()
	var sendErr error
	if req.GetBinary() {
		decoded, decErr := base64.StdEncoding.DecodeString(req.GetBody())
		if decErr != nil {
			return &WebSocketSendResponse{Error: fmt.Sprintf("binary body must be base64-encoded: %s", decErr)}, nil
		}
		sendErr = conn.conn.WriteMessage(websocket.BinaryMessage, decoded)
	} else {
		sendErr = conn.conn.WriteMessage(websocket.TextMessage, []byte(req.GetBody()))
	}

	conn.mu.Lock()
	conn.lastUsed = time.Now()
	conn.messages = appendWebSocketMessage(conn.messages, &WebSocketMessage{
		Direction: "out",
		Type:      websocketMessageType(req.GetBinary()),
		Body:      logBody,
		CreatedAt: time.Now().UnixMilli(),
	})
	if sendErr != nil {
		conn.closed = true
	}
	conn.mu.Unlock()

	if sendErr != nil {
		return &WebSocketSendResponse{Error: sendErr.Error()}, nil
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
	for _, m := range messages {
		conn.totalBytes -= int64(len(m.Body))
	}
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

	closeMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "")
	_ = conn.conn.WriteControl(websocket.CloseMessage, closeMsg, time.Now().Add(5*time.Second))
	if err := conn.conn.Close(); err != nil {
		return &WebSocketCloseResponse{Error: err.Error()}, nil
	}
	return &WebSocketCloseResponse{}, nil
}

func (s *Service) readWebSocket(conn *wsConnection) {
	for {
		msgType, data, err := conn.conn.ReadMessage()
		now := time.Now()

		conn.mu.Lock()
		conn.lastUsed = now
		if err != nil {
			conn.closed = true
			body := closeReason(err)
			msgKind := "info"
			if !isNormalClose(err) {
				msgKind = "error"
			}
			conn.messages = appendWebSocketMessage(conn.messages, &WebSocketMessage{
				Direction: "system",
				Type:      msgKind,
				Body:      body,
				CreatedAt: now.UnixMilli(),
			})
			conn.mu.Unlock()
			return
		}

		messageType := "text"
		body := string(data)
		if msgType == websocket.BinaryMessage {
			messageType = "binary"
			body = base64.StdEncoding.EncodeToString(data)
		}

		incoming := int64(len(data))
		if conn.totalBytes+incoming > maxBufferBytes {
			// Drop oldest half to make room.
			half := len(conn.messages) / 2
			if half > 0 {
				for _, m := range conn.messages[:half] {
					conn.totalBytes -= int64(len(m.Body))
				}
				conn.messages = conn.messages[half:]
			}
			conn.messages = appendWebSocketMessage(conn.messages, &WebSocketMessage{
				Direction: "system",
				Type:      "warn",
				Body:      "buffer overflow: oldest messages discarded",
				CreatedAt: now.UnixMilli(),
			})
		}

		conn.totalBytes += incoming
		conn.messages = appendWebSocketMessage(conn.messages, &WebSocketMessage{
			Direction: "in",
			Type:      messageType,
			Body:      body,
			CreatedAt: now.UnixMilli(),
		})
		conn.mu.Unlock()
	}
}

func isNormalClose(err error) bool {
	return websocket.IsCloseError(err,
		websocket.CloseNormalClosure,
		websocket.CloseGoingAway,
		websocket.CloseNoStatusReceived,
	)
}

func closeReason(err error) string {
	if closeErr, ok := err.(*websocket.CloseError); ok {
		if closeErr.Text != "" {
			return fmt.Sprintf("Connection closed (%d): %s", closeErr.Code, closeErr.Text)
		}
		return fmt.Sprintf("Connection closed (%d)", closeErr.Code)
	}
	if strings.Contains(err.Error(), "use of closed network connection") {
		return "Connection closed"
	}
	return fmt.Sprintf("Connection error: %s", err.Error())
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
			closeMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "")
			_ = conn.conn.WriteControl(websocket.CloseMessage, closeMsg, time.Now().Add(time.Second))
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
	b := make([]byte, 16)
	if _, err := rand.Read(b); err == nil {
		return "ws_" + hex.EncodeToString(b)
	}
	return fmt.Sprintf("ws_%d", time.Now().UnixNano())
}
