# invoke — MVP Execution Detail

**Purpose:** Step-by-step implementation guide for building the invoke MVP.
**Scope:** MVP phase only — anonymous public users, IndexedDB storage, no accounts, no database.
**Granularity:** Each task is approximately 1–2 hours of work.

---

## MVP Feature Summary

The MVP delivers a fully functional, browser-based API testing tool with zero account requirement. All data is stored in the user's browser via IndexedDB.

### What's Included in MVP

- **Protocols:** REST, GraphQL, WebSocket, gRPC
- **Core engine:** Collection management, environment/variable system, flow runner (request chaining), assertion engine, response diffing, mock server, code generation (14 targets), history with full-text search, scripting (pre-request/post-response)
- **Import/Export:** Postman, OpenAPI, cURL, Insomnia, Hoppscotch import. YAML, JSON, Postman, OpenAPI, cURL export.
- **Web UI:** Request builder, response viewer (JSON tree, timing waterfall, TLS info, cookies, assertions), collection sidebar with drag-and-drop, environment switcher, GraphQL client with schema explorer, WebSocket client, gRPC client, visual flow builder, response diff viewer, mock server manager, history browser, code export, command palette (Ctrl+K), keyboard shortcuts, dark/light theme
- **Deployment:** Public hosted (invoke.dev), self-hosted Docker Compose (no database), single all-in-one Docker container
- **Storage:** Browser IndexedDB via Dexie.js (no server-side database)

### What's NOT in MVP

- User accounts, authentication, OAuth login (v2)
- PostgreSQL storage (v2)
- Team workspaces, roles, permissions (v3)
- CLI tool (v4)
- Real-time collaboration (v5)

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vue 3 (Composition API) | UI framework |
| | Vite 5 | Build tool and dev server |
| | Pinia | State management |
| | PrimeVue | UI component library |
| | Tailwind CSS 3 | Utility-first CSS |
| | CodeMirror 6 | Code editor (JSON, GraphQL, XML, JavaScript) |
| | Dexie.js | IndexedDB wrapper |
| | Vue Router | Client-side routing |
| | D3.js | Timing waterfall visualization |
| | @vueuse/core | Keyboard shortcuts (useMagicKeys) |
| **Server** | Node.js 20 LTS | Runtime |
| | Hono | HTTP framework (thin proxy + mock host in MVP) |
| | ws | WebSocket server |
| | @grpc/grpc-js + @grpc/proto-loader | gRPC client to Go executor |
| | Zod | Request validation |
| | Pino | Logging |
| **Core Engine** | TypeScript 5 | Isomorphic library (browser + Node.js) |
| | tsup | Library build tool (two entry points: browser-safe + server-only) |
| | jsonpath-plus | JSONPath evaluation |
| | js-yaml | YAML parsing |
| | Ajv 8 | JSON Schema validation |
| | microdiff | Structural JSON diffing |
| | Web Worker (browser) | Script sandboxing for MVP |
| | isolated-vm (server) | Script sandboxing for v2+ |
| **Go Executor** | Go 1.22+ | Language |
| | google.golang.org/grpc | gRPC server |
| | google.golang.org/protobuf | Protocol Buffers |
| | net/http + net/http/httptrace | HTTP execution with timing |
| | nhooyr.io/websocket | WebSocket client |
| | zerolog | Logging |
| **Infrastructure** | Docker + Docker Compose | Containerization |
| | GitHub Actions | CI/CD |
| | Nginx | Reverse proxy (production) |
| | Cloudflare | CDN + SSL (public hosted) |
| **Testing** | Vitest | Unit + integration tests (core + server) |
| | Supertest | Server API route testing |
| | @playwright/test | E2E tests (canvas, drag-and-drop, visual) |
| | Go testing | Go executor tests |
| **Monorepo** | pnpm workspaces | Package management |

---

## Stage 1 — Project Setup & Scaffold

> **Goal:** Establish the monorepo structure, configure all build tools, verify that all four layers (UI + core, server proxy, Go executor) can communicate end-to-end.
>
> **Deliverable:** All packages build successfully. A ping from the Vue UI travels through the Node.js proxy to the Go executor and back. `@invoke/core` is importable from both the Vue UI (browser) and the server (Node.js).

### Part 1 — Monorepo & Package Initialization

| # | Task | Description | Output |
|---|------|-------------|--------|
| 1.1 | Initialize pnpm monorepo | Create root `package.json`, `pnpm-workspace.yaml` with `packages/*` glob. Add root scripts for dev, build, test, lint. | `pnpm-workspace.yaml`, root `package.json` |
| 1.2 | Setup `packages/core` | Initialize TypeScript library package. Add `tsconfig.json` with strict mode. Configure `tsup.config.ts` with two entry points: `src/index.ts` (browser-safe) and `src/server.ts` (Node.js-only). Add Vitest config. Ensure browser entry point has zero Node.js imports. | `packages/core/` with dual builds working |
| 1.3 | Setup `packages/server` | Initialize Hono server package. Add TypeScript config, dev script with `tsx --watch`. Add dependency on `@invoke/core/server`. Add Vitest + Supertest config. | `packages/server/` with `GET /health` endpoint returning 200 |
| 1.4 | Setup `packages/ui` | Scaffold Vue 3 project with `create-vite`. Add Tailwind CSS, PrimeVue, Vue Router, Pinia. Add dependency on `@invoke/core` (browser entry point). Configure Vite proxy to forward `/api` to server. Verify that `@invoke/core` imports work in browser build without Node.js polyfills. | `packages/ui/` with Vue app rendering and core importable |
| 1.5 | Setup `executor/` | Initialize Go module (`go mod init github.com/brendatama/invoke/executor`). Add gRPC and protobuf dependencies. Create `cmd/executor/main.go` skeleton. | `executor/` with `go build` succeeding |
| 1.6 | Setup `proto/` | Write `executor.proto` with the full service definition from PRD. Add codegen scripts: `protoc` for Go, `grpc-tools` for TypeScript. Add generated code to `.gitignore`. | `proto/executor.proto`, generated Go and TS files |
| 1.7 | Setup dev tooling | Add ESLint (flat config), Prettier, lint-staged, husky pre-commit hook. Add `.editorconfig`. Configure path aliases in all `tsconfig.json` files. | Lint and format working on pre-commit |
| 1.8 | Setup `docker-compose.dev.yml` | Create development Docker Compose with hot-reload: Vue (Vite dev server), Node.js (tsx --watch), Go (air or go run). Mount source volumes. | All 3 services start with `docker compose -f docker-compose.dev.yml up` |
| 1.9 | Verify end-to-end ping | Implement `Ping` RPC in Go executor. Implement proxy route `GET /api/ping` in server that calls Go via gRPC. Call from Vue UI on mount. Verify response shows Go version. Also verify that `@invoke/core` can be imported in the Vue app (call a simple core function in browser). | Full stack communication verified + core running in browser |

---

## Stage 2 — Go HTTP Executor

> **Goal:** Build the Go sidecar that handles all HTTP execution with precise timing, TLS inspection, and protocol support. This is the foundation — everything else depends on it.
>
> **Deliverable:** A running Go gRPC server that can execute any REST request and return precise timing data (DNS/TCP/TLS/TTFB), inspect TLS certificates, track redirects, handle streaming, batch execution, WebSocket connections, and gRPC reflection + unary calls.

### Part 2 — HTTP Execution Core

