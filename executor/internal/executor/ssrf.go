package executor

import (
	"context"
	"fmt"
	"net"
	"os"
)

var privateRanges []*net.IPNet

func init() {
	for _, cidr := range []string{
		"127.0.0.0/8",
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"169.254.0.0/16",
		"100.64.0.0/10",
		"::1/128",
		"fc00::/7",
		"fe80::/10",
		"::ffff:0:0/96",
	} {
		_, ipNet, _ := net.ParseCIDR(cidr)
		if ipNet != nil {
			privateRanges = append(privateRanges, ipNet)
		}
	}
}

func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		return true
	}
	for _, ipNet := range privateRanges {
		if ipNet.Contains(ip) {
			return true
		}
	}
	return false
}

// ssrfDialContext returns a DialContext that blocks connections to private/local
// addresses. Disabled when ALLOW_PRIVATE_ADDRESSES=true.
func ssrfDialContext(base *net.Dialer) func(ctx context.Context, network, addr string) (net.Conn, error) {
	if os.Getenv("ALLOW_PRIVATE_ADDRESSES") == "true" {
		return base.DialContext
	}
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, err
		}
		ips, err := net.DefaultResolver.LookupHost(ctx, host)
		if err != nil {
			return nil, err
		}
		for _, ipStr := range ips {
			ip := net.ParseIP(ipStr)
			if ip == nil || isPrivateIP(ip) {
				return nil, fmt.Errorf("SSRF: blocked request to private/reserved address %s (%s); set ALLOW_PRIVATE_ADDRESSES=true to permit", ipStr, host)
			}
		}
		if len(ips) == 0 {
			return nil, fmt.Errorf("SSRF: no addresses resolved for %s", host)
		}
		return base.DialContext(ctx, network, net.JoinHostPort(ips[0], port))
	}
}
