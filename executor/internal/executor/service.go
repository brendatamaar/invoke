package executor

import (
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strconv"
	"log"
	"net"
	"net/http"
	"net/http/httptrace"
	"net/url"
	"runtime"
	"strings"
	"sync"
	"time"

	ntlmssp "github.com/Azure/go-ntlmssp"
	"github.com/brendatamaar/invoke/executor/internal/executorpb"
	"golang.org/x/net/http2"
	"golang.org/x/net/proxy"
)

// transportCache caches *http.Transport keyed by config hash so TCP connections
// and HTTP/2 sessions are reused across requests with the same settings.
var transportCache sync.Map

type Service struct {
	executorpb.UnimplementedHttpExecutorServer
	startedAt     time.Time
	wsMu          sync.Mutex
	wsConnections map[string]*wsConnection
	grpcStreamMu  sync.Mutex
	grpcStreams    map[string]*grpcManagedStream
	grpcStreamSenders map[string]func(string) error
	grpcStreamClosers map[string]func() (*GrpcStreamCloseResponse, error)
}

func NewService() *Service {
	s := &Service{
		startedAt:         time.Now(),
		wsConnections:     make(map[string]*wsConnection),
		grpcStreams:       make(map[string]*grpcManagedStream),
		grpcStreamSenders: make(map[string]func(string) error),
		grpcStreamClosers: make(map[string]func() (*GrpcStreamCloseResponse, error)),
	}
	s.startWsCleanupTicker()
	s.startGrpcStreamCleanupTicker()
	return s
}

func (s *Service) Ping(context.Context, *PingRequest) (*PingResponse, error) {
	return &PingResponse{
		Message:  "pong from Go " + runtime.Version(),
		Version:  runtime.Version(),
		UptimeMs: time.Since(s.startedAt).Milliseconds(),
	}, nil
}

func (s *Service) Execute(ctx context.Context, req *HttpRequest) (*HttpResponse, error) {
	if strings.TrimSpace(req.GetUrl()) == "" {
		return &HttpResponse{Error: "url is required"}, nil
	}
	method := strings.ToUpper(strings.TrimSpace(req.GetMethod()))
	if method == "" {
		method = http.MethodGet
	}

	timeout := time.Duration(req.GetTimeoutMs()) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, method, req.GetUrl(), bytes.NewReader(req.GetBody()))
	if err != nil {
		return &HttpResponse{Error: err.Error()}, nil
	}
	connectTimeoutMs, readTimeoutMs, allowPrivate, ntlm, httpVersionMode := extractInvokeHeaders(req.GetHeaders(), httpReq)

	transport, err := transportFor(req, connectTimeoutMs, readTimeoutMs, allowPrivate, httpVersionMode)
	if err != nil {
		return &HttpResponse{Error: err.Error()}, nil
	}
	var innerTransport http.RoundTripper = transport
	if ntlm != nil && ntlm.username != "" {
		innerTransport = ntlmssp.Negotiator{RoundTripper: transport}
		httpReq.SetBasicAuth(ntlm.username, ntlm.password)
	}
	attempts := make([]*attemptRecord, 0)
	client := &http.Client{Transport: &recordingTransport{base: innerTransport, attempts: &attempts}}
	if !req.GetFollowRedirects() {
		client.CheckRedirect = func(next *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
	} else {
		maxRedirects := int(req.GetMaxRedirects())
		if maxRedirects <= 0 {
			maxRedirects = 10
		}
		client.CheckRedirect = func(next *http.Request, via []*http.Request) error {
			if len(via) >= maxRedirects {
				return errors.New("stopped after maximum redirects")
			}
			return nil
		}
	}

	start := time.Now()
	resp, err := client.Do(httpReq)
	if err != nil {
		finishedAt := time.Now()
		finalizeLastAttempt(attempts, finishedAt)
		return &HttpResponse{
			Error:     err.Error(),
			Timing:    aggregateTiming(attempts, start, finishedAt),
			Redirects: redirectsFromAttempts(attempts),
			Attempts:  attemptsToProto(attempts),
		}, nil
	}
	defer resp.Body.Close()

	body, truncated, readErr := limitedReadAll(resp.Body)
	finishedAt := time.Now()
	finalizeLastAttempt(attempts, finishedAt)
	if readErr != nil {
		return &HttpResponse{
			Error:     readErr.Error(),
			Timing:    aggregateTiming(attempts, start, finishedAt),
			Redirects: redirectsFromAttempts(attempts),
			Attempts:  attemptsToProto(attempts),
		}, nil
	}

	timing := aggregateTiming(attempts, start, finishedAt)
	truncatedErr := ""
	if truncated {
		truncatedErr = fmt.Sprintf("BODY_TRUNCATED: response exceeded %d MB limit; only the first %d MB are shown", maxBodyBytes/1024/1024, maxBodyBytes/1024/1024)
	}
	out := &HttpResponse{
		Status:       int32(resp.StatusCode),
		StatusText:   resp.Status,
		Headers:      appendHttpVersion(headersFromHTTP(resp.Header), resp.Proto),
		Body:         body,
		Timing:       timing,
		Tls:          tlsInfo(resp.TLS),
		Redirects:    redirectsFromAttempts(attempts),
		Attempts:     attemptsToProto(attempts),
		RequestSize:  int64(len(req.GetBody())),
		ResponseSize: int64(len(body)),
		Error:        truncatedErr,
	}
	return out, nil
}

