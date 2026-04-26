package executor

import (
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptrace"
	"net/url"
	"runtime"
	"strings"
	"time"

	"github.com/brendatama/invoke/executor/internal/executorpb"
	"golang.org/x/net/proxy"
)

type Service struct {
	executorpb.UnimplementedHttpExecutorServer
	startedAt time.Time
}

func NewService() *Service {
	return &Service{startedAt: time.Now()}
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

	traceData := newTraceData()
	httpReq, err := http.NewRequestWithContext(ctx, method, req.GetUrl(), bytes.NewReader(req.GetBody()))
	if err != nil {
		return &HttpResponse{Error: err.Error()}, nil
	}
	for _, header := range req.GetHeaders() {
		if strings.TrimSpace(header.GetKey()) != "" {
			httpReq.Header.Add(header.GetKey(), header.GetValue())
		}
	}
	httpReq = httpReq.WithContext(httptrace.WithClientTrace(httpReq.Context(), traceData.trace()))

	transport, err := transportFor(req)
	if err != nil {
		return &HttpResponse{Error: err.Error()}, nil
	}
	client := &http.Client{Transport: transport}
	redirects := make([]*Redirect, 0)
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
			if len(via) > 0 {
				prior := via[len(via)-1]
				if prior.Response != nil {
					redirects = append(redirects, &Redirect{
						Url:     prior.URL.String(),
						Status:  int32(prior.Response.StatusCode),
						Headers: headersFromHTTP(prior.Response.Header),
					})
				}
			}
			if len(via) >= maxRedirects {
				return errors.New("stopped after maximum redirects")
			}
			return nil
		}
	}

	start := time.Now()
	resp, err := client.Do(httpReq)
	if err != nil {
		traceData.finish(time.Now())
		return &HttpResponse{Error: err.Error(), Timing: traceData.timing(start)}, nil
	}
	defer resp.Body.Close()

	bodyStarted := time.Now()
	body, readErr := io.ReadAll(resp.Body)
	traceData.finish(time.Now())
	if readErr != nil {
		return &HttpResponse{Error: readErr.Error(), Timing: traceData.timing(start)}, nil
	}

	timing := traceData.timing(start)
	if timing.TransferMs == 0 {
		timing.TransferMs = floatMs(time.Since(bodyStarted))
	}
	out := &HttpResponse{
		Status:       int32(resp.StatusCode),
		StatusText:   resp.Status,
		Headers:      headersFromHTTP(resp.Header),
		Body:         body,
		Timing:       timing,
		Tls:          tlsInfo(resp.TLS),
		Redirects:    redirects,
		RequestSize:  int64(len(req.GetBody())),
		ResponseSize: int64(len(body)),
	}
	return out, nil
}

func transportFor(req *HttpRequest) (*http.Transport, error) {
	verify := req.GetVerifySsl()
	transport := &http.Transport{
		DisableKeepAlives: true,
		TLSClientConfig:   &tls.Config{InsecureSkipVerify: !verify}, //nolint:gosec
	}
	if req.GetProxy() != nil && strings.TrimSpace(req.GetProxy().GetUrl()) != "" {
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

func headersFromHTTP(values http.Header) []*Header {
	headers := make([]*Header, 0, len(values))
	for key, all := range values {
		headers = append(headers, &Header{Key: key, Value: strings.Join(all, ", ")})
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

func elapsed(start, end time.Time) float64 {
	if start.IsZero() || end.IsZero() || end.Before(start) {
		return 0
	}
	return floatMs(end.Sub(start))
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