| # | Task | Description | Output |
|---|------|-------------|--------|
| 2.1 | gRPC server bootstrap | Implement gRPC server in `cmd/executor/main.go`. Register `HttpExecutor` service. Add graceful shutdown on SIGTERM. Implement `Ping` RPC with version and uptime. | gRPC server starts on port 50051 |
| 2.2 | Basic HTTP execution | Implement `Execute` RPC. Accept `HttpRequest`, execute with `net/http`, return `HttpResponse` with status, headers, body. Handle all HTTP methods. | Can execute GET/POST requests and return results |
| 2.3 | Timing instrumentation | Add `httptrace.ClientTrace` hooks: `DNSStart`/`DNSDone`, `ConnectStart`/`ConnectDone`, `TLSHandshakeStart`/`TLSHandshakeDone`, `GotFirstResponseByte`. Calculate and populate `Timing` message. | Timing data accurate to sub-millisecond |
| 2.4 | Response capture | Capture response body (read into bytes), calculate request and response sizes. Handle gzip/deflate decompression. Set size fields in `HttpResponse`. | Full response data including sizes |
| 2.5 | TLS certificate inspection | On HTTPS requests, capture `tls.ConnectionState`. Extract certificate chain: subject, issuer, validity dates, SANs, serial number, fingerprint, cipher suite, protocol version. Populate `TLSInfo`. | TLS details available for every HTTPS request |
| 2.6 | Redirect tracking | Set `CheckRedirect` on client to capture each hop. Record redirect URL, status code, headers, and timing per hop. Populate `redirects` field. Respect `follow_redirects` and `max_redirects` options. | Redirect chain with per-hop data |
| 2.7 | Request options | Implement `timeout_ms` (context deadline), `verify_ssl` (skip TLS verification), request cancellation via context. | Configurable timeout and SSL verification |
| 2.8 | Proxy support | Implement HTTP proxy (`http.ProxyURL`), SOCKS5 proxy (`golang.org/x/net/proxy`). Read proxy config from `RequestOptions`. Support proxy authentication. | Requests route through configured proxy |
| 2.9 | Client certificates | Implement client certificate loading from PEM bytes. Implement custom CA bundle. Create `tls.Config` per request from `TLSClientConfig`. | mTLS requests working |
| 2.10 | Response streaming | Implement `ExecuteStream` RPC. Read response body in chunks, send `ResponseChunk` messages via gRPC stream. Send `final_response` with timing at end. Handle SSE (`text/event-stream`). | Large responses and SSE streams delivered incrementally |
| 2.11 | Batch execution | Implement `ExecuteBatch` RPC. Execute request N times with configurable concurrency (goroutine pool). Stream individual `HttpResponse` results. Calculate and send `BatchSummary` with p50/p95/p99/mean/stddev/min/max. | Concurrent execution with statistical summary |
| 2.12 | Go unit tests | Write tests for: timing accuracy, redirect tracking, TLS inspection, proxy routing, batch statistics calculation. Use httptest for mock target server. | Test suite passing with >80% coverage |

### Part 3 — WebSocket & gRPC Protocol Support (Go)

| # | Task | Description | Output |
|---|------|-------------|--------|
| 3.1 | WebSocket connection handler | Implement WebSocket connection using `gorilla/websocket`. Handle upgrade, text/binary frame send/receive, ping/pong, clean close with status codes. | WebSocket connections working |
| 3.2 | Connection registry | Implement `map[string]*Connection` registry with mutex. Assign UUID per connection. Background goroutine checks idle connections every 30s, closes connections idle for 30min (configurable TTL). | Connection lifecycle managed with cleanup |
| 3.3 | WebSocket RPCs | Implement `WebSocketConnect` (returns stream of `WebSocketMessage`), `WebSocketSend`, `WebSocketClose` RPCs. Map connection IDs between Node.js server and Go registry. | Full WebSocket lifecycle via gRPC |
| 3.4 | gRPC reflection client | Implement gRPC server reflection client. Discover services, methods, input/output types. Generate JSON schema from proto descriptors for message editor hints. | Can discover services on any gRPC server with reflection enabled |
| 3.5 | gRPC request execution | Implement `GrpcExecute` RPC. Connect to target gRPC server. Execute unary call with JSON-encoded message. Capture response message, metadata, trailing metadata, status, and duration. | Unary gRPC calls working |
| 3.6 | gRPC RPCs | Implement `GrpcReflect` and `GrpcExecute` RPCs with TLS support (plaintext and TLS modes). Handle deadline/timeout. | Full gRPC testing capability |
| 3.7 | Go tests for protocols | Write tests for WebSocket connection lifecycle, registry cleanup, gRPC reflection parsing. Use test servers. | Protocol tests passing |

---

## Stage 3 — Core Engine

> **Goal:** Build all business logic as a standalone TypeScript library. The core engine is **isomorphic** — it runs in both the browser (MVP) and Node.js (v2+). No framework dependencies, no DOM — pure logic. Browser-safe entry point must not import any Node.js APIs.
>
> **Deliverable:** A fully tested `@invoke/core` library that handles collections, environments, variables, flows, assertions, diffing, code generation, import/export, history, mock configuration, and scripting. All features pass unit tests. The library builds successfully for both browser and Node.js targets.

### Part 4 — Types & Storage Layer

| # | Task | Description | Output |
|---|------|-------------|--------|
| 4.1 | Shared type definitions | Define all TypeScript interfaces in `core/src/types/`: `RequestConfig`, `ResponseResult`, `Collection`, `Folder`, `SavedRequest`, `Environment`, `Flow`, `Assertion`, `AuthConfig`, `TimingData`, `TLSInfo`, etc. Export from `core/src/index.ts`. | All types defined and exported |
| 4.2 | StorageAdapter interface | Define `StorageAdapter` interface with sub-stores: `CollectionStore`, `EnvironmentStore`, `HistoryStore`, `FlowStore`, `WorkspaceStore`. Define all CRUD method signatures. | Interface contract defined |
| 4.3 | ScriptSandbox adapter interface | Define `ScriptSandbox` interface with `execute(code, context, timeout)` and `dispose()` methods. This enables swapping between Web Worker (browser) and isolated-vm (server). | Sandbox interface defined |
| 4.4 | IndexedDB adapter — collections | Implement `IndexedDBCollectionStore` with Dexie.js. Define database schema, version, and indexes. Implement create, getById, getAll, update, delete, duplicate. | Collection CRUD working in browser |
| 4.5 | IndexedDB adapter — environments | Implement `IndexedDBEnvironmentStore`. CRUD + active environment tracking. | Environment CRUD working |
| 4.6 | IndexedDB adapter — history | Implement `IndexedDBHistoryStore`. Save entries, query with filters (date, method, status, protocol), delete by range. | History storage working |
| 4.7 | IndexedDB adapter — flows | Implement `IndexedDBFlowStore`. CRUD for flow definitions. | Flow storage working |
| 4.8 | IndexedDB adapter — workspaces | Implement `IndexedDBWorkspaceStore`. Single default workspace for MVP. | Workspace storage working |
| 4.9 | File/YAML storage adapter | Implement YAML exporter: collection → file-per-request directory structure. Implement YAML importer: read directory → collection. Use `js-yaml` for serialization. Add `invoke_version: "1.0"` header. | Export/import to/from YAML files |
| 4.10 | Storage unit tests | Write Vitest tests for all storage adapters and sandbox interface. Use fake-indexeddb for IndexedDB tests. Test CRUD operations, search, edge cases. | All storage tests passing |

### Part 5 — gRPC Client & Variable System

> **Note:** The gRPC client (`ExecutorClient`) is a **server-only** module. It lives in `@invoke/core/server` and is NOT imported in the browser build. In MVP, the Vue UI calls the Node.js proxy via REST, which uses the gRPC client internally.

| # | Task | Description | Output |
|---|------|-------------|--------|
| 5.1 | gRPC client wrapper | Implement `ExecutorClient` class in `core/src/server/executor-client.ts` (server-only entry point). Wraps `@grpc/grpc-js` client. Methods: `execute()`, `executeStream()`, `executeBatch()`, `inspectTLS()`, `webSocketConnect()`, `webSocketSend()`, `webSocketClose()`, `grpcReflect()`, `grpcExecute()`, `ping()`. Handle connection retry with exponential backoff. | Server can call Go executor |
| 5.2 | Template parser | Implement `{{variable}}` detection and replacement in strings. Handle nested variables (`{{base_url}}/{{version}}`). Return list of variable names found. Handle edge cases (escaped braces, incomplete syntax). | `resolve("{{host}}/api", {host: "localhost"})` → `"localhost/api"` |
| 5.3 | Variable scope hierarchy | Implement `VariableScope` type and scope chain resolution: global → environment → collection → folder → request → flow → dynamic. Later scopes override earlier. | Variables resolve in correct priority order |
| 5.4 | Dynamic variables | Implement built-in variables: `$uuid`, `$timestamp`, `$timestampMs`, `$isoTimestamp`, `$randomInt`, `$randomFloat`, `$randomUUID`, `$randomEmail`, `$randomString`, `$randomBoolean`. | `resolve("{{$uuid}}")` → UUID string |
| 5.5 | Variable extraction | Implement `extractVariables()` — extract values from `ResponseResult` using `ExtractionRule`. Support sources: body (JSONPath via `jsonpath-plus`), header (header name), status, timing, cookie. Support fallback values. | Can extract `$.data.token` from response body |
| 5.6 | resolveRequest | Implement `resolveRequest()` — takes a `RequestConfig` and `VariableScope[]`, returns a new `RequestConfig` with all `{{variables}}` resolved in URL, headers, params, body, auth fields. | Full request resolution in one call |
| 5.7 | Resolution preview | Implement `previewResolution()` — returns raw vs resolved for URL, headers, body, plus list of unresolved variables. Used by UI to show variable chips. | UI can display variable resolution state |
| 5.8 | Variable resolver tests | Write Vitest tests: scope override order, dynamic variables, JSONPath extraction, nested resolution, unresolved tracking, edge cases. | All variable tests passing |

