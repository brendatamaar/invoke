# invoke - v1 Local Implementation

**Purpose:** Records the implemented v1-local pass after Beta 2.

**Source docs checked:**
- `prd.md`
- `mvp-features.md`
- `execution-detail.md`
- `alpha-mvp.md`
- `beta-1-mvp.md`
- `beta-2-mvp.md`

## Implemented In This Pass

- Full local code export matrix: cURL, JavaScript fetch, Node fetch, Node axios, Python requests, Python httpx, Go net/http, Java OkHttp, Kotlin OkHttp, Ruby Net::HTTP, PHP Guzzle, C# HttpClient, Rust reqwest, PowerShell, and HTTPie.
- Pre-request and post-response scripts in core, with browser Worker execution, Node/test fallback, a Postman-style `test()` helper, and extended `expect()` matchers.
- Flow runner core with request steps, delay steps, condition branches, fixed-count and conditional loops, extraction into flow variables, progress hooks, cancellation, and IndexedDB flow persistence.
- Browser flow editor in Settings with saved flows, request/delay steps, reordering, execution, and live step logs.
- In-memory Node mock server at `/mock/*`, managed from browser state, with path params, header/query/bodyJsonPath conditions, dynamic variables, latency, and request logs.
- Go-backed WebSocket relay with custom upgrade headers, auth headers, TLS verification settings, mTLS material, subprotocols, connect/disconnect, text/JSON message composer, polling, and chronological log.
- gRPC reflection and unary execution through the Go executor, with metadata, TLS/plaintext mode, mTLS material, dynamic protobuf JSON request/response handling, and method discovery.
- mTLS and custom CA PEM support for HTTP, WebSocket, and gRPC requests.
- Advanced local auth coverage for OAuth2 client credentials, Digest, and core-backed AWS SigV4 signing, alongside Basic, Bearer, and API key auth.

## Explicitly Not Claimed Complete

- Public hosted `invoke.dev` is still pending a threat model, SSRF protection, rate limits, abuse monitoring, and deployment hardening.
- NTLM and full OAuth2 authorization-code/password/implicit browser flows are not faked; they need dedicated handshake/callback handling.
- gRPC streaming methods are discoverable, but the current execution UI handles unary calls.
- The flow editor is a practical visual list editor, not the full drag-and-drop canvas polish described in the long-form PRD.

## Verification

- `pnpm --filter @invoke/core test`
- `pnpm test`
- `pnpm build`
- `go test ./...` from `executor/`
