# invoke

invoke is a privacy-first API development and testing platform: a browser UI, local-first storage, and a Go executor for accurate HTTP timing. The v1 local implementation adds scripts, flows, WebSocket testing, gRPC unary calls, mock server routes, mTLS, advanced auth, and the full code export matrix on top of the Beta 2 validation and migration features.

No account. No cloud sync. Your collections, environments, and history live in your browser's IndexedDB.

## V1 Local Scope

Everything from Beta 2, plus:

- **Scripts** - pre-request and post-response JavaScript with a browser Worker sandbox path, `test()`, and `expect()` helpers
- **Flow runner/editor** - sequential request flows with extraction, conditions, fixed-count and conditional loops, delays, hooks, cancellation, IndexedDB persistence, and a Settings-based visual editor
- **WebSocket relay** - Go-backed connect/disconnect, custom upgrade headers, TLS/mTLS settings, subprotocols, message composer, and chronological message log
- **gRPC** - reflection-backed method discovery and unary JSON/protobuf execution with metadata and TLS/mTLS settings
- **Advanced auth** - OAuth2 client credentials, Digest, AWS SigV4, Basic, Bearer, and API key auth
- **mTLS/custom CA** - PEM client certificate, key, CA bundle, SNI override, and TLS verification controls for local protocols
- **Mock server** - browser-managed in-memory routes served by the Node proxy at `/mock/*`, with path params, header/query/bodyJsonPath conditions, dynamic variables, latency, and request logs
- **Code export** - cURL, fetch, Node fetch, axios, Python requests/httpx, Go, Java, Kotlin, Ruby, PHP, C#, Rust, PowerShell, and HTTPie

## Beta 2 Scope

Everything from Beta 1, plus:

- **Assertions** — define pass/fail rules on status code, headers, and JSON body fields; results shown inline after each request
- **Response diff** — structural diff between any two saved responses, highlighted side-by-side
- **SSE streaming** — real-time token-by-token display for Server-Sent Events responses
- **GraphQL schema autocomplete** — introspects the endpoint on demand and wires CodeMirror completion for fields, args, and types
- **Insomnia v4 import** — import collections and environments from Insomnia export JSON
- **Hoppscotch import** — import collections from Hoppscotch JSON export

## Beta 1 Scope

- REST requests: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- GraphQL requests with query, variables, shared headers, and save/load support
- Headers, query params, JSON/raw bodies, Basic/Bearer/API key auth
- Go HTTP executor with DNS/TCP/TLS/TTFB/transfer/total timing plus a waterfall view
- Browser-local collections, nested folders, environments, and searchable history in IndexedDB
- `{{variable}}` resolution across environment, collection, folder, request, and session scopes
- YAML zip export/import, Postman v2.1 import, OpenAPI 3.x import, cURL paste import
- Code export for cURL, JavaScript `fetch`, Python `requests`, and Node `axios`
- Light/dark theme, keyboard shortcuts, shortcut help, and command palette

## Screenshots

![GraphQL editor](docs/assets/beta-1/graphql-editor.png)

![Timing waterfall](docs/assets/beta-1/timing-waterfall.png)

![Command palette](docs/assets/beta-1/command-palette.png)

![OpenAPI import preview](docs/assets/beta-1/openapi-import.png)

## Architecture

```text
Vue UI + @invoke/core (browser)
  -> Hono proxy (Node.js)
  -> Go HTTP executor (gRPC)
  -> target API
```

The browser owns product state and local persistence. The Node server is intentionally thin: it forwards resolved requests to the Go sidecar and proxies SSE streams to the UI. The Go executor performs network I/O with `net/http/httptrace` so the UI can show DNS, TCP, TLS, TTFB, transfer, and total timing.

## Development

Requirements:

- Node.js 20+
- pnpm 9+
- Go 1.23+
- Buf CLI, only when regenerating protobuf code

PowerShell may block `pnpm.ps1`; use `pnpm.cmd` if that happens.

```bash
pnpm install
```

Start three terminals:

```bash
pnpm executor:dev
pnpm dev:server
pnpm dev:ui
```

Open `http://localhost:3000`.

## Protobuf

The executor service is defined in `proto/executor.proto`. Generated Go code is checked in under `executor/internal/executorpb`.

```bash
pnpm proto:generate
```

## Self-Hosted

```bash
docker compose up --build
```

Open `http://localhost:8080`.

## Verification

```bash
pnpm lint
pnpm build
pnpm test
pnpm e2e
go test ./executor/...
```

`pnpm e2e` starts the Go executor, Hono server, Vite UI, and a local mock target API, then runs the happy paths in Chromium.

## Status

**Current release: `1.0.0-local`**

Remaining before public hosted 1.0: hosted `invoke.dev` threat model, rate limits, SSRF controls, abuse monitoring, and deployment hardening. Not faked locally: NTLM, full OAuth2 browser callback flows, gRPC streaming execution, and drag-and-drop flow canvas polish.