### Part 6 — Collection Manager

| # | Task | Description | Output |
|---|------|-------------|--------|
| 6.1 | Collection CRUD | Implement `CollectionManager` class. Methods: `create()`, `getById()`, `getAll()`, `update()`, `delete()`, `duplicate()`. Uses `StorageAdapter` interface. Generate UUID v7 (time-ordered) for IDs. Set timestamps. | Collection operations working |
| 6.2 | Folder CRUD | Implement folder operations: `createFolder()`, `moveFolder()`, `deleteFolder()` (cascade delete contents). Handle nested folder hierarchy. | Folder operations within collections |
| 6.3 | Request CRUD | Implement request operations: `createRequest()`, `moveRequest()`, `duplicateRequest()`, `deleteRequest()`. Handle parent folder/collection reference. | Request operations within folders |
| 6.4 | Reordering | Implement `reorder()` — update `sortOrder` field for collections, folders, and requests. Support drag-and-drop reordering within and across containers. | Items maintain custom sort order |
| 6.5 | Full-text search | Implement `search()` — search across request names, URLs, bodies, headers, descriptions. Return `SearchResult[]` with match context snippet and breadcrumb path. For IndexedDB, implement client-side search with string matching. | Search finds requests by body content |
| 6.6 | Collection manager tests | Write tests for CRUD, nested folder operations, reorder, search, cascade delete. | All collection tests passing |

### Part 7 — Environment Manager

| # | Task | Description | Output |
|---|------|-------------|--------|
| 7.1 | Environment CRUD | Implement `EnvironmentManager`. Methods: `create()`, `getById()`, `getAll()`, `update()`, `delete()`, `duplicate()`. Handle `initialValue` vs `currentValue` per variable. | Environment operations working |
| 7.2 | Active environment | Implement `setActive()` and `getActive()`. Track active environment ID per workspace. | Can switch active environment |
| 7.3 | .env import | Implement `importFromEnvFile()` — parse `KEY=VALUE` format, handle comments (`#`), quotes, multiline values, empty lines. Create environment from parsed data. | Import `.env` files into environments |
| 7.4 | .env export | Implement `exportToEnvFile()` — serialize environment variables to `KEY=VALUE` format. Option to include descriptions as comments. | Export environments as `.env` files |
| 7.5 | Environment tests | Write tests for CRUD, active switching, `.env` parsing (edge cases: quoted values, spaces, empty values, comments). | All environment tests passing |

### Part 8 — Auth Module

| # | Task | Description | Output |
|---|------|-------------|--------|
| 8.1 | Auth resolver interface | Define `resolveAuth()` function that takes `AuthConfig` and returns headers/params to add to request. Implement dispatcher based on `auth.type`. | Auth resolution entry point |
| 8.2 | Bearer token | Implement Bearer auth — add `Authorization: Bearer <token>` header. | Bearer auth working |
| 8.3 | Basic auth | Implement Basic auth — base64 encode `username:password`, add `Authorization: Basic <encoded>` header. | Basic auth working |
| 8.4 | API Key | Implement API Key auth — add key-value to header or query parameter based on `addTo` config. | API Key auth working |
| 8.5 | OAuth2 client credentials | Implement client credentials flow — POST to token URL with client_id/secret, parse token response, cache token with expiry. | Client credentials flow working |
| 8.6 | OAuth2 authorization code | Implement authorization code flow — generate auth URL, handle callback, exchange code for token, cache token. | Auth code flow working |
| 8.7 | OAuth2 password grant | Implement password grant — POST with username/password/client_id, parse token response. | Password grant working |
| 8.8 | Digest auth | Implement Digest authentication — parse WWW-Authenticate challenge, compute response hash (MD5/SHA-256), send Authorization header. | Digest auth working |
| 8.9 | AWS Signature V4 | Implement AWS Sig V4 — canonical request, string to sign, signing key derivation, Authorization header construction. | AWS Sig V4 auth working |
| 8.10 | Auth inheritance | Implement inheritance chain: if request auth is `type: 'inherit'`, look up parent folder auth, then collection auth. | Auth cascades correctly |
| 8.11 | Auth module tests | Write tests for each auth type. Mock token endpoints for OAuth2. Test inheritance chain. | All auth tests passing |

### Part 9 — Assertion Engine

| # | Task | Description | Output |
|---|------|-------------|--------|
| 9.1 | Basic matchers | Implement: `equals`, `not-equals`, `contains`, `not-contains`, `starts-with`, `ends-with`, `matches-regex`. | String/value matchers working |
| 9.2 | Existence matchers | Implement: `exists`, `not-exists`, `is-type` (string/number/boolean/array/object/null), `is-empty`, `is-not-empty`. | Type and existence checks working |
| 9.3 | Comparison matchers | Implement: `greater-than`, `less-than`, `greater-than-or-equal`, `less-than-or-equal`, `has-length`, `contains-key`. | Numeric and structural matchers working |
| 9.4 | JSON Schema matcher | Implement `json-schema` matcher using Ajv. Validate response body (or JSONPath-extracted value) against provided JSON Schema. Return validation errors as assertion message. | Schema validation working |
| 9.5 | Assertion evaluator | Implement `evaluateAssertions()` — takes `Assertion[]` and `ResponseResult`, evaluates each assertion against the appropriate source (status, body via JSONPath, header, timing, size). Returns `AssertionResult[]`. | Full assertion evaluation pipeline |
| 9.6 | Assertion tests | Write tests for every matcher type, JSONPath extraction, edge cases (null body, missing headers, empty arrays). | All assertion tests passing |

### Part 10 — Code Generator

| # | Task | Description | Output |
|---|------|-------------|--------|
| 10.1 | Generator dispatcher | Implement `CodeGenerator` class with `generate(request, target, options)` method. Define `CodeGenTarget` type. Implement shared utilities (indent, escape strings, format headers). | Dispatcher and utilities ready |
| 10.2 | curl target | Generate curl command with method, URL, headers (`-H`), body (`-d`), auth (`-u`). Handle form-data (`-F`). | `generate(req, 'curl')` → valid curl command |
| 10.3 | fetch target | Generate JavaScript Fetch API code with method, headers, body (JSON.stringify), error handling. | Valid fetch code |
| 10.4 | axios target | Generate Axios code with config object. Handle params, headers, data, auth. | Valid axios code |
| 10.5 | python-requests target | Generate Python requests code with method, url, headers, json/data params. | Valid Python code |
| 10.6 | Spring RestTemplate target | Generate Java Spring RestTemplate code with HttpEntity, HttpHeaders, exchange method. | Valid Java code |
| 10.7 | Spring WebClient target | Generate Java Spring WebClient reactive code. | Valid Java code |
| 10.8 | OkHttp target | Generate Java/Kotlin OkHttp code with Request.Builder. | Valid Java/Kotlin code |
| 10.9 | Remaining targets | Implement: `go-net-http`, `python-httpx`, `php-guzzle`, `node-fetch`, `csharp-httpclient`, `ruby-net-http`. | All 14 targets generating valid code |
| 10.10 | Code generator tests | Write snapshot tests for each target — given a standard request config, assert generated code matches expected output. | All codegen tests passing |

