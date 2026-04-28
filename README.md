# invoke

invoke is a privacy-first API development and testing platform: a browser UI, local-first storage, and a Go executor for accurate HTTP timing. Beta 1 covers the daily API workflow: send REST and GraphQL requests, inspect accurate timing, organize collections locally, import OpenAPI specs, export runnable code, and jump around with a command palette.

No account. No cloud sync. Your collections, environments, and history live in your browser's IndexedDB.

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

## Self-Hosted Beta 1

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

`pnpm e2e` starts the Go executor, Hono server, Vite UI, and a local mock target API, then runs the Beta 1 happy paths in Chromium.

## Beta 1 Status

Beta 1 is local-first and browser-owned. Deferred features include WebSocket, gRPC client UI, assertions, response diffing, mock server, GraphQL schema explorer/autocomplete, additional importers, and hosted public deployment. See `docs/beta-1-mvp.md` for the exact scope and acceptance criteria.
