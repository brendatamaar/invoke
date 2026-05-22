# invoke — Product Requirements Document

**Version:** 1.1
**Last Updated:** May 21, 2026
**Author:** Brendatama
**Status:** Active

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Positioning](#3-product-vision--positioning)
4. [Architecture Overview](#4-architecture-overview)
5. [System Architecture Detail](#5-system-architecture-detail)
6. [Core Engine Specification](#6-core-engine-specification)
7. [Go HTTP Executor Specification](#7-go-http-executor-specification)
8. [Web UI Specification](#8-web-ui-specification)
9. [CLI Specification](#9-cli-specification)
10. [Protocol Support](#10-protocol-support)
11. [Collection & Data Management](#11-collection--data-management)
12. [Environment & Variable System](#12-environment--variable-system)
13. [Flow Runner (Request Chaining)](#13-flow-runner-request-chaining)
14. [Response Diffing](#14-response-diffing)
15. [Mock Server](#15-mock-server)
16. [Import & Export](#16-import--export)
17. [Code Generation](#17-code-generation)
18. [Assertion Engine](#18-assertion-engine)
19. [History & Search](#19-history--search)
20. [Authentication & Authorization](#20-authentication--authorization)
21. [Deployment Models](#21-deployment-models)
22. [Storage Architecture](#22-storage-architecture)
23. [Tech Stack](#23-tech-stack)
24. [Project Structure](#24-project-structure)
25. [gRPC Contract (Proto Definition)](#25-grpc-contract-proto-definition)
26. [API Routes](#26-api-routes)
27. [UI Component Inventory](#27-ui-component-inventory)
28. [Keyboard Shortcuts](#28-keyboard-shortcuts)
29. [Non-Functional Requirements](#29-non-functional-requirements)
30. [Feature Inventory](#30-feature-inventory)
31. [Licensing](#31-licensing)
32. [Resolved Decisions & Future Considerations](#32-resolved-decisions--future-considerations)
33. [Glossary](#33-glossary)

---

## 1. Executive Summary

**invoke** is a modern, open-source API development and testing platform designed to replace Postman for developers who value speed, privacy, and developer experience. It provides a web-based UI for interactive API testing, backed by a TypeScript core engine for business logic and a Go sidecar for high-precision HTTP execution.

invoke is built for both solo developers and small teams (2–10 developers). It is available as a public hosted service (invoke.dev) and as a self-hosted Docker deployment for teams that require data privacy. All features are available in both deployment modes with no premium gating.

The product supports REST, GraphQL, WebSocket, and gRPC protocols. All four protocols are fully implemented in the current release. The current release is a fully functional, browser-based API testing tool for anonymous users with no account required.

**Tagline:** *"Invoke your APIs."*

---

## 2. Problem Statement

### 2.1 Developer Pain Points with Postman

The following pain points are derived from developer community feedback, reviews (G2, Capterra, Software Advice, PeerSpot), and competitive analysis of alternatives (Bruno, Hoppscotch, Insomnia).

#### 2.1.1 Forced Account & Cloud Dependency
Postman requires mandatory account creation to use the application. API secrets, tokens, request bodies, and responses are synced to Postman's cloud by default. Developers working with sensitive or internal APIs are uncomfortable with this. Many enterprise environments prohibit uploading confidential data to third-party clouds.

#### 2.1.2 Performance & Bloat
Postman is an Electron application that consumes significant memory. Workspaces with 2,000+ requests take minutes to load. The application has grown into a platform with features most developers never use (API governance, networks, AI add-ons), adding complexity and weight.

#### 2.1.3 Disconnection from Developer Workflow
Postman collections exist outside the development workflow. They are not version-controlled with code. Developers context-switch between their IDE, Git workflow, and Postman's interface. API testing is disconnected from the development lifecycle.

#### 2.1.4 Poor Search
Postman's search does not look inside request body payloads. Collection management is described as cumbersome by reviewers. Finding a specific request in a large workspace requires manual navigation.

#### 2.1.5 Pricing & Usage Limits
Postman limits free-tier users to 25 local collection runs per month. Paid plans are expensive for larger teams. Per-seat pricing compounds quickly.

#### 2.1.6 Weak Reporting & Limited Test Types
Reporting is basic. Postman is limited to request/response validation. Users want database validation, end-to-end testing, and better integration with test management tools.

#### 2.1.7 Integration Friction
Integrating Postman with other applications and creating automation tools is more difficult than expected. CI/CD integration requires Newman, a separate tool.

### 2.2 Gaps in Current Alternatives

| Tool | Strength | Gap |
|------|----------|-----|
| Bruno | Git-native, offline-first, privacy | CLI/file-only, no web UI, limited features (no mock server, weaker testing) |
| Hoppscotch | Lightweight, browser-based | Governance and ecosystem less mature, weaker team collaboration |
| Insomnia | Familiar Postman-like UX, GraphQL | History of ownership/cloud controversies, collaboration only in paid tier |
| Thunder Client | Zero context-switch (VS Code) | VS Code only, limited features |
| HTTPie | Great CLI + desktop | Not team-oriented, no flow/chaining |

### 2.3 Opportunity

There is no tool that combines:

- Browser-based web UI (no Electron, no install)
- Full privacy (no account required, self-hostable)
- Git-friendly collection format
- Multi-protocol support (REST, GraphQL, WebSocket, gRPC)
- Advanced features (flow builder, response diffing, mock server)
- High-precision HTTP timing data
- CI/CD-ready from day one

invoke fills this gap.

---

## 3. Product Vision & Positioning

### 3.1 Vision Statement

invoke aims to be the API development tool that developers actually enjoy using — fast, private, and powerful without being bloated.

### 3.2 Design Principles

1. **No bloat** — Every feature must earn its place. If 80% of users won't use it, it doesn't belong in the core product.
2. **Privacy by default** — No mandatory accounts. No cloud sync of sensitive data. Self-hostable for teams with strict data requirements.
3. **Developer-first UX** — Keyboard-driven, fast rendering, information-dense without being cluttered. Designed for developers who spend hours testing APIs.
4. **Git-friendly** — Collections are files that can be committed, branched, and code-reviewed alongside application code.
5. **One tool, multiple interfaces** — The same core engine powers the web UI, and is designed to power a desktop app and CLI in future releases. Collections and configurations work identically across all interfaces.
6. **Accurate measurements** — HTTP timing data is precise and trustworthy, powered by a Go sidecar with nanosecond-level instrumentation.

### 3.3 Competitive Positioning

invoke sits at the intersection of Postman's feature depth, Bruno's privacy-first philosophy, and Hoppscotch's lightweight browser experience.

### 3.4 What invoke Is NOT

- invoke is not an API gateway or API management platform.
- invoke is not a load testing tool (though it supports basic benchmarking).
- invoke is not an API documentation generator (though it can export collections as docs).
- invoke does not aim to be an all-in-one API lifecycle platform. It focuses on building, testing, and debugging APIs.

### 3.5 Competitive Advantage

invoke wins because:

1. **Zero-friction start** — Open invoke.dev, send a request in 5 seconds. No account, no download, no onboarding wizard. Postman requires mandatory sign-up; Bruno requires a desktop install; Insomnia requires an account for collaboration.

2. **Git-native collections** — Export collections as file-per-request YAML. Branch, merge, and code-review API definitions like any other code. No proprietary sync, no vendor lock-in.

3. **Privacy by default** — All data lives in your browser. No cloud sync, no telemetry, no one else sees your API keys. Self-host for full control.

4. **Instant startup** — Browser-based means <1 second to ready. No Electron boot time, no workspace loading, no "Postman is updating" splash screens.

5. **One core, many interfaces** — The same `@invoke/core` powers the web UI. Your collections work everywhere.

6. **Precision HTTP timing** — Go sidecar with `httptrace` gives you real DNS, TCP, TLS, TTFB measurements — not approximations. No other browser-based tool offers this.

7. **Open formats** — YAML collections, standard `.env` files, OpenAPI export. Your data is always portable. No proprietary lock-in, no JSON blobs that only one tool can read.

---

## 4. Architecture Overview

invoke uses an **isomorphic architecture** — the same core engine (`@invoke/core`) runs in different environments depending on the deployment phase.

### 4.0 Architecture (Thick Client)

`@invoke/core` runs **inside the browser** alongside the React UI. It reads IndexedDB directly, resolves variables, orchestrates flows, runs assertions, and generates code. The Node.js server is a thin proxy that forwards fully-resolved requests to the Go executor.

```
┌───────────────────────────────────────────────────┐
│  React Web UI + @invoke/core (browser)             │
│                                                    │
│  UI renders components and handles interaction.    │
│  Core engine runs business logic directly:         │
│  - Reads/writes IndexedDB via Dexie               │
│  - Resolves variables across scopes               │
│  - Orchestrates flows                              │
│  - Runs assertions                                 │
│  - Generates code snippets                         │
│  - Manages collections, environments, history      │
│  - Executes pre/post scripts (Web Worker sandbox)  │
└──────────────────┬────────────────────────────────┘
                   │ POST with fully-resolved request
┌──────────────────▼────────────────────────────────┐
│  Node.js Proxy (thin)                              │
│  - Forwards resolved requests to Go executor       │
│  - Relays WebSocket/SSE streams                    │
│  - Serves React SPA static files                   │
│  - Hosts mock server (in-memory state)             │
└──────────────────┬────────────────────────────────┘
                   │ gRPC (Protocol Buffers)
┌──────────────────▼────────────────────────────────┐
│  Go HTTP Executor (sidecar)                        │
│  Executes HTTP/WebSocket/gRPC requests with        │
│  precise timing. TLS inspection. Parallel          │
│  execution. Streaming responses.                   │
└───────────────────────────────────────────────────┘
```

### 4.0.1 Why Thick Client

All data is stored in browser IndexedDB (no server-side database, no accounts). If business logic ran on the Node.js server, it would have no way to access the browser's IndexedDB — the server cannot read the user's local storage. This creates a "split-brain" problem where state lives in the browser but logic runs on the server.

The thick client approach solves this cleanly:
- `@invoke/core` runs in the browser, directly accessing IndexedDB
- No state needs to be shipped between browser and server on every request
- The user experience works fully offline (except for the Go executor proxy)
- The Node.js server is genuinely thin — ~200-300 lines of proxy code

### 4.1 Why This Architecture

**Why a separate Go sidecar?**
The browser cannot make arbitrary API requests due to CORS. A server-side proxy is required. Go provides nanosecond-precision HTTP timing via `net/http/httptrace`, TLS certificate inspection, client certificate authentication, and efficient concurrent request execution — capabilities that are difficult or impossible in Node.js or the browser.

**Why TypeScript for the core engine?**
The core engine is **isomorphic** — it runs in the browser and is designed to also run on a Node.js server. TypeScript provides type safety shared across all layers. The storage adapter pattern (`IndexedDBAdapter` for browser, `PostgresAdapter` for server) and script sandbox adapter pattern (`WebWorkerSandbox` for browser, `IsolatedVmSandbox` for server) let the same business logic work in both environments.

**Why gRPC between Node.js proxy and Go?**
gRPC provides typed contracts (protobuf), response streaming for large payloads and SSE, bidirectional communication for cancellation, and better performance than JSON over REST. The browser sends fully-resolved requests to the Node.js proxy via REST, which forwards to Go via gRPC.

**Why keep Node.js if core runs in the browser?**
The Node.js server is still needed for:
1. **Proxying requests to Go** — the browser can't call gRPC directly
2. **Hosting the mock server** — mock servers must run server-side to accept connections from external clients
3. **Relaying WebSocket streams** — SSE and streaming responses need server-side relay
4. **Serving the React SPA** — static file serving in production
5. **Future readiness** — Node.js is positioned to absorb `@invoke/core` when server-side features are added, avoiding the need to introduce it later

---

## 5. System Architecture Detail

### 5.1 Layer Responsibilities

#### 5.1.1 React Web UI + @invoke/core

**Responsibility:** Presentation, user interaction, AND business logic.

The React UI imports `@invoke/core` directly. The core engine runs in the browser:

- Renders all UI components (request builder, response viewer, collection tree, etc.)
- Manages UI state (active tab, panel sizes, theme) via Zustand stores
- Runs `@invoke/core` for all business logic:
  - Reads/writes IndexedDB directly via Dexie
  - Resolves `{{variables}}` across scope hierarchy
  - Orchestrates flow execution
  - Evaluates assertions
  - Generates code snippets
  - Manages collections, environments, history
  - Executes pre/post scripts via Web Worker sandbox
  - Computes response diffs
  - Handles import/export
- Sends fully-resolved requests to Node.js proxy for execution
- Receives streaming responses via WebSocket
- Handles keyboard shortcuts and command palette

**Does NOT:**
- Execute HTTP requests directly (delegates to Go executor via Node.js proxy)
- Host mock servers (Node.js handles this)
- Access gRPC directly (browser limitation)

#### 5.1.2 Node.js Proxy

**Responsibility:** Thin proxy and mock server host.

- Serves the React SPA as static files
- Proxies fully-resolved HTTP requests to the Go executor via gRPC
- Relays WebSocket/SSE streams from Go executor to browser
- Hosts mock server (receives full config from UI, holds state in memory)
- ~200-300 lines of code total

**Does NOT:**
- Contain business logic (core runs in browser)
- Access IndexedDB (browser-only)
- Store any user data

#### 5.1.3 @invoke/core (Isomorphic TypeScript Library)

**Responsibility:** All business logic. Runs in the browser.

- Collection CRUD and full-text search
- Variable resolution across scopes (environment → collection → flow)
- Flow orchestration (chaining, variable extraction, conditional logic)
- Assertion evaluation
- JSON/response diffing (via `microdiff` library)
- Code generation (curl, fetch, axios, Spring RestTemplate, OkHttp, etc.)
- Import/export (Postman, OpenAPI, cURL, Insomnia, Hoppscotch)
- Storage adapter interface (IndexedDB for browser, PostgreSQL for server)
- Script sandbox adapter interface (Web Worker for browser, isolated-vm for server)

**Isomorphic design:** The library has two entry points:
- `@invoke/core` — browser-safe modules (collections, variables, assertions, diff, codegen, import/export, storage adapters, Web Worker sandbox)
- `@invoke/core/server` — Node.js-only modules (gRPC client, isolated-vm sandbox, PostgreSQL adapter)

**Does NOT:**
- Handle HTTP routing or middleware
- Manage authentication
- Render UI
- Import Node.js-specific APIs in the browser-safe entry point

#### 5.1.4 Go HTTP Executor

**Responsibility:** High-precision HTTP execution.

- Execute HTTP requests with `net/http` and `httptrace` for timing
- Collect granular timing data (DNS lookup, TCP connection, TLS handshake, TTFB, transfer)
- Inspect TLS certificates (chain, expiry, issuer, cipher suite, SANs)
- Handle redirects with per-hop timing
- Execute requests in parallel for benchmarking
- Stream responses for SSE and large payloads
- Support HTTP/SOCKS5 proxies
- Support client certificates and custom CA bundles
- Handle WebSocket connections (upgrade, send, receive, close)
- Handle gRPC reflection and request execution

**Does NOT:**
- Manage collections, environments, or variables
- Run assertions or flows
- Store data

### 5.2 Communication Patterns

#### 5.2.1 Single Request Execution

```
User clicks "Send"
  → @invoke/core (in browser) reads active environment from IndexedDB
  → @invoke/core resolves all {{variables}} in URL, headers, body
  → @invoke/core resolves auth config (Bearer, Basic, OAuth2, etc.)
  → React UI sends fully-resolved request to POST /api/proxy/execute
  → Node.js proxy forwards resolved request to Go executor via gRPC Execute()
  → Go executes HTTP request with httptrace instrumentation
  → Go returns HttpResponse (status, headers, body, timing, TLS info) via gRPC
  → Node.js proxy returns HttpResponse to React UI
  → @invoke/core (in browser) runs assertions against the response
  → @invoke/core saves request + response to history in IndexedDB
  → React UI renders response body, timing waterfall, headers, TLS info, assertion results
```

#### 5.2.2 Flow Execution

```
User clicks "Run Flow"
  → @invoke/core (in browser) loads flow definition from IndexedDB
  → @invoke/core FlowRunner iterates steps:
      For each step:
        → Read request config from IndexedDB
        → Resolve variables (including extracted variables from previous steps)
        → Send resolved request to POST /api/proxy/execute
        → Node.js proxy forwards to Go executor via gRPC
        → Receive response
        → Evaluate assertions
        → Extract variables from response (JSONPath/header extraction)
        → Inject extracted variables into next step's scope
        → Emit progress event to React UI (in-browser, no WebSocket needed)
  → @invoke/core returns FlowResult (all steps, all responses, all assertions)
  → React UI renders flow timeline with per-step results
```

#### 5.2.3 Response Streaming (SSE / Large Body)

```
User sends request to SSE endpoint
  → @invoke/core resolves request in browser
  → React UI opens WebSocket/SSE to /api/proxy/stream with resolved request
  → Node.js proxy calls Go executor via gRPC ExecuteStream()
  → Go opens HTTP connection, receives chunks
  → Go streams ResponseChunk messages back via gRPC stream
  → Node.js proxy forwards chunks to React UI via SSE
     (backpressure: if SSE buffer exceeds high-water mark,
      Node pauses gRPC stream read until buffer drains)
  → React UI renders chunks in real-time in the response viewer
```

#### 5.2.4 Mock Server

```
User clicks "Start Mock"
  → @invoke/core (in browser) reads collection from IndexedDB
  → @invoke/core generates mock endpoint config (routes, responses, conditions)
  → React UI sends full mock config to POST /api/mock/start
  → Node.js starts Hono mock server on specified port, holds config in memory
  → External clients hit mock server → Node matches routes → serves responses
  → Mock request log accessible via GET /api/mock/log

Note: Mock server state is held in Node.js memory. If the container
restarts, mock state is lost. The UI detects this via GET /api/mock/status
and prompts the user to restart the mock (re-pushing config from IndexedDB).
```

---

## 6. Core Engine Specification

The core engine (`@invoke/core`) is a standalone TypeScript library with zero framework dependencies. It can be imported by the Node.js server, a CLI tool, or any other TypeScript/JavaScript application.

### 6.1 Module Inventory

| Module | Responsibility |
|--------|---------------|
| `collection` | CRUD operations, folder hierarchy, full-text search, ordering |
| `variable` | Variable resolution across scopes, JSONPath extraction, template parsing |
| `flow` | Flow definition, step orchestration, conditional branching, variable passing |
| `assertion` | Status, header, body, timing assertions with multiple matcher types |
| `diff` | Structural JSON diffing, response comparison (body, headers, status, timing) |
| `codegen` | Code snippet generation for multiple languages/libraries |
| `mock` | Mock server configuration, response recording, dynamic response templates |
| `import` | Parsers for Postman, OpenAPI, cURL, Insomnia, Hoppscotch formats |
| `export` | Export collections to YAML, JSON, or other tool formats |
| `history` | Request/response history storage, full-text search, retention policies |
| `executor-client` | gRPC client to communicate with the Go HTTP executor |
| `storage` | Storage adapter interface with IndexedDB and PostgreSQL implementations |
| `schema` | JSON Schema validation for request/response bodies |
| `auth` | Auth helper logic (Bearer, Basic, OAuth2, API Key, Digest, AWS Sig V4, NTLM) |

### 6.2 Collection Manager

#### 6.2.1 Data Model

```typescript
interface Collection {
  id: string;                    // UUID v7 (time-ordered)
  name: string;
  description?: string;
  folders: Folder[];
  requests: SavedRequest[];
  variables: Variable[];         // collection-level variables
  auth?: AuthConfig;             // collection-level default auth
  headers?: Header[];            // collection-level default headers
  preRequestScript?: Script;
  postResponseScript?: Script;
  createdAt: string;             // ISO 8601
  updatedAt: string;
  createdBy?: string;            // user ID (team mode)
  sortOrder: number;
}

interface Folder {
  id: string;
  name: string;
  description?: string;
  folders: Folder[];             // nested folders
  requests: SavedRequest[];
  auth?: AuthConfig;             // folder-level auth (overrides collection)
  headers?: Header[];
  sortOrder: number;
}

interface SavedRequest {
  id: string;
  name: string;
  description?: string;
  protocol: 'rest' | 'graphql' | 'websocket' | 'grpc';
  request: RequestConfig;
  assertions: Assertion[];
  preRequestScript?: Script;
  postResponseScript?: Script;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface RequestConfig {
  method: HttpMethod;
  url: string;                   // may contain {{variables}}
  headers: Header[];
  params: QueryParam[];
  body?: RequestBody;
  auth?: AuthConfig;
  options?: RequestOptions;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

interface Header {
  key: string;
  value: string;                 // may contain {{variables}}
  enabled: boolean;
  description?: string;
}

interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

interface RequestBody {
  type: 'none' | 'json' | 'text' | 'xml' | 'form-data' | 'form-urlencoded' | 'binary' | 'graphql';
  content?: string;              // raw content (JSON, text, XML, GraphQL query)
  formData?: FormDataField[];
  formUrlEncoded?: KeyValue[];
  binaryPath?: string;
  graphql?: GraphQLBody;
}

interface GraphQLBody {
  query: string;
  variables?: string;            // JSON string
  operationName?: string;
}

interface FormDataField {
  key: string;
  value: string;
  type: 'text' | 'file';
  filePath?: string;
  enabled: boolean;
}

interface RequestOptions {
  timeoutMs?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  verifySsl?: boolean;
  proxy?: ProxyConfig;
  clientCertificate?: ClientCertConfig;
}
```

#### 6.2.2 Operations

```typescript
interface CollectionManager {
  // CRUD
  create(data: CreateCollectionInput): Promise<Collection>;
  getById(id: string): Promise<Collection | null>;
  getAll(workspaceId?: string): Promise<Collection[]>;
  update(id: string, data: UpdateCollectionInput): Promise<Collection>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<Collection>;

  // Folder operations
  createFolder(collectionId: string, data: CreateFolderInput): Promise<Folder>;
  moveFolder(folderId: string, targetCollectionId: string, targetFolderId?: string): Promise<void>;
  deleteFolder(folderId: string): Promise<void>;

  // Request operations
  createRequest(collectionId: string, folderId: string | null, data: CreateRequestInput): Promise<SavedRequest>;
  moveRequest(requestId: string, targetCollectionId: string, targetFolderId?: string): Promise<void>;
  duplicateRequest(requestId: string): Promise<SavedRequest>;
  deleteRequest(requestId: string): Promise<void>;

  // Search
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  // Ordering
  reorder(items: ReorderInput[]): Promise<void>;
}

interface SearchOptions {
  scope?: 'all' | 'url' | 'body' | 'headers' | 'name' | 'description';
  collectionId?: string;
  protocol?: string;
  limit?: number;
  offset?: number;
}

interface SearchResult {
  type: 'collection' | 'folder' | 'request';
  id: string;
  name: string;
  matchContext: string;          // snippet showing where match occurred
  collectionId: string;
  collectionName: string;
  folderId?: string;
  folderPath?: string;           // "Auth / OAuth2 / Token Refresh"
}
```

### 6.3 Variable Resolver

#### 6.3.1 Variable Scope Hierarchy

Variables resolve in the following order (later scopes override earlier):

1. **Global variables** — available across all collections
2. **Environment variables** — from the active environment
3. **Collection variables** — defined on the collection
4. **Folder variables** — defined on the folder (inherits from parent folders)
5. **Request variables** — defined on the request
6. **Flow variables** — extracted from previous steps during flow execution
7. **Dynamic variables** — built-in generated values (`{{$uuid}}`, `{{$timestamp}}`, `{{$randomInt}}`)

#### 6.3.2 Template Syntax

Variables use double curly brace syntax: `{{variableName}}`

Nested resolution is supported: `{{base_url}}/{{api_version}}/users`

#### 6.3.3 Dynamic Variables

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `{{$uuid}}` | UUID v7 (time-ordered) | `01900000-7000-7000-8000-000000000000` |
| `{{$timestamp}}` | Unix timestamp (seconds) | `1713168000` |
| `{{$timestampMs}}` | Unix timestamp (milliseconds) | `1713168000000` |
| `{{$isoTimestamp}}` | ISO 8601 timestamp | `2026-04-15T10:00:00.000Z` |
| `{{$randomInt}}` | Random integer 0–1000 | `742` |
| `{{$randomFloat}}` | Random float 0–1 | `0.4821` |
| `{{$randomUUID}}` | Alias for `{{$uuid}}` | — |
| `{{$randomEmail}}` | Random email | `user_7x2k@example.com` |
| `{{$randomString}}` | Random alphanumeric (16 chars) | `a8f2k9x1m3b7c4d6` |
| `{{$randomBoolean}}` | Random true/false | `true` |

#### 6.3.4 Variable Extraction (from responses)

```typescript
interface ExtractionRule {
  variableName: string;
  source: 'body' | 'header' | 'status' | 'timing' | 'cookie';
  expression: string;           // JSONPath for body, header name for headers
  fallback?: string;            // default value if extraction fails
}

// Example extractions:
// { variableName: "token", source: "body", expression: "$.data.accessToken" }
// { variableName: "requestId", source: "header", expression: "X-Request-Id" }
// { variableName: "responseTime", source: "timing", expression: "total" }
```

#### 6.3.5 Operations

```typescript
interface VariableResolver {
  resolve(template: string, scopes: VariableScope[]): string;
  resolveRequest(config: RequestConfig, scopes: VariableScope[]): RequestConfig;
  extractVariables(response: ResponseResult, rules: ExtractionRule[]): Record<string, unknown>;
  listUnresolved(template: string, scopes: VariableScope[]): string[];   // find undefined variables
  previewResolution(config: RequestConfig, scopes: VariableScope[]): ResolutionPreview;
}

interface ResolutionPreview {
  url: { raw: string; resolved: string };
  headers: { key: string; rawValue: string; resolvedValue: string }[];
  body?: { raw: string; resolved: string };
  unresolvedVariables: string[];
}
```

### 6.4 Auth Module

#### 6.4.1 Supported Auth Types

```typescript
type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'api-key'; key: string; value: string; addTo: 'header' | 'query' }
  | { type: 'oauth2'; grantType: OAuth2GrantType; config: OAuth2Config }
  | { type: 'digest'; username: string; password: string }
  | { type: 'aws-sig-v4'; accessKey: string; secretKey: string; region: string; service: string; sessionToken?: string }
  | { type: 'ntlm'; username: string; password: string; domain?: string; workstation?: string }
  | { type: 'inherit' };         // inherit from folder or collection

interface OAuth2Config {
  grantType: 'authorization_code' | 'client_credentials' | 'password' | 'implicit' | 'device_code';
  authUrl?: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
  redirectUri?: string;
  pkce?: boolean;                // PKCE S256 for authorization_code
  username?: string;             // for password grant
  password?: string;             // for password grant
  accessToken?: string;          // cached token
  refreshToken?: string;
  tokenExpiry?: string;
}
```

#### 6.4.2 Auth Inheritance

Auth configuration cascades: Request → Folder → Collection. If a request has `type: 'inherit'`, it uses the parent folder's auth. If the folder also inherits, it uses the collection's auth.

### 6.5 Scripting

#### 6.5.1 Pre-Request Scripts

Scripts run before a request is sent. They can modify the request configuration, set variables, or skip the request conditionally.

```typescript
interface Script {
  language: 'javascript';
  code: string;
}

// Available API in pre-request scripts:
interface PreRequestContext {
  request: MutableRequestConfig;     // modify URL, headers, body, auth
  variables: {
    get(name: string): unknown;
    set(name: string, value: unknown): void;
  };
  environment: {
    get(name: string): unknown;
    set(name: string, value: unknown): void;
  };
  skip(): void;                      // skip this request
  log(message: string): void;
}
```

#### 6.5.2 Post-Response Scripts

Scripts run after a response is received. They can extract data, set variables, run assertions, or log output.

```typescript
interface PostResponseContext {
  response: {
    status: number;
    headers: Record<string, string>;
    body: unknown;
    timing: TimingData;
    json(): unknown;
    text(): string;
  };
  request: ReadonlyRequestConfig;
  variables: {
    get(name: string): unknown;
    set(name: string, value: unknown): void;
  };
  environment: {
    get(name: string): unknown;
    set(name: string, value: unknown): void;
  };
  test(name: string, fn: () => void): void;   // assertion helper
  expect(value: unknown): Expectation;
  log(message: string): void;
}
```

#### 6.5.3 Script Execution

Scripts execute in a sandboxed environment that prevents file system access, network access, process spawning, and infinite loops. The sandbox implementation varies by runtime:

```typescript
interface ScriptSandbox {
  execute(code: string, context: ScriptContext, timeout: number): Promise<ScriptResult>;
  dispose(): void;
}

// Web Worker sandbox (browser)
class WebWorkerSandbox implements ScriptSandbox {
  // Creates a Blob URL Web Worker with pre-bundled utility libraries
  // (lodash, uuid, CryptoJS) available on `self`
  // Memory isolated by browser's Worker thread model
  // Timeout enforced via Worker.terminate()
}

// isolated-vm sandbox (Node.js server — for future server-side use)
class IsolatedVmSandbox implements ScriptSandbox {
  // Creates V8 isolate with 128MB memory limit
  // Timeout enforced via isolate timeout parameter
  // Same V8 engine as Node.js for 100% behavior consistency
}
```

**Web Worker sandbox (browser):** The worker script is pre-bundled at build time (via Vite/tsup) with allowed utility libraries attached to `self`. User code executes inside the worker with no access to the main thread's DOM, IndexedDB, or network. The worker communicates results back via `postMessage`.

**isolated-vm sandbox (server):** When `@invoke/core` runs on a Node.js server, uses V8 isolates for stronger isolation with configurable memory and CPU limits.

---

## 7. Go HTTP Executor Specification

### 7.1 Responsibilities

The Go executor is a standalone gRPC server that receives request configurations and returns complete response data with precise timing measurements.

### 7.2 Timing Instrumentation

Go's `net/http/httptrace` package provides hooks for every phase of an HTTP request:

```go
type TimingData struct {
    DNSLookupMs    float64  // Time to resolve DNS
    TCPConnectMs   float64  // Time to establish TCP connection
    TLSHandshakeMs float64  // Time to complete TLS handshake
    TTFBMs         float64  // Time to first byte (from request sent to first response byte)
    TransferMs     float64  // Time to transfer response body
    TotalMs        float64  // Total request duration
}
```

### 7.3 TLS Certificate Inspection

For every HTTPS request, the executor captures:

- Protocol version (TLS 1.2, TLS 1.3)
- Cipher suite used
- Full certificate chain (subject, issuer, validity dates, serial number, SANs)
- Certificate expiry warnings

### 7.4 Redirect Tracking

For requests that follow redirects, the executor captures per-hop data:

- Redirect URL
- Status code (301, 302, 307, 308)
- Response headers at each hop
- Timing data for each hop

### 7.5 Parallel Execution

For benchmarking, the executor supports running the same request N times with configurable concurrency:

```protobuf
message BatchRequest {
    HttpRequest request = 1;
    int32 count = 2;            // total number of requests
    int32 concurrency = 3;      // simultaneous requests
    int32 delay_ms = 4;         // delay between batches
}
```

Returns individual results plus aggregated statistics (p50, p95, p99, mean, std dev).

### 7.6 WebSocket Support

The executor handles WebSocket connections:

- Upgrade HTTP connection to WebSocket
- Send text/binary frames
- Receive frames with timestamps
- Track connection duration
- Support ping/pong for keepalive
- Clean close with status codes

### 7.7 gRPC Protocol Support

The executor can act as a gRPC client:

- Server reflection to discover services and methods
- Unary, server streaming, client streaming, and bidirectional streaming calls
- Protobuf message encoding/decoding
- Metadata (header) management

### 7.8 Proxy Support

- HTTP proxy (CONNECT method)
- SOCKS5 proxy
- Proxy authentication (basic)
- Per-request proxy configuration

### 7.9 Client Certificate Authentication

- PEM-encoded client certificate and key
- PKCS12 (.p12) support
- Custom CA bundle for self-signed server certificates
- Per-request TLS configuration

---

## 8. Web UI Specification

### 8.1 Design Principles

1. **Dark mode default** — Light mode available, but dark mode is the primary design target.
2. **Keyboard-first** — All primary actions accessible via keyboard shortcuts. Command palette for discovery.
3. **Information density** — Show more data per screen than Postman with better visual hierarchy. No wasted space.
4. **Instant feedback** — No loading spinners for navigation. Skeleton screens for data fetching.
5. **Single-page feel** — No full-page route transitions. Panel-based navigation with smooth transitions.

### 8.2 Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│ [invoke logo]  [Workspace ▾]  [Environment ▾]  [🔍 Ctrl+K]  [⚙] │
├────────────┬─────────────────────────────────────────────────┤
│            │  [Tab: Request 1] [Tab: Request 2] [+]          │
│  Collection │────────────────────────────────────────────────│
│  Sidebar   │  ┌─────────────────────┬───────────────────────┤
│            │  │ Request Builder     │  Response Viewer      │
│  ├ Auth    │  │                     │                       │
│  │ └ Login │  │ [GET ▾] [URL bar  ] │  [Body│Headers│       │
│  │ └ Token │  │                     │   Timing│TLS│Cookies] │
│  ├ Users   │  │ [Params│Headers│    │                       │
│  │ └ List  │  │  Body│Auth│Scripts] │                       │
│  │ └ Create│  │                     │                       │
│  ├ Products│  │                     │                       │
│            │  │                     │                       │
│  [History] │  │                     │                       │
│  [Flows]   │  │                     │  [Code Export] [Save] │
├────────────┴──┴─────────────────────┴───────────────────────┤
│ [Status: 200 OK]  [Time: 142ms]  [Size: 2.4 KB]  [Protocol]│
└──────────────────────────────────────────────────────────────┘
```

### 8.3 Screen Specifications

#### 8.3.1 Request Builder (Primary Screen)

**URL Bar:**
- Method selector dropdown (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- URL input with syntax highlighting for `{{variables}}`
- Send button (primary action)
- Save button (to collection)
- Variable chips — hover `{{token}}` to see resolved value from current environment

**Request Configuration Tabs:**

- **Params** — Key-value editor for query parameters. Toggle enabled/disabled per param. Auto-sync with URL query string.
- **Headers** — Key-value editor with autocomplete for common headers (Content-Type, Authorization, Accept, etc.). Toggle enabled/disabled. Show inherited headers from collection/folder in a separate "inherited" section.
- **Body** — Content type selector (none, JSON, text, XML, form-data, form-urlencoded, binary, GraphQL). JSON editor with syntax highlighting and formatting. Form-data editor with file upload support.
- **Auth** — Auth type selector. Dynamic form based on selected type. "Inherit from parent" option. OAuth2 token management with manual and auto-refresh.
- **Scripts** — Pre-request and post-response script editors with syntax highlighting. Script API documentation sidebar.

**Response Viewer Tabs:**

- **Body** — JSON tree view (collapsible nodes, copy path, copy value), raw text view, and preview (for HTML responses). Search within response body. Body size indicator.
- **Headers** — Response headers table with copy functionality.
- **Timing** — Waterfall visualization showing DNS, TCP, TLS, TTFB, and transfer phases as horizontal bars with millisecond values. Total time prominently displayed.
- **TLS** — Certificate chain viewer showing subject, issuer, validity period, SANs, cipher suite, and protocol version. Visual warning for expired or soon-to-expire certificates.
- **Cookies** — Table of cookies set by the response with name, value, domain, path, expiry, and flags (secure, httpOnly, sameSite).
- **Assertions** — Pass/fail list of assertion results with expected vs actual values.

**Status Bar (bottom):**
- HTTP status code with color coding (2xx green, 3xx blue, 4xx yellow, 5xx red)
- Response time
- Response body size
- HTTP protocol version

#### 8.3.2 GraphQL Request Builder

Extends the standard request builder with:

- **Query editor** — Syntax-highlighted GraphQL query editor with autocomplete (if schema is available)
- **Variables editor** — JSON editor for GraphQL variables
- **Schema explorer** — Sidebar showing types, queries, mutations, and subscriptions. Click to insert into query. Loaded via introspection query or uploaded schema file.
- **Operation selector** — If query contains multiple operations, dropdown to select which to execute

#### 8.3.3 WebSocket Client

Dedicated interface for WebSocket connections:

- **URL bar** — `ws://` or `wss://` URL input with "Connect" / "Disconnect" button
- **Connection status** — Visual indicator (connected, disconnecting, disconnected, error)
- **Message composer** — Text/JSON editor with "Send" button
- **Message log** — Chronological list of sent and received messages with:
  - Direction indicator (↑ sent, ↓ received)
  - Timestamp
  - Message type (text, binary, ping, pong, close)
  - Collapsible message body with JSON formatting
- **Headers** — Custom headers for the upgrade request
- **Connection info** — Protocol, extensions, subprotocol

#### 8.3.4 gRPC Client

Dedicated interface for gRPC requests:

- **Server URL** — Host and port input
- **Service/Method selector** — Populated via server reflection or uploaded proto files
- **Message editor** — JSON editor for the request message (auto-generated from proto definition)
- **Metadata editor** — Key-value editor for gRPC metadata (equivalent to headers)
- **Response viewer** — Shows response message, metadata, status code, and timing
- **Streaming support** — For server/client/bidirectional streaming, shows a message log similar to WebSocket client

#### 8.3.5 Collection Sidebar

- **Tree view** — Hierarchical display of collections → folders → requests
- **Icons** — Protocol indicator (REST, GraphQL, WS, gRPC) and method badge (colored GET, POST, etc.)
- **Drag and drop** — Reorder requests and folders. Move between collections.
- **Context menu** — Right-click for rename, duplicate, delete, move, export
- **Git status indicators** — (for exported collections) modified, untracked, committed markers
- **New request button** — Quick-create at any level
- **Search** — Filter tree by name. Link to full-text search (Ctrl+K).

#### 8.3.6 Command Palette (Ctrl+K)

Global search and command execution interface:

- **Search scope** — Collections, requests, history, environments, commands
- **Quick actions** — "New request", "Switch environment", "Import collection", "Open settings"
- **Keyboard navigation** — Arrow keys, Enter to select, Esc to close
- **Recent items** — Show recently opened requests at the top
- **Fuzzy matching** — Forgiving search that matches partial strings

#### 8.3.7 Environment Manager

- **Environment list** — Sidebar showing all environments with active indicator
- **Variable editor** — Table with key, initial value, current value, and description columns
- **Sensitive values** — Toggle to mask/unmask values (stored encrypted for sensitive variables)
- **Bulk edit** — Raw text editor (key=value format) for quick editing
- **Import/export** — Import from `.env` files, export as `.env` or JSON

#### 8.3.8 Flow Builder

Visual canvas for building request chains:

- **Canvas** — Drag-and-drop area where requests are nodes connected by edges
- **Node types:**
  - Request node — references a saved request with extraction rules
  - Condition node — if/else branching based on response values
  - Delay node — wait N milliseconds before next step
  - Loop node — repeat a section N times or until condition
- **Variable flow** — Visual lines showing extracted variable connections between nodes
- **Execution view** — Run flow and see per-step results in a timeline:
  - Step name, status (pass/fail), duration
  - Expandable response details
  - Variable values at each step
  - Assertions results per step
- **Export** — Save flow as YAML for CI/CD or CLI execution

#### 8.3.9 Response Diff View

Side-by-side comparison of two responses:

- **Source selection:**
  - Same request, two different environments
  - Same request, two different points in time (from history)
  - Two different requests
- **Diff view:**
  - JSON structural diff with additions (green), removals (red), modifications (yellow)
  - Headers diff
  - Status code comparison
  - Timing comparison (bar chart overlay)
- **Filters:**
  - Ignore specific fields (e.g., timestamps, UUIDs)
  - Show only differences
  - Show only additions/removals

#### 8.3.10 Mock Server Manager

Interface for managing mock servers:

- **Create mock** — Select a collection to mock. Each request becomes an endpoint that returns the last recorded response.
- **Endpoint list** — Table showing mocked routes with method, URL pattern, status code, and response body preview.
- **Response editor** — Edit the mock response body, headers, status code, and delay per endpoint.
- **Dynamic templates** — Support `{{$randomInt}}` and other dynamic variables in mock responses.
- **Start/stop controls** — Start mock server on a specified port. Show the base URL for frontend teams.
- **Request log** — Live log of incoming requests to the mock server.

#### 8.3.11 History View

- **Request list** — Chronological list of all executed requests with:
  - Method, URL, status code, response time
  - Timestamp
  - Environment used
  - Response size
- **Full-text search** — Search across request URLs, headers, bodies, and response bodies
- **Filters** — By method, status code range, date range, collection, protocol
- **Detail view** — Click to see full request and response (same layout as response viewer)
- **Restore** — Click to load a historical request into the request builder
- **Compare** — Select two history items to open in diff view
- **Retention** — Configurable retention period (default: 30 days). Manual clear option.

#### 8.3.12 Settings

- **General** — Theme (dark/light/system), language (English), auto-save interval
- **Proxy** — Global proxy configuration (HTTP/SOCKS5)
- **Certificates** — Client certificate management, custom CA bundles
- **Data** — Import/export all data, clear history, reset application
- **Editor** — Font size, tab size, word wrap, line numbers
- **Keyboard shortcuts** — View and customize keyboard shortcuts
- **Team** (self-hosted only) — User management, workspace settings

---

## 9. CLI Specification

> **Note:** CLI is planned for a future release. This section is included for architectural reference to ensure the core engine is designed to support both web UI and CLI interfaces.

### 9.1 Overview

The CLI (`invoke`) will import `@invoke/core` directly and communicate with the Go executor via the same gRPC protocol used by the Node.js server. Collections are YAML files on disk.

### 9.2 Command Structure

```
invoke <command> [subcommand] [flags]

Commands:
  invoke send <method> <url>            # Quick send a request
  invoke run <flow-name>                # Run a saved flow
  invoke collection <subcommand>        # Manage collections
  invoke env <subcommand>               # Manage environments
  invoke import <format> <file>         # Import collection
  invoke export <format> <file>         # Export collection
  invoke mock <collection>              # Start mock server
  invoke diff <env1> <env2> <request>   # Diff responses
  invoke history                        # View request history
  invoke codegen <target> <request>     # Generate code snippet
  invoke ui                             # Start web UI (opens browser)
  invoke version                        # Show version
```

### 9.3 Collection File Format (YAML)

```yaml
# collections/auth/login.invoke.yaml
name: Login
protocol: rest
method: POST
url: "{{base_url}}/auth/login"
headers:
  Content-Type: application/json
  Accept: application/json
body:
  type: json
  content: |
    {
      "email": "{{email}}",
      "password": "{{password}}"
    }
assertions:
  - type: status
    matcher: equals
    expected: 200
  - type: body
    expression: "$.data.accessToken"
    matcher: exists
extractions:
  - variableName: token
    source: body
    expression: "$.data.accessToken"
  - variableName: refreshToken
    source: body
    expression: "$.data.refreshToken"
```

### 9.4 Flow File Format (YAML)

```yaml
# flows/auth-flow.invoke-flow.yaml
name: Authentication Flow
description: Login and access protected resource
environment: development
steps:
  - name: login
    request: auth/login          # reference to collection file
    extractions:
      - variableName: token
        source: body
        expression: "$.data.accessToken"
  - name: get-profile
    request: users/me
    headers:
      Authorization: "Bearer {{token}}"
    assertions:
      - type: status
        matcher: equals
        expected: 200
      - type: body
        expression: "$.data.email"
        matcher: equals
        expected: "{{email}}"
  - name: conditional-admin
    condition:
      source: body
      expression: "$.data.role"
      matcher: equals
      expected: "admin"
    request: admin/dashboard
```

### 9.5 Environment File Format

```yaml
# environments/development.invoke-env.yaml
name: Development
variables:
  base_url: http://localhost:3000/api
  email: dev@example.com
  password: devpass123
  api_version: v1
```

---

## 10. Protocol Support

### 10.1 REST (HTTP/HTTPS)

**Methods:** GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

**Body types:** JSON, plain text, XML, form-data (multipart), form-urlencoded, binary, raw

**Features:**
- Full header management with autocomplete
- Query parameter editor with URL sync
- Cookie management (auto-send, manual override)
- Response body rendering (JSON tree, raw text, HTML preview, image preview)
- Redirect chain visualization
- All auth types supported

### 10.2 GraphQL

**Transport:** HTTP POST (standard), HTTP GET (persisted queries), WebSocket (subscriptions via `graphql-ws` and `graphql-transport-ws`)

**Features:**
- Schema introspection and caching per endpoint
- Schema-aware autocomplete (fields, arguments, enums, fragments, directives)
- Query validation against fetched schema
- Schema explorer with search, type navigation, SDL view
- Variables editor (JSON) with auto-detection and type hints
- Operation name selector (for multi-operation documents)
- Subscription support via WebSocket transport
- File uploads via graphql-multipart-request-spec
- Batched queries
- Automatic Persisted Queries (APQ)
- `@defer` / `@stream` incremental delivery support
- Fragments library with per-workspace saved fragments
- SDL import from paste or file

### 10.3 WebSocket

**Protocols:** ws://, wss://

**Features:**
- Connection lifecycle management (connect, disconnect, reconnect with exponential backoff)
- Send/receive text and binary frames
- Multiple concurrent sessions per request (tabbed)
- Message history with timestamps, direction, and per-message timing
- Custom headers on upgrade request
- Subprotocol negotiation
- Auto-reconnect with exponential backoff
- Ping/pong heartbeat with live latency display
- Close frame with code/reason
- Handshake details (headers, subprotocol, TLS info, RTT)
- `permessage-deflate` compression toggle
- Real-time inbound delivery via SSE (sub-100ms latency)
- Protocol presets: graphql-transport-ws, MQTT-over-WS, STOMP, SignalR, Socket.IO
- Auth on handshake (Bearer, Basic, API Key, OAuth2, SigV4)
- Session transcript export (JSON, NDJSON, text)
- Saved message templates and composer presets

### 10.4 gRPC

**Transport:** HTTP/2 (native gRPC), gRPC-Web (application/grpc-web+proto, grpc-web-text)

**Features:**
- Server reflection (v1 and v1alpha fallback) with per-address caching
- `.proto` file upload and pre-compiled FileDescriptorSet import
- All call types: unary, server streaming, client streaming, bidirectional streaming
- Metadata (header) management
- Structured body editor (enums, repeated fields, oneof, maps)
- Method search with fuzzy matching and service grouping
- Inline schema viewer (field names, types, comments, enums)
- Deadline/timeout configuration
- TLS and plaintext connections
- Per-call compression toggle (none/gzip)
- Connection pooling with keepalive (30s ping, 10s timeout)
- Collection-scoped proto registry
- Saved message templates per method
- Response metadata and trailers display
- Health check probe via `grpc.health.v1.Health/Check`

---

## 11. Collection & Data Management

### 11.1 Workspace Model

```typescript
interface Workspace {
  id: string;
  name: string;
  description?: string;
  type: 'personal' | 'team';
  collections: Collection[];
  environments: Environment[];
  flows: Flow[];
  members?: WorkspaceMember[];     // team mode only
  createdAt: string;
  updatedAt: string;
}
```

- In public hosted mode (anonymous): a single default personal workspace stored in browser.
- In public hosted mode (with account): multiple personal workspaces, synced to server.
- In self-hosted mode: personal and team workspaces, stored in PostgreSQL.

### 11.2 Collection File Format

When exported to disk (for Git versioning), collections use a file-per-request structure:

```
my-api-collection/
├── collection.invoke.yaml            # collection metadata, variables, auth
├── auth/
│   ├── folder.invoke.yaml            # folder metadata
│   ├── login.invoke.yaml             # request
│   ├── register.invoke.yaml
│   └── refresh-token.invoke.yaml
├── users/
│   ├── folder.invoke.yaml
│   ├── list-users.invoke.yaml
│   ├── get-user.invoke.yaml
│   └── create-user.invoke.yaml
└── products/
    ├── folder.invoke.yaml
    └── list-products.invoke.yaml
```

This structure is Git-friendly: each request is a separate file, so changes can be tracked, branched, and merged independently.

---

## 12. Environment & Variable System

### 12.1 Environment Data Model

```typescript
interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  createdAt: string;
  updatedAt: string;
}

interface EnvironmentVariable {
  key: string;
  initialValue: string;          // committed value (safe to share)
  currentValue: string;          // runtime value (may contain secrets)
  description?: string;
  sensitive: boolean;            // mask in UI
  enabled: boolean;
}
```

### 12.2 Variable Resolution Order

When resolving `{{variableName}}`:

1. Flow scope (variables extracted from previous flow steps)
2. Request-level variables
3. Folder-level variables (nearest folder first, then parent folders)
4. Collection-level variables
5. Environment variables (active environment)
6. Global variables
7. Dynamic variables (`{{$uuid}}`, etc.)

If unresolved after all scopes, the raw `{{variableName}}` string is kept and the UI highlights it as unresolved.

### 12.3 Environment Operations

```typescript
interface EnvironmentManager {
  create(data: CreateEnvironmentInput): Promise<Environment>;
  getById(id: string): Promise<Environment | null>;
  getAll(workspaceId?: string): Promise<Environment[]>;
  update(id: string, data: UpdateEnvironmentInput): Promise<Environment>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<Environment>;
  setActive(id: string): Promise<void>;
  getActive(): Promise<Environment | null>;
  importFromEnvFile(content: string): Promise<Environment>;
  exportToEnvFile(id: string): Promise<string>;
}
```

---

## 13. Flow Runner (Request Chaining)

### 13.1 Flow Data Model

```typescript
interface Flow {
  id: string;
  name: string;
  description?: string;
  steps: FlowStep[];
  variables?: Variable[];         // flow-level initial variables
  createdAt: string;
  updatedAt: string;
}

type FlowStep =
  | RequestStep
  | ConditionStep
  | DelayStep
  | LoopStep;

interface RequestStep {
  type: 'request';
  id: string;
  name: string;
  requestRef: string;            // reference to a saved request ID or file path
  overrides?: Partial<RequestConfig>;    // override URL, headers, body for this flow step
  extractions: ExtractionRule[];
  assertions: Assertion[];
  continueOnFailure?: boolean;
}

interface ConditionStep {
  type: 'condition';
  id: string;
  name: string;
  condition: {
    source: 'variable' | 'lastStatus' | 'lastBody';
    expression?: string;         // JSONPath for body, variable name for variable
    matcher: MatcherType;
    expected: unknown;
  };
  thenSteps: FlowStep[];
  elseSteps?: FlowStep[];
}

interface DelayStep {
  type: 'delay';
  id: string;
  name: string;
  delayMs: number;
}

interface LoopStep {
  type: 'loop';
  id: string;
  name: string;
  iterations?: number;           // fixed count
  condition?: {                  // or loop until condition
    source: 'variable' | 'lastStatus' | 'lastBody';
    expression?: string;
    matcher: MatcherType;
    expected: unknown;
  };
  maxIterations: number;         // safety limit
  steps: FlowStep[];
}
```

### 13.2 Flow Execution

```typescript
interface FlowRunner {
  run(flow: Flow, environment: Environment, hooks?: FlowHooks): Promise<FlowResult>;
  cancel(): void;
}

interface FlowHooks {
  onStepStart?: (step: FlowStep, index: number) => void;
  onStepComplete?: (step: FlowStep, result: StepResult) => void;
  onVariableExtracted?: (name: string, value: unknown) => void;
  onFlowComplete?: (result: FlowResult) => void;
  onError?: (step: FlowStep, error: Error) => void;
}

interface FlowResult {
  flowId: string;
  status: 'passed' | 'failed' | 'cancelled' | 'error';
  steps: StepResult[];
  totalDurationMs: number;
  variables: Record<string, unknown>;    // all variables at end of flow
  startedAt: string;
  completedAt: string;
}

interface StepResult {
  stepId: string;
  stepName: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  response?: ResponseResult;
  assertions: AssertionResult[];
  extractedVariables: Record<string, unknown>;
  durationMs: number;
  error?: string;
}
```

---

## 14. Response Diffing

### 14.1 Diff Modes

1. **Environment diff** — Same request executed against two different environments. Useful for verifying staging matches production.
2. **Temporal diff** — Same request compared at two points in time (from history). Useful for detecting API changes after deployments.
3. **Request diff** — Two different requests compared. Useful for comparing endpoints.

### 14.2 Diff Output

```typescript
interface DiffResult {
  status: {
    left: number;
    right: number;
    changed: boolean;
  };
  headers: {
    added: Header[];           // in right but not left
    removed: Header[];         // in left but not right
    modified: { key: string; left: string; right: string }[];
  };
  body: JsonDiffNode[];
  timing: {
    left: TimingData;
    right: TimingData;
    deltas: Record<string, number>;   // difference in ms per phase
  };
}

interface JsonDiffNode {
  path: string;                // JSONPath
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  leftValue?: unknown;
  rightValue?: unknown;
  children?: JsonDiffNode[];
}
```

### 14.3 Diff Options

```typescript
interface DiffOptions {
  ignorePaths?: string[];        // JSONPaths to ignore (e.g., "$.timestamp", "$.requestId")
  ignoreArrayOrder?: boolean;    // treat arrays as sets
  showUnchanged?: boolean;       // include unchanged fields
  depthLimit?: number;           // max nesting depth to compare
}
```

---

## 15. Mock Server

### 15.1 Overview

invoke can start a mock HTTP server that serves recorded responses from a collection. This allows frontend teams to develop against stable endpoints while the real API is being built or modified.

**Limitation:** The mock server runs on the Node.js proxy and holds its configuration **in memory**. Since all data lives in browser IndexedDB, the UI must send the full mock configuration (all routes, responses, conditions) in the `POST /api/mock/start` payload. If the Node.js container restarts, mock server state is lost. The UI detects this via `GET /api/mock/status` and prompts the user to restart the mock, which re-pushes the configuration from IndexedDB.

### 15.2 Mock Configuration

```typescript
interface MockConfig {
  collectionId: string;
  port: number;
  basePath?: string;             // e.g., "/api/v1"
  cors?: boolean;                // enable CORS headers (default: true)
  delay?: number;                // global response delay in ms
  endpoints: MockEndpoint[];
}

interface MockEndpoint {
  method: HttpMethod;
  path: string;                  // supports path params: /users/:id
  statusCode: number;
  headers: Header[];
  body: string;                  // may contain dynamic variables
  delay?: number;                // per-endpoint delay override
  conditional?: MockCondition[]; // different responses based on request
}

interface MockCondition {
  match: {
    header?: { key: string; value: string };
    queryParam?: { key: string; value: string };
    bodyPath?: { expression: string; value: unknown };
  };
  response: {
    statusCode: number;
    headers?: Header[];
    body: string;
  };
}
```

### 15.3 Mock Operations

```typescript
interface MockServer {
  start(config: MockConfig): Promise<{ url: string; port: number }>;
  stop(): Promise<void>;
  getRequestLog(): MockRequestLog[];
  updateEndpoint(method: string, path: string, response: Partial<MockEndpoint>): void;
}

interface MockRequestLog {
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  matchedEndpoint?: string;
  responseStatus: number;
}
```

---

## 16. Import & Export

### 16.1 Import Formats

#### 16.1.1 Postman Collection (v2.1)

- File format: JSON
- Import path: `.json` file or URL
- Mapping: Postman collections → invoke collections, folders → folders, requests → requests
- Variable mapping: Postman environment variables → invoke environments
- Auth mapping: Postman auth configs → invoke auth configs
- Script mapping: Postman pre-request/test scripts → invoke scripts (compatible JavaScript API with adapter layer)
- Limitation: Postman monitors and mock servers are not imported (invoke has its own implementation)

#### 16.1.2 OpenAPI (3.0, 3.1)

- File format: JSON or YAML
- Import: Generate one request per operation (path + method)
- Collection structure: Tags → folders, operations → requests
- Parameter mapping: path/query/header parameters → invoke params with `{{variable}}` defaults
- Request body: Generate example body from schema (uses `example`, `examples`, or generates from type)
- Auth mapping: Security schemes → invoke auth configs
- Server mapping: Server URLs → invoke environments

#### 16.1.3 cURL

- Input: Single cURL command string or file with multiple commands
- Parsing: Extract method, URL, headers, body, auth from curl flags
- Mapping: Each cURL command → one invoke request
- Supported flags: `-X`, `-H`, `-d`, `--data-raw`, `-u`, `--user`, `-b`, `--cookie`, `--compressed`, `-k`, `--insecure`, `-L`, `--location`, `--connect-timeout`, `-F`, `--form`

#### 16.1.4 Insomnia (v4)

- File format: JSON or YAML
- Mapping: Insomnia workspaces → invoke workspaces, request groups → folders, requests → requests
- Environment mapping: Insomnia environments → invoke environments
- Plugin compatibility: Insomnia template tags → invoke variables where possible

#### 16.1.5 Hoppscotch

- File format: JSON
- Mapping: Hoppscotch collections → invoke collections
- Environment mapping: Hoppscotch environments → invoke environments

#### 16.1.6 HAR (HTTP Archive)

- File format: JSON (`.har`)
- Source: Browser DevTools export, proxy tools
- Mapping: HAR entries → invoke requests, one request per entry
- Preserves: method, URL, headers, body, response details

#### 16.1.7 grpcurl

- Input: Paste `grpcurl` command string
- Parsing: Extracts host, service/method, message JSON, metadata, TLS flags
- Mapping: Single grpcurl command → one gRPC invoke request

### 16.2 Export Formats

- **invoke ZIP/YAML** — Native format, file-per-request structure for Git versioning
- **Workspace JSON backup** — Single-file export of entire workspace (for backup/restore)
- **OpenAPI 3.0.3 YAML** — Generate OpenAPI spec from REST collections (best-effort, may need manual refinement)
- **Environment `.env` files** — Export environment variables as standard `.env` format
- **grpcurl command** — Export individual gRPC requests as grpcurl commands
- **buf curl command** — Export individual gRPC requests as buf curl commands

### 16.3 Import Operations

```typescript
interface Importer {
  detectFormat(content: string): ImportFormat | null;
  import(content: string, format: ImportFormat): Promise<ImportResult>;
  importFromUrl(url: string): Promise<ImportResult>;
  importFromFile(path: string): Promise<ImportResult>;
}

interface ImportResult {
  collections: Collection[];
  environments: Environment[];
  warnings: ImportWarning[];     // features that couldn't be mapped
  stats: {
    collectionsImported: number;
    foldersImported: number;
    requestsImported: number;
    environmentsImported: number;
    skipped: number;
  };
}

type ImportFormat = 'postman-v2.1' | 'openapi-3.0' | 'openapi-3.1' | 'curl' | 'insomnia-v4' | 'hoppscotch' | 'har' | 'grpcurl' | 'invoke-yaml' | 'invoke-json';
```

---

## 17. Code Generation

### 17.1 Supported Targets

#### REST / HTTP

| Target | Language | Library/Style |
|--------|----------|---------------|
| `curl` | Shell | curl command |
| `fetch` | JavaScript | Fetch API |
| `axios` | JavaScript | Axios library |
| `node-fetch` | JavaScript (Node.js) | node-fetch |
| `node-axios` | JavaScript (Node.js) | axios |
| `python-requests` | Python | requests library |
| `python-httpx` | Python | httpx (async) |
| `go-net-http` | Go | net/http |
| `okhttp` | Java | OkHttp |
| `kotlin-okhttp` | Kotlin | OkHttp |
| `ruby-net-http` | Ruby | Net::HTTP |
| `php-guzzle` | PHP | Guzzle |
| `csharp-httpclient` | C# | HttpClient |
| `rust-reqwest` | Rust | reqwest |
| `powershell` | PowerShell | Invoke-WebRequest |
| `httpie` | Shell | HTTPie |

#### WebSocket

| Target | Language | Library/Style |
|--------|----------|---------------|
| `wscat` | Shell | wscat command |
| `websocat` | Shell | websocat command |
| `js-websocket` | JavaScript | native WebSocket API |
| `node-ws` | JavaScript (Node.js) | ws library |
| `python-websockets` | Python | websockets library |
| `go-websocket` | Go | nhooyr.io/websocket |

#### gRPC

| Target | Language | Library/Style |
|--------|----------|---------------|
| `grpcurl` | Shell | grpcurl command |
| `go-grpc` | Go | google.golang.org/grpc |
| `node-grpc` | JavaScript (Node.js) | @grpc/grpc-js |
| `python-grpcio` | Python | grpcio library |
| `java-grpc` | Java | io.grpc |
| `csharp-grpc` | C# | Grpc.Net.Client |
| `kotlin-grpc` | Kotlin | grpc-kotlin-stub |

### 17.2 Code Generation Interface

```typescript
interface CodeGenerator {
  generate(request: RequestConfig, target: CodeGenTarget, options?: CodeGenOptions): string;
  listTargets(): CodeGenTarget[];
}

interface CodeGenOptions {
  includeComments?: boolean;     // add explanatory comments
  includeErrorHandling?: boolean; // wrap in try-catch
  resolveVariables?: boolean;    // replace {{vars}} with values or keep as placeholders
  indentation?: number;          // spaces per indent level
}
```

---

## 18. Assertion Engine

### 18.1 Assertion Data Model

```typescript
interface Assertion {
  id: string;
  enabled: boolean;
  source: 'status' | 'header' | 'body' | 'timing' | 'size';
  expression?: string;           // JSONPath for body, header name for header, timing phase
  matcher: MatcherType;
  expected?: unknown;
  description?: string;
}

type MatcherType =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'not-contains'
  | 'starts-with'
  | 'ends-with'
  | 'matches-regex'
  | 'exists'
  | 'not-exists'
  | 'is-type'                    // string, number, boolean, array, object, null
  | 'greater-than'
  | 'less-than'
  | 'greater-than-or-equal'
  | 'less-than-or-equal'
  | 'is-empty'
  | 'is-not-empty'
  | 'has-length'
  | 'contains-key'
  | 'json-schema';              // validate against JSON Schema
```

### 18.2 Assertion Result

```typescript
interface AssertionResult {
  assertionId: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
  message: string;               // human-readable result description
  duration?: number;             // time to evaluate (ms)
}
```

### 18.3 Assertion Examples

```typescript
// Status code equals 200
{ source: 'status', matcher: 'equals', expected: 200 }

// Response body has a specific field
{ source: 'body', expression: '$.data.id', matcher: 'exists' }

// Response body field matches regex
{ source: 'body', expression: '$.data.email', matcher: 'matches-regex', expected: '^[\\w.-]+@[\\w.-]+\\.\\w+$' }

// Response header present
{ source: 'header', expression: 'Content-Type', matcher: 'contains', expected: 'application/json' }

// Response time under threshold
{ source: 'timing', expression: 'total', matcher: 'less-than', expected: 500 }

// Response body matches JSON Schema
{ source: 'body', matcher: 'json-schema', expected: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } }

// Array has expected length
{ source: 'body', expression: '$.data.users', matcher: 'has-length', expected: 10 }

// Response size under limit
{ source: 'size', expression: 'response', matcher: 'less-than', expected: 1048576 }   // 1MB
```

---

## 19. History & Search

### 19.1 History Data Model

```typescript
interface HistoryEntry {
  id: string;
  requestConfig: RequestConfig;   // as sent (variables resolved)
  requestConfigRaw: RequestConfig; // as authored (with {{variables}})
  response: ResponseResult;
  environment?: string;           // environment name used
  collectionId?: string;
  requestId?: string;             // link back to saved request
  assertions?: AssertionResult[];
  timestamp: string;              // ISO 8601
  durationMs: number;
  protocol: 'rest' | 'graphql' | 'websocket' | 'grpc';
}
```

### 19.2 Search Capabilities

```typescript
interface HistorySearch {
  search(query: string, filters?: HistoryFilters): Promise<HistorySearchResult>;
}

interface HistoryFilters {
  dateFrom?: string;
  dateTo?: string;
  methods?: HttpMethod[];
  statusCodes?: { min: number; max: number };
  protocols?: string[];
  collectionId?: string;
  environmentName?: string;
  limit?: number;
  offset?: number;
}

interface HistorySearchResult {
  entries: HistoryEntry[];
  total: number;
  searchedFields: string[];      // which fields matched
}
```

### 19.3 Full-Text Search Scope

Search indexes the following fields:

- Request URL (raw and resolved)
- Request headers (keys and values)
- Request body (raw text)
- Response body (raw text)
- Request name
- Request description
- Collection name
- Folder name

### 19.4 History Retention

- Default retention: 30 days
- Configurable per workspace: 7 / 14 / 30 / 60 / 90 days / unlimited
- Manual clear option (clear all, clear by date range, clear by collection)
- Maximum entries limit: configurable, default 10,000

---

## 20. Authentication & Authorization

### 20.1 Anonymous Mode

- No authentication required
- All data stored in browser IndexedDB
- No server-side storage
- Full feature access (no limitations)
- Users export/import YAML files for backup

---

## 21. Deployment Models

### 21.1 Public Hosted (invoke.dev)

- React SPA served via CDN (Cloudflare)
- Node.js backend + Go executor on VPS (Contabo Singapore or equivalent)
- No database — all user data in browser IndexedDB

```
[User Browser] → [CDN: React SPA] → [API Server: Node.js + @invoke/core]
                                           ↓ gRPC
                                     [Go Executor]
```

### 21.2 Self-Hosted (Docker Compose)

**Minimum requirements:**
- Docker and Docker Compose
- 2 CPU cores, 2 GB RAM
- 10 GB disk space

**Docker Compose services:**

| Service | Image | Purpose |
|---------|-------|---------|
| `ui` | `invoke/ui:latest` | React SPA served by Nginx |
| `server` | `invoke/server:latest` | Node.js API server with @invoke/core |
| `executor` | `invoke/executor:latest` | Go HTTP executor (gRPC) |

```yaml
# docker-compose.yml
services:
  ui:
    image: invoke/ui:latest
    ports:
      - "3000:80"
    depends_on:
      - server

  server:
    image: invoke/server:latest
    environment:
      EXECUTOR_ADDR: executor:50051
      STORAGE_MODE: browser
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      - executor

  executor:
    image: invoke/executor:latest
    # internal only, no ports exposed to host
```

### 21.3 Single-Container Option

For quick local use, a single Docker image bundles all services:

```bash
docker run -p 3000:3000 invoke/all-in-one:latest
```

Runs Node.js server + Go executor with IndexedDB in the browser (no embedded database needed).

---

## 22. Storage Architecture

### 22.1 Storage Adapter Interface

```typescript
interface StorageAdapter {
  collections: CollectionStore;
  environments: EnvironmentStore;
  history: HistoryStore;
  flows: FlowStore;
  workspaces: WorkspaceStore;
  users?: UserStore;              // team/self-hosted mode only
}

interface CollectionStore {
  create(data: CreateCollectionInput): Promise<Collection>;
  getById(id: string): Promise<Collection | null>;
  getAll(workspaceId?: string): Promise<Collection[]>;
  update(id: string, data: UpdateCollectionInput): Promise<Collection>;
  delete(id: string): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

// Similar interfaces for EnvironmentStore, HistoryStore, FlowStore, WorkspaceStore
```

### 22.2 IndexedDB Implementation

- Used for all users (anonymous only)
- All data stored in browser-local IndexedDB via Dexie.js
- Database name: `invoke`
- Object stores: `collections`, `environments`, `history`, `flows`, `workspaces`
- Full-text search via Dexie.js full-text addon or client-side filtering
- Data survives browser restarts but is device-specific
- Export/import for backup and migration

### 22.3 File/YAML Implementation (Export)

- Used for Git-friendly collection export
- Each request is a separate YAML file
- Folder structure mirrors collection hierarchy
- Read-only import; write creates/updates from files

---

## 23. Tech Stack

### 23.1 Core Engine

The core engine runs in the browser. It produces two entry points:
- `@invoke/core` — browser-safe modules (no Node.js APIs)
- `@invoke/core/server` — Node.js-only modules (gRPC client, isolated-vm)

| Component | Technology | Version | Environment |
|-----------|-----------|---------|-------------|
| Language | TypeScript | 5.x | Both |
| Build tool | tsup | latest | Both (produces CJS + ESM) |
| Testing | Vitest | latest | Both |
| JSON Schema validation | Ajv | 8.x | Both |
| JSONPath | jsonpath-plus | latest | Both |
| YAML parsing | js-yaml | 4.x | Both |
| JSON diffing | microdiff | latest | Both |
| Script sandbox (browser) | Web Worker + Blob URL | native | Browser only |
| Script sandbox (server) | isolated-vm | latest | Node.js only |
| gRPC client | @grpc/grpc-js + @grpc/proto-loader | latest | Node.js only |
| IndexedDB | Dexie.js | latest | Browser only |
| E2E testing | @playwright/test | latest | Dev only |

### 23.2 Node.js Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Hono | latest |
| WebSocket | ws | latest |
| Testing | Vitest + Supertest | latest |
| ORM / Query builder | Drizzle ORM | latest |
| Database | PostgreSQL | 16 |
| Authentication | JWT (jsonwebtoken) | latest |
| Password hashing | bcrypt or argon2 | latest |
| Validation | Zod | latest |
| Logging | Pino | latest |
| Migration | Drizzle Kit | latest |

### 23.3 React Web UI

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.3.x |
| Language | TypeScript | 5.x |
| Build tool | Vite | latest |
| State management | Zustand | latest |
| CSS framework | Tailwind CSS | 3.x |
| Code editor | CodeMirror 6 | latest |
| Icons | Lucide React | latest |
| Search | Fuse.js (fuzzy search) | latest |
| HTTP client (UI → server) | Native Fetch API | — |
| WebSocket client | Native WebSocket API / SSE | — |
| IndexedDB | Dexie 4.x | latest |
| Linting | ESLint + Prettier | latest |

### 23.4 Go HTTP Executor

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Go | 1.23+ |
| gRPC server | google.golang.org/grpc | latest |
| Protobuf | google.golang.org/protobuf | latest |
| HTTP client | net/http (standard library) | — |
| HTTP tracing | net/http/httptrace | — |
| TLS | crypto/tls | — |
| WebSocket | nhooyr.io/websocket | latest |
| gRPC reflection | google.golang.org/grpc/reflection | latest |
| Logging | zerolog or slog | latest |

### 23.5 Infrastructure

| Component | Technology |
|-----------|-----------|
| Containerization | Docker |
| Orchestration | Docker Compose |
| CI/CD | GitHub Actions |
| Container registry | GitHub Container Registry (ghcr.io) |
| CDN (public hosted) | Cloudflare |
| VPS (public hosted) | Contabo (Singapore region) |
| SSL | Let's Encrypt / Cloudflare |
| Reverse proxy | Nginx |
| Monitoring | Uptime Kuma (self-hosted) |

---

## 24. Project Structure

```
invoke/
├── proto/
│   └── executor.proto                    # gRPC contract (source of truth)
│
├── packages/
│   ├── core/                             # @invoke/core — TypeScript core engine
│   │   ├── src/
│   │   │   ├── index.ts                  # Public API exports
│   │   │   ├── types/                    # Shared type definitions
│   │   │   │   ├── request.ts
│   │   │   │   ├── response.ts
│   │   │   │   ├── collection.ts
│   │   │   │   ├── environment.ts
│   │   │   │   ├── flow.ts
│   │   │   │   ├── assertion.ts
│   │   │   │   └── auth.ts
│   │   │   ├── collection/
│   │   │   │   ├── manager.ts            # Collection CRUD
│   │   │   │   ├── search.ts             # Full-text search
│   │   │   │   └── ordering.ts           # Sort/reorder
│   │   │   ├── variable/
│   │   │   │   ├── resolver.ts           # Template resolution
│   │   │   │   ├── scope.ts              # Scope hierarchy
│   │   │   │   ├── extractor.ts          # JSONPath extraction
│   │   │   │   └── dynamic.ts            # Built-in dynamic variables
│   │   │   ├── flow/
│   │   │   │   ├── runner.ts             # Flow orchestration
│   │   │   │   ├── conditional.ts        # If/else evaluation
│   │   │   │   └── loop.ts              # Loop execution
│   │   │   ├── assertion/
│   │   │   │   ├── engine.ts             # Assertion evaluator
│   │   │   │   └── matchers.ts           # Matcher implementations
│   │   │   ├── diff/
│   │   │   │   ├── json-diff.ts          # Structural JSON diff
│   │   │   │   └── response-diff.ts      # Full response comparison
│   │   │   ├── codegen/
│   │   │   │   ├── generator.ts          # Dispatcher
│   │   │   │   ├── targets/
│   │   │   │   │   ├── curl.ts
│   │   │   │   │   ├── fetch.ts
│   │   │   │   │   ├── axios.ts
│   │   │   │   │   ├── spring-resttemplate.ts
│   │   │   │   │   ├── spring-webclient.ts
│   │   │   │   │   ├── okhttp.ts
│   │   │   │   │   ├── python-requests.ts
│   │   │   │   │   ├── python-httpx.ts
│   │   │   │   │   ├── go-net-http.ts
│   │   │   │   │   ├── php-guzzle.ts
│   │   │   │   │   ├── csharp-httpclient.ts
│   │   │   │   │   └── ruby-net-http.ts
│   │   │   │   └── template.ts           # Shared code generation utilities
│   │   │   ├── mock/
│   │   │   │   ├── server.ts             # Mock HTTP server
│   │   │   │   ├── recorder.ts           # Response recorder
│   │   │   │   └── matcher.ts            # Request matching
│   │   │   ├── import/
│   │   │   │   ├── importer.ts           # Format detection + dispatch
│   │   │   │   ├── postman.ts            # Postman v2.1 parser
│   │   │   │   ├── openapi.ts            # OpenAPI 3.x parser
│   │   │   │   ├── curl.ts              # cURL parser
│   │   │   │   ├── insomnia.ts           # Insomnia v4 parser
│   │   │   │   └── hoppscotch.ts         # Hoppscotch parser
│   │   │   ├── export/
│   │   │   │   ├── exporter.ts           # Format dispatch
│   │   │   │   ├── yaml.ts              # invoke YAML format
│   │   │   │   ├── json.ts              # invoke JSON format
│   │   │   │   ├── postman.ts            # Postman v2.1 export
│   │   │   │   ├── openapi.ts            # OpenAPI export
│   │   │   │   └── curl.ts              # cURL export
│   │   │   ├── history/
│   │   │   │   ├── manager.ts            # History CRUD + retention
│   │   │   │   └── search.ts             # Full-text history search
│   │   │   ├── auth/
│   │   │   │   ├── resolver.ts           # Auth config → headers/params
│   │   │   │   └── oauth2.ts             # OAuth2 flow handler
│   │   │   ├── script/
│   │   │   │   ├── runner.ts             # Script execution sandbox
│   │   │   │   └── context.ts            # Script API (pre/post)
│   │   │   ├── schema/
│   │   │   │   └── validator.ts          # JSON Schema validation
│   │   │   ├── executor/
│   │   │   │   └── grpc-client.ts        # gRPC client to Go executor
│   │   │   └── storage/
│   │   │       ├── adapter.ts            # Storage interface
│   │   │       ├── indexeddb.ts          # Browser implementation
│   │   │       ├── postgres.ts           # Server implementation
│   │   │       └── file.ts              # YAML file implementation
│   │   ├── test/                         # Vitest unit tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server/                           # Node.js API server
│   │   ├── src/
│   │   │   ├── index.ts                  # Server entrypoint
│   │   │   ├── config.ts                 # Environment configuration
│   │   │   ├── routes/
│   │   │   │   ├── request.ts            # POST /api/requests/execute
│   │   │   │   ├── request-stream.ts     # WebSocket /api/requests/stream
│   │   │   │   ├── collection.ts         # CRUD /api/collections
│   │   │   │   ├── environment.ts        # CRUD /api/environments
│   │   │   │   ├── flow.ts              # POST /api/flows/run
│   │   │   │   ├── history.ts            # GET /api/history
│   │   │   │   ├── diff.ts              # POST /api/diff
│   │   │   │   ├── mock.ts              # POST /api/mock/start|stop
│   │   │   │   ├── import.ts            # POST /api/import
│   │   │   │   ├── export.ts            # POST /api/export
│   │   │   │   ├── codegen.ts           # POST /api/codegen
│   │   │   │   ├── workspace.ts         # CRUD /api/workspaces
│   │   │   │   └── auth.ts             # POST /api/auth/login|register
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts              # JWT verification
│   │   │   │   ├── error.ts             # Error handling
│   │   │   │   └── validation.ts        # Request validation (Zod)
│   │   │   ├── websocket/
│   │   │   │   ├── hub.ts               # WebSocket connection manager
│   │   │   │   └── handlers.ts          # Event handlers
│   │   │   └── db/
│   │   │       ├── schema.ts            # Drizzle schema
│   │   │       └── migrations/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                               # React SPA
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── components/
│       │   │   ├── editors/              # CodeEditor (CodeMirror wrapper)
│       │   │   ├── layout/               # Sidebar, TopBar
│       │   │   ├── palette/              # CommandPalette (Ctrl+K)
│       │   │   └── shared/               # Modals, forms, UI primitives
│       │   ├── features/                 # Feature modules (colocated components + logic)
│       │   │   ├── bootstrap/            # App initialization, health checks
│       │   │   ├── codegen/              # Code export UI
│       │   │   ├── collections/          # Collection tree, collection runner, batch runner
│       │   │   ├── cookies/              # Cookie manager
│       │   │   ├── diff/                 # Diff viewer
│       │   │   ├── environments/         # Environment editor
│       │   │   ├── execute/              # Request execution setup
│       │   │   ├── execution/            # Request/response handling, response viewer
│       │   │   ├── flows/                # Flow editor & runner
│       │   │   ├── grpc/                 # gRPC request UI
│       │   │   ├── health/               # Health check panel
│       │   │   ├── history/              # History viewer
│       │   │   ├── mock/                 # Mock server UI
│       │   │   ├── oauth2/               # OAuth2 token UI
│       │   │   ├── request/              # Request builder
│       │   │   ├── response/             # Response viewer
│       │   │   ├── settings/             # Settings panel
│       │   │   ├── variables/            # Variable editor
│       │   │   ├── websocket/            # WebSocket client UI
│       │   │   └── webhook/              # Webhook capture
│       │   ├── store/                    # Zustand store slices
│       │   ├── hooks/                    # Custom React hooks
│       │   └── lib/                      # Utilities
│       ├── test/                         # Component and integration tests
│       ├── public/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── tailwind.config.js
│
├── executor/                             # Go HTTP executor sidecar
│   ├── cmd/
│   │   └── executor/
│   │       └── main.go                   # gRPC server entrypoint
│   ├── internal/
│   │   ├── server/
│   │   │   └── grpc.go                   # gRPC service implementation
│   │   ├── runner/
│   │   │   ├── execute.go                # Core HTTP execution
│   │   │   ├── timing.go                 # httptrace timing hooks
│   │   │   ├── redirect.go               # Redirect chain tracking
│   │   │   └── stream.go                 # SSE / chunked handling
│   │   ├── tls/
│   │   │   ├── inspect.go                # Certificate inspection
│   │   │   └── config.go                 # Custom CA, client certs
│   │   ├── proxy/
│   │   │   └── proxy.go                  # HTTP/SOCKS5 proxy support
│   │   ├── websocket/
│   │   │   └── client.go                 # WebSocket connection handling
│   │   ├── grpc/
│   │   │   └── client.go                 # gRPC client (for gRPC protocol testing)
│   │   └── batch/
│   │       └── parallel.go               # Concurrent execution + stats
│   ├── proto/
│   │   └── executor.pb.go                # Generated from /proto
│   ├── go.mod
│   └── go.sum
│
├── docker/
│   ├── Dockerfile.ui                     # React build → Nginx
│   ├── Dockerfile.server                 # Node.js server
│   ├── Dockerfile.executor               # Go executor
│   └── Dockerfile.all-in-one             # Combined single container
│
├── docker-compose.yml                    # Self-hosted deployment
├── docker-compose.dev.yml                # Development with hot-reload
├── pnpm-workspace.yaml
├── package.json
├── .github/
│   └── workflows/
│       ├── ci.yml                        # Lint, test, build
│       ├── release.yml                   # Build & push Docker images
│       └── deploy.yml                    # Deploy to public hosted
├── README.md
├── LICENSE
└── CONTRIBUTING.md
```

---

## 25. gRPC Contract (Proto Definition)

```protobuf
syntax = "proto3";
package invoke.executor;

option go_package = "github.com/brendatama/invoke/executor/proto";

service HttpExecutor {
  // Single request execution
  rpc Execute (HttpRequest) returns (HttpResponse);

  // Streaming response (for SSE, large bodies)
  rpc ExecuteStream (HttpRequest) returns (stream ResponseChunk);

  // Parallel execution (benchmarking)
  rpc ExecuteBatch (BatchRequest) returns (stream BatchResponse);

  // TLS certificate inspection (without full request)
  rpc InspectTLS (TLSInspectRequest) returns (TLSInfo);

  // WebSocket connection
  rpc WebSocketConnect (WebSocketRequest) returns (stream WebSocketMessage);
  rpc WebSocketSend (WebSocketSendRequest) returns (WebSocketSendResponse);
  rpc WebSocketClose (WebSocketCloseRequest) returns (WebSocketCloseResponse);

  // gRPC reflection + execution
  rpc GrpcReflect (GrpcReflectRequest) returns (GrpcReflectResponse);
  rpc GrpcExecute (GrpcExecuteRequest) returns (GrpcExecuteResponse);

  // Health check
  rpc Ping (Empty) returns (PingResponse);
}

// --- HTTP Messages ---

message HttpRequest {
  string request_id = 1;
  string method = 2;
  string url = 3;
  map<string, string> headers = 4;
  bytes body = 5;
  RequestOptions options = 6;
}

message RequestOptions {
  int32 timeout_ms = 1;
  bool follow_redirects = 2;
  int32 max_redirects = 3;
  bool verify_ssl = 4;
  ProxyConfig proxy = 5;
  TLSClientConfig tls_client = 6;
}

message ProxyConfig {
  string url = 1;
  string username = 2;
  string password = 3;
}

message TLSClientConfig {
  bytes client_cert_pem = 1;
  bytes client_key_pem = 2;
  bytes ca_bundle_pem = 3;
}

message HttpResponse {
  string request_id = 1;
  int32 status_code = 2;
  string status_text = 3;
  map<string, string> headers = 4;
  bytes body = 5;
  Timing timing = 6;
  Size size = 7;
  repeated Redirect redirects = 8;
  TLSInfo tls_info = 9;
  string remote_address = 10;
  string http_version = 11;
}

message Timing {
  double dns_ms = 1;
  double tcp_ms = 2;
  double tls_ms = 3;
  double ttfb_ms = 4;
  double transfer_ms = 5;
  double total_ms = 6;
}

message Size {
  int64 request_bytes = 1;
  int64 response_bytes = 2;
  int64 response_body_bytes = 3;
}

message Redirect {
  string url = 1;
  int32 status_code = 2;
  map<string, string> headers = 3;
  Timing timing = 4;
}

message TLSInfo {
  string protocol_version = 1;
  string cipher_suite = 2;
  repeated Certificate certificates = 3;
}

message Certificate {
  string subject = 1;
  string issuer = 2;
  string not_before = 3;
  string not_after = 4;
  string serial_number = 5;
  repeated string subject_alt_names = 6;
  string fingerprint_sha256 = 7;
}

// --- Streaming ---

message ResponseChunk {
  oneof data {
    bytes body_chunk = 1;
    HttpResponse final_response = 2;
  }
}

// --- Batch ---

message BatchRequest {
  HttpRequest request = 1;
  int32 count = 2;
  int32 concurrency = 3;
  int32 delay_between_ms = 4;
}

message BatchResponse {
  oneof result {
    HttpResponse individual = 1;
    BatchSummary summary = 2;
  }
}

message BatchSummary {
  int32 total = 1;
  int32 successful = 2;
  int32 failed = 3;
  double mean_ms = 4;
  double median_ms = 5;
  double p95_ms = 6;
  double p99_ms = 7;
  double min_ms = 8;
  double max_ms = 9;
  double std_dev_ms = 10;
  map<int32, int32> status_code_distribution = 11;
}

// --- TLS Inspection ---

message TLSInspectRequest {
  string host = 1;
  int32 port = 2;
}

// --- WebSocket ---

message WebSocketRequest {
  string url = 1;
  map<string, string> headers = 2;
  repeated string subprotocols = 3;
}

message WebSocketMessage {
  enum Type {
    TEXT = 0;
    BINARY = 1;
    PING = 2;
    PONG = 3;
    CLOSE = 4;
    CONNECTED = 5;
    ERROR = 6;
  }
  string connection_id = 1;
  Type type = 2;
  bytes data = 3;
  string timestamp = 4;
}

message WebSocketSendRequest {
  string connection_id = 1;
  WebSocketMessage.Type type = 2;
  bytes data = 3;
}

message WebSocketSendResponse {
  bool success = 1;
  string error = 2;
}

message WebSocketCloseRequest {
  string connection_id = 1;
  int32 code = 2;
  string reason = 3;
}

message WebSocketCloseResponse {
  bool success = 1;
}

// --- gRPC Protocol Testing ---

message GrpcReflectRequest {
  string host = 1;
  bool use_tls = 2;
  TLSClientConfig tls_config = 3;
}

message GrpcReflectResponse {
  repeated GrpcService services = 1;
}

message GrpcService {
  string name = 1;
  repeated GrpcMethod methods = 2;
}

message GrpcMethod {
  string name = 1;
  string input_type = 2;
  string output_type = 3;
  bool client_streaming = 4;
  bool server_streaming = 5;
  string input_schema_json = 6;      // JSON representation of proto fields
  string output_schema_json = 7;
}

message GrpcExecuteRequest {
  string host = 1;
  string service = 2;
  string method = 3;
  bytes message_json = 4;            // JSON-encoded request message
  map<string, string> metadata = 5;
  int32 timeout_ms = 6;
  bool use_tls = 7;
  TLSClientConfig tls_config = 8;
}

message GrpcExecuteResponse {
  bytes response_json = 1;           // JSON-encoded response message
  map<string, string> response_metadata = 2;
  map<string, string> trailing_metadata = 3;
  int32 status_code = 4;
  string status_message = 5;
  double duration_ms = 6;
}

// --- Common ---

message Empty {}

message PingResponse {
  string version = 1;
  string go_version = 2;
  int64 uptime_seconds = 3;
}
```

---

## 26. API Routes

### 26.1 Request Execution

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/requests/execute` | Execute a single request |
| WS | `/api/requests/stream` | Execute with streaming response |
| POST | `/api/requests/batch` | Execute batch (benchmarking) |

### 26.2 Collections

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/collections` | List all collections |
| POST | `/api/collections` | Create collection |
| GET | `/api/collections/:id` | Get collection by ID |
| PUT | `/api/collections/:id` | Update collection |
| DELETE | `/api/collections/:id` | Delete collection |
| POST | `/api/collections/:id/duplicate` | Duplicate collection |
| POST | `/api/collections/:id/folders` | Create folder |
| PUT | `/api/collections/folders/:id` | Update folder |
| DELETE | `/api/collections/folders/:id` | Delete folder |
| POST | `/api/collections/:id/requests` | Create request |
| PUT | `/api/collections/requests/:id` | Update request |
| DELETE | `/api/collections/requests/:id` | Delete request |
| POST | `/api/collections/requests/:id/duplicate` | Duplicate request |
| POST | `/api/collections/reorder` | Reorder items |
| GET | `/api/collections/search?q=` | Search collections |

### 26.3 Environments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/environments` | List all environments |
| POST | `/api/environments` | Create environment |
| GET | `/api/environments/:id` | Get environment |
| PUT | `/api/environments/:id` | Update environment |
| DELETE | `/api/environments/:id` | Delete environment |
| POST | `/api/environments/:id/duplicate` | Duplicate environment |
| PUT | `/api/environments/active` | Set active environment |

### 26.4 Flows

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/flows` | List all flows |
| POST | `/api/flows` | Create flow |
| GET | `/api/flows/:id` | Get flow |
| PUT | `/api/flows/:id` | Update flow |
| DELETE | `/api/flows/:id` | Delete flow |
| POST | `/api/flows/:id/run` | Execute flow |
| POST | `/api/flows/:id/cancel` | Cancel running flow |

### 26.5 History

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/history` | List history (with filters) |
| GET | `/api/history/:id` | Get history entry |
| DELETE | `/api/history` | Clear history (with filters) |
| GET | `/api/history/search?q=` | Full-text search history |

### 26.6 Diff

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/diff/responses` | Diff two responses |
| POST | `/api/diff/environments` | Execute + diff across envs |

### 26.7 Mock

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mock/start` | Start mock server |
| POST | `/api/mock/stop` | Stop mock server |
| GET | `/api/mock/status` | Get mock server status |
| GET | `/api/mock/log` | Get mock request log |
| PUT | `/api/mock/endpoints/:id` | Update mock endpoint |

### 26.8 Import / Export

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/import` | Import collection (multipart file) |
| POST | `/api/import/detect` | Detect import format |
| POST | `/api/export/:format` | Export collection |

### 26.9 Code Generation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/codegen` | Generate code snippet |
| GET | `/api/codegen/targets` | List available targets |

### 26.10 TLS

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tls/inspect` | Inspect TLS certificate |

### 26.11 Settings

> **Note:** Settings are stored in browser localStorage.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |

---

## 27. UI Component Inventory

### 27.1 Shared Components

| Component | Description |
|-----------|-------------|
| `CommandPalette` | Global search + command execution (Ctrl+K) |
| `KeyValueEditor` | Reusable key-value pair editor (params, headers, form data) with enable/disable toggle, description, and drag reorder |
| `TabBar` | Horizontal tabs for request/response sections |
| `SplitPane` | Resizable horizontal/vertical split panel |
| `ConfirmDialog` | Confirmation modal with customizable message and actions |
| `ToastNotification` | Toast notifications (success, error, warning, info) |
| `LoadingSkeleton` | Skeleton loading placeholders |
| `CodeEditor` | Monaco/CodeMirror wrapper with language modes, themes, and formatting |
| `EmptyState` | Illustrated empty state with action button |

### 27.2 Component Count Summary

| Category | Component Count |
|----------|----------------|
| Request builder | 8 |
| Response viewer | 9 |
| Collection management | 6 |
| Environment | 3 |
| Flow builder | 7 |
| Diff viewer | 4 |
| Mock server | 3 |
| History | 2 |
| GraphQL | 3 |
| WebSocket | 3 |
| gRPC | 3 |
| Code generation | 1 |
| Settings | 4 |
| Shared/utility | 9 |
| **Total** | **~62 components** |

---

## 28. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send request |
| `Ctrl+S` | Save request to collection |
| `Ctrl+K` | Open command palette |
| `Ctrl+N` | New request tab |
| `Ctrl+W` | Close active tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+E` | Toggle environment switcher |
| `Ctrl+D` | Duplicate active request |
| `Ctrl+L` | Focus URL bar |
| `Ctrl+Shift+F` | Full-text search |
| `Ctrl+Shift+H` | Toggle history panel |
| `Ctrl+Shift+C` | Toggle collection sidebar |
| `Ctrl+B` | Toggle sidebar visibility |
| `Ctrl+\` | Toggle response panel |
| `Ctrl+Shift+P` | Format request body (prettify) |
| `F5` | Send request (alternative) |
| `Esc` | Close dialog / command palette |

All shortcuts are customizable in settings.

---

## 29. Non-Functional Requirements

### 29.1 Performance

| Metric | Target |
|--------|--------|
| Web UI initial load | < 3 seconds (cached: < 1 second) |
| Time from "Send" click to response display | < 50ms overhead (excluding target API latency) |
| Collection tree render (1,000 requests) | < 200ms |
| Full-text search (10,000 history entries) | < 500ms |
| Command palette open | < 100ms |
| Tab switching | < 50ms |
| JSON tree render (1MB body) | < 1 second |
| Memory usage (web UI) | < 200MB browser tab |
| Go executor startup | < 500ms |
| Go executor idle memory | < 30MB |

### 29.2 Reliability

- Go executor process recovery: auto-restart on crash
- Node.js server graceful shutdown: drain active requests
- IndexedDB data integrity: transactions for multi-object writes
- PostgreSQL: connection pool with health checks and retry
- gRPC: connection retry with exponential backoff

### 29.3 Security

- All passwords hashed with argon2id
- JWT tokens with RS256 or HS256
- Sensitive environment variables encrypted at rest (AES-256-GCM)
- CSRF protection on all state-changing endpoints
- Rate limiting on auth endpoints (5 attempts per minute)
- Input validation on all API endpoints (Zod schemas)
- CSP headers on the web UI
- No eval() or dynamic code execution in the frontend
- Script sandbox (vm2/isolated-vm) with CPU/memory limits
- Dependencies audited regularly (npm audit, govulncheck)

### 29.4 Scalability (Self-Hosted)

| Metric | Target |
|--------|--------|
| Concurrent users per instance | Up to 50 |
| Collections per workspace | Up to 10,000 |
| Requests per collection | Up to 5,000 |
| History entries | Up to 1,000,000 (with retention) |
| Mock server concurrent connections | Up to 100 |

### 29.5 Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome / Edge | Latest 2 major versions |
| Firefox | Latest 2 major versions |
| Safari | Latest 2 major versions |

### 29.6 Accessibility

- Keyboard navigation for all primary actions
- ARIA labels on interactive elements
- Focus management in dialogs and command palette
- Sufficient color contrast in both light and dark themes
- Screen reader compatible tree views and tables

### 29.7 Failure Modes & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Go executor crashes mid-request | Node.js proxy returns 502 with "Executor unavailable" message. Auto-retry connection with exponential backoff (1s, 2s, 4s, max 30s). UI shows error toast with retry button. |
| Go executor crashes during flow | Current step fails. If `continueOnFailure` is true, next step runs. Otherwise flow stops with partial results and status `'error'`. All completed steps are preserved. |
| Flow step times out | Step marked as `'error'` with timeout message. Same `continueOnFailure` logic applies. Default timeout: 30 seconds per step. |
| User navigates away during flow | Flow continues running in the browser (same tab). If user closes the tab, flow is lost (browser-only execution). History entries for completed steps are already saved. |
| IndexedDB storage quota exceeded | Browser typically allows 50-80% of available disk. When quota is hit, write operations fail. UI shows warning: "Storage full — export and clear history to free space." History retention auto-prune runs immediately. |
| Mock server port already in use | `POST /api/mock/start` returns error with message "Port 8080 is already in use". UI prompts user to choose a different port. |
| Mock server container restart | Mock state (in-memory) is lost. `GET /api/mock/status` returns "not running". UI detects this and shows "Restart Mock" button, which re-pushes config from IndexedDB. |
| Import file is malformed | Import parser returns error with specific message (e.g., "Invalid JSON at line 42" or "Missing required field 'info' for Postman format"). UI shows error in import dialog with option to try a different format. |
| Large response body (>10MB) | JSON tree view switches to virtualized rendering. Raw view uses CodeMirror's lazy rendering. Response is still saved to history but subject to retention limits. |
| WebSocket connection drops | UI shows "Disconnected" status. Auto-reconnect option available. Message log preserves all messages from the session. |
| gRPC server doesn't support reflection | Reflection request fails. UI prompts user to upload a `.proto` file manually as alternative. |
| Script execution exceeds timeout (5s) | Web Worker is terminated via `Worker.terminate()`. Script result returns `'error'` with "Script execution timed out after 5000ms". |
| Script execution exceeds memory | Web Worker is terminated by browser. Script result returns `'error'` with "Script exceeded memory limit". |
| Browser doesn't support required APIs | On load, check for IndexedDB, Web Workers, and Crypto API. If missing, show unsupported browser message with minimum version requirements. |

### 29.8 Observability

Observability is minimal — focused on operational health, not analytics:

- **Health endpoint:** `GET /api/ping` returns Go executor version, uptime, and connection status
- **Structured logging:** Pino (Node.js) and zerolog (Go) with JSON output, log levels, request IDs
- **Error tracking:** All errors include a request ID that traces through Node.js proxy → Go executor for debugging
- **Request timing:** Every proxy request logs total proxy overhead (time from receiving browser request to returning Go response)
- **Mock server metrics:** Request count and error count exposed via `GET /api/mock/status`

**Not included:** APM integration, distributed tracing, metrics dashboards, usage analytics.

---

## 30. Feature Inventory

> A fully functional API testing tool that anyone can use without an account. All data stored in browser IndexedDB. Public hosted + self-hosted Docker deployment.

#### Core Engine

| # | Feature | Description |
|---|---------|-------------|
| C01 | HTTP request execution | Execute REST requests via Go sidecar with precise timing |
| C02 | GraphQL execution | Execute GraphQL queries, mutations, subscriptions |
| C03 | WebSocket client | Connect, send, receive WebSocket messages |
| C04 | gRPC client | Server reflection, unary and streaming calls |
| C05 | Variable resolution | Resolve `{{variables}}` across scoped hierarchy |
| C06 | Dynamic variables | Built-in `$uuid`, `$timestamp`, `$randomInt`, etc. |
| C07 | Variable extraction | Extract values from response body (JSONPath), headers, cookies |
| C08 | Collection CRUD | Create, read, update, delete collections and folders |
| C09 | Collection search | Full-text search across request names, URLs, bodies, headers |
| C10 | Environment management | CRUD environments, variable editor, active env switching |
| C11 | Environment file import | Import from `.env` files |
| C12 | Auth helpers | Bearer, Basic, API Key, OAuth2, Digest, AWS Sig V4, NTLM |
| C13 | OAuth2 token management | Auto-fetch, cache, refresh OAuth2 tokens |
| C14 | Cookie management | Auto-send cookies, manual override, cookie jar |
| C15 | Pre-request scripts | JavaScript scripts executed before request |
| C16 | Post-response scripts | JavaScript scripts executed after response |
| C17 | Script sandbox | Secure isolated-vm execution environment for scripts |
| C18 | Assertion engine | Status, header, body, timing, size assertions |
| C19 | JSON Schema validation | Validate response body against JSON Schema |
| C20 | Flow runner | Orchestrate multi-step request chains |
| C21 | Flow conditions | If/else branching based on response values |
| C22 | Flow loops | Repeat steps N times or until condition |
| C23 | Flow delay | Wait between steps |
| C24 | Flow variable passing | Pass extracted variables between flow steps |
| C25 | Response diffing | Structural JSON diff between two responses |
| C26 | Environment diffing | Execute request against two envs and diff |
| C27 | Temporal diffing | Compare response now vs. historical response |
| C28 | Diff ignore rules | Ignore specific paths (timestamps, UUIDs) |
| C29 | Mock server | Serve recorded responses from a collection |
| C30 | Mock dynamic responses | Support dynamic variables in mock responses |
| C31 | Mock conditional responses | Different responses based on request content |
| C32 | Mock request logging | Log incoming requests to mock server |
| C33 | Import: Postman | Import Postman Collection v2.1 (including gRPC from v10+) |
| C34 | Import: OpenAPI | Import OpenAPI 3.x specs with local $ref resolution |
| C35 | Import: cURL | Parse cURL commands into requests |
| C36 | Import: Insomnia | Import Insomnia v4 collections (including gRPC) |
| C37 | Import: Hoppscotch | Import Hoppscotch collections |
| C37a | Import: HAR | Import browser DevTools HAR files |
| C37b | Import: grpcurl | Paste grpcurl commands as gRPC requests |
| C38 | Import: auto-detect | Detect import format automatically |
| C39 | Export: invoke ZIP/YAML | Export as ZIP archive with YAML files (Git-friendly) |
| C40 | Export: Workspace JSON | Export entire workspace as JSON backup |
| C42 | Export: OpenAPI | Generate OpenAPI 3.0.3 YAML spec from REST collection |
| C43a | Export: Environment .env | Export environment variables as .env file |
| C43b | Export: grpcurl/buf curl | Export gRPC requests as grpcurl or buf curl commands |
| C44 | Code generation | Generate code snippets (REST, WebSocket, gRPC — 20+ targets) |
| C45 | Request history | Store all executed requests with responses |
| C46 | History search | Full-text search across history entries |
| C47 | History retention | Configurable retention period and max entries |
| C48 | TLS inspection | Certificate chain, cipher suite, validity |
| C49 | Redirect tracking | Capture per-hop redirect data with timing |
| C50 | Collection runner | Run all requests in a collection with assertion results, JSON/CSV export |
| C50a | Batch runner | Run same request N times with configurable concurrency, delay, stop-on-failure, latency stats |
| C51 | Batch statistics | p50, p95, p99, mean, std dev, status distribution |
| C52 | Proxy support | HTTP and SOCKS5 proxy configuration |
| C53 | Client certificates | Client cert auth for mTLS endpoints |
| C54 | Custom CA bundles | Support self-signed server certificates |
| C55 | Response streaming | Stream SSE and large response bodies |
| C56 | Storage: IndexedDB | Browser-local storage adapter |
| C58 | Storage: File/YAML | File-based storage for export/import |

#### Web UI

| # | Feature | Description |
|---|---------|-------------|
| U01 | Request builder | Method selector, URL bar, tabs for params/headers/body/auth/scripts |
| U02 | URL variable highlighting | Visual chips for `{{variables}}` with hover preview |
| U03 | Response body viewer | JSON tree view, raw text, HTML preview |
| U04 | Response headers table | Sortable, copyable headers table |
| U05 | Timing waterfall | Visual bar chart of DNS/TCP/TLS/TTFB/transfer |
| U06 | TLS info panel | Certificate details, expiry warnings |
| U07 | Cookies table | Response cookies with all attributes |
| U08 | Assertion results panel | Pass/fail list with expected vs actual |
| U09 | Collection tree sidebar | Hierarchical tree with drag-and-drop, context menu |
| U10 | Collection search (sidebar) | Filter tree by name |
| U11 | Tabbed interface | Multiple open requests as tabs |
| U12 | Environment switcher | Top bar dropdown for environment selection |
| U13 | Environment editor | Variable table with initial/current values, sensitive toggle |
| U14 | Command palette | Ctrl+K global search and command execution |
| U15 | GraphQL query editor | Syntax-highlighted editor with autocomplete |
| U16 | GraphQL schema explorer | Browse types, fields, arguments from introspection |
| U17 | GraphQL variables editor | JSON editor for query variables |
| U18 | WebSocket client UI | Connect/disconnect, message composer, message log |
| U19 | gRPC client UI | Service explorer, message editor, metadata editor |
| U20 | Flow builder canvas | Visual drag-and-drop flow editor |
| U21 | Flow execution timeline | Per-step results with expandable details |
| U22 | Flow variable flow lines | Visual connections showing data flow between steps |
| U23 | Diff viewer | Side-by-side JSON diff with color coding |
| U24 | Diff source selector | Choose envs, history entries, or requests to compare |
| U25 | Mock server manager | Start/stop, endpoint list, response editor |
| U26 | Mock request log | Live log of incoming mock requests |
| U27 | History list | Chronological list with filters and search |
| U28 | History detail view | Full request/response viewer for history entry |
| U29 | History restore | Load historical request into builder |
| U30 | History compare | Select two entries for diff view |
| U31 | Code export panel | Target selector, generated code with copy button |
| U32 | Import dialog | File picker, format detection, import preview |
| U33 | Export dialog | Format selector, scope selection (collection, folder, request) |
| U34 | Settings: general | Theme, auto-save, editor preferences |
| U35 | Settings: proxy | Global proxy configuration |
| U36 | Settings: certificates | Client cert and CA bundle management |
| U37 | Settings: keyboard | View and customize shortcuts |
| U39 | Dark mode | Default dark theme with light mode toggle |
| U40 | Keyboard shortcuts | Full keyboard navigation (see section 28) |
| U41 | Resizable panels | Drag-to-resize sidebar, request/response split |
| U42 | Status bar | Response status, time, size, protocol |
| U43 | Toast notifications | Success, error, warning, info messages |
| U44 | Request body formatting | Auto-prettify JSON, XML |
| U45 | Request code editor | Syntax highlighting for JSON, XML, GraphQL, JavaScript |
| U46 | Bulk header editor | Raw text editing mode for headers |
| U47 | Bulk param editor | Raw text editing mode for query params |
| U48 | Response size indicator | Display response body and total sizes |

#### Deployment & Infrastructure

| # | Feature | Description |
|---|---------|-------------|
| D01 | Public hosted deployment | invoke.dev hosted on VPS with CDN |
| D02 | Self-hosted Docker Compose | Multi-container deployment (no database) |
| D03 | Single-container Docker | All-in-one image (server + executor) |
| D04 | Anonymous mode | Full features without account (IndexedDB) |
| D14 | CI/CD pipeline | GitHub Actions for lint, test, build, deploy |
| D15 | Docker image publishing | ghcr.io or Docker Hub |

---

## 31. Licensing

**License:** Business Source License 1.1 (BSL 1.1)

- Source code is publicly visible and auditable
- Users may view, fork, modify, and self-host for personal and internal use
- **Additional Use Grant:** Usage of invoke is permitted for any purpose except offering invoke as a hosted commercial service that competes with invoke's own hosted offering
- **Change License:** Apache License 2.0
- **Change Date:** 4 years from each release date
- After the change date, each version automatically converts to Apache 2.0 (fully open source)
- This is the same license model used by HashiCorp, MariaDB, Sentry, and CockroachDB

---

## 32. Resolved Decisions & Future Considerations

### 32.1 Resolved Decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | License selection | **BSL 1.1** with Apache 2.0 conversion after 4 years | Battle-tested (HashiCorp, MariaDB), simple terms, protects against competing hosted services while allowing all other use. SSPL has legal ambiguity and community pushback. |
| 2 | Domain and branding | **Deferred** — check availability of invoke.dev, invoke.io, invoke.app, getinvoke.com | Domain availability to be verified before public launch. |
| 3 | Go executor distribution | **Both options** — separate containers for teams (Docker Compose) + all-in-one single container for solo use | Minimal extra effort (~30 lines of Dockerfile). Solo devs get `docker run invoke/all-in-one`, teams get `docker compose up` with independent scaling. |
| 4 | Script sandbox runtime | **isolated-vm** (V8 isolates) | Uses same V8 engine as Node.js for 100% JavaScript behavior consistency. Actively maintained (used by Figma). Configurable memory (128MB) and CPU (5s timeout) limits per isolate. ~1ms isolate creation overhead. |
| 5 | Database ORM | **Drizzle ORM** | Lighter, SQL-like API, faster queries, smaller bundle. Better fit for a project that values performance and minimal abstraction. |
| 6 | File System Access API | **Both** — File System Access API on Chrome/Edge, download link fallback on Safari/Firefox | ~10 lines of feature detection code. Chrome/Edge users get native save dialogs, others get standard file downloads. No reason to limit to one approach. |
| 7 | Collection format versioning | **Both** — semver header (`invoke_version: "1.0"`) + auto-migration scripts | Version header in every YAML file costs one line. Migration functions chain `v1.0 → v1.1 → v1.2` automatically on import. Users never need to manually update files. |
| 8 | WebSocket/gRPC connections | **Connection registry with TTL-based cleanup** | Go executor maintains `map[string]*Connection` keyed by UUID. Background goroutine checks for idle connections every 30 seconds, closes connections idle for 30 minutes (configurable). Explicit disconnect from UI removes immediately. Prevents memory leaks from abandoned browser tabs. |
| 9 | Runtime | **Node.js 20 LTS** (not Bun) | gRPC dependency (`@grpc/grpc-js`) and script sandbox (`isolated-vm`) both require Node.js. Bun uses JavaScriptCore (not V8), so `isolated-vm` cannot work. Bun's gRPC streaming compatibility has known issues. |

### 32.2 Future Considerations

- **Plugin system** — Allow community extensions for custom auth types, importers, code generation targets, or UI panels.
- **AI-assisted testing** — Use LLMs to generate assertions, suggest test cases, or explain response differences.
- **API documentation generation** — Generate interactive API docs from collections (similar to Postman's published docs).
- **Load testing** — Extend batch execution into a proper load testing tool with ramp-up, sustained load, and reporting.
- **Contract testing** — Consumer-driven contract testing between microservices using collection definitions.
- **Mobile app** — Lightweight mobile client for monitoring and quick request testing.

---

## 33. Glossary

| Term | Definition |
|------|-----------|
| **Collection** | A group of saved API requests, organized in folders |
| **Environment** | A named set of variables (e.g., Development, Staging, Production) |
| **Flow** | A sequence of requests executed in order with variable passing between steps |
| **Assertion** | A rule that validates part of a response (status, body, headers, timing) |
| **Extraction** | Pulling a value from a response (via JSONPath, header name) and storing it as a variable |
| **Mock server** | A local HTTP server that returns recorded/configured responses |
| **Diff** | A structural comparison between two responses highlighting differences |
| **Sidecar** | A companion process (Go executor) that handles HTTP execution |
| **Workspace** | A container for collections, environments, and flows. Can be personal or shared. |
| **gRPC** | A high-performance RPC framework using Protocol Buffers |
| **Protobuf** | Protocol Buffers — Google's language-neutral serialization format |
| **JSONPath** | A query language for JSON (e.g., `$.data.users[0].name`) |
| **CORS** | Cross-Origin Resource Sharing — browser security restriction preventing direct API calls |
| **TTFB** | Time To First Byte — time from request sent to first response byte received |
| **IndexedDB** | Browser-native database for storing structured data client-side |
| **mTLS** | Mutual TLS — both client and server authenticate with certificates |
| **SSE** | Server-Sent Events — server push over HTTP |
| **CRDT** | Conflict-free Replicated Data Type — for real-time collaborative editing |

---

*End of PRD*