### Part 11 — Diff Engine

| # | Task | Description | Output |
|---|------|-------------|--------|
| 11.1 | JSON structural diff wrapper | Build a wrapper around `microdiff` library that produces `JsonDiffNode[]` tree format (added, removed, modified, unchanged). microdiff handles the recursive comparison; the wrapper normalizes output for invoke's `DiffResult` type. | Deep JSON comparison working via microdiff |
| 11.2 | Response diff | Implement `diffResponses()` — compare status, headers (added/removed/modified), body (using JSON diff wrapper), timing (deltas per phase). Return `DiffResult`. | Full response comparison |
| 11.3 | Diff options | Implement `DiffOptions` on top of microdiff: `ignorePaths` (JSONPath list to filter out before diffing), `ignoreArrayOrder` (sort arrays before compare), `showUnchanged`, `depthLimit`. | Configurable diff behavior |
| 11.4 | Diff tests | Write tests for nested diffs, array handling, ignore paths, edge cases (null values, type changes). | All diff tests passing |

### Part 12 — Flow Runner

| # | Task | Description | Output |
|---|------|-------------|--------|
| 12.1 | Sequential execution | Implement `FlowRunner.run()` — iterate through `FlowStep[]` sequentially. For each `RequestStep`: resolve variables, call executor, collect response. Build `FlowResult`. | Basic flow execution working |
| 12.2 | Variable extraction & injection | After each step, run `ExtractionRule[]` against response. Inject extracted variables into flow scope for subsequent steps. | Variables pass between steps |
| 12.3 | Condition steps | Implement `ConditionStep` evaluation — evaluate condition against variable/response value, execute `thenSteps` or `elseSteps` branch. | If/else branching working |
| 12.4 | Delay steps | Implement `DelayStep` — wait `delayMs` milliseconds before continuing. Use `setTimeout` with promise. | Configurable delays between steps |
| 12.5 | Loop steps | Implement `LoopStep` — repeat nested steps N times or until condition met. Enforce `maxIterations` safety limit. | Loop execution with exit conditions |
| 12.6 | Flow hooks | Implement `FlowHooks` — call `onStepStart`, `onStepComplete`, `onVariableExtracted`, `onFlowComplete`, `onError` callbacks during execution. Used by server to push WebSocket progress updates. | Real-time progress events |
| 12.7 | Flow cancellation | Implement `cancel()` — set cancellation flag, abort current in-flight request, stop iteration, return partial `FlowResult` with status `'cancelled'`. | Flows can be cancelled mid-execution |
| 12.8 | Flow runner tests | Write tests for sequential execution, variable chaining across steps, conditional branching, loops, cancellation, error handling (step failure with `continueOnFailure`). | All flow tests passing |

### Part 13 — Import/Export

