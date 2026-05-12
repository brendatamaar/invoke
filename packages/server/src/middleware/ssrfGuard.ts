/**
 * SSRF guard for WebSocket (and HTTP) connect endpoints.
 *
 * Disabled by default — enable for web-hosted deployments by setting
 * INVOKE_SSRF_GUARD=true in the server environment.
 *
 * This is a hostname-level check only (no async DNS pre-resolution).
 * It blocks obvious direct-IP attacks; full protection requires
 * DNS pinning in the executor dialer (future work).
 */

const PRIVATE_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,  // link-local + AWS IMDS (169.254.169.254)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/,  // CGNAT
  /^0\.\d+\.\d+\.\d+$/,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^fc[0-9a-f]{2}:/i,  // IPv6 unique-local fc00::/7
  /^fd[0-9a-f]{2}:/i,  // IPv6 unique-local fd00::/8
  /^fe80:/i,            // IPv6 link-local
];

const ALLOWED_SCHEMES = new Set(["ws:", "wss:", "http:", "https:"]);

export const SSRF_GUARD_ENABLED = process.env.INVOKE_SSRF_GUARD === "true";

/**
 * Returns an error string if the URL targets a private/internal address, null otherwise.
 */
export function checkSsrf(rawUrl: string): string | null {
  if (!SSRF_GUARD_ENABLED) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "Invalid URL";
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return `Unsupported scheme: ${parsed.protocol}`;
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (PRIVATE_PATTERNS.some((re) => re.test(hostname))) {
    return `Blocked: requests to private/internal addresses are not allowed`;
  }

  return null;
}
