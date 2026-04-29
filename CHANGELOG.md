# Changelog

## 1.0.0-local

Beta 2 to v1 local implementation pass:

- Added v1 code export targets: Node fetch, Python httpx, Go net/http, Java OkHttp, Kotlin OkHttp, Ruby Net::HTTP, PHP Guzzle, C# HttpClient, Rust reqwest, PowerShell, and HTTPie.
- Added pre-request and post-response scripts with a browser Worker sandbox path, Node/test fallback, Postman-style `test()`, and extended `expect()` helpers.
- Added a core flow runner with sequential request execution, delay, condition, fixed-count and conditional loops, extraction, hooks, cancellation, and IndexedDB flow persistence.
- Added a browser flow editor in Settings for saved flows, request/delay steps, reordering, execution, and step logs.
- Added a Node-hosted in-memory mock server at `/mock/*` with browser-managed route sync, path params, header/query/bodyJsonPath conditions, dynamic response variables, latency, and request logs.
- Added Go-backed WebSocket relay RPCs and UI wiring for custom upgrade headers, auth headers, TLS/mTLS settings, subprotocols, connect/disconnect, message composer, and chronological message log.
- Added gRPC reflection and unary execution through the Go executor, with metadata, TLS/mTLS settings, dynamic protobuf JSON bodies, and method discovery.
- Added mTLS/custom CA support for HTTP, WebSocket, and gRPC requests.
- Added OAuth2 client credentials, Digest, and core-backed AWS SigV4 auth support.
- Added mock server management to settings and expanded dynamic variables.

## 0.2.0-beta.2

Beta 1 to Beta 2:

- Added response assertions with status, response time, header, JSONPath, regex, and Ajv JSON Schema checks.
- Added assertion results in response/history records and a session-scoped extraction rules tab.
- Added response diffing for history entries with structural JSON comparison and text fallback.
- Added GraphQL introspection, schema caching, and a schema explorer with click-to-insert fields.
- Added streaming execution through `ExecuteStream` and `/api/execute/stream` SSE forwarding.
- Added Insomnia v4 and Hoppscotch importers.
- Hardened Invoke ZIP export against duplicate folder/request slug overwrites.

## 0.2.0-beta.1

Alpha to Beta 1:

- Added timing waterfall details for DNS, TCP, TLS, TTFB, and transfer phases.
- Added nested folders with collection, folder, request, environment, and session variable scopes.
- Added GraphQL basic request support with save/load and history.
- Added OpenAPI 3.x import through `@apidevtools/swagger-parser`, including local `$ref` resolution.
- Added code export for cURL, JavaScript `fetch`, Python `requests`, and Node `axios`.
- Added searchable history, command palette, and keyboard shortcut help.
- Documented the browser importer limitation for external OpenAPI `$ref` targets.