func (s *Service) ExecuteStream(req *HttpRequest, stream executorpb.HttpExecutor_ExecuteStreamServer) error {
	if strings.TrimSpace(req.GetUrl()) == "" {
		return stream.Send(&ResponseChunk{Done: true, Error: "url is required", FinalResponse: &HttpResponse{Error: "url is required"}})
	}
	method := strings.ToUpper(strings.TrimSpace(req.GetMethod()))
	if method == "" {
		method = http.MethodGet
	}

	timeout := time.Duration(req.GetTimeoutMs()) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	ctx, cancel := context.WithTimeout(stream.Context(), timeout)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, method, req.GetUrl(), bytes.NewReader(req.GetBody()))
	if err != nil {
		return stream.Send(&ResponseChunk{Done: true, Error: err.Error(), FinalResponse: &HttpResponse{Error: err.Error()}})
	}
	connectTimeoutMs, readTimeoutMs, allowPrivate, ntlm, httpVersionMode := extractInvokeHeaders(req.GetHeaders(), httpReq)

	transport, err := transportFor(req, connectTimeoutMs, readTimeoutMs, allowPrivate, httpVersionMode)
	if err != nil {
		return stream.Send(&ResponseChunk{Done: true, Error: err.Error(), FinalResponse: &HttpResponse{Error: err.Error()}})
	}
	var innerTransport http.RoundTripper = transport
	if ntlm != nil && ntlm.username != "" {
		innerTransport = ntlmssp.Negotiator{RoundTripper: transport}
		httpReq.SetBasicAuth(ntlm.username, ntlm.password)
	}
	attempts := make([]*attemptRecord, 0)
	client := &http.Client{Transport: &recordingTransport{base: innerTransport, attempts: &attempts}}
	if !req.GetFollowRedirects() {
		client.CheckRedirect = func(next *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
	} else {
		maxRedirects := int(req.GetMaxRedirects())
		if maxRedirects <= 0 {
			maxRedirects = 10
		}
		client.CheckRedirect = func(next *http.Request, via []*http.Request) error {
			if len(via) >= maxRedirects {
				return errors.New("stopped after maximum redirects")
			}
			return nil
		}
	}

	start := time.Now()
	resp, err := client.Do(httpReq)
	if err != nil {
		finishedAt := time.Now()
		finalizeLastAttempt(attempts, finishedAt)
		finalResponse := &HttpResponse{
			Error:     err.Error(),
			Timing:    aggregateTiming(attempts, start, finishedAt),
			Redirects: redirectsFromAttempts(attempts),
			Attempts:  attemptsToProto(attempts),
		}
		return stream.Send(&ResponseChunk{Done: true, Error: err.Error(), FinalResponse: finalResponse})
	}
	defer resp.Body.Close()

	var body bytes.Buffer
	chunk := make([]byte, 16*1024)
	streamTruncated := false
	for {
		if body.Len() >= maxBodyBytes {
			streamTruncated = true
			break
		}
		n, readErr := resp.Body.Read(chunk)
		if n > 0 {
			part := append([]byte(nil), chunk[:n]...)
			body.Write(part)
			if err := stream.Send(&ResponseChunk{Body: part}); err != nil {
				return err
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			finishedAt := time.Now()
			finalizeLastAttempt(attempts, finishedAt)
			finalResponse := &HttpResponse{
				Status:       int32(resp.StatusCode),
				StatusText:   resp.Status,
				Headers:      headersFromHTTP(resp.Header),
				Body:         body.Bytes(),
				Timing:       aggregateTiming(attempts, start, finishedAt),
				Tls:          tlsInfo(resp.TLS),
				Redirects:    redirectsFromAttempts(attempts),
				Attempts:     attemptsToProto(attempts),
				RequestSize:  int64(len(req.GetBody())),
				ResponseSize: int64(body.Len()),
				Error:        readErr.Error(),
			}
			return stream.Send(&ResponseChunk{Done: true, Error: readErr.Error(), FinalResponse: finalResponse})
		}
	}

	finishedAt := time.Now()
	finalizeLastAttempt(attempts, finishedAt)
	streamTruncErr := ""
	if streamTruncated {
		streamTruncErr = fmt.Sprintf("BODY_TRUNCATED: response exceeded %d MB limit; only the first %d MB are shown", maxBodyBytes/1024/1024, maxBodyBytes/1024/1024)
	}
	finalResponse := &HttpResponse{
		Status:       int32(resp.StatusCode),
		StatusText:   resp.Status,
		Headers:      appendHttpVersion(headersFromHTTP(resp.Header), resp.Proto),
		Body:         body.Bytes(),
		Timing:       aggregateTiming(attempts, start, finishedAt),
		Tls:          tlsInfo(resp.TLS),
		Redirects:    redirectsFromAttempts(attempts),
		Attempts:     attemptsToProto(attempts),
		RequestSize:  int64(len(req.GetBody())),
		ResponseSize: int64(body.Len()),
		Error:        streamTruncErr,
	}
	return stream.Send(&ResponseChunk{Done: true, FinalResponse: finalResponse})
}

const maxBodyBytes = 50 * 1024 * 1024 // 50 MB

type ntlmCreds struct {
	username string
	password string
}

// extractInvokeHeaders copies non-internal headers onto httpReq and returns
// connect/read timeout values, allowPrivate flag, optional NTLM credentials,
// and an httpVersionMode ("auto", "http1", "h2c") parsed from X-Invoke-* headers.
func extractInvokeHeaders(headers []*Header, httpReq *http.Request) (connectMs, readMs int64, allowPrivate bool, ntlm *ntlmCreds, httpVersionMode string) {
	for _, h := range headers {
		key := strings.TrimSpace(h.GetKey())
		if key == "" {
			continue
		}
		switch strings.ToLower(key) {
		case "x-invoke-connect-timeout-ms":
			if v, err := strconv.ParseInt(h.GetValue(), 10, 64); err == nil {
				connectMs = v
			}
		case "x-invoke-read-timeout-ms":
			if v, err := strconv.ParseInt(h.GetValue(), 10, 64); err == nil {
				readMs = v
			}
		case "x-invoke-allow-private":
			allowPrivate = strings.EqualFold(h.GetValue(), "true")
		case "x-invoke-http-version-mode":
			httpVersionMode = strings.ToLower(strings.TrimSpace(h.GetValue()))
		case "x-invoke-ntlm-username":
			if ntlm == nil {
				ntlm = &ntlmCreds{}
			}
			ntlm.username = h.GetValue()
		case "x-invoke-ntlm-password":
			if ntlm == nil {
				ntlm = &ntlmCreds{}
			}
			ntlm.password = h.GetValue()
		default:
			httpReq.Header.Add(key, h.GetValue())
		}
	}
	return
}

func transportFor(req *HttpRequest, connectTimeoutMs, readTimeoutMs int64, allowPrivate bool, httpVersionMode string) (http.RoundTripper, error) {
	key := buildTransportKey(req, connectTimeoutMs, readTimeoutMs, allowPrivate, httpVersionMode)
	if v, ok := transportCache.Load(key); ok {
		return v.(http.RoundTripper), nil
	}
	t, err := buildTransport(req, connectTimeoutMs, readTimeoutMs, allowPrivate, httpVersionMode)
	if err != nil {
		return nil, err
	}
	actual, _ := transportCache.LoadOrStore(key, t)
	return actual.(http.RoundTripper), nil
}

func buildTransportKey(req *HttpRequest, connectMs, readMs int64, allowPrivate bool, httpVersionMode string) string {
	h := sha256.New()
	fmt.Fprintf(h, "v=%v|ct=%d|rt=%d|ap=%v|hv=%s", req.GetVerifySsl(), connectMs, readMs, allowPrivate, httpVersionMode)
	if cc := req.GetTlsClientConfig(); cc != nil {
		fmt.Fprintf(h, "|sn=%s", cc.GetServerName())
		certSum := sha256.Sum256(append(append([]byte(nil), cc.GetClientCertPem()...), cc.GetClientKeyPem()...))
		caSum := sha256.Sum256(cc.GetCaCertPem())
		h.Write(certSum[:])
		h.Write(caSum[:])
	}
	if p := req.GetProxy(); p != nil && strings.TrimSpace(p.GetUrl()) != "" {
		fmt.Fprintf(h, "|px=%s|pu=%s|pt=%s", p.GetUrl(), p.GetUsername(), p.GetType())
	}
	return hex.EncodeToString(h.Sum(nil))
}

func buildTransport(req *HttpRequest, connectTimeoutMs, readTimeoutMs int64, allowPrivate bool, httpVersionMode string) (http.RoundTripper, error) {
	if httpVersionMode == "h2c" {
		return buildH2cTransport(req, connectTimeoutMs, readTimeoutMs, allowPrivate)
	}

	verify := req.GetVerifySsl()
	tlsConfig, err := tlsConfigFor(verify, req.GetTlsClientConfig())
	if err != nil {
		return nil, err
	}
	var connectTimeout time.Duration
	if connectTimeoutMs > 0 {
		connectTimeout = time.Duration(connectTimeoutMs) * time.Millisecond
	}
	forceHTTP2 := httpVersionMode != "http1"
	transport := &http.Transport{
		ForceAttemptHTTP2:     forceHTTP2,
		TLSClientConfig:       tlsConfig,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   10,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
	if !forceHTTP2 {
		// Disable HTTP/2 upgrade at the TLS level too
		transport.TLSNextProto = make(map[string]func(authority string, c *tls.Conn) http.RoundTripper)
	}
	if readTimeoutMs > 0 {
		transport.ResponseHeaderTimeout = time.Duration(readTimeoutMs) * time.Millisecond
	}
	hasProxy := req.GetProxy() != nil && strings.TrimSpace(req.GetProxy().GetUrl()) != ""
	if !hasProxy {
		transport.DialContext = ssrfDialContext(&net.Dialer{Timeout: connectTimeout, KeepAlive: 30 * time.Second}, allowPrivate)
	}
	if hasProxy {
		proxyURL, err := url.Parse(req.GetProxy().GetUrl())
		if err != nil {
			return nil, fmt.Errorf("invalid proxy url: %w", err)
		}
		if req.GetProxy().GetUsername() != "" {
			proxyURL.User = url.UserPassword(req.GetProxy().GetUsername(), req.GetProxy().GetPassword())
		}
		switch strings.ToLower(req.GetProxy().GetType()) {
		case "socks5":
			dialer, err := proxy.FromURL(proxyURL, proxy.Direct)
			if err != nil {
				return nil, err
			}
			transport.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
				type contextDialer interface {
					DialContext(context.Context, string, string) (net.Conn, error)
				}
				if d, ok := dialer.(contextDialer); ok {
					return d.DialContext(ctx, network, address)
				}
				return dialer.Dial(network, address)
			}
		default:
			transport.Proxy = http.ProxyURL(proxyURL)
		}
	}
	return transport, nil
}

func buildH2cTransport(req *HttpRequest, connectTimeoutMs, readTimeoutMs int64, allowPrivate bool) (http.RoundTripper, error) {
	var connectTimeout time.Duration
	if connectTimeoutMs > 0 {
		connectTimeout = time.Duration(connectTimeoutMs) * time.Millisecond
	}

	dialCtx := ssrfDialContext(&net.Dialer{Timeout: connectTimeout, KeepAlive: 30 * time.Second}, allowPrivate)

	hasProxy := req.GetProxy() != nil && strings.TrimSpace(req.GetProxy().GetUrl()) != ""
	if hasProxy && strings.ToLower(req.GetProxy().GetType()) == "socks5" {
		proxyURL, err := url.Parse(req.GetProxy().GetUrl())
		if err != nil {
			return nil, fmt.Errorf("invalid proxy url: %w", err)
		}
		if req.GetProxy().GetUsername() != "" {
			proxyURL.User = url.UserPassword(req.GetProxy().GetUsername(), req.GetProxy().GetPassword())
		}
		dialer, err := proxy.FromURL(proxyURL, proxy.Direct)
		if err != nil {
			return nil, err
		}
		dialCtx = func(ctx context.Context, network, addr string) (net.Conn, error) {
			type contextDialer interface {
				DialContext(context.Context, string, string) (net.Conn, error)
			}
			if d, ok := dialer.(contextDialer); ok {
				return d.DialContext(ctx, network, addr)
			}
			return dialer.Dial(network, addr)
		}
	}

	t := &http2.Transport{
		AllowHTTP: true,
		DialTLSContext: func(ctx context.Context, network, addr string, _ *tls.Config) (net.Conn, error) {
			return dialCtx(ctx, network, addr)
		},
	}

	if readTimeoutMs > 0 {
		t.ReadIdleTimeout = time.Duration(readTimeoutMs) * time.Millisecond
	}

	if hasProxy && strings.ToLower(req.GetProxy().GetType()) != "socks5" {
		return nil, errors.New("HTTP proxies are not supported with h2c mode; use a SOCKS5 proxy or switch to auto/http1 mode")
	}

	return t, nil
}

func appendHttpVersion(headers []*Header, proto string) []*Header {
	if proto == "" {
		return headers
	}
	return append(headers, &Header{Key: "X-Invoke-Http-Version", Value: proto})
}

func limitedReadAll(r io.Reader) ([]byte, bool, error) {
	limited := io.LimitReader(r, int64(maxBodyBytes)+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return data, false, err
	}
	if len(data) > maxBodyBytes {
		return data[:maxBodyBytes], true, nil
	}
	return data, false, nil
}

func tlsConfigFor(verify bool, clientConfig *TlsClientConfig) (*tls.Config, error) {
	config := &tls.Config{InsecureSkipVerify: !verify} //nolint:gosec
	if clientConfig == nil {
		return config, nil
	}

	if serverName := strings.TrimSpace(clientConfig.GetServerName()); serverName != "" {
		config.ServerName = serverName
	}

	clientCert := bytes.TrimSpace(clientConfig.GetClientCertPem())
	clientKey := bytes.TrimSpace(clientConfig.GetClientKeyPem())
	if len(clientCert) > 0 || len(clientKey) > 0 {
		if len(clientCert) == 0 || len(clientKey) == 0 {
			return nil, errors.New("client certificate and key are both required for mTLS")
		}
		cert, err := tls.X509KeyPair(clientCert, clientKey)
		if err != nil {
			return nil, fmt.Errorf("invalid client certificate/key: %w", err)
		}
		config.Certificates = []tls.Certificate{cert}
	}

	caCert := bytes.TrimSpace(clientConfig.GetCaCertPem())
	if len(caCert) > 0 {
		pool, err := x509.SystemCertPool()
		if err != nil || pool == nil {
			log.Printf("warning: SystemCertPool failed (%v); custom CA will be the only trusted root", err)
			pool = x509.NewCertPool()
		}
		if !pool.AppendCertsFromPEM(caCert) {
			return nil, errors.New("invalid CA certificate PEM")
		}
		config.RootCAs = pool
	}

	return config, nil
}

func headersFromHTTP(values http.Header) []*Header {
	headers := make([]*Header, 0)
	for key, vals := range values {
		for _, v := range vals {
			headers = append(headers, &Header{Key: key, Value: v})
		}
	}
	return headers
}

func tlsInfo(state *tls.ConnectionState) *TlsInfo {
	if state == nil {
		return nil
	}
	certs := make([]*Certificate, 0, len(state.PeerCertificates))
	for _, cert := range state.PeerCertificates {
		sum := sha256.Sum256(cert.Raw)
		certs = append(certs, &Certificate{
			Subject:           cert.Subject.String(),
			Issuer:            cert.Issuer.String(),
			NotBefore:         cert.NotBefore.Format(time.RFC3339),
			NotAfter:          cert.NotAfter.Format(time.RFC3339),
			DnsNames:          cert.DNSNames,
			SerialNumber:      cert.SerialNumber.String(),
			Sha256Fingerprint: strings.ToUpper(hex.EncodeToString(sum[:])),
		})
	}
	return &TlsInfo{
		Version:      tlsVersion(state.Version),
		CipherSuite:  tls.CipherSuiteName(state.CipherSuite),
		Certificates: certs,
	}
}

func tlsVersion(version uint16) string {
	switch version {
	case tls.VersionTLS10:
		return "TLS 1.0"
	case tls.VersionTLS11:
		return "TLS 1.1"
	case tls.VersionTLS12:
		return "TLS 1.2"
	case tls.VersionTLS13:
		return "TLS 1.3"
	default:
		return "unknown"
	}
}

type recordingTransport struct {
	base     http.RoundTripper
	attempts *[]*attemptRecord
}

type attemptRecord struct {
	start   time.Time
	trace   *traceData
	attempt *TimingAttempt
}

func (t *recordingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	traceData := newTraceData()
	start := time.Now()
	tracedReq := req.WithContext(httptrace.WithClientTrace(req.Context(), traceData.trace()))
	resp, err := t.base.RoundTrip(tracedReq)
	record := &attemptRecord{
		start: start,
		trace: traceData,
		attempt: &TimingAttempt{
			Url:     req.URL.String(),
			Headers: []*Header{},
		},
	}
	if resp != nil {
		record.attempt.Status = int32(resp.StatusCode)
		record.attempt.Headers = headersFromHTTP(resp.Header)
		record.attempt.Redirect = resp.StatusCode >= 300 && resp.StatusCode < 400
	}
	record.finalize(time.Now())
	*t.attempts = append(*t.attempts, record)
	return resp, err
}

func (r *attemptRecord) finalize(at time.Time) {
	r.trace.finish(at)
	r.attempt.Timing = r.trace.timing(r.start)
	r.attempt.Phases = r.trace.phases(r.start)
}

func finalizeLastAttempt(attempts []*attemptRecord, at time.Time) {
	if len(attempts) == 0 {
		return
	}
	attempts[len(attempts)-1].finalize(at)
}

func attemptsToProto(attempts []*attemptRecord) []*TimingAttempt {
	out := make([]*TimingAttempt, 0, len(attempts))
	for _, attempt := range attempts {
		out = append(out, attempt.attempt)
	}
	return out
}

func redirectsFromAttempts(attempts []*attemptRecord) []*Redirect {
	redirects := make([]*Redirect, 0)
	for _, attempt := range attempts {
		if !attempt.attempt.GetRedirect() {
			continue
		}
		redirects = append(redirects, &Redirect{
			Url:     attempt.attempt.GetUrl(),
			Status:  attempt.attempt.GetStatus(),
			Headers: attempt.attempt.GetHeaders(),
			Timing:  attempt.attempt.GetTiming(),
			Phases:  attempt.attempt.GetPhases(),
		})
	}
	return redirects
}

func aggregateTiming(attempts []*attemptRecord, start, end time.Time) *Timing {
	timing := &Timing{TotalMs: floatMs(end.Sub(start))}
	for _, attempt := range attempts {
		attemptTiming := attempt.attempt.GetTiming()
		if attemptTiming == nil {
			continue
		}
		timing.DnsMs += attemptTiming.GetDnsMs()
		timing.TcpMs += attemptTiming.GetTcpMs()
		timing.TlsMs += attemptTiming.GetTlsMs()
		timing.TtfbMs += attemptTiming.GetTtfbMs()
		timing.TransferMs += attemptTiming.GetTransferMs()
	}
	return timing
}

type traceData struct {
	dnsStart, dnsDone       time.Time
	connStart, connDone     time.Time
	tlsStart, tlsDone       time.Time
	wroteRequest            time.Time
	firstByte, finishedRead time.Time
}

func newTraceData() *traceData { return &traceData{} }

func (t *traceData) trace() *httptrace.ClientTrace {
	return &httptrace.ClientTrace{
		DNSStart:             func(httptrace.DNSStartInfo) { t.dnsStart = time.Now() },
		DNSDone:              func(httptrace.DNSDoneInfo) { t.dnsDone = time.Now() },
		ConnectStart:         func(_, _ string) { t.connStart = time.Now() },
		ConnectDone:          func(_, _ string, _ error) { t.connDone = time.Now() },
		TLSHandshakeStart:    func() { t.tlsStart = time.Now() },
		TLSHandshakeDone:     func(tls.ConnectionState, error) { t.tlsDone = time.Now() },
		WroteRequest:         func(httptrace.WroteRequestInfo) { t.wroteRequest = time.Now() },
		GotFirstResponseByte: func() { t.firstByte = time.Now() },
	}
}

func (t *traceData) finish(at time.Time) { t.finishedRead = at }

func (t *traceData) timing(start time.Time) *Timing {
	totalEnd := t.finishedRead
	if totalEnd.IsZero() {
		totalEnd = time.Now()
	}
	return &Timing{
		DnsMs:      elapsed(t.dnsStart, t.dnsDone),
		TcpMs:      elapsed(t.connStart, t.connDone),
		TlsMs:      elapsed(t.tlsStart, t.tlsDone),
		TtfbMs:     elapsed(nonZero(t.wroteRequest, start), t.firstByte),
		TransferMs: elapsed(t.firstByte, totalEnd),
		TotalMs:    floatMs(totalEnd.Sub(start)),
	}
}

func (t *traceData) phases(start time.Time) []*TimingPhase {
	totalEnd := t.finishedRead
	if totalEnd.IsZero() {
		totalEnd = time.Now()
	}
	return []*TimingPhase{
		phase("dns", start, t.dnsStart, t.dnsDone),
		phase("tcp", start, t.connStart, t.connDone),
		phase("tls", start, t.tlsStart, t.tlsDone),
		phase("ttfb", start, nonZero(t.wroteRequest, start), t.firstByte),
		phase("transfer", start, t.firstByte, totalEnd),
	}
}

func phase(name string, requestStart, phaseStart, phaseEnd time.Time) *TimingPhase {
	return &TimingPhase{
		Name:       name,
		StartMs:    offset(requestStart, phaseStart),
		DurationMs: elapsed(phaseStart, phaseEnd),
	}
}

func elapsed(start, end time.Time) float64 {
	if start.IsZero() || end.IsZero() || end.Before(start) {
		return 0
	}
	return floatMs(end.Sub(start))
}

func offset(start, at time.Time) float64 {
	if start.IsZero() || at.IsZero() || at.Before(start) {
		return 0
	}
	return floatMs(at.Sub(start))
}

func floatMs(duration time.Duration) float64 {
	return float64(duration.Microseconds()) / 1000
}

func nonZero(value, fallback time.Time) time.Time {
	if value.IsZero() {
		return fallback
	}
	return value
}
