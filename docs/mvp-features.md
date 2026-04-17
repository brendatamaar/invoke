# invoke — MVP Features

**Purpose:** Detailed explanation of every feature in the MVP release. This document describes what each feature does, why it exists, and how it will be implemented at a high level.

**Audience:** Both product-focused (users, marketing) and technical (developers, contributors).

**Structure:** Organized by architectural layer (Core Engine → Web UI → Infrastructure), then by category within each layer.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Engine Features](#2-core-engine-features)
   - [Request Execution](#21-request-execution)
   - [Variables & Environments](#22-variables--environments)
   - [Collections & Organization](#23-collections--organization)
   - [Authentication](#24-authentication)
   - [Scripting](#25-scripting)
   - [Assertions & Testing](#26-assertions--testing)
   - [Flow Runner](#27-flow-runner)
   - [Response Analysis](#28-response-analysis)
   - [Mock Server](#29-mock-server)
   - [Code Generation](#210-code-generation)
   - [Import & Export](#211-import--export)
   - [History](#212-history)
   - [Storage](#213-storage)
3. [Web UI Features](#3-web-ui-features)
   - [Request Builder](#31-request-builder)
   - [Response Viewer](#32-response-viewer)
   - [Collection Sidebar](#33-collection-sidebar)
   - [Environment Manager](#34-environment-manager)
   - [GraphQL Client](#35-graphql-client)
   - [WebSocket Client](#36-websocket-client)
   - [gRPC Client](#37-grpc-client)
   - [Flow Builder](#38-flow-builder)
   - [Diff Viewer](#39-diff-viewer)
   - [History Browser](#310-history-browser)
   - [Mock Server Manager](#311-mock-server-manager)
   - [Import/Export Dialogs](#312-importexport-dialogs)
   - [Code Export Panel](#313-code-export-panel)
   - [Settings](#314-settings)
   - [Command Palette & Keyboard Shortcuts](#315-command-palette--keyboard-shortcuts)
   - [Shell & Layout](#316-shell--layout)
4. [Infrastructure Features](#4-infrastructure-features)
   - [Public Hosted Deployment](#41-public-hosted-deployment)
   - [Self-Hosted Docker](#42-self-hosted-docker)
   - [All-in-One Container](#43-all-in-one-container)
   - [CI/CD Pipeline](#44-cicd-pipeline)

---

## 1. Overview

The invoke MVP is a fully functional, browser-based API testing tool designed to replace Postman for developers who value speed, privacy, and a clean experience. Every feature in the MVP works without requiring an account, without syncing data to the cloud, and without bloated application overhead.

### What Makes the MVP Complete

Unlike typical MVPs that ship with minimal features, the invoke MVP ships with a genuinely competitive feature set. The reasoning is simple: an API client with half the features of Postman isn't useful to anyone. To displace incumbents, the MVP must match or exceed them on core capabilities.

**The MVP includes:**
- All four modern API protocols (REST, GraphQL, WebSocket, gRPC)
- Full collection and environment management
- Visual flow builder for chained requests
- Mock server generation
- Code generation for 14 target languages/libraries
- Import from 5 other tools (Postman, OpenAPI, cURL, Insomnia, Hoppscotch)
- Scriptable pre-request and post-response logic
- Response assertions and diffing
- Complete history with full-text search

**The MVP deliberately excludes:**
- User accounts (coming in v2)
- Team workspaces (coming in v3)
- Native desktop app (coming in v4)
- Real-time collaboration (coming in v5)
- CLI tool (coming in v6)

Anonymous users get the full web experience. Their data lives entirely in browser IndexedDB — no server-side storage, no privacy concerns, no account creation friction.

---

## 2. Core Engine Features

The core engine is a standalone, **isomorphic** TypeScript library (`@invoke/core`) that contains all business logic. It has zero framework dependencies and runs **inside the browser** in the MVP — directly accessing IndexedDB, resolving variables, running assertions, and orchestrating flows. In v2+, the same library moves to the Node.js server for authenticated users.

The library produces two entry points:
- `@invoke/core` — browser-safe modules (collections, variables, assertions, diff, codegen, import/export, Web Worker sandbox)
- `@invoke/core/server` — Node.js-only modules (gRPC client, isolated-vm sandbox, PostgreSQL adapter)

### 2.1 Request Execution

#### HTTP Request Execution (REST)

**What it does:** Executes HTTP requests against any REST API and captures the complete response with precise timing measurements.

**Why it exists:** This is the fundamental purpose of an API client. Everything else in the product supports this core operation.

**How it works:** In the MVP, the core engine runs in the browser. When the user clicks "Send", the core engine resolves all `{{variables}}` in the URL, headers, body, and auth config by reading the active environment from IndexedDB. The fully-resolved request is then sent to the Node.js proxy via a REST call. The proxy forwards it to the Go HTTP executor via gRPC. The Go executor performs the actual network request using `net/http` with `httptrace` instrumentation, capturing DNS lookup time, TCP connection time, TLS handshake duration, time to first byte, and total transfer time with sub-millisecond precision. The response comes back through the proxy to the browser, where the core engine runs assertions and saves the entry to history in IndexedDB.

#### GraphQL Execution

**What it does:** Sends GraphQL queries, mutations, and subscriptions to a GraphQL endpoint with proper request formatting and schema support.

**Why it exists:** GraphQL has become standard for modern APIs. Postman's GraphQL support feels bolted-on; invoke designs it natively from the start.

**How it works:** GraphQL requests are a special case of HTTP POST. The core engine formats the body as `{query, variables, operationName}` with `Content-Type: application/json`. For schema-aware features, the engine can execute an introspection query (`__schema` query) against the target endpoint, parse the resulting schema, and cache it for reuse. Subscriptions are handled via the WebSocket transport layer when supported.

#### WebSocket Client

**What it does:** Connects to WebSocket servers, maintains persistent connections, and allows sending and receiving messages interactively.

**Why it exists:** Real-time applications (chat, notifications, live updates) use WebSocket. Developers need a way to test these connections just like they test HTTP endpoints.

**How it works:** The core engine sends a connection request to the Go executor via gRPC. The Go executor establishes the WebSocket connection using `gorilla/websocket` and assigns it a UUID. The connection is stored in a registry with a TTL (30-minute idle timeout with background cleanup). The core engine returns the connection ID to the UI, which uses it for subsequent send/receive operations. Messages flow bidirectionally: UI → server → Go executor → WebSocket server, and back. A connection registry ensures abandoned connections (user closes browser tab) don't leak resources.

#### gRPC Client

**What it does:** Tests gRPC services by discovering available methods via server reflection and executing unary calls with structured message payloads.

**Why it exists:** gRPC is the dominant RPC protocol for microservices. Until now, developers had to use specialized tools like `grpcurl` or Kreya. invoke brings it into the same interface as REST/GraphQL/WebSocket.

**How it works:** The core engine connects to the target gRPC server via the Go executor. If the server supports reflection (most do), the executor queries the reflection service to discover available services, methods, and their input/output protobuf types. The core engine generates JSON schemas from these proto descriptors, which the UI uses to provide field hints in the message editor. When the user executes a call, the JSON-encoded message is converted to protobuf, sent to the server, and the response is converted back to JSON for display. Metadata (gRPC's equivalent of HTTP headers) is managed separately.

#### Response Streaming

**What it does:** Delivers large response bodies and Server-Sent Events (SSE) incrementally rather than waiting for the entire response.

**Why it exists:** Large API responses (1MB+ JSON payloads, binary downloads) cause perceived slowness if the UI waits for the entire body. SSE endpoints (`text/event-stream`) never "complete" in the traditional sense — they stream events indefinitely.

**How it works:** The UI opens a WebSocket connection to the server instead of a regular HTTP request. The server calls the Go executor's `ExecuteStream` gRPC method, which returns a stream of chunks. As each chunk arrives from the target server, the Go executor forwards it through gRPC, the server forwards it through WebSocket, and the UI appends it to the response display. A final message contains the completed metadata (total timing, full headers).

#### Batch Execution

**What it does:** Runs the same request N times with configurable concurrency, producing statistical summaries (p50, p95, p99, mean, std dev).

**Why it exists:** Developers often need to quickly check if an endpoint is consistently fast, identify slow outliers, or verify rate-limiting behavior. Standalone load testing tools are overkill for this.

**How it works:** The core engine sends a batch request config to the Go executor's `ExecuteBatch` gRPC method. Go uses a goroutine pool sized to the configured concurrency, with each goroutine independently executing a copy of the request. Results stream back as they complete. When all iterations finish, the Go executor calculates aggregate statistics and sends a summary message. The UI displays individual results and a histogram of response times.

#### Proxy Support

**What it does:** Routes API requests through HTTP or SOCKS5 proxies with optional authentication.

**Why it exists:** Corporate networks often require proxy usage. Developers debugging issues sometimes route traffic through tools like mitmproxy or Charles Proxy.

**How it works:** Proxy configuration is part of the request options passed to the Go executor. Go's `net/http` supports HTTP proxies natively via `http.ProxyURL`; SOCKS5 requires `golang.org/x/net/proxy`. Proxy credentials are included in the proxy URL (e.g., `http://user:pass@proxy:8080`). The proxy can be configured globally in settings or overridden per-request.

#### Client Certificates (mTLS)

**What it does:** Authenticates to servers requiring mutual TLS (mTLS) using client certificates.

**Why it exists:** Enterprise and fintech APIs often require mTLS for zero-trust authentication. Postman supports this but it's buried in settings; invoke makes it a first-class feature.

**How it works:** Users upload PEM-encoded client certificates and keys through the settings UI. These are stored in browser IndexedDB. When a request targets a host associated with a client certificate, the core engine includes the cert and key in the gRPC call to the Go executor. Go constructs a `tls.Config` with the client certificate and uses it for the request. Custom CA bundles (for self-signed server certificates) work the same way.

#### TLS Certificate Inspection

**What it does:** Displays detailed information about the TLS certificate chain for any HTTPS request — issuer, validity period, cipher suite, SANs, and fingerprints.

**Why it exists:** Developers need to debug certificate issues, verify certificate pinning works correctly, check expiry dates, or inspect certificates for security audits. No other API client offers this at this level of detail.

**How it works:** Every HTTPS request made by the Go executor captures the `tls.ConnectionState` from the underlying connection. This includes the full certificate chain, cipher suite negotiated, and protocol version used. The data is serialized into the gRPC response and displayed in the TLS tab of the response viewer.

### 2.2 Variables & Environments

#### Variable Resolution

**What it does:** Replaces `{{variable}}` placeholders in URLs, headers, bodies, and auth configs with actual values from the active environment or other scopes.

**Why it exists:** Developers work with multiple environments (dev, staging, production). Hard-coding URLs and credentials leads to mistakes (accidentally hitting production with dev data). Variables make the same request definition work across all environments.

**How it works:** The core engine implements a scope hierarchy: global variables → environment variables → collection variables → folder variables → request variables → flow-extracted variables → dynamic variables. Later scopes override earlier ones. When resolving a string, the engine scans for `{{variable}}` patterns and replaces each with its resolved value. Nested references (`{{base_url}}/{{version}}`) resolve recursively. Unresolved variables are tracked and displayed in the UI as warnings.

#### Dynamic Variables

**What it does:** Provides built-in variables that generate random or contextual values on each request: `{{$uuid}}`, `{{$timestamp}}`, `{{$randomInt}}`, `{{$isoTimestamp}}`, `{{$randomEmail}}`, and more.

**Why it exists:** Testing often requires unique values per request (unique IDs, current timestamps, random test data). Hardcoding these defeats the purpose; generating them manually is tedious.

**How it works:** Dynamic variables are resolved at request-send time (not at save time). The variable resolver recognizes the `$` prefix and calls the appropriate generator function. Each dynamic variable has a dedicated implementation — `$uuid` uses `crypto.randomUUID()`, `$timestamp` uses `Date.now()`, `$randomInt` uses `Math.floor(Math.random() * 1000)`, and so on. Values are fresh on each request execution.

#### Variable Extraction

**What it does:** Extracts values from response bodies, headers, or status codes and stores them as variables for use in subsequent requests.

**Why it exists:** The canonical use case is authentication — POST to a login endpoint, extract the JWT token from the response, then use that token in subsequent requests. Without extraction, users would have to manually copy tokens.

**How it works:** Users define extraction rules on a request, specifying a source (body/header/status/timing/cookie) and expression (JSONPath for bodies, header name for headers). After the request executes, the core engine evaluates each rule against the response and stores results as variables in the flow scope. These variables become available to subsequent requests in a flow (or to later manual requests if not part of a flow).

#### Environment Management

**What it does:** Creates, updates, and switches between named sets of variables (typically one per deployment environment).

**Why it exists:** Separating environment-specific data (URLs, API keys, credentials) from request definitions is foundational to API testing workflows.

**How it works:** Environments are stored in IndexedDB with a unique ID, name, and array of variables. Each variable has a key, an initial value (safe to share/commit), a current value (may contain secrets), a description, a sensitive flag, and an enable/disable toggle. The active environment is tracked per workspace. When a request executes, the active environment's variables are injected into the variable scope chain. Sensitive variables are masked in the UI but included in actual request execution.

#### .env File Import/Export

**What it does:** Imports standard `.env` file format (`KEY=VALUE` lines) into an environment, and exports environments as `.env` files.

**Why it exists:** Developers already manage environment variables in `.env` files for their applications. Duplicating them manually in invoke is annoying. Direct import eliminates friction.

**How it works:** The core engine includes a parser that reads `.env` format — handles `KEY=VALUE` lines, ignores comments (`#` prefix), strips surrounding quotes, skips empty lines, and handles spaces around `=`. Export is the inverse: serializes variables to `KEY=VALUE` format with optional comments for descriptions.

### 2.3 Collections & Organization

#### Collection Management

**What it does:** Organizes requests into named collections — reusable groups of related API calls (e.g., "User API", "Payments API").

**Why it exists:** Developers typically work with dozens or hundreds of API endpoints. Without organization, finding the right one is impossible.

**How it works:** Collections are top-level containers stored in IndexedDB. Each has a unique ID, name, description, list of folders, list of requests, collection-level variables, default auth config, default headers, and scripts. Collections are created through the UI (new collection dialog) or imported from Postman/OpenAPI/etc. All CRUD operations (create, read, update, delete, duplicate) are exposed through the CollectionManager in `@invoke/core`.

#### Nested Folders

**What it does:** Allows unlimited nesting of folders within collections to organize requests hierarchically.

**Why it exists:** Flat collections don't scale. A large API might have 200 endpoints; grouping them into folders like `Auth/`, `Users/`, `Users/Profiles/`, `Users/Settings/` makes navigation manageable.

**How it works:** Folders are recursive structures — each folder contains nested folders and/or requests. The data model uses arrays rather than a parent-reference scheme, which makes tree rendering simple. Auth and headers cascade from parent folders to children, so authentication configured at the collection level applies to all nested requests unless overridden.

#### Drag-and-Drop Reordering

**What it does:** Lets users reorder collections, folders, and requests by dragging them. Supports moving items between folders and across collections.

**Why it exists:** Users want to organize their workspace intuitively. Forcing them to delete and recreate items to change order is unacceptable.

**How it works:** The UI tracks a `sortOrder` field on every item. Drag-and-drop operations update these values and persist to storage. Moving between containers updates parent references. The core engine's `reorder()` method handles batch updates efficiently.

#### Full-Text Search

**What it does:** Searches across request names, URLs, request body content, headers, and descriptions. Returns matching requests with highlighted matches and breadcrumb paths.

**Why it exists:** Postman's search is notoriously limited — it doesn't search inside request bodies, which is exactly where developers look to find "the request that sends this specific JSON structure". invoke fixes this.

**How it works:** The core engine implements a search function that iterates through all collections and their requests, checking each field against the search query. For IndexedDB (MVP), this is client-side string matching with substring and fuzzy matching support. For PostgreSQL (v2+), it uses full-text search indexes (`tsvector`/`tsquery`). Results include a context snippet showing where the match occurred and the full breadcrumb path (e.g., "Payments / Subscriptions / Cancel Subscription").

### 2.4 Authentication

#### Bearer Token Auth

**What it does:** Adds `Authorization: Bearer <token>` header automatically to requests.

**Why it exists:** Bearer tokens are the most common API authentication method today. Manually typing `Authorization: Bearer ...` for every request is tedious and error-prone.

**How it works:** The auth resolver reads the configured token (which may itself contain `{{variables}}` that get resolved). It formats the header and adds it to the request's headers. Simple, but solves the repetitive problem.

#### Basic Auth

**What it does:** Base64-encodes username:password and adds as `Authorization: Basic <encoded>` header.

**Why it exists:** HTTP Basic is still used by many APIs, especially internal tools and legacy systems.

**How it works:** The resolver takes username and password, combines with a colon, base64-encodes, and formats as a Basic auth header. Credentials can reference variables for environment-specific auth.

#### API Key Auth

**What it does:** Adds an API key as either a header or query parameter, based on the service's expected placement.

**Why it exists:** Many APIs use custom headers (`X-API-Key`) or query parameters (`?api_key=...`). The location varies by service.

**How it works:** Users configure the key name, value, and where to add it (header or query). The resolver adds to the appropriate location. This is simple key-value injection with placement flexibility.

#### OAuth2 Flows

**What it does:** Automates OAuth2 authentication — handles the token fetching, caching, and refresh cycle for all four standard grant types (client credentials, authorization code, password, implicit).

**Why it exists:** Manually obtaining OAuth2 tokens is painful — it involves generating auth URLs, handling callbacks, exchanging codes for tokens, and tracking expiry. This is the feature that makes testing OAuth2-protected APIs bearable.

**How it works:** For each grant type, the resolver has a dedicated implementation:
- **Client credentials:** POST to token URL with client_id/secret, parse access_token response, cache with expiry
- **Authorization code:** Generate auth URL, redirect user to authorization server, receive callback with code, exchange code for token
- **Password grant:** POST with username/password/client_id, parse token response
- **Implicit:** Parse token directly from redirect URL fragment

Tokens are cached with their expiry timestamps. Before each request, the resolver checks if the cached token is still valid; if expired, it attempts a refresh using the refresh token, or re-executes the grant flow.

#### Digest Auth

**What it does:** Handles HTTP Digest authentication (RFC 7616) by parsing server challenges and computing response hashes.

**Why it exists:** Some legacy and enterprise APIs still use Digest auth for its security advantages over Basic.

**How it works:** On the first request, the server returns 401 with a `WWW-Authenticate: Digest` challenge. The auth resolver parses the challenge (realm, nonce, qop, algorithm), computes the response hash (MD5 or SHA-256 of user:realm:password, URI, nonce, etc.), and sends a second request with the `Authorization: Digest` header. For subsequent requests, the nonce and response can be reused until the server requires a new challenge.

#### AWS Signature V4

**What it does:** Signs requests using the AWS Signature Version 4 algorithm for AWS APIs.

**Why it exists:** AWS services (S3, DynamoDB, Lambda, etc.) require SigV4 signing. Implementing this by hand is complex and error-prone.

**How it works:** The resolver takes AWS access key, secret key, region, and service name. It builds the canonical request (method, URI, query string, canonical headers, signed headers, hashed payload), creates the string to sign, derives the signing key (through multiple HMAC-SHA256 iterations), computes the signature, and adds the complete `Authorization` header to the request. This exactly follows the AWS documentation for SigV4.

#### Auth Inheritance

**What it does:** Inherits auth configuration from parent folder or collection when a request doesn't define its own auth.

**Why it exists:** Most requests in a collection use the same authentication. Configuring it once at the collection level and having requests inherit is cleaner than repeating the config on each request.

**How it works:** When a request's auth type is `'inherit'`, the resolver walks up the parent chain — folder → parent folder → collection — looking for the first non-inherit auth config. If no ancestor has auth configured, the request sends without authentication.

### 2.5 Scripting

#### Pre-Request Scripts

**What it does:** Runs user-defined JavaScript before a request is sent, allowing dynamic modification of the request (URL, headers, body, auth) or setting of variables.

**Why it exists:** Some scenarios require logic that declarative configuration can't express — computing an HMAC signature, generating a complex auth token, or conditionally modifying the request based on time of day.

**How it works:** In the MVP (browser), scripts execute in a **Web Worker sandbox**. A pre-bundled worker script includes allowed utility libraries (lodash, uuid, CryptoJS) attached to the worker's `self` global. The core engine posts the user's script code and a context object to the worker via `postMessage`. The context exposes `request` (mutable), `variables.get/set`, `environment.get/set`, `skip()`, and `log()`. After script execution, the modified request configuration is posted back to the main thread and used for the actual network call. Timeout is enforced via `Worker.terminate()` (5 seconds). In v2+ (server), scripts run in `isolated-vm` (V8 isolates) with 128MB memory limits.

#### Post-Response Scripts

**What it does:** Runs user-defined JavaScript after a response is received, allowing assertion evaluation, variable extraction, and logging.

**Why it exists:** Custom assertion logic and complex extraction (e.g., parsing an XML response or handling nested response structures) can't be expressed declaratively.

**How it works:** Similar to pre-request scripts, but the injected context exposes `response` (read-only), `request`, `variables`, `environment`, `test()` (Postman-compatible assertion helper), `expect()` (Chai-style assertions), and `log()`. The script runs in the same Web Worker sandbox after the response comes back. Any variables set persist for subsequent requests.

#### Secure Script Sandbox

**What it does:** Prevents scripts from accessing the DOM, IndexedDB, network, or other browser capabilities outside the explicitly injected context.

**Why it exists:** Imported collections may contain malicious scripts. Without sandboxing, opening a malicious collection could compromise the user's data.

**How it works:** The sandbox uses an **adapter pattern** — the same `ScriptSandbox` interface has two implementations:

- **MVP (browser):** `WebWorkerSandbox` — Web Workers run in a separate thread with no access to the main thread's DOM, localStorage, or IndexedDB. The worker is created from a Blob URL with restrictive CSP. User code executes inside the worker with only the injected context available. Timeout enforced via `Worker.terminate()`.
- **v2+ (server):** `IsolatedVmSandbox` — V8 isolates with 128MB memory limits and 5-second timeouts. Same V8 engine as Node.js for 100% behavior consistency.

Both implementations expose the same API to user scripts. Scripts written for one environment work identically in the other.

### 2.6 Assertions & Testing

#### Declarative Assertions

**What it does:** Verifies response properties against expected values using a library of matchers. Supports status codes, response bodies (via JSONPath), headers, timing, and size.

**Why it exists:** Running a request manually and squinting at the response to verify correctness doesn't scale. Automated assertions enable regression testing and CI/CD integration.

**How it works:** Users define assertions as structured data: a source (status/header/body/timing/size), an optional expression (JSONPath for body extraction, header name for headers), a matcher type (equals, contains, greater-than, matches-regex, is-type, has-length, exists, etc.), and an expected value. The assertion engine evaluates each rule after the response is received, extracting the actual value from the appropriate source and comparing against the expected value. Results are returned as pass/fail with actual/expected for failed assertions.

#### JSON Schema Validation

**What it does:** Validates response body structure against a JSON Schema definition.

**Why it exists:** Individual field assertions don't catch missing fields or unexpected additional fields. Schema validation verifies the entire response structure matches the API contract.

**How it works:** Uses Ajv 8 for validation. Users provide a JSON Schema in the assertion config. The engine compiles the schema once and validates the response body. Validation errors are formatted as human-readable messages showing which field failed, what the expected type/format was, and what was actually received.

#### Comprehensive Matcher Library

**What it does:** Provides 15+ matchers for different assertion scenarios.

**Why it exists:** Different response properties require different comparison strategies. Numeric comparisons, string patterns, type checks, and existence checks all have different needs.

**How it works:** Each matcher is a pure function that takes actual and expected values and returns a boolean. Implementations:
- Equality matchers: `equals`, `not-equals`
- String matchers: `contains`, `not-contains`, `starts-with`, `ends-with`, `matches-regex`
- Existence matchers: `exists`, `not-exists`, `is-empty`, `is-not-empty`
- Type matchers: `is-type` (string/number/boolean/array/object/null)
- Comparison matchers: `greater-than`, `less-than`, `greater-than-or-equal`, `less-than-or-equal`
- Structural matchers: `has-length`, `contains-key`
- Advanced: `json-schema` (delegates to Ajv)

### 2.7 Flow Runner

#### Sequential Flow Execution

**What it does:** Runs a predefined sequence of requests in order, passing data between them via extracted variables.

**Why it exists:** Many real-world API operations require multiple steps — authenticate, then create a resource, then update it, then verify. Without a flow runner, users have to execute each step manually and copy data between them.

**How it works:** Flows are stored as ordered arrays of steps. The flow runner iterates through steps sequentially. For each RequestStep, it resolves variables (including any extracted from previous steps), executes the request via the Go executor, runs assertions, extracts new variables per extraction rules, and adds them to the flow scope. All results are collected into a `FlowResult` with per-step status, duration, response, and assertion outcomes.

#### Conditional Branching

**What it does:** Executes different branches of a flow based on response values or variable contents.

**Why it exists:** Real workflows have decision points — "if the user is already logged in, skip the login step" or "if the response indicates an admin user, fetch additional data".

**How it works:** Condition steps evaluate a condition expression (source, JSONPath/variable name, matcher, expected value) and execute either the `thenSteps` array or `elseSteps` array. The condition uses the same matcher library as assertions, so the behavior is consistent.

#### Loop Steps

**What it does:** Repeats a sequence of steps a fixed number of times or until a condition is met.

**Why it exists:** Pagination, polling, and batch operations require loops. Manually duplicating requests for each iteration isn't scalable.

**How it works:** Loop steps contain nested steps and a termination strategy (fixed count or conditional). A `maxIterations` safety limit (default 1000) prevents runaway loops. Each iteration can access a `$loop.iteration` variable for use in request templates.

#### Delay Steps

**What it does:** Pauses flow execution for a specified duration.

**Why it exists:** Rate-limited APIs often require wait time between requests. Async operations (e.g., "create resource, wait 2 seconds, check status") need pauses.

**How it works:** Simple `setTimeout` wrapped in a Promise. Flow runner awaits the promise before continuing to the next step.

#### Flow Cancellation

**What it does:** Stops a running flow mid-execution, returning partial results.

**Why it exists:** Long flows should be cancellable by the user without closing the browser.

**How it works:** The FlowRunner exposes a `cancel()` method that sets an internal cancellation flag. The flow loop checks this flag before each step. When set, any in-flight request is aborted, the flow exits, and a partial FlowResult with status `'cancelled'` is returned.

#### Real-Time Progress Events

**What it does:** Emits events during flow execution (step started, step completed, variable extracted) so the UI can show live progress.

**Why it exists:** Long-running flows (especially with delays) would feel frozen without progress feedback.

**How it works:** The FlowRunner accepts a hooks object with callbacks: `onStepStart`, `onStepComplete`, `onVariableExtracted`, `onError`. The server forwards these events through a WebSocket connection to the UI, which renders a live timeline.

### 2.8 Response Analysis

#### Response Diffing

**What it does:** Compares two responses and highlights additions, removals, and modifications in a structural JSON diff.

**Why it exists:** Developers frequently ask "what changed in this response?" — after a deployment, between environments, or when debugging regressions. Without diffing, they have to manually compare responses side-by-side.

**How it works:** The core engine wraps the `microdiff` library for structural JSON comparison, normalizing its output into invoke's `JsonDiffNode` tree format. Each node is marked as `added`, `removed`, `modified`, or `unchanged`. The wrapper adds invoke-specific features on top: ignore paths (skip timestamps/UUIDs), ignore array order (treat arrays as sets), depth limits, and response-level comparison (status, headers, timing alongside body). The UI renders the diff tree with color coding.

#### Environment Diffing

**What it does:** Executes the same request against two different environments and diffs the responses.

**Why it exists:** Verifying that staging matches production before a deploy, or that dev matches staging before a release, is a common QA activity.

**How it works:** The server executes the request twice in parallel (once per environment), collects both responses, runs the diff engine, and returns the combined result. The UI displays both responses side-by-side with the diff overlay.

#### Temporal Diffing

**What it does:** Compares a response received now against a historical response of the same request.

**Why it exists:** Detecting API changes over time ("did the response shape change after the last deploy?") is essential for maintaining client-server compatibility.

**How it works:** Users select a history entry and a current response. The diff engine runs normally. This is the same operation as environment diffing, but using history as one source.

#### Diff Ignore Rules

**What it does:** Excludes specified JSON paths from the diff (typically timestamps, UUIDs, or other always-changing fields).

**Why it exists:** Without this, every diff would flag timestamp differences, creating noise that obscures meaningful changes.

**How it works:** Users configure `ignorePaths` with JSONPath expressions. During diff computation, nodes matching ignored paths are excluded entirely. Additional options include `ignoreArrayOrder` (treats arrays as sets), `depthLimit` (caps recursion depth), and `showUnchanged` (includes unchanged nodes in output).

### 2.9 Mock Server

#### Mock Server Generation

**What it does:** Starts a local HTTP server that serves recorded responses from a collection's request history.

**Why it exists:** Frontend developers often wait for backend APIs to be built. Mock servers let them develop against stable endpoints based on the API contract.

**How it works:** Users select a collection and configure a port. The core engine (running in the browser) reads the collection from IndexedDB, generates the full mock configuration (all routes, response bodies, conditions, delays), and sends the entire config to the Node.js proxy via `POST /api/mock/start`. The proxy starts a lightweight Hono mock server on the specified port, holding the config **in memory**. Each endpoint in the collection becomes a mock route.

**MVP limitation:** Because the mock server runs on Node.js but data lives in browser IndexedDB, the full mock configuration must be sent from the browser. If the Node.js container restarts, mock server state is lost. The UI detects this via `GET /api/mock/status` and prompts the user to "Restart Mock" — re-pushing the config from IndexedDB. In v2+ (with PostgreSQL), mock configurations are persisted server-side.

#### URL Pattern Matching

**What it does:** Matches incoming mock requests to endpoints using method + path pattern, including path parameters (`:id`).

**Why it exists:** Real APIs use path parameters (`GET /users/:id`). The mock server needs to match these generically.

**How it works:** Endpoint definitions are stored with patterns like `/users/:id`. Incoming requests are matched against these patterns. Path parameters are extracted and made available for dynamic response generation.

#### Dynamic Mock Responses

**What it does:** Supports `{{$uuid}}`, `{{$timestamp}}`, `{{$randomInt}}`, and other dynamic variables in mock response bodies.

**Why it exists:** Static responses are often insufficient — tests expecting unique IDs, random timestamps, or varied values need dynamic generation.

**How it works:** Mock response bodies are templates. Before serving a response, the core engine resolves dynamic variables using the same resolver that handles request variables. Each response gets fresh values.

#### Conditional Responses

**What it does:** Serves different responses based on request properties (headers, query parameters, body fields).

**Why it exists:** Real APIs return different responses for different inputs. Mocks need to simulate this behavior to be useful for realistic testing.

**How it works:** Endpoints can define conditional response rules with matching criteria (header equals, body JSONPath equals, etc.). On each request, the mock server evaluates conditions in order and serves the first matching response. A default response applies if no conditions match.

#### Request Logging

**What it does:** Logs every request received by the mock server with full details (method, path, headers, body, matched endpoint, response served).

**Why it exists:** Debugging mock server behavior ("why did my frontend get a 404?") requires visibility into what the mock received.

**How it works:** Each request is captured as a log entry and stored in memory (capped at 1000 entries). The UI polls or subscribes via WebSocket to display the log in real-time.

### 2.10 Code Generation

#### 14 Language/Library Targets

**What it does:** Generates ready-to-paste code snippets for making the same request in various languages and HTTP libraries.

**Why it exists:** After designing and testing a request in invoke, developers want to copy the working request into their application code. Manually translating between tools is error-prone.

**How it works:** Each target has a dedicated generator function that takes a `RequestConfig` and returns a code string. Generators handle method, URL, query params, headers, body serialization (JSON.stringify for JSON, form encoding for form-data, etc.), auth injection, and language-idiomatic error handling. Supported targets:
- cURL
- JavaScript: fetch, axios, node-fetch
- Python: requests, httpx
- Java/Kotlin: Spring RestTemplate, Spring WebClient, OkHttp
- Go: net/http
- PHP: Guzzle
- C#: HttpClient
- Ruby: Net::HTTP

#### Code Generation Options

**What it does:** Offers customization options like including error handling, resolving variables vs keeping placeholders, indentation size.

**Why it exists:** Different developers have different preferences. Some want inline error handling; others prefer clean code they'll wrap themselves. Some want `{{variables}}` preserved; others want real values substituted.

**How it works:** Generators accept a `CodeGenOptions` parameter that modifies their behavior. Templates are parameterized to handle variations.

### 2.11 Import & Export

#### Format Auto-Detection

**What it does:** Automatically detects the format of an imported file (Postman, OpenAPI, cURL, Insomnia, or Hoppscotch).

**Why it exists:** Users import files from various tools. Asking them to manually specify the format is unnecessary friction.

**How it works:** The detection logic examines the file content for format-specific markers:
- Postman: `info._postman_id` field
- OpenAPI: root `openapi` key or Swagger 2.0 `swagger` key
- Insomnia: `_type: "export"` field
- Hoppscotch: `v` field at root
- cURL: string starts with `curl`

The first matching format is returned. If no format matches, the user is prompted to select manually.

#### Postman v2.1 Import

**What it does:** Imports Postman Collection v2.1 JSON files with full fidelity — collections, folders, requests, scripts, auth, and variables.

**Why it exists:** Postman has massive market share. Making migration painless is essential for adoption.

**How it works:** The parser walks the Postman collection JSON, mapping each item recursively:
- `info` → collection metadata
- `item[]` with `request` → requests
- `item[]` with nested `item[]` → folders
- `event` → pre-request and test scripts (compatible JavaScript API with adapter)
- `auth` → AuthConfig (with conversion between Postman's and invoke's auth representations)
- `variable` → collection-scoped variables

#### OpenAPI 3.x Import

**What it does:** Generates a collection from an OpenAPI 3.0 or 3.1 specification — one request per operation, organized by tags.

**Why it exists:** Most modern APIs provide OpenAPI specs. Importing creates a complete collection automatically instead of manually defining each endpoint.

**How it works:** The parser reads the OpenAPI spec (JSON or YAML), iterates through `paths`, and creates one request per operation (path + method combination). Operations with tags are placed in folders named after the tag. Path/query/header parameters become request params/headers. Request bodies get example payloads generated from schemas (using `example`, `examples`, or type-based synthesis). Security schemes map to auth configs. Servers become environments.

#### cURL Import

**What it does:** Parses cURL command strings into requests.

**Why it exists:** cURL commands are everywhere in documentation, Stack Overflow answers, browser DevTools "Copy as cURL", and debug logs. Quickly converting them to a testable request saves time.

**How it works:** A cURL command parser tokenizes the command respecting quotes and line continuations (`\`). Recognized flags include `-X` (method), `-H` (headers), `-d` / `--data-raw` (body), `-u` (basic auth), `-b` (cookies), `-L` (follow redirects), `-k` (insecure), `-F` (form-data), and `--compressed`. Positional arguments after flags are treated as URLs.

#### Insomnia v4 Import

**What it does:** Imports Insomnia v4 JSON/YAML export files.

**Why it exists:** Insomnia has a significant user base. Providing migration support broadens invoke's addressable audience.

**How it works:** Insomnia's format uses a flat structure where items reference parent IDs. The parser builds the hierarchy by walking parent references, maps workspaces to collections, request_groups to folders, and requests to requests. Insomnia's template tags (`{% variable %}`) are converted to invoke's `{{variable}}` syntax.

#### Hoppscotch Import

**What it does:** Imports Hoppscotch collection JSON files.

**Why it exists:** Hoppscotch is a popular open-source alternative. Users switching to invoke shouldn't have to rebuild their collections.

**How it works:** Hoppscotch's format is closer to invoke's structurally. The parser maps collections to collections, folders to folders, and requests to requests. Auth configurations are converted using a mapping table.

#### invoke YAML Export

**What it does:** Exports a collection as a file-per-request directory structure using YAML format — Git-friendly.

**Why it exists:** Users want to version-control their API definitions alongside code. A single JSON blob per collection doesn't work well with Git (merge conflicts, noisy diffs). File-per-request structure is naturally mergeable.

**How it works:** The exporter creates a directory with:
- `collection.invoke.yaml` — collection metadata, variables, auth
- Subdirectories for folders, each with `folder.invoke.yaml`
- Individual request files as `<request-name>.invoke.yaml`

Each file has a version header (`invoke_version: "1.0"`) for forward compatibility with future format changes.

#### Other Export Formats

**What it does:** Exports collections as single JSON file, Postman Collection v2.1, OpenAPI 3.0, or individual cURL commands.

**Why it exists:** Interoperability with other tools. Users might share collections with teammates who use Postman, generate API docs from an OpenAPI spec, or paste a cURL command in a bug report.

**How it works:** Each exporter is the inverse of its corresponding importer, reversing the field mappings.

### 2.12 History

#### Request History Tracking

**What it does:** Records every executed request with its full configuration, response, timing, and assertion results.

**Why it exists:** Users often want to revisit past requests — to retry a working version after a breaking change, to compare responses over time, or to document what they tested.

**How it works:** After every request execution, the core engine creates a `HistoryEntry` with the raw request config (with `{{variables}}`), resolved config (variables substituted), response, environment used, timing, and assertion results. Entries are saved to IndexedDB with indexed timestamps.

#### Full-Text History Search

**What it does:** Searches across request URLs, headers, bodies, response bodies, and metadata to find past executions.

**Why it exists:** Finding "that request I made last Tuesday where the response had user ID 12345" is otherwise impossible.

**How it works:** The search function iterates through history entries and checks each field against the query. Matches are returned with context snippets and highlighting metadata. For IndexedDB, this is client-side substring matching. Future PostgreSQL implementation will use `tsvector` for better performance.

#### History Retention

**What it does:** Automatically removes old history entries based on configurable retention rules (max age, max entries).

**Why it exists:** Unbounded history would eventually fill browser storage. Automatic pruning keeps the database manageable.

**How it works:** On startup and periodically, the history manager checks entry counts and ages. Entries older than the configured retention period (default 30 days) or beyond the max count (default 10,000) are deleted. Users can also manually clear history via UI controls (clear all, clear by date range, clear by collection).

#### History Filters

**What it does:** Filters history by method, status code range, date range, protocol, collection, or environment.

**Why it exists:** With thousands of history entries, filtering is essential for finding specific executions.

**How it works:** The query function accepts a filter object and applies each filter during iteration. IndexedDB indexes on common fields (timestamp, status) speed up filtering.

### 2.13 Storage

#### IndexedDB Storage

**What it does:** Persists all user data (collections, environments, history, flows, settings) in the browser's IndexedDB.

**Why it exists:** The MVP positioning requires no-account, no-server-side storage. IndexedDB provides durable client-side storage that survives browser restarts.

**How it works:** The `IndexedDBAdapter` uses Dexie.js to wrap the raw IndexedDB API. The schema defines object stores for collections, environments, history, flows, and workspaces. Each store has appropriate indexes for common query patterns. Transactions ensure atomicity for multi-object operations (e.g., duplicating a collection creates new records for the collection, folders, and requests in a single transaction).

#### File/YAML Storage

**What it does:** Reads and writes collections as YAML files on disk (via browser's File System Access API or download/upload).

**Why it exists:** Export/import for Git versioning and sharing. Eventually powers the CLI in v6.

**How it works:** The `FileStorageAdapter` serializes collections to the file-per-request YAML structure. For writing, it uses the File System Access API on Chrome/Edge, or generates a downloadable zip on other browsers. For reading, it parses the uploaded directory structure back into collection objects.

#### Storage Adapter Pattern

**What it does:** Provides a unified `StorageAdapter` interface that allows swapping storage backends without changing business logic.

**Why it exists:** v2 adds PostgreSQL for logged-in users. Without the adapter pattern, all business logic would have to know about both storage types. With the pattern, only the adapter implementations change. The same pattern is used for script sandboxing (`ScriptSandbox` interface with `WebWorkerSandbox` and `IsolatedVmSandbox` implementations).

**How it works:** The interface defines sub-stores (`CollectionStore`, `EnvironmentStore`, `HistoryStore`, `FlowStore`, `WorkspaceStore`) with standardized CRUD method signatures. Business logic depends only on the interface; concrete implementations (IndexedDB, PostgreSQL, File) are injected at runtime based on deployment mode. In the MVP, the browser uses `IndexedDBAdapter`; in v2+, the server uses `PostgresAdapter`.

---

## 3. Web UI Features

The web UI is the primary user interface for the MVP — a Vue 3 SPA that renders in any modern browser. In the MVP, the UI imports `@invoke/core` directly — composables call core engine functions for business logic (variable resolution, assertions, flow orchestration, history, collections) and call the Node.js proxy only for HTTP execution (forwarding resolved requests to the Go executor) and mock server management.

### 3.1 Request Builder

#### Method Selector

**What it does:** Lets users pick the HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) for their request.

**Why it exists:** The method determines the semantics of the request. It's the first thing users set.

**How it works:** A dropdown component with color-coded method options (GET green, POST blue, PUT yellow, DELETE red, etc.). Visual differentiation helps users quickly identify methods in collection lists.

#### URL Bar with Variable Highlighting

**What it does:** Accepts the target URL and visually highlights any `{{variables}}` in the URL, showing their resolved values on hover.

**Why it exists:** Variables are invisible when they're just text. Making them visible helps users understand what their request will actually hit.

**How it works:** A custom text input component scans the URL for `{{variable}}` patterns. Each match is rendered as a colored chip with the variable name. Hovering the chip shows a tooltip with the resolved value from the current environment. Unresolved variables show a warning color.

#### Key-Value Editor (Shared Component)

**What it does:** Provides a reusable editor for key-value pairs with per-row controls (enable/disable, description tooltip, delete).

**Why it exists:** The same interface pattern is used for query parameters, request headers, form-data fields, form-urlencoded fields, and environment variables. Implementing it once as a shared component ensures consistency.

**How it works:** A Vue component that renders a table of rows, each with a key input, value input, enable/disable checkbox, description field (shown on hover), and delete button. An "Add row" button at the bottom. Drag handles allow reordering. The component emits events on changes, letting parent components handle persistence.

#### Params Editor

**What it does:** Edits query parameters. Automatically syncs with the URL query string — editing params updates the URL, and editing the URL updates the params list.

**Why it exists:** URLs with query parameters are verbose and hard to read. A structured editor makes parameters easier to work with.

**How it works:** Uses the shared KeyValueEditor component. A Vue computed property serializes the enabled params to a query string and updates the URL. An input watcher on the URL parses the query string back into params when the user edits the URL directly. The sync is debounced to avoid thrashing.

#### Headers Editor

**What it does:** Edits HTTP headers with autocomplete for common header names.

**Why it exists:** Standard HTTP headers have specific names (Content-Type, Accept, Authorization, Cache-Control, etc.). Autocomplete prevents typos.

**How it works:** Uses the shared KeyValueEditor component with an autocomplete datalist populated with ~100 common header names. Headers inherited from the collection or folder are shown in a separate read-only section so users see what's being applied.

#### Body Editor

**What it does:** Edits the request body in multiple formats: JSON, text, XML, form-data, form-urlencoded, binary, or GraphQL.

**Why it exists:** Different APIs expect different body formats. A good editor adapts to each.

**How it works:** A body type selector dropdown. Based on the selected type, the appropriate editor is rendered:
- **JSON:** CodeMirror 6 with JSON language mode, syntax highlighting, auto-formatting (prettify button), line numbers, bracket matching, and schema error indicators
- **Text/XML:** CodeMirror with appropriate language mode
- **Form-data:** KeyValueEditor with file upload support on values
- **Form-urlencoded:** KeyValueEditor (URL encoded on submit)
- **Binary:** File picker that reads file contents
- **GraphQL:** Dedicated GraphQL editor (see 3.5)

#### Auth Config Panel

**What it does:** Configures authentication per request, with dynamic form based on the selected auth type.

**Why it exists:** Each auth type has different required fields (Bearer needs a token; OAuth2 needs grant type, URLs, credentials, etc.). A type-aware form is more user-friendly than a generic field editor.

**How it works:** A Vue component with an auth type dropdown. Selecting a type renders the corresponding form component (BearerAuthForm, BasicAuthForm, APIKeyAuthForm, OAuth2AuthForm, etc.). An "Inherit from parent" option selects the inheritance mode. OAuth2 forms include a "Fetch Token" button that triggers the OAuth2 flow and caches the result.

#### Script Editor

**What it does:** Edits pre-request and post-response JavaScript scripts with syntax highlighting.

**Why it exists:** Scripting enables advanced logic that declarative configuration can't handle.

**How it works:** Two tabs (Pre-request, Post-response), each containing a CodeMirror instance with JavaScript language mode. A sidebar panel shows the available script API (methods on the injected context object) with documentation. Users can click a method name to insert a code snippet template.

#### Send Button

**What it does:** Executes the request when clicked or when Ctrl+Enter is pressed.

**Why it exists:** The obvious primary action.

**How it works:** A prominently placed button that shows a loading spinner during execution. On click, it gathers the current request configuration from the UI state and calls `POST /api/requests/execute`. The response populates the response viewer. Errors are shown as toast notifications.

#### Save to Collection

**What it does:** Saves the current request to a collection, either as a new request or updating an existing one.

**Why it exists:** Users want to preserve configured requests for reuse.

**How it works:** A dialog opens when the user clicks Save (or presses Ctrl+S). The dialog shows the collection tree with folders. Users pick a target location and enter a name. "Save As" always creates new; "Quick Save" (Ctrl+S) updates the existing saved request if there is one, otherwise opens the dialog.

### 3.2 Response Viewer

#### JSON Tree View

**What it does:** Displays JSON response bodies as a collapsible tree with syntax highlighting and interactive navigation.

**Why it exists:** Raw JSON is hard to read, especially for large responses. A tree view makes structure visible at a glance and lets users navigate efficiently.

**How it works:** A recursive Vue component that renders each node with an expand/collapse toggle, type-colored values, and key labels. Clicking a node's path icon copies the JSONPath to clipboard. Clicking a value copies it. A search input filters visible nodes. For large responses (>1MB), the component uses virtualized rendering to maintain performance.

#### Raw Text View

**What it does:** Shows the response body as raw text with syntax highlighting for JSON, XML, HTML, or plain text.

**Why it exists:** Sometimes users need to see the exact bytes (for debugging whitespace issues, encoding problems, or verifying wire format).

**How it works:** A read-only CodeMirror 6 instance with automatic language detection based on the `Content-Type` header. Word wrap is toggleable. Search within the response is supported.

#### HTML Preview

**What it does:** Renders HTML responses in a sandboxed iframe for visual inspection.

**Why it exists:** Some endpoints return HTML (error pages, OAuth redirects, old APIs). Seeing the rendered page is more useful than raw HTML.

**How it works:** A Vue component that creates an iframe with the `sandbox` attribute (no scripts, no same-origin, no top-level navigation). The HTML content is written into the iframe's document. Security is maintained through the sandbox restrictions.

#### Response Tab Bar

**What it does:** Organizes response sections into tabs: Body, Headers, Timing, TLS, Cookies, Assertions.

**Why it exists:** Response data has multiple facets. Cramming them all onto one screen is overwhelming.

**How it works:** A tabbed component with badges showing counts (e.g., "Headers (8)", "Assertions (5/6 passed"). Click a tab to switch views.

#### Timing Waterfall

**What it does:** Visualizes request timing as a horizontal waterfall chart showing DNS lookup, TCP connection, TLS handshake, TTFB, and transfer phases as colored bars.

**Why it exists:** Seeing where time is spent helps diagnose performance issues. "Slow response" could be DNS, network, server processing, or transfer — each requires different remediation.

**How it works:** An SVG component that renders five horizontal bars, each sized proportionally to its phase duration. Phase labels and millisecond values are displayed alongside each bar. Total time is shown prominently. The chart uses CSS variables for theming to match dark/light mode.

#### TLS Info Panel

**What it does:** Shows TLS certificate details — chain, subjects, issuers, validity dates, SANs, cipher suite, protocol version.

**Why it exists:** Developers debugging TLS issues or auditing security need this data. No other API client shows it this clearly.

**How it works:** A Vue component that renders the certificate chain as a list, with each certificate displayed in a card showing its details. Expired or soon-to-expire certificates (< 30 days) are highlighted with warning colors. The cipher suite and TLS version are shown above the chain.

#### Cookies Table

**What it does:** Shows all cookies set by the response with their attributes (domain, path, expires, secure, httpOnly, sameSite).

**Why it exists:** Cookie-based auth is still common. Debugging cookie issues requires seeing all attributes, not just names and values.

**How it works:** A sortable table component populated from the `Set-Cookie` response headers (parsed into structured cookie objects). Each row shows cookie name, value (toggleable mask), domain, path, expiration, and flag badges.

#### Assertion Results

**What it does:** Shows the pass/fail status of every assertion configured for the request.

**Why it exists:** Without clear visibility into assertion results, declarative testing is useless.

**How it works:** A list component that renders each assertion as a row with a status icon (green check or red X), the assertion description, and (for failures) the expected vs actual values. A summary at the top shows "5/6 passed". Failed assertions are expandable to show detailed diff information.

#### Status Bar

**What it does:** Shows the most important response metrics (status code, time, size, HTTP version) in a persistent bottom bar.

**Why it exists:** Users glance at these values constantly. Having them always visible avoids repeated tab switching.

**How it works:** A bottom bar component with four segments. Status code is color-coded (2xx green, 3xx blue, 4xx yellow, 5xx red). Values update immediately when a response is received.

### 3.3 Collection Sidebar

#### Collection Tree

**What it does:** Displays collections, folders, and requests as a hierarchical tree in the left sidebar.

**Why it exists:** The primary navigation for a user's saved work. Users spend significant time in this tree.

**How it works:** A recursive Vue component that renders collections as root nodes, folders as expandable children, and requests as leaf nodes. Clicking a request opens it in the request builder. Clicking a folder toggles expansion. The tree uses virtualization to handle 1000+ items without performance issues.

#### Tree Node Styling

**What it does:** Provides visual distinction between node types — collections get a folder icon and request count, folders get an expand icon and name, requests get a method badge and protocol icon.

**Why it exists:** Visual differentiation helps users scan the tree quickly. Method badges (colored GET/POST/etc.) are especially useful for identifying request types at a glance.

**How it works:** Three Vue components (CollectionNode, FolderNode, RequestNode) with distinct styling. Method badges use the same color scheme as the method selector for consistency. Protocol icons (REST/GraphQL/WS/gRPC) appear next to request names.

#### Drag-and-Drop

**What it does:** Allows users to reorder tree items and move them between containers by dragging.

**Why it exists:** Organizing by drag-and-drop is the expected interaction pattern. Context menu "Move to..." dialogs feel clunky in comparison.

**How it works:** Uses `vuedraggable` or a similar Vue drag-drop library. Visual drop indicators show where the item will land during drag. On drop, the sort order and/or parent reference is updated via the reorder API. The tree re-renders with the new arrangement.

#### Context Menu

**What it does:** Provides right-click actions: Rename, Duplicate, Delete, Move to..., Export, New Request, New Folder.

**Why it exists:** Quick actions without navigating menus. Standard desktop UX pattern.

**How it works:** A Vue context menu component triggered by `contextmenu` events on tree nodes. Actions are filtered based on node type (you can't "New Folder" on a request). Destructive actions show a confirmation dialog.

#### Sidebar Search

**What it does:** Filters the tree to show only matching items as the user types.

**Why it exists:** Large collections benefit from search. Full-text search (via command palette) is for deep content search; sidebar search is fast name filtering.

**How it works:** A search input at the top of the sidebar. As the user types, the tree is re-rendered with only nodes whose names match the query. Matching text is highlighted. Parent folders of matching items are expanded automatically.

#### Inline Rename

**What it does:** Double-clicking a node name enters edit mode for quick renaming.

**Why it exists:** Quick renames without opening a settings dialog.

**How it works:** Double-click toggles the node's name into an input field. Enter saves, Escape cancels. The update is sent to the server via the update API.

### 3.4 Environment Manager

#### Environment Switcher

**What it does:** A dropdown in the top bar showing all environments with the active one highlighted.

**Why it exists:** Users switch environments frequently during development. A prominent, always-visible switcher makes this one-click fast.

**How it works:** A Vue dropdown component populated from the environment store. The currently active environment is shown in the button. Selecting a different environment updates the active environment state, triggering re-resolution of all variables.

#### Environment Editor

**What it does:** A full-page view for managing environment variables — table of variables with initial value, current value, description, and sensitive flag.

**Why it exists:** Detailed environment management needs more space than a sidebar panel.

**How it works:** A dedicated view accessible from the environment switcher. The variable table uses the shared KeyValueEditor component extended with columns for initial value (committed), current value (runtime), description, sensitive toggle, and enable/disable. Changes autosave after a short debounce.

#### Sensitive Variable Masking

**What it does:** Masks sensitive variable values in the UI with `••••••••`, revealed on click.

**Why it exists:** Tokens and secrets shouldn't be visible to onlookers (screen sharing, over-the-shoulder observation).

**How it works:** The variable row has a sensitive flag. When set, the value input shows dots instead of the actual value. Clicking the eye icon temporarily reveals the value. The flag is persisted in storage.

#### Bulk Edit Mode

**What it does:** Switches between table editing and raw text editing (KEY=VALUE per line) for quick bulk changes.

**Why it exists:** Adding 20 variables one by one is tedious. Pasting a `.env` file's contents is much faster.

**How it works:** A toggle switches between two view modes. Table mode renders the structured editor. Bulk mode renders a CodeMirror textarea with KEY=VALUE format. Switching parses the content and updates the other view.

#### .env File Import

**What it does:** Imports a `.env` file, previewing contents before creating an environment or merging into an existing one.

**Why it exists:** Users have existing `.env` files from their applications. Direct import is much faster than manual entry.

**How it works:** A file picker opens the selected file. The contents are parsed by the core engine's `.env` parser. A preview shows detected variables with their values (sensitive ones masked). The user chooses to create a new environment or merge into an existing one.

### 3.5 GraphQL Client

#### Query Editor

**What it does:** Edits GraphQL queries with syntax highlighting, bracket matching, and autocomplete (when a schema is available).

**Why it exists:** GraphQL queries have specific syntax. A dedicated editor with language support reduces errors.

**How it works:** A CodeMirror 6 instance configured with GraphQL language mode. Autocomplete uses the loaded schema to suggest types, fields, and arguments. Syntax errors are highlighted in real-time.

#### Variables Editor

**What it does:** Edits GraphQL query variables as JSON, separately from the query itself.

**Why it exists:** GraphQL separates query structure from variable values. Parameterizing queries with variables is a best practice.

**How it works:** A second CodeMirror instance with JSON language mode, rendered alongside the query editor.

#### Schema Introspection

**What it does:** Fetches the target server's schema via the introspection query and caches it for use in autocomplete and exploration.

**Why it exists:** Knowing the schema enables autocomplete, validation, and exploration. Without it, users have to reference external documentation.

**How it works:** A "Fetch Schema" button triggers a POST request with the standard GraphQL introspection query (`__schema { types ... }`). The response is cached per URL. Subsequent operations use the cached schema.

#### Schema Explorer

**What it does:** Browses the schema's types, queries, mutations, and subscriptions with field-level details.

**Why it exists:** Visual schema exploration is the fastest way to discover what an API offers. Reading raw introspection JSON is painful.

**How it works:** A sidebar panel that tree-renders the schema. Root types (Query, Mutation, Subscription) expand to show available fields. Each field expands to show arguments with types and descriptions. Clicking a field inserts a skeleton query into the editor.

#### Operation Selector

**What it does:** For query documents containing multiple operations, shows a dropdown to select which to execute.

**Why it exists:** Users often develop multiple related queries in the same document. The active operation determines which runs.

**How it works:** The query editor parses the document and extracts operation names. A dropdown shows all operations. The selected operation name is sent in the request as `operationName`.

### 3.6 WebSocket Client

#### Connection UI

**What it does:** URL input, Connect/Disconnect button, and connection status indicator.

**Why it exists:** WebSocket connections are stateful (connected/disconnected). The UI needs to reflect the current state.

**How it works:** A component with a URL input (accepting `ws://` or `wss://`), a Connect button that changes to Disconnect when connected, and a colored status dot (green=connected, yellow=connecting, red=disconnected or error).

#### Message Composer

**What it does:** Composes messages to send over the WebSocket connection, with text or JSON format options.

**Why it exists:** Interactive testing of WebSocket protocols requires sending messages.

**How it works:** A CodeMirror text area for the message content, a format selector (text/JSON), and a Send button. Sent messages appear in the message log immediately.

#### Message Log

**What it does:** Shows all messages sent and received in chronological order with timestamps and direction indicators.

**Why it exists:** WebSocket debugging requires seeing the full conversation. Without the log, users are flying blind.

**How it works:** A scrollable list component. Each entry shows a direction arrow (↑ for sent, ↓ for received), a timestamp, a message type badge (text/binary/ping/pong/close), and the message body (collapsible for long messages). Auto-scrolls to the bottom on new messages.

#### Custom Headers

**What it does:** Sets custom headers on the WebSocket upgrade request.

**Why it exists:** Some WebSocket servers require specific headers (auth tokens, subprotocols) on the upgrade request.

**How it works:** A standard headers editor (reusing the KeyValueEditor component). Headers are sent with the initial upgrade request.

### 3.7 gRPC Client

#### Connection UI

**What it does:** Server URL input (host:port), TLS toggle, and Connect button.

**Why it exists:** gRPC servers are identified by host:port rather than URL paths. A dedicated connection UI handles this format.

**How it works:** A form with host and port inputs, a TLS toggle (with optional client certificate upload), and a Connect button that initiates reflection on click.

#### Service Explorer

**What it does:** Displays discovered services and their methods, populated via server reflection or uploaded proto files.

**Why it exists:** Developers need to browse available RPCs to know what to call.

**How it works:** A tree view component that lists services at the top level, expanding to show methods. Each method shows its input and output types. Clicking a method selects it and loads a skeleton request message.

#### Message Editor

**What it does:** Edits the gRPC request message as JSON with field hints from the proto schema.

**Why it exists:** Raw JSON editing without knowing the expected structure is error-prone. Field hints guide users to correct payloads.

**How it works:** A CodeMirror instance with a skeleton JSON generated from the method's input type. Field names and types are shown as inline hints. Unknown fields trigger validation warnings.

#### Metadata Editor

**What it does:** Edits gRPC metadata (the equivalent of HTTP headers).

**Why it exists:** gRPC uses metadata for auth tokens, deadlines, and custom contexts. Setting this is required for most real services.

**How it works:** A standard KeyValueEditor component.

#### Response Viewer

**What it does:** Displays the gRPC response — message (as JSON), metadata, trailing metadata, status code, and duration.

**Why it exists:** Full response visibility is needed for debugging.

**How it works:** A tabbed component showing each section. The message is rendered with the JSON tree view component. Metadata uses the shared header table component.

### 3.8 Flow Builder

#### Flow Canvas

**What it does:** A visual drag-and-drop canvas for designing request flows.

**Why it exists:** Flows have branching and looping logic that's hard to express in a linear editor. A visual canvas makes the logic legible.

**How it works:** An SVG-based canvas (or HTML with absolute positioning) where users drag nodes from a toolbar onto the canvas. Nodes have input/output ports that connect via lines. Zooming and panning are supported for complex flows. Node positions are saved as part of the flow definition.

#### Flow Step Node

**What it does:** Represents a single request in the flow, configured to reference a saved request with optional overrides, extractions, and assertions.

**Why it exists:** The building block of flows.

**How it works:** A custom Vue component rendered on the canvas. Shows the request name, method badge, and summary of extractions and assertions. Double-click opens a configuration panel for editing. Overrides let users modify URL, headers, or body for the flow context without changing the saved request.

#### Condition Node

**What it does:** Branches flow execution based on a condition.

**Why it exists:** Conditional logic is essential for non-trivial flows.

**How it works:** A node with two output ports (then/else). The configuration panel defines the condition (source, expression, matcher, expected). At execution time, the engine evaluates the condition and follows the appropriate path.

#### Delay and Loop Nodes

**What it does:** Delay nodes pause the flow; loop nodes repeat a sequence of steps.

**Why it exists:** Flow control primitives beyond simple sequencing.

**How it works:** Delay nodes are simple — they show a duration and pause execution. Loop nodes are containers — they hold nested steps that repeat. The loop node's configuration specifies the termination (fixed count, conditional, with max iteration safety).

#### Variable Flow Lines

**What it does:** Visual lines connecting nodes show how extracted variables flow between them.

**Why it exists:** Understanding data dependencies is critical for complex flows. Without visual indication, users have to mentally trace variable usage.

**How it works:** When a node extracts a variable and a subsequent node uses it, a line is drawn connecting the nodes with the variable name labeled. Lines are color-coded by direction.

#### Flow Execution Timeline

**What it does:** Shows the live execution of a flow as it runs — current step, durations, results, and variables at each step.

**Why it exists:** Flows can take minutes to run. Without progress visibility, users can't tell what's happening.

**How it works:** A timeline component that receives real-time events via WebSocket. Each step shows its status (running/passed/failed), duration, and (on click) full response details. Variables available at each step are shown in a side panel.

### 3.9 Diff Viewer

#### Diff Viewer

**What it does:** Side-by-side comparison of two responses with color-coded additions, removals, and modifications.

**Why it exists:** The visual output of the diff engine.

**How it works:** A component that renders two JSON trees side-by-side with synchronized scrolling. Additions are green, removals red, modifications yellow, unchanged gray (or hidden). Expanded/collapsed state syncs between the two trees.

#### Diff Source Selector

**What it does:** Selects the two sources to compare — two environments, two history entries, or two requests.

**Why it exists:** Different diff scenarios need different inputs.

**How it works:** A form with three diff modes. Each mode shows appropriate inputs (environment pickers, history entry selectors, request pickers). Clicking "Compare" triggers execution (if needed) and renders the result.

#### Header and Timing Diffs

**What it does:** Shows differences in response headers and timing alongside the body diff.

**Why it exists:** Changes aren't always in the body — headers and timing may differ too, and those differences can matter.

**How it works:** Two additional sub-components render below the body diff. The header diff shows added/removed/modified rows. The timing diff overlays both timing waterfalls for visual comparison.

### 3.10 History Browser

#### History List

**What it does:** Chronological list of past request executions with filtering options.

**Why it exists:** Browsing history is how users find past executions.

**How it works:** A scrollable list with each entry showing method, URL (truncated), status code (colored), response time, timestamp, and environment. Filter controls at the top narrow results by method, status range, date range, and protocol. Search input triggers full-text history search.

#### History Detail View

**What it does:** Shows the full request and response for a selected history entry.

**Why it exists:** Users need to see everything about a past execution — not just summary fields.

**How it works:** A view that reuses the ResponseViewer components to display the full response. Also shows the request configuration as it was at the time of execution. Read-only.

#### Restore and Compare

**What it does:** "Restore" loads the historical request into the request builder; "Compare" opens two history entries in the diff view.

**Why it exists:** The two common actions on history entries — re-run or compare.

**How it works:** Buttons on the history detail view. Restore copies the request config to the active tab in the request builder. Compare opens the diff view with both entries pre-selected.

### 3.11 Mock Server Manager

#### Mock Server Controls

**What it does:** Starts and stops mock servers, shows their status, and displays the base URL for connecting clients.

**Why it exists:** The primary management interface for mock servers.

**How it works:** A view with a collection selector (which collection to mock), port input, and Start/Stop button. When running, shows the base URL (`http://localhost:PORT`) and a colored status indicator.

#### Endpoint List

**What it does:** Shows all mocked endpoints in a table with method, path pattern, status code, and response body preview.

**Why it exists:** Users need to see what endpoints exist and edit their mock responses.

**How it works:** A table component populated from the mock server's endpoint list. Clicking a row opens an editor for that endpoint's response (body, headers, status code, delay).

#### Mock Request Log

**What it does:** Live log of incoming requests to the mock server.

**Why it exists:** Debugging client integrations — "did my frontend actually hit the right endpoint?"

**How it works:** A log view that auto-updates via WebSocket. Each entry shows timestamp, method, path, matched endpoint (or "unmatched"), and response status.

### 3.12 Import/Export Dialogs

#### Import Dialog

**What it does:** Imports collections from external formats with auto-detection and preview.

**Why it exists:** Making migration painless is key for adoption.

**How it works:** A dialog with a drag-and-drop zone or file picker. On file selection, the format is auto-detected and displayed. A preview shows what will be imported (collection name, request count, folder count, environment count). Confirm button triggers the import.

#### Export Dialog

**What it does:** Exports collections in various formats with scope selection.

**Why it exists:** Users want to back up, share, or export to other tools.

**How it works:** A dialog with format selector (YAML, JSON, Postman, OpenAPI, cURL), scope selector (entire collection, specific folder, single request), and Download button. On download, the export is generated and saved via File System Access API (Chrome/Edge) or download trigger (other browsers).

### 3.13 Code Export Panel

#### Target Selector and Generated Code

**What it does:** Generates code snippets for the current request in 14 languages/libraries, with copy-to-clipboard.

**Why it exists:** After testing a request in invoke, developers copy working code to their application.

**How it works:** A panel or tab in the response viewer. A target dropdown lists available options. When selected, the code is generated via the `/api/codegen` endpoint and displayed in a read-only CodeMirror instance with appropriate syntax highlighting. A Copy button copies to clipboard. The code regenerates automatically when the request changes.

### 3.14 Settings

#### General Settings

**What it does:** Configures theme (dark/light/system), auto-save interval, editor font size, tab size, and word wrap.

**Why it exists:** User preferences for a tool they'll spend hours in.

**How it works:** A settings view with form controls. Changes persist to localStorage and apply immediately.

#### Proxy Settings

**What it does:** Configures a global proxy for all requests.

**Why it exists:** Corporate networks often require proxy usage.

**How it works:** Form fields for proxy type (HTTP/SOCKS5), URL, username, and password. Settings are included in the request options for every request.

#### Certificate Settings

**What it does:** Manages client certificates and custom CA bundles.

**Why it exists:** mTLS and self-signed certificates require this configuration.

**How it works:** A list of certificates with add/delete controls. Adding opens a file picker for PEM files (cert and key for client certs; cert only for CA bundles). Certificates are stored in IndexedDB and associated with hostnames.

#### Keyboard Settings

**What it does:** Customizes keyboard shortcuts.

**Why it exists:** Power users have personal preferences. Forcing defaults alienates them.

**How it works:** A table of all shortcuts with their current bindings. Clicking a binding enters capture mode where the next key combination becomes the new binding. A "Reset to defaults" button undoes customizations.

### 3.15 Command Palette & Keyboard Shortcuts

#### Command Palette

**What it does:** Global search interface activated by Ctrl+K — finds collections, requests, history, environments, and commands.

**Why it exists:** Keyboard-driven users don't want to navigate menus. A command palette is the fastest way to do anything.

**How it works:** A Vue modal that appears on Ctrl+K. As the user types, fuzzy matching filters results across all searchable content. Results are grouped by category. Arrow keys navigate, Enter selects, Escape closes. Recent items appear at the top when the input is empty.

#### Keyboard Shortcuts

**What it does:** Provides keyboard shortcuts for common actions (send request, save, switch tabs, etc.).

**Why it exists:** Productivity — mouse navigation is slow.

**How it works:** The `@vueuse/core` `useMagicKeys` composable detects key combinations globally. Each shortcut triggers the corresponding action. Shortcuts respect customizations from settings.

### 3.16 Shell & Layout

#### App Layout Shell

**What it does:** The overall app structure — collapsible sidebar (left), main content area (center/right), status bar (bottom).

**Why it exists:** Every screen needs this framing. A consistent shell provides spatial orientation.

**How it works:** A Vue App component using CSS Grid for layout. Sidebar width is persisted. The main area renders the current route (workspace, flow, diff, history, mock, settings).

#### Theme System

**What it does:** Toggles between dark and light themes with system preference detection.

**Why it exists:** Developers overwhelmingly prefer dark mode, but some users prefer light or need it in certain environments (bright rooms, accessibility).

**How it works:** CSS variables define color tokens. A dark and light palette is defined. A Vue composable (`useTheme`) manages the active theme, updates a class on the `<html>` element, and persists the preference. PrimeVue's theme module is coordinated to match.

#### Split Panes

**What it does:** Resizable split between panels (sidebar+main, request+response).

**Why it exists:** Users have different screen sizes and preferences for panel sizes.

**How it works:** A custom Vue component with a drag handle. Dragging updates the flex ratios. Sizes persist to localStorage.

#### Tab Bar

**What it does:** Tabs for multiple open requests, with unsaved indicators and close buttons.

**Why it exists:** Working on multiple requests simultaneously is common. Tabs avoid losing work when switching between them.

**How it works:** A horizontal tab component with drag-to-reorder and keyboard shortcuts (Ctrl+Tab to cycle). Unsaved tabs show a dot indicator. Closing a tab with unsaved changes prompts for confirmation.

#### Toast Notifications

**What it does:** Shows temporary notifications for success, error, warning, and info events.

**Why it exists:** Feedback for background operations (save completed, import failed, etc.) without modal interruption.

**How it works:** A Vue toast component triggered by a `useToast()` composable. Toasts auto-dismiss after a configurable duration and stack in a corner of the screen.

---

## 4. Infrastructure Features

### 4.1 Public Hosted Deployment

#### invoke.dev Hosting

**What it does:** Hosts the public version of invoke at invoke.dev for zero-install usage.

**Why it exists:** Lowest friction entry point. Users can try invoke immediately without installing anything.

**How it works:** Docker containers (Nginx serving the Vue SPA, Node.js running the Hono server, Go running the executor) deployed to a VPS (Contabo Singapore). Cloudflare provides CDN for static assets and SSL termination. A domain points to the VPS.

#### CDN Delivery

**What it does:** Serves the Vue SPA assets from a global CDN for fast loading worldwide.

**Why it exists:** Developers in any region should get fast load times.

**How it works:** Cloudflare caches the SPA's static assets (JS, CSS, images) at edge locations. Only API calls go to the origin server.

### 4.2 Self-Hosted Docker

#### Docker Compose Setup

**What it does:** Provides a single `docker compose up` command to run a complete invoke instance on any server.

**Why it exists:** Teams that can't use the public hosted service (privacy requirements, internal networks) need self-hosting.

**How it works:** A `docker-compose.yml` defines three services — UI (Nginx with Vue SPA), Server (Node.js with Hono and @invoke/core), and Executor (Go binary). The services communicate over an internal Docker network. Users run `docker compose up` and access the UI at `localhost:3000`.

#### Published Docker Images

**What it does:** Official Docker images published to GitHub Container Registry.

**Why it exists:** Users shouldn't have to build images themselves. Official images ensure everyone runs the same code.

**How it works:** Each release builds and publishes images (`invoke/ui`, `invoke/server`, `invoke/executor`, `invoke/all-in-one`) to ghcr.io via GitHub Actions. Images are tagged with version numbers and `latest`.

### 4.3 All-in-One Container

#### Single-Container Deployment

**What it does:** A single Docker image that combines UI, server, and executor for the simplest possible deployment.

**Why it exists:** For solo users or quick tests, running three separate containers is overkill. One container is simpler.

**How it works:** A multi-stage Dockerfile combines all three binaries. A supervisord or shell script starts all processes inside the container. Nginx serves the UI and proxies `/api` to the Node.js server. The Go executor runs as a sidecar process. Users run `docker run -p 3000:3000 invoke/all-in-one:latest` and get the full experience.

### 4.4 CI/CD Pipeline

#### GitHub Actions CI

**What it does:** Runs linting, tests, and build verification on every pull request and push.

**Why it exists:** Catches regressions before they reach main. Makes contributing safe.

**How it works:** A `.github/workflows/ci.yml` file defines a workflow that checks out code, installs pnpm, runs lint, runs tests for core (Vitest), runs tests for server (Vitest + Supertest), runs tests for Go executor (go test), and verifies all Docker images build successfully.

#### Release Pipeline

**What it does:** Automatically builds and publishes Docker images when a version tag is pushed.

**Why it exists:** Manual release processes are error-prone. Automation ensures consistency.

**How it works:** A `.github/workflows/release.yml` triggered by pushing a tag matching `v*`. It builds all Docker images, tags them with the version, and pushes them to ghcr.io. It also creates a GitHub Release with changelog auto-generated from commits.

---

## 5. Feature Count Summary

| Layer | Category | Count |
|-------|----------|-------|
| **Core Engine** | Request execution | 9 |
| | Variables & environments | 5 |
| | Collections & organization | 4 |
| | Authentication | 8 |
| | Scripting | 3 |
| | Assertions & testing | 3 |
| | Flow runner | 6 |
| | Response analysis | 4 |
| | Mock server | 5 |
| | Code generation | 2 |
| | Import & export | 9 |
| | History | 4 |
| | Storage | 3 |
| **Web UI** | Request builder | 9 |
| | Response viewer | 8 |
| | Collection sidebar | 6 |
| | Environment manager | 5 |
| | GraphQL client | 5 |
| | WebSocket client | 4 |
| | gRPC client | 5 |
| | Flow builder | 6 |
| | Diff viewer | 3 |
| | History browser | 3 |
| | Mock server manager | 3 |
| | Import/export dialogs | 2 |
| | Code export panel | 1 |
| | Settings | 4 |
| | Command palette & shortcuts | 2 |
| | Shell & layout | 5 |
| **Infrastructure** | Public hosted | 2 |
| | Self-hosted Docker | 2 |
| | All-in-one container | 1 |
| | CI/CD pipeline | 2 |
| **Total** | | **~142 features** |

---

## Notes

- Features that reference other phases (v2-v6) are explicitly excluded from the MVP.
- All MVP features are available to anonymous users without accounts or signup.
- All data is stored locally in the user's browser via IndexedDB.
- No premium or paid features — everything listed here is in the free, open-source MVP.