| # | Task | Description | Output |
|---|------|-------------|--------|
| 13.1 | Format auto-detection | Implement `detectFormat()` — analyze file content to determine if it's Postman (check `info._postman_id`), OpenAPI (check `openapi` key), Insomnia (check `_type`), Hoppscotch (check `v` key), cURL (check `curl` prefix). | Detect format from file content |
| 13.2 | Postman v2.1 importer | Parse Postman Collection v2.1 JSON. Map: `info` → collection metadata, `item[]` → folders/requests (recursive), `request` → `RequestConfig`, `event` → scripts, `auth` → `AuthConfig`, `variable` → collection variables. Handle Postman variable syntax `{{var}}`. | Import Postman collections with full fidelity |
| 13.3 | OpenAPI 3.x importer | Parse OpenAPI 3.0/3.1 JSON or YAML. Map: tags → folders, paths + methods → requests, parameters → params/headers, requestBody → body (generate example from schema), securitySchemes → auth configs, servers → environments. | Import OpenAPI specs as collections |
| 13.4 | cURL parser | Parse cURL command strings. Extract: method (`-X`), URL, headers (`-H`), body (`-d`, `--data-raw`), auth (`-u`), cookies (`-b`), follow redirects (`-L`), insecure (`-k`), form data (`-F`), compressed (`--compressed`). Handle multiline commands with `\`. | Parse any curl command into a request |
| 13.5 | Insomnia v4 importer | Parse Insomnia v4 JSON/YAML. Map: workspaces → collections, request_groups → folders, requests → requests, environments → environments. Handle Insomnia template tags → `{{variables}}`. | Import Insomnia collections |
| 13.6 | Hoppscotch importer | Parse Hoppscotch collection JSON. Map: collections → collections, folders → folders, requests → requests. Map Hoppscotch auth format → invoke auth. | Import Hoppscotch collections |
| 13.7 | invoke YAML exporter | Export collection to file-per-request directory structure. Each request → `name.invoke.yaml`. Each folder → subdirectory with `folder.invoke.yaml`. Collection metadata → `collection.invoke.yaml`. Include `invoke_version: "1.0"` header. | Git-friendly YAML export |
| 13.8 | invoke JSON exporter | Export entire collection as single JSON file. Include all requests, folders, variables, auth, scripts. | Single-file collection export |
| 13.9 | Postman v2.1 exporter | Export invoke collection → Postman Collection v2.1 JSON. Reverse the import mapping. | Export compatible with Postman import |
| 13.10 | OpenAPI exporter | Generate OpenAPI 3.0 spec from collection. Map: folders → tags, requests → operations, params → parameters, body → requestBody with schema inference. | Best-effort OpenAPI spec generation |
| 13.11 | cURL exporter | Export individual request → cURL command string. Include all headers, body, auth as curl flags. | Valid curl command output |
| 13.12 | Import/export tests | Write tests for each importer with sample files. Test round-trip (import → export → import should be equivalent). Test cURL parsing edge cases. | All import/export tests passing |

### Part 14 — History, Mock Server, Scripts

| # | Task | Description | Output |
|---|------|-------------|--------|
| 14.1 | History manager | Implement `HistoryManager` — save request+response entries, query with filters (date range, method, status code, protocol, collection), delete by range, enforce retention (max entries, max age). | History CRUD working |
| 14.2 | History full-text search | Implement `search()` — search across request URLs, headers, bodies, response bodies. For IndexedDB, implement client-side string matching across stored fields. Return results with match context. | Full-text history search working |
| 14.3 | Mock server core | Implement `MockServer` class — takes a collection, generates mock endpoint list (method + URL pattern → response). Start Hono server on specified port. Serve recorded responses. | Mock server starts and serves responses |
| 14.4 | Mock request matching | Implement URL pattern matching with path parameters (`:id`). Match incoming requests to configured endpoints by method and path. Return 404 for unmatched routes. | Route matching working |
| 14.5 | Mock dynamic responses | Support `{{$randomInt}}`, `{{$uuid}}`, etc. in mock response bodies. Resolve dynamic variables on each request. | Dynamic mock responses |
| 14.6 | Mock conditional responses | Implement `MockCondition` matching — check request headers, query params, or body paths. Return different responses based on match. | Conditional routing working |
| 14.7 | Mock request logging | Log each incoming request to mock server: timestamp, method, path, headers, body, matched endpoint, response status. Provide `getRequestLog()` method. | Mock request log accessible |
| 14.8 | Web Worker sandbox (browser) | Implement `WebWorkerSandbox` class that implements `ScriptSandbox` interface. Create a pre-bundled worker script (via Vite) with allowed utility libraries (lodash, uuid, CryptoJS) attached to `self`. User code executes inside the worker via `postMessage`. Timeout via `Worker.terminate()`. | Browser-safe script execution working |
| 14.9 | Worker library bundling | Bundle the worker script at build time with Vite. Include allowed libraries on the worker's global scope. Ensure the bundle is small (<500KB) and loads instantly. | Worker script bundled and loadable |
| 14.10 | isolated-vm sandbox (server-only) | Implement `IsolatedVmSandbox` class in `core/src/server/` that implements `ScriptSandbox` interface. V8 isolate with 128MB memory limit, 5s timeout. For v2+ when core runs server-side. | Server-side script execution working |
| 14.11 | Pre-request script context | Implement `PreRequestContext` — expose `request` (mutable), `variables.get/set`, `environment.get/set`, `skip()`, `log()` to sandbox. Marshal context in/out via postMessage (browser) or isolate transfer (server). | Scripts can modify requests before send |
| 14.12 | Post-response script context | Implement `PostResponseContext` — expose `response` (read-only), `request`, `variables`, `environment`, `test()`, `expect()`, `log()`. Marshal response data into sandbox. | Scripts can run assertions and extract data after response |
| 14.13 | History, mock, script tests | Write tests: history save/query/search/retention, mock server request matching and response, Web Worker sandbox execution with context access. | All tests passing |

---

## Stage 4 — Server API Layer

> **Goal:** Build the thin Hono server that proxies requests to the Go executor and hosts the mock server. In the MVP, the server contains **no business logic** — `@invoke/core` runs in the browser. The server is a proxy and mock host only.
>
> **Deliverable:** All proxy routes working (execute, stream, batch, TLS inspect). Mock server starts/stops via API with in-memory state. WebSocket relay for streaming responses. All routes tested.

### Part 15 — Server Setup & Proxy Routes

| # | Task | Description | Output |
|---|------|-------------|--------|
| 15.1 | Hono server setup | Setup Hono app with middleware: CORS (configurable origin), request logging (Pino), error handling (catch and format). Configure gRPC client connection to Go executor via `@invoke/core/server` `ExecutorClient`. | Server starts with middleware working |
| 15.2 | `POST /api/proxy/execute` | Receive **fully-resolved** request config from browser (no variables — already resolved by core in browser). Forward to Go executor via gRPC `Execute()`. Return `HttpResponse` to browser. | Single request proxy working |
| 15.3 | WebSocket streaming route | Implement WebSocket upgrade at `/api/proxy/stream`. Receive resolved request via WebSocket. Call `executorClient.executeStream()`. Forward `ResponseChunk` messages to client. Implement backpressure: if WebSocket send buffer exceeds 16MB high-water mark, pause gRPC stream read. Resume when drained. | Streaming proxy with backpressure |
| 15.4 | `POST /api/proxy/batch` | Receive resolved batch config. Call `executorClient.executeBatch()`. Stream individual results via response. Return summary. | Batch execution proxy working |
| 15.5 | `POST /api/tls/inspect` | Receive host and port. Call `executorClient.inspectTLS()`. Return `TLSInfo`. | TLS inspection proxy working |
| 15.6 | Proxy route tests | Write tests with Vitest + Supertest. Mock gRPC client. Test proxy forwarding, backpressure, error handling. | Proxy route tests passing |

### Part 16 — Mock Server & Utility Routes

| # | Task | Description | Output |
|---|------|-------------|--------|
| 16.1 | Mock server routes | Implement `POST /api/mock/start` — accepts **full mock config JSON** (all routes, responses, conditions) from browser. Holds config in Node.js memory. Starts Hono mock server on specified port. Implement `POST /api/mock/stop`, `GET /api/mock/status` (returns running state — UI uses this to detect container restarts), `GET /api/mock/log`, `PUT /api/mock/endpoints/:id`. | Mock server management via API |
| 16.2 | `GET /api/ping` | Health check endpoint — calls Go executor `Ping` RPC, returns executor version and status. | Health check working |
| 16.3 | WebSocket relay routes | Implement WebSocket relay routes for Go executor's WebSocket and gRPC protocol features. Browser opens WebSocket to Node proxy, which forwards to Go executor's WebSocket/gRPC RPCs. | Protocol relay working |
| 16.4 | Server route tests | Write tests for mock routes, health check, error handling. | All server route tests passing |

> **Note:** In MVP, CRUD operations for collections, environments, flows, and history are handled directly by `@invoke/core` running in the browser (IndexedDB). There are no CRUD API routes on the server. These routes are added in v2 when `@invoke/core` moves server-side for authenticated users.

---

## Stage 5 — Web UI

> **Goal:** Build the full Vue 3 web interface. In MVP, the UI imports `@invoke/core` directly — composables call core engine functions for business logic and call the server proxy for HTTP execution.
>
> **Deliverable:** Complete web UI with all MVP features: request builder, response viewer, collection sidebar, environment manager, GraphQL/WebSocket/gRPC clients, flow builder, diff viewer, history browser, mock manager, code export, import/export, settings, command palette, and keyboard shortcuts. All features working end-to-end.

### Part 17 — Layout Shell & Core Infrastructure

| # | Task | Description | Output |
|---|------|-------------|--------|
| 17.1 | Vue Router setup | Define routes: `/` (workspace), `/flow/:id` (flow builder), `/diff` (diff view), `/mock` (mock manager), `/history` (history), `/settings` (settings). Create view stubs. | Client-side routing working |
| 17.2 | Pinia stores | Create stores: `useUiStore` (theme, sidebar, panels, active tab), `useRequestStore` (active request config, response), `useCollectionStore` (collection tree), `useEnvironmentStore` (environments, active env), `useHistoryStore` (history entries), `useFlowStore` (flows). Stores interact with `@invoke/core` directly (not via API calls). | State management ready |
| 17.3 | Core engine integration | Initialize `@invoke/core` in the Vue app. Setup storage adapter (IndexedDB), script sandbox (Web Worker). Create composables that wrap core engine functions: `useCollectionManager()`, `useEnvironmentManager()`, `useVariableResolver()`, `useHistoryManager()`, `useFlowRunner()`, `useAssertionEngine()`, `useDiffEngine()`, `useCodeGenerator()`, `useImporter()`, `useExporter()`. | Core engine running in browser, accessible via composables |
| 17.4 | Proxy client module | Create `packages/ui/src/api/proxy.ts` — thin wrapper around native `fetch()` for calling the Node.js proxy. Functions: `executeRequest()`, `executeStream()` (WebSocket), `executeBatch()`, `inspectTLS()`, `startMock()`, `stopMock()`, `getMockStatus()`, `getMockLog()`, `ping()`. | Proxy client ready |
| 17.5 | App layout shell | Implement `App.vue` with layout: collapsible sidebar (left), main content area (center/right), status bar (bottom). Use CSS Grid. Handle sidebar toggle. | App shell rendering |
| 17.6 | Theme system | Implement dark/light theme with CSS variables. Store preference in localStorage. Apply PrimeVue theme matching. Default to dark. | Theme toggle working |
| 17.7 | SplitPane component | Implement resizable split pane (horizontal and vertical). Drag handle to resize. Persist sizes in localStorage. | Resizable panels working |
| 17.8 | TabBar component | Implement horizontal tab bar for open requests. Add tab, close tab, switch tab, reorder tabs via drag. Show method badge and name. Handle unsaved indicator. | Tab management working |
| 17.9 | Toast notification system | Implement `ToastNotification` component. Integrate with a `useToast()` composable. Support success, error, warning, info variants. Auto-dismiss with configurable duration. | Toasts appearing and dismissing |
| 17.9 | Loading skeleton | Implement `LoadingSkeleton` component for data-fetching states. Use in all views during initial load. | Skeleton placeholders rendering |

### Part 18 — Request Builder

| # | Task | Description | Output |
|---|------|-------------|--------|
| 18.1 | MethodSelector | Implement dropdown for HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). Color-coded per method. | Method selection working |
| 18.2 | UrlBar | Implement URL input with: `{{variable}}` detection and colored chip rendering on hover (show resolved value), autocomplete from history, clear button. | URL bar with variable highlighting |
| 18.3 | KeyValueEditor | Implement reusable key-value pair editor: key input, value input, enable/disable toggle, description tooltip, delete button, add row button, drag-to-reorder. Used by params, headers, form-data. | Shared KV editor component |
| 18.4 | ParamsEditor | Implement using KeyValueEditor. Auto-sync with URL query string (editing params updates URL, editing URL updates params). | Params editor synced with URL |
| 18.5 | HeadersEditor | Implement using KeyValueEditor. Add autocomplete for common header names (Content-Type, Authorization, Accept, Cache-Control, etc.). Show inherited headers from collection/folder in a read-only "inherited" section. | Headers editor with autocomplete |
| 18.6 | BodyEditor — JSON | Implement JSON body editor using CodeMirror 6 with JSON language mode, syntax highlighting, auto-formatting (prettify), line numbers, bracket matching, error indicators. | JSON body editing with syntax highlighting |
| 18.7 | BodyEditor — other modes | Implement body type selector (none, JSON, text, XML, form-data, form-urlencoded, binary, GraphQL). For text/XML: CodeMirror with appropriate language mode. For form-data: KeyValueEditor with file upload support. For form-urlencoded: KeyValueEditor. For binary: file picker. | All body types supported |
| 18.8 | AuthConfig panel | Implement auth type selector dropdown. Render dynamic form per type: Bearer (token input), Basic (username + password), API Key (key + value + addTo), OAuth2 (grant type, URLs, credentials, token display), Digest, AWS Sig V4. "Inherit from parent" option. | Auth configuration for all types |
| 18.9 | ScriptEditor | Implement pre-request and post-response script tabs. Each has CodeMirror editor with JavaScript mode. Add "Script API Reference" collapsible sidebar showing available context methods. | Script editing working |
| 18.10 | Send button | Implement Send button with loading state (spinner, disable). Wire to `POST /api/requests/execute`. Update response store on success. Handle errors. Keyboard shortcut: Ctrl+Enter. | Request execution from UI |
| 18.11 | Save to collection | Implement "Save" dialog — select target collection and folder, enter request name. "Save As" for saving to new location. "Quick Save" (Ctrl+S) for already-saved requests. | Requests saved to collections |

### Part 19 — Response Viewer

| # | Task | Description | Output |
|---|------|-------------|--------|
| 19.1 | JsonTreeView | Implement collapsible JSON tree. Each node shows key, value (type-colored), expand/collapse toggle. Click to copy JSONPath. Click value to copy. Search within tree. Handle large JSON (virtualized rendering for 1MB+ bodies). | JSON tree rendering and navigation |
| 19.2 | RawTextView | Implement raw text display with CodeMirror (read-only). Syntax highlighting for JSON, XML, HTML. Word wrap toggle. Search. | Raw response text with highlighting |
| 19.3 | HtmlPreview | Implement HTML preview in sandboxed iframe (`sandbox` attribute, no scripts). | HTML responses rendered |
| 19.4 | Response tab bar | Implement tabs: Body, Headers, Timing, TLS, Cookies, Assertions. Show count badges (e.g., headers count, assertion pass/fail). | Response section tabs |
| 19.5 | HeadersTable | Implement sortable table of response headers. Click to copy key or value. Filter/search within headers. | Response headers browsable |
| 19.6 | TimingWaterfall | Implement horizontal waterfall chart showing DNS, TCP, TLS, TTFB, Transfer phases as colored bars. Show millisecond values. Total time prominently displayed. Use SVG or CSS. | Visual timing breakdown |
| 19.7 | TlsInfoPanel | Implement certificate chain display: subject, issuer, valid from/to, SANs, serial number, fingerprint. Show cipher suite and TLS version. Visual warning for expired or soon-to-expire certs (< 30 days). | TLS certificate details |
| 19.8 | CookiesTable | Implement table of response cookies: name, value, domain, path, expires, secure, httpOnly, sameSite. | Cookie inspection |
| 19.9 | AssertionResults | Implement pass/fail list. Each assertion shows: description, status (green check / red X), expected value, actual value. Summary: "5/6 passed". | Assertion results visible |
| 19.10 | Status bar | Implement bottom bar showing: status code (color-coded: 2xx green, 3xx blue, 4xx yellow, 5xx red), response time, response body size, HTTP version. | Key metrics always visible |
| 19.11 | Response size indicator | Show request size and response size (headers + body) in status bar and response panel header. Format as human-readable (bytes, KB, MB). | Size information displayed |

### Part 20 — Collection Sidebar

| # | Task | Description | Output |
|---|------|-------------|--------|
| 20.1 | CollectionTree | Implement recursive tree component rendering `Collection[]` → tree nodes. Expand/collapse folders. Click request to open in builder. | Tree rendering working |
| 20.2 | Tree node components | Implement `CollectionNode` (collection icon, name, request count), `FolderNode` (folder icon, name, expand toggle), `RequestNode` (method badge with color, name, protocol icon). | Styled tree nodes |
| 20.3 | Drag-and-drop | Implement drag-and-drop reordering within collections, between folders, and across collections. Visual drop indicator. Wire to reorder API. | Drag-and-drop reordering |
| 20.4 | Context menu | Implement right-click context menu on tree nodes: Rename, Duplicate, Delete (with confirmation), Move to..., Export, New Request, New Folder. | Right-click actions |
| 20.5 | Sidebar search | Implement search input at top of sidebar. Filter tree to show only matching nodes (by name). Highlight matches. | Tree filtering |
| 20.6 | Create collection dialog | Implement dialog: collection name, description (optional). Creates and adds to tree. | New collection creation |
| 20.7 | Inline rename | Double-click node name to enter inline edit mode. Enter to confirm, Esc to cancel. | Inline renaming |
| 20.8 | Wire to store & API | Connect tree to `useCollectionStore`. Load collections on mount. Update tree on CRUD operations. Handle optimistic updates. | Collection sidebar fully functional |

### Part 21 — Environment Manager

| # | Task | Description | Output |
|---|------|-------------|--------|
| 21.1 | EnvSwitcher | Implement dropdown in top bar showing all environments. Active env highlighted. Click to switch. "Manage Environments" link. "No Environment" option. | Environment switching in top bar |
| 21.2 | EnvEditor | Implement environment editor view: variable table with columns (key, initial value, current value, description, sensitive toggle, enable/disable). Add row, delete row. | Variable editing |
| 21.3 | Sensitive masking | Implement toggle to show/hide sensitive variable values (show as `••••••••`). Persist sensitive flag per variable. | Sensitive values masked |
| 21.4 | Bulk edit mode | Implement raw text editor mode: `KEY=VALUE` per line. Toggle between table and bulk edit. Parse and sync between modes. | Quick bulk editing |
| 21.5 | Env import | Implement file picker for `.env` files. Parse and preview variables before importing. Option to create new environment or merge into existing. | .env file import from UI |
| 21.6 | Wire to store & API | Connect to `useEnvironmentStore`. Load environments on mount. Sync active environment. | Environment manager fully functional |

### Part 22 — GraphQL Client

| # | Task | Description | Output |
|---|------|-------------|--------|
| 22.1 | GraphQL query editor | Implement CodeMirror editor with GraphQL language mode (syntax highlighting, bracket matching). Integrate with request builder body tab when body type is "GraphQL". | GraphQL query editing |
| 22.2 | Variables editor | Implement JSON editor panel for GraphQL variables. Side-by-side with query editor. | GraphQL variables editing |
| 22.3 | Schema introspection | Implement "Fetch Schema" button — execute introspection query against target URL. Cache schema per URL. | Schema fetching working |
| 22.4 | SchemaExplorer | Implement sidebar panel showing: Query/Mutation/Subscription root types, all types with fields, field arguments with types and descriptions. Click field to insert into query editor. | Schema browsing |
| 22.5 | Operation selector | If query document contains multiple operations, show dropdown to select which operation to execute. Pass selected `operationName` in request. | Multi-operation support |
| 22.6 | Wire to execution | Integrate GraphQL request building with the main request execution flow. Set `Content-Type: application/json`, format body as `{ query, variables, operationName }`. | GraphQL requests executing through normal flow |

### Part 23 — WebSocket Client

| # | Task | Description | Output |
|---|------|-------------|--------|
| 23.1 | Connection UI | Implement URL input (`ws://` / `wss://`), Connect/Disconnect button, connection status indicator (colored dot: green=connected, red=disconnected, yellow=connecting). | WebSocket connection controls |
| 23.2 | Message composer | Implement text/JSON editor for composing messages. Send button. Format selector (text/JSON). | Message composition and sending |
| 23.3 | Message log | Implement chronological message list: direction indicator (↑ sent / ↓ received), timestamp, message type badge (text/binary/ping/pong/close), collapsible message body with JSON formatting. Auto-scroll to bottom. | Message log with all events |
| 23.4 | Custom headers | Implement headers editor for the WebSocket upgrade request. | Custom upgrade headers |
| 23.5 | Wire to server | Connect WebSocket UI to server-side WebSocket relay, which communicates with Go executor WebSocket RPCs. Handle connection lifecycle. | Full WebSocket testing from UI |

