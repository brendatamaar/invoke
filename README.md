# invoke

invoke is a privacy-first API development and testing platform: a browser UI, local-first storage, and a Go executor for accurate HTTP timing. The Alpha focuses on the core loop: open the app, send REST requests, inspect the response, save it locally, and export Git-friendly files.

No account. No cloud sync. Your collections, environments, and history live in your browser's IndexedDB.

## Alpha Scope

- REST requests: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- Headers, query params, JSON/raw bodies, Basic/Bearer/API key auth
- Go HTTP executor with DNS/TCP/TLS/TTFB/transfer/total timing
- Browser-local collections, environments, and history in IndexedDB
- `{{variable}}` resolution and dynamic variables like `{{$uuid}}`
- YAML zip export/import, Postman v2.1 import, cURL paste import
- Light/dark theme and keyboard shortcuts

## Architecture

```text
Vue UI + @invoke/core (browser)
  -> Hono proxy (Node.js)
  -> Go HTTP executor (gRPC)
  -> target API
```

The browser owns product state and local persistence. The Node server is intentionally thin: it forwards resolved requests to the Go sidecar. The Go executor performs network I/O with `net/http/httptrace` so the UI can show DNS, TCP, TLS, TTFB, transfer, and total timing.

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

## Self-Hosted Alpha

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

`pnpm e2e` starts the Go executor, Hono server, Vite UI, and a local mock target API, then runs the Alpha happy paths in Chromium.

## Alpha Status

Alpha is intentionally narrow. Deferred features include GraphQL, WebSocket, gRPC client UI, assertions, response diffing, mock server, command palette, and hosted public deployment. See `docs/alpha-mvp.md` for the exact scope and acceptance criteria.
