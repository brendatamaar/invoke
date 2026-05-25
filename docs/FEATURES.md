# invoke — Feature Matrix

A scannable inventory of what invoke supports today. The full requirements document — including data models, scripts API, gRPC contract, and design rationale — lives in [`PRD.md`](PRD.md).

Legend: ✅ supported · 🟡 partial / planned · — not applicable

---

## Protocols

| Capability | REST / HTTP | GraphQL | WebSocket | gRPC | Streaming HTTP |
|---|:--:|:--:|:--:|:--:|:--:|
| Build & send | ✅ | ✅ | ✅ | ✅ | ✅ |
| Variable resolution (`{{...}}`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auth applied to outgoing request | ✅ | ✅ | ✅ (handshake) | ✅ (metadata) | ✅ |
| Timing waterfall (DNS/TCP/TLS/TTFB/transfer) | ✅ | ✅ | ✅ (handshake) | ✅ | ✅ |
| TLS / mTLS / custom CA | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assertions | ✅ | ✅ | ✅ (per frame) | ✅ (status, body, metadata, trailers) | ✅ |
| Extraction into session vars | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pre-/post-scripts | ✅ | ✅ | ✅ + `onMessage` | ✅ + `onStreamMessage` | ✅ |
| Code generation targets | 16 | via REST | 6 | 7 | via REST |

### REST / HTTP

- Standard methods (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) plus custom verbs (`PROPFIND`, `MKCOL`, …)
- Bodies: JSON, text, XML, form-data (per-part type/filename/content-type), `x-www-form-urlencoded`, raw, binary, file upload
- HTTP/2 with ALPN negotiation and protocol display
- Connection pooling with configurable idle / per-host limits
- Separate connect, read, and total timeouts
- Per-request retry policy with retryable status codes, network-error retry, backoff, and per-attempt timing chart
- Redirect chain visualization with per-hop response details
- Request cancellation via `AbortController`

### GraphQL

- Syntax highlighting via `@codemirror/lang-graphql`
- Schema-aware autocomplete (fields, arguments, enums, fragments, directives) with inline diagnostics
- Schema explorer (search, type navigation, breadcrumb stack, SDL view)
- Schema persistence per endpoint with refresh and diff notifications; SDL paste/file import when introspection is disabled
- Operation picker for multi-operation documents
- Variables panel with `$var` auto-detection and type hints
- Subscriptions over `graphql-ws` and `graphql-transport-ws`
- File uploads via the `graphql-multipart-request-spec`
- Batched queries (array body)
- Automatic Persisted Queries (APQ) — hash-only-first with fallback
- `@defer` / `@stream` incremental delivery via `multipart/mixed`
- Workspace fragments library
- Dedicated `errors[]` panel with message, path, locations, extensions

### WebSocket

- Text and binary frame composer with file picker
- Multiple concurrent sessions per request (tabbed)
- Auto-reconnect with configurable exponential backoff
- Saved messages and composer presets with send-on-connect queue
- Ping/pong heartbeat with live latency display
- Close frame with code + reason (send and receive)
- Handshake details panel (request/response headers, negotiated subprotocol, extensions, TLS info, RTT)
- `permessage-deflate` compression toggle
- Real-time inbound delivery via SSE (sub-100 ms)
- Protocol presets: `graphql-transport-ws`, `graphql-ws`, MQTT-over-WS, STOMP, SignalR, Socket.IO
- JSON pretty-print and hex/raw view for received frames
- Session transcript export (JSON, NDJSON, text)
- Log toolbar: search, filter, pause/resume, clear
- Cookie injection on handshake from the cookie store

### gRPC

- Server reflection (v1 with v1alpha fallback) cached per address in IndexedDB
- `.proto` upload and pre-compiled `FileDescriptorSet` import when reflection is unavailable
- Native gRPC over HTTP/2 and gRPC-Web (`application/grpc-web+proto`, `application/grpc-web-text`)
- Unary, server-stream, client-stream, and bidi calls
- Structured body editor (enum dropdowns, repeated lists, oneof radios, map key/value rows) plus a JSON editor
- Method search/filter with fuzzy matching and service grouping
- Inline schema viewer (field names, types, comments, enum values)
- Connection pooling with keepalive (30 s ping, 10 s timeout) and channel reuse
- Per-call compression toggle (none / gzip)
- Saved message templates per method
- Stream UI with sent/received columns, per-message timing, transcript export
- Health check probe via `grpc.health.v1.Health/Check`
- Response view: status code + name, status message, decoded `google.rpc.Status` details (BadRequest, RetryInfo, DebugInfo), initial metadata + trailers, message count, compression ratio

---

## Workspace

| Capability | Status | Notes |
|---|:--:|---|
| Collections with nested folders | ✅ | Browser storage |
| Environments (local / staging / production / custom) | ✅ | Variable editor with sensitive-toggle |
| Variable scopes | ✅ | environment → collection → folder → request → session → flow |
| Dynamic variables | ✅ | `$uuid`, `$timestamp`, `$randomInt`, … |
| `{{var}}` autocomplete in URL/headers/body | ✅ | |
| `.env` import / export | ✅ | |
| Searchable history | ✅ | |
| History pinning + retention policy | ✅ | Configurable; pinned entries preserved |
| Workspace JSON backup / restore | ✅ | |
| Saved response examples | ✅ | Per request |
| Cookie jar (persisted) | ✅ | |
| Per-collection proto registry | ✅ | |
| Schema cache (GraphQL per endpoint, gRPC reflection per address) | ✅ | |

---

## Auth & Transport

| Auth method | REST/GraphQL | WebSocket (handshake) | gRPC (metadata) |
|---|:--:|:--:|:--:|
| No auth | ✅ | ✅ | ✅ |
| Basic | ✅ | ✅ | ✅ |
| Bearer token | ✅ | ✅ | ✅ |
| API key (header or query) | ✅ | ✅ | ✅ |
| OAuth2 client credentials | ✅ | ✅ | ✅ |
| OAuth2 authorization code + PKCE (S256) + refresh rotation | ✅ | ✅ | ✅ |
| OAuth2 implicit / device flow / OIDC `id_token` | ✅ | ✅ | ✅ |
| Digest | ✅ | — | — |
| AWS SigV4 (with session token) | ✅ | ✅ | ✅ |
| NTLM | ✅ | — | — |

| Transport option | Status |
|---|:--:|
| mTLS client certificates | ✅ |
| Custom CA bundles | ✅ |
| TLS verification controls | ✅ |
| HTTP proxy | ✅ |
| Cookie manager + persisted jar | ✅ |
| SSRF guard (server middleware + executor dialer) | ✅ (opt-in via env) |

---

## Testing & Automation

| Capability | Status |
|---|:--:|
| Status / header / response-time / size assertions | ✅ |
| JSONPath value assertions | ✅ |
| Regex body assertions | ✅ |
| JSON Schema validation | ✅ |
| Extraction from body / headers / status / timing / cookies | ✅ |
| Pre-request and post-response scripts | ✅ |
| Browser Worker script execution path | ✅ |
| Node/test fallback for scripts | ✅ |
| Postman-style `test()` and `expect()` API | ✅ |
| Per-request retry policy + backoff | ✅ |
| Collection / folder runner with progress + JSON/CSV report | ✅ |
| Batch runner (iterations, concurrency, delay, stop-on-failure, latency stats) | ✅ |
| Flow runner (steps, delays, conditions, loops, extraction, cancellation, hooks) | ✅ |
| Visual flow editor with saved flows and live step logs | ✅ |

### WebSocket testing

- Per-frame assertions (body via JSONPath, frame type, direction) with index selectors (first / last / nth / any)
- Pre-connect and post-close scripts
- `onMessage` hook with `frame`, `session.send`, `session.close`

### gRPC testing

- Assertions on `grpc.statusCode`, `grpc.statusMessage`, `grpc.bodyJson`, `grpc.metadata[key]`, `grpc.trailers[key]`, `grpc.durationMs`
- Stream message index selectors for server-stream and bidi assertions
- Extraction from response body, metadata, and trailers
- `pm.request.metadata.add`, `pm.environment.set`, `pm.expect`
- `onStreamMessage` hook
- gRPC requests as flow steps (assert / extract / scripts)

---

## Diffing & History

| Capability | Status |
|---|:--:|
| Search and filter previous executions | ✅ |
| Restore historical request into builder | ✅ |
| Pin and label history entries | ✅ |
| Compare saved responses | ✅ |
| Structural JSON diff | ✅ |
| Diff ignore rules (timestamps, UUIDs, …) | ✅ |
| Text diff fallback for non-JSON bodies | ✅ |
| Review prior assertion results | ✅ |

---

## Mock & Webhook

| Capability | Status |
|---|:--:|
| Mock routes served under `/mock/*` | ✅ |
| Path parameters | ✅ |
| Conditions on headers / query / JSONPath body values | ✅ |
| Dynamic variables in responses | ✅ |
| Response sequences (cycle) | ✅ |
| Configurable latency | ✅ |
| Live request log | ✅ |
| Webhook capture endpoints with logs and validation | ✅ |
| Proxy recording → mock route data | ✅ |
| gRPC mock (FileDescriptorSet + canned responses by full method) | ✅ |
| gRPC connection record / replay | ✅ |

Mock state is in-memory on the server; the browser owns the configuration and re-syncs on reload.

---

## Import & Export

| Format | Direction | Notes |
|---|:--:|---|
| Postman Collection v2.1 | Import | Includes gRPC requests from Postman ≥ v10 |
| OpenAPI 3.0 / 3.1 | Import | Tags → folders, operations → requests, security schemes → auth, servers → environments |
| OpenAPI 3.0.3 YAML | Export | Generated from REST collections (best-effort) |
| Insomnia v4 | Import | Includes gRPC workspace items |
| Hoppscotch | Import | |
| HAR | Import | Browser DevTools / proxy export |
| cURL | Import | Paste single or batched commands |
| `grpcurl` | Import | Paste a `grpcurl` command |
| `grpcurl` / `buf curl` command | Export | Per gRPC request |
| invoke ZIP/YAML | Import | Native format (file-per-request, Git-friendly) |
| Workspace JSON | Import / Export | Full backup/restore |
| `.env` file | Import / Export | Environment variables |

---

## Code Generation

### REST / HTTP (16)

cURL · JavaScript `fetch` · Node `fetch` · Node `axios` · Python `requests` · Python `httpx` · Go `net/http` · Java OkHttp · Kotlin OkHttp · Ruby `Net::HTTP` · PHP Guzzle · C# `HttpClient` · Rust `reqwest` · PowerShell · HTTPie · Axios (browser)

### WebSocket (6)

`wscat` · `websocat` · JavaScript `WebSocket` · Node `ws` · Python `websockets` · Go `nhooyr.io/websocket`

### gRPC (7)

`grpcurl` · Go `google.golang.org/grpc` · Node `@grpc/grpc-js` · Python `grpcio` · Java `io.grpc` · C# `Grpc.Net.Client` · Kotlin `grpc-kotlin-stub`

Generators accept options for comments, error handling, indentation, and whether to inline resolved variables or keep `{{placeholders}}`.

---

## Storage & Data Model

| Where it lives | What lives there |
|---|---|
| Browser (IndexedDB) | Collections, environments, history, cookies, response examples, history retention settings, diff ignore rules, saved flows, GraphQL schema cache (per endpoint), gRPC reflection cache (per address), proto registries (per collection), mock configuration |
| Server memory | Mock runtime state, webhook capture logs |
| Executor | None — stateless network execution |

invoke does not require a database for local or self-hosted use. Persisted browser data is treated as product state: changes go through migrations rather than assuming a clean profile, and import/export formats stay stable across versions.

---

## Deployment

| Mode | Status | Open at |
|---|:--:|---|
| `pnpm dev:all` (executor + server + UI) | ✅ | http://localhost:3000 |
| `pnpm dev` (server + UI only) | ✅ | http://localhost:3000 |
| `docker compose up --build` (UI + server + executor) | ✅ | http://localhost:8080 |
| `docker-compose.dev.yml` (bind-mounted dev stack) | ✅ | http://localhost:3000 |

See the root [`README.md`](../README.md) for setup details and configuration environment variables.