### Part 24 — gRPC Client

| # | Task | Description | Output |
|---|------|-------------|--------|
| 24.1 | Connection UI | Implement server URL input (host:port), TLS toggle, "Connect" button. | gRPC server connection |
| 24.2 | ServiceExplorer | Implement sidebar populated from server reflection: list services, expand to show methods with input/output types. Click method to select. Support proto file upload as alternative to reflection. | Service discovery and browsing |
| 24.3 | MessageEditor | Implement JSON editor for gRPC request message. Auto-generate skeleton JSON from proto field schema (returned by Go executor reflection). | Proto-aware message editing |
| 24.4 | Metadata editor | Implement key-value editor for gRPC metadata (headers). | Metadata management |
| 24.5 | Response viewer | Display gRPC response: response message (JSON), response metadata, trailing metadata, gRPC status code + message, duration. | gRPC response display |
| 24.6 | Wire to server | Connect gRPC UI to server routes, which call Go executor `GrpcReflect` and `GrpcExecute` RPCs. | Full gRPC testing from UI |

### Part 25 — Flow Builder

| # | Task | Description | Output |
|---|------|-------------|--------|
| 25.1 | FlowCanvas | Implement drag-and-drop canvas area. Toolbar to add node types (Request, Condition, Delay, Loop). Zoom and pan controls. Grid background. | Canvas with node placement |
| 25.2 | FlowStepNode | Implement request step node: shows request name, method badge, extraction rules list, assertion count. Click to configure. Config panel: select request from collection, define extractions, define assertions, `continueOnFailure` toggle. | Request step nodes |
| 25.3 | ConditionNode | Implement condition node: shows condition expression. Two output ports (then/else). Config panel: source, expression, matcher, expected value. | Conditional branching nodes |
| 25.4 | DelayNode and LoopNode | Implement delay node (shows duration). Implement loop node (shows iterations/condition, contains nested steps area). | Delay and loop nodes |
| 25.5 | VariableFlowLine | Implement visual lines connecting nodes that share variables. Show variable name on the line. Color-code to show data flow direction. | Visual variable connections |
| 25.6 | Flow execution | Implement "Run" button. Call `POST /api/flows/:id/run`. Receive progress updates via WebSocket. Render `FlowTimeline`: per-step status (pass/fail/running), duration, expandable response details, variable values at each step. | Flow execution with live progress |
| 25.7 | Flow save/load | Implement flow save (to IndexedDB via API), flow list sidebar, load existing flow into canvas. | Flow persistence |
| 25.8 | Wire to store & API | Connect to `useFlowStore` and flow API routes. | Flow builder fully functional |

### Part 26 — Diff, History, Mock, Code Export, Import/Export

| # | Task | Description | Output |
|---|------|-------------|--------|
| 26.1 | DiffViewer | Implement side-by-side JSON diff display. Additions in green, removals in red, modifications in yellow. Synchronized scrolling. Line numbers. | JSON diff rendering |
| 26.2 | DiffSourceSelector | Implement source selection UI: choose two environments (re-execute and diff), two history entries, or two requests. Trigger diff execution. | Diff source configuration |
| 26.3 | HeaderDiff and TimingDiff | Implement header diff table (added/removed/modified rows). Implement timing diff chart (overlay two timing waterfalls). | Supporting diff views |
| 26.4 | HistoryList | Implement chronological list of history entries: method badge, URL (truncated), status code (colored), response time, timestamp, environment name. Filter controls: method, status range, date range, protocol. Search input wired to full-text search. | History browsing |
| 26.5 | HistoryDetail | Implement full request/response viewer for a history entry (reuse ResponseViewer components). | History entry inspection |
| 26.6 | History actions | Implement "Restore" button (load request into builder), "Compare" (select two entries → open diff view). | History restore and compare |
| 26.7 | MockManager | Implement mock server view: collection selector, port input, start/stop button, status indicator. Endpoint list table: method, path, status code, response body preview. Click to edit response. | Mock server management |
| 26.8 | MockRequestLog | Implement live log of incoming mock server requests: timestamp, method, path, matched endpoint, response status. Auto-updating. | Mock traffic monitoring |
| 26.9 | CodeExportPanel | Implement floating panel (or tab) on response viewer: target selector dropdown (14 targets), generated code display with CodeMirror (read-only), copy button. Regenerate on request change. | Code snippet generation from UI |
| 26.10 | ImportDialog | Implement import dialog: drag-and-drop file zone or file picker. Auto-detect format, show detected format badge. Preview imported collections/requests/environments counts. Confirm button to import. | Collection import from UI |
| 26.11 | ExportDialog | Implement export dialog: format selector (YAML, JSON, Postman, OpenAPI, cURL). Scope selector (entire collection, specific folder, single request). Download button using File System Access API with fallback. | Collection export from UI |

### Part 27 — Settings, Command Palette, Keyboard Shortcuts

| # | Task | Description | Output |
|---|------|-------------|--------|
| 27.1 | SettingsView | Implement settings page with sidebar navigation: General, Proxy, Certificates, Keyboard. | Settings page shell |
| 27.2 | GeneralSettings | Implement: theme selector (dark/light/system), auto-save toggle and interval, editor font size, editor tab size, word wrap toggle. Persist to localStorage. | General preferences |
| 27.3 | ProxySettings | Implement: global proxy enable/disable, proxy type (HTTP/SOCKS5), proxy URL, proxy username/password. Persisted and sent with every request. | Proxy configuration |
| 27.4 | CertificateSettings | Implement: client certificate list (name, thumbprint, expiry). Add certificate (upload PEM files). CA bundle upload. Delete certificate. | Certificate management |
| 27.5 | KeyboardSettings | Implement: table of all shortcuts with current binding. Click to rebind (listen for key combo). Reset to defaults. | Customizable keyboard shortcuts |
| 27.6 | CommandPalette | Complete command palette (Ctrl+K): search input, results grouped by category (Collections, Requests, History, Commands). Fuzzy matching. Recent items at top. Keyboard navigation (arrow keys, Enter, Esc). Commands: "New Request", "Switch Environment", "Import Collection", "Open Settings", "Toggle Theme". | Global search and command execution |
| 27.7 | Keyboard shortcuts | Implement all shortcuts from PRD section 32 using `@vueuse/core` `useMagicKeys`. Support customized bindings from settings. | All shortcuts working |
| 27.8 | Persist settings | Ensure all settings persist to localStorage. Load on app startup. Apply theme, editor preferences, proxy config. | Settings survive browser restart |

---

## Stage 6 — Integration, Docker & Deployment

> **Goal:** End-to-end testing, Docker image creation, CI/CD pipeline, and production deployment.
>
> **Deliverable:** All features verified end-to-end in real browsers via Playwright. Docker images built, published to ghcr.io, and deployed to invoke.dev. README with self-hosted instructions.

### Part 28 — Integration Testing & Polish

| # | Task | Description | Output |
|---|------|-------------|--------|
| 28.1 | E2E: REST request (Playwright) | Test full stack in real browser: core resolves variables in browser → sends resolved request to proxy → Go executor runs request → response displayed with timing, headers, body. | REST flow verified |
| 28.2 | E2E: GraphQL query (Playwright) | Test: schema introspection works → query editor has autocomplete → execute query → response displayed with JSON tree. | GraphQL flow verified |
| 28.3 | E2E: WebSocket (Playwright) | Test: connect to WebSocket → send message → receive response → message log populated → disconnect works. | WebSocket flow verified |
| 28.4 | E2E: gRPC (Playwright) | Test: connect to gRPC server → reflection discovers services → unary call executes → response displayed. | gRPC flow verified |
| 28.5 | E2E: Flow execution (Playwright) | Test: create flow with 3 steps → extract token from step 1 → inject into step 2 header → assert step 3 response → flow timeline shows all results. Verify flow progress renders in real-time. | Flow chaining verified |
| 28.6 | E2E: Import Postman (Playwright) | Test: import Postman collection JSON via import dialog → verify collections, folders, requests created correctly in sidebar → execute an imported request. | Import verified |
| 28.7 | E2E: Mock server (Playwright) | Test: start mock from collection (UI sends full config to server) → send request to mock URL → verify response → check request log → restart mock after simulated container restart. | Mock server verified |
| 28.8 | E2E: Flow canvas drag-and-drop (Playwright) | Test: drag request nodes onto canvas → connect nodes → drag to reorder → verify node positions persist. Also test collection sidebar drag-and-drop reordering. | Canvas interactions verified |
| 28.9 | Cross-browser test (Playwright) | Test IndexedDB storage in Chrome, Firefox, WebKit. Verify: create collection, add requests, reload page → data persists. Test export/download in each browser. | Browser compatibility verified |
| 28.10 | Performance profiling | Profile: UI initial load time (target <3s), collection tree render with 1000 requests (target <200ms), large JSON response render (1MB, target <1s), command palette open (target <100ms). Optimize bottlenecks. | Performance targets met |
| 28.11 | Bug fixes & polish | Fix bugs found during integration testing. Polish UI transitions, loading states, empty states, error states. Ensure all error messages are user-friendly. | Production-quality UX |

### Part 29 — Docker & CI/CD

| # | Task | Description | Output |
|---|------|-------------|--------|
| 29.1 | `Dockerfile.ui` | Multi-stage: build Vue app with Vite → copy dist to Nginx Alpine. Configure nginx.conf for SPA routing (`try_files`), gzip, cache headers. | UI Docker image building and serving |
| 29.2 | `Dockerfile.server` | Multi-stage: install dependencies → build TypeScript → copy to production Node.js Alpine. Expose port 4000. | Server Docker image building |
| 29.3 | `Dockerfile.executor` | Multi-stage: build Go binary → copy to Alpine/scratch. Expose gRPC port 50051. | Executor Docker image building |
| 29.4 | `Dockerfile.all-in-one` | Multi-stage: build all three → combine into single image. Use supervisord or shell script to start Node.js server + Go executor. Nginx serves UI and proxies `/api` to server. | All-in-one image working |
| 29.5 | `docker-compose.yml` | Production Docker Compose: `ui` (port 3000), `server` (internal), `executor` (internal). Internal network. Health checks. Restart policies. | `docker compose up` starts full stack |
| 29.6 | Finalize `docker-compose.dev.yml` | Finalize dev compose from Part 1. Ensure hot-reload works for all services. Volume mounts for source code. | Development workflow smooth |
| 29.7 | GitHub Actions CI | Create `.github/workflows/ci.yml`: on PR/push → checkout → install pnpm → lint → test core (vitest) → test server (vitest) → test Go (go test) → build all Docker images (verify build succeeds). | CI pipeline running on every push |
| 29.8 | GitHub Actions release | Create `.github/workflows/release.yml`: on tag `v*` → build Docker images → push to ghcr.io (`invoke/ui`, `invoke/server`, `invoke/executor`, `invoke/all-in-one`). | Automated Docker image publishing |
| 29.9 | Deploy public hosted | Deploy to VPS: Docker Compose on Contabo. Nginx reverse proxy with SSL (Cloudflare/Certbot). Configure domain. Cloudflare CDN for static assets. Health check monitoring. | invoke.dev live and accessible |
| 29.10 | README.md | Write README: project description, screenshot, quickstart (public hosted URL), self-hosted Docker instructions, development setup, contributing guidelines, license (BSL 1.1). | Professional README |

---

## Task Summary

| Stage | Parts | Tasks | Focus |
|-------|-------|-------|-------|
| Stage 1 — Setup | 1 | 9 | Monorepo, scaffold, isomorphic core build, dev tooling, end-to-end verification |
| Stage 2 — Go Executor | 2–3 | 19 | HTTP execution, timing, TLS, WebSocket, gRPC protocol support |
| Stage 3 — Core Engine | 4–14 | 89 | Types, storage adapters, sandbox adapters, variables, collections, environments, auth, assertions, codegen, diff (microdiff), flows, import/export, history, mock, scripts (Web Worker + isolated-vm) |
| Stage 4 — Server | 15–16 | 10 | Hono proxy routes, mock server host, WebSocket relay (thin — no CRUD routes in MVP) |
| Stage 5 — Web UI | 17–27 | 89 | Layout, core engine integration, request builder, response viewer, collection sidebar, environment manager, GraphQL/WebSocket/gRPC clients, flow builder, diff, history, mock, codegen, settings, command palette |
| Stage 6 — Deploy | 28–29 | 21 | Playwright E2E tests, Docker images, CI/CD, production deployment |
| **Total** | **29 Parts** | **~237 Tasks** | |

---

## Dependency Graph

Tasks must be completed in this order due to dependencies:

```
Stage 1 (Setup — isomorphic core verified)
  └──→ Stage 2 (Go Executor)
  └──→ Stage 3 (Core Engine — runs in browser)
         ├── Part 4 (Types, Storage & Sandbox adapters) — no dependencies beyond Stage 1
         ├── Part 5 (gRPC Client [server-only] & Variables) — depends on Part 4 types
         ├── Part 6 (Collections) — depends on Part 4 storage
         ├── Part 7 (Environments) — depends on Part 4 storage
         ├── Part 8 (Auth) — depends on Part 4 types
         ├── Part 9 (Assertions) — depends on Part 4 types
         ├── Part 10 (Code Gen) — depends on Part 4 types
         ├── Part 11 (Diff via microdiff) — depends on Part 4 types
         ├── Part 12 (Flows) — depends on Part 5 (variables) + Part 9 (assertions)
         ├── Part 13 (Import/Export) — depends on Part 6 (collections) + Part 7 (environments)
         └── Part 14 (History, Mock, Scripts) — depends on Part 4 (storage + sandbox adapters)
  └──→ Stage 4 (Server Proxy) — depends on Stage 2 (Go executor for gRPC client)
  └──→ Stage 5 (Web UI) — depends on Stage 3 (core) + Stage 4 (proxy)
  └──→ Stage 6 (Deploy) — depends on all above
```

Stage 3 and Stage 4 can be developed in parallel — they only share Stage 2 as a dependency.
Parts within Stage 3 can also be parallelized where dependencies allow.

---

## Notes for Implementation

1. **Always reference the PRD** (`prd.md`) for detailed type definitions, interface contracts, gRPC proto definition, and UI screen specifications. This execution detail tells you *what to build and in what order*. The PRD tells you *exactly how each feature should work*.

2. **Test as you go.** Every Part ends with a testing task. Do not skip tests — they catch regressions as the codebase grows. Use Vitest for unit/integration, Playwright for E2E.

3. **Core engine is isomorphic.** `@invoke/core` must run in both browser and Node.js. The browser-safe entry point (`src/index.ts`) must NOT import any Node.js APIs (no `fs`, `path`, `crypto` from Node, `@grpc/grpc-js`, `isolated-vm`). Node-only modules go in `src/server.ts`. Verify browser compatibility by building with Vite — if it fails, you have a Node.js import leak.

4. **MVP: Core runs in browser.** In the MVP, the Vue UI imports `@invoke/core` directly. Business logic (variable resolution, assertions, flow orchestration, diffing, code generation, import/export) runs in the browser. The server is a thin proxy that forwards resolved requests to the Go executor.

5. **Server is a thin proxy in MVP.** The MVP server has ~200-300 lines: proxy routes to Go, mock server host, WebSocket relay. No CRUD routes, no business logic, no database. CRUD routes are added in v2 when core moves server-side.

6. **IndexedDB storage for MVP.** Do not implement PostgreSQL adapter yet. The storage interface is designed so PostgreSQL can be added in v2 without changing any business logic.

7. **Script sandbox is environment-dependent.** Use `WebWorkerSandbox` for browser (MVP), `IsolatedVmSandbox` for server (v2+). Both implement the same `ScriptSandbox` interface. Bundle allowed libraries (lodash, uuid) into the Web Worker script at build time.

8. **Mock server state is in-memory.** The browser sends full mock config to `POST /api/mock/start`. Node holds it in memory. Container restart = state lost. UI must detect via `GET /api/mock/status` and offer re-push.

9. **Proto-first gRPC.** Always generate TypeScript and Go code from `proto/executor.proto`. Never hand-write gRPC message types — they must match the proto definition exactly.

10. **File naming convention.** Collection files use `.invoke.yaml` extension. Flow files use `.invoke-flow.yaml`. Environment files use `.invoke-env.yaml`.
