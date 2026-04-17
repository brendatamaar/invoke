# invoke — Product Requirements Document

**Version:** 1.0
**Last Updated:** April 15, 2026
**Author:** Brendatama
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Positioning](#3-product-vision--positioning)
4. [Target Users](#4-target-users)
5. [Architecture Overview](#5-architecture-overview)
6. [System Architecture Detail](#6-system-architecture-detail)
7. [Core Engine Specification](#7-core-engine-specification)
8. [Go HTTP Executor Specification](#8-go-http-executor-specification)
9. [Web UI Specification](#9-web-ui-specification)
10. [CLI Specification](#10-cli-specification)
11. [Protocol Support](#11-protocol-support)
12. [Collection & Data Management](#12-collection--data-management)
13. [Environment & Variable System](#13-environment--variable-system)
14. [Flow Runner (Request Chaining)](#14-flow-runner-request-chaining)
15. [Response Diffing](#15-response-diffing)
16. [Mock Server](#16-mock-server)
17. [Import & Export](#17-import--export)
18. [Code Generation](#18-code-generation)
19. [Assertion Engine](#19-assertion-engine)
20. [History & Search](#20-history--search)
21. [Team & Collaboration](#21-team--collaboration)
22. [Authentication & Authorization](#22-authentication--authorization)
23. [Deployment Models](#23-deployment-models)
24. [Storage Architecture](#24-storage-architecture)
25. [Desktop App (v4)](#25-desktop-app-v4)
26. [Real-Time Collaboration (v5)](#26-real-time-collaboration-v5)
27. [CLI (v6)](#27-cli-v6)
28. [Tech Stack](#28-tech-stack)
29. [Project Structure](#29-project-structure)
30. [gRPC Contract (Proto Definition)](#30-grpc-contract-proto-definition)
31. [API Routes](#31-api-routes)
32. [UI Component Inventory](#32-ui-component-inventory)
33. [Keyboard Shortcuts](#33-keyboard-shortcuts)
34. [Non-Functional Requirements](#34-non-functional-requirements)
35. [Feature Inventory & Roadmap](#35-feature-inventory--roadmap)
36. [Licensing](#36-licensing)
37. [Resolved Decisions & Future Considerations](#37-resolved-decisions--future-considerations)
38. [Glossary](#38-glossary)

---

## 1. Executive Summary

**invoke** is a modern, open-source API development and testing platform designed to replace Postman for developers who value speed, privacy, and developer experience. It provides a web-based UI for interactive API testing, backed by a TypeScript core engine for business logic and a Go sidecar for high-precision HTTP execution.

invoke is built for both solo developers and small teams (2–10 developers). It is available as a public hosted service (invoke.dev) and as a self-hosted Docker deployment for teams that require data privacy. All features are available in both deployment modes with no premium gating.

The product supports REST, GraphQL, WebSocket, and gRPC protocols from MVP. The release roadmap is:

- **MVP** — Full-featured API client for anonymous public users (IndexedDB storage, no accounts)
- **v2** — Optional user accounts with cross-device sync (PostgreSQL added)
- **v3** — Team workspaces with roles and permissions (self-hosted)
- **v4** — Desktop app (Tauri — lightweight native wrapper for macOS, Windows, Linux)
- **v5** — Real-time collaborative editing (web + desktop)
- **v6** — CLI tool for terminal-based usage and CI/CD integration

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
5. **One tool, multiple interfaces** — The same core engine powers the web UI (MVP), desktop app (v4), and CLI (v6). Collections and configurations work identically across all interfaces.
6. **Accurate measurements** — HTTP timing data is precise and trustworthy, powered by a Go sidecar with nanosecond-level instrumentation.

### 3.3 Competitive Positioning

invoke sits at the intersection of Postman's feature depth, Bruno's privacy-first philosophy, and Hoppscotch's lightweight browser experience.

**One-liner:** *"Invoke your APIs — Postman's power, Bruno's philosophy, zero bloat."*

### 3.4 What invoke Is NOT

- invoke is not an API gateway or API management platform.
- invoke is not a load testing tool (though it supports basic benchmarking).
- invoke is not an API documentation generator (though it can export collections as docs).
- invoke does not aim to be an all-in-one API lifecycle platform. It focuses on building, testing, and debugging APIs.

### 3.5 Competitive Advantage

invoke wins because:

1. **Zero-friction start** — Open invoke.dev, send a request in 5 seconds. No account, no download, no onboarding wizard. Postman requires mandatory sign-up; Bruno requires a desktop install; Insomnia requires an account for collaboration.

2. **Git-native collections** — Export collections as file-per-request YAML. Branch, merge, and code-review API definitions like any other code. No proprietary sync, no vendor lock-in.

3. **Privacy by default** — All MVP data lives in your browser. No cloud sync, no telemetry, no one else sees your API keys. Self-host for full control.

4. **Instant startup** — Browser-based means <1 second to ready. No Electron boot time, no workspace loading, no "Postman is updating" splash screens.

5. **One core, many interfaces** — The same `@invoke/core` powers the web UI today, the Tauri desktop app in v4, and the CLI in v6. Your collections work everywhere.

6. **Precision HTTP timing** — Go sidecar with `httptrace` gives you real DNS, TCP, TLS, TTFB measurements — not approximations. No other browser-based tool offers this.

7. **Open formats** — YAML collections, standard `.env` files, OpenAPI export. Your data is always portable. No proprietary lock-in, no JSON blobs that only one tool can read.

### 3.6 User Journey (First 10 Minutes)

The following describes the intended experience for a new user:

1. **0:00** — User visits invoke.dev. The request builder loads immediately. No sign-up wall, no onboarding modal, no cookie consent popup. Dark mode by default.

2. **0:15** — User types `https://jsonplaceholder.typicode.com/users` in the URL bar, clicks Send (or presses Ctrl+Enter). The response appears with JSON tree view, timing waterfall showing 45ms total, and 200 OK in the status bar.

3. **1:00** — User clicks "Save" and creates a collection called "JSONPlaceholder". The request appears in the sidebar. User adds a second request (POST to `/users` with a JSON body).

4. **2:00** — User creates an environment called "Local" with `base_url = http://localhost:3000`. Switches to it. Edits the URL to `{{base_url}}/users`. The variable chip shows the resolved value on hover.

5. **3:00** — User clicks the Code Export tab, selects "Python - requests", copies the generated code into their project. The code includes all headers, auth, and body exactly as configured.

6. **5:00** — User drags both requests into a flow. Configures the POST response to extract `$.id` into a `user_id` variable. Adds a GET request for `/users/{{user_id}}`. Runs the flow — timeline shows all three steps passing.

7. **8:00** — User clicks "Export" and downloads the collection as YAML. Opens terminal, runs `git add .` — each request is a separate file, clean diffs, ready for code review.

8. **10:00** — User bookmarks invoke.dev. Their data is still there next time (IndexedDB). No account needed.

---

## 4. Target Users

### 4.1 Solo Developers

**Profile:** Individual developers building and testing APIs during development. They use Postman or curl today, and are frustrated by Postman's bloat, account requirements, or performance.

**Needs:**
- Quick start with zero friction (no sign-up, no install)
- Send requests and inspect responses with a clean UI
- Organize requests into collections
- Switch between environments (dev, staging, prod)
- Import existing Postman/OpenAPI collections
- Generate code snippets from requests

**Deployment:** Public hosted (invoke.dev) or local Docker.

### 4.2 Small Teams (2–10 Developers)

**Profile:** Development teams working on backend services, microservices, or API-first products. They need shared collections, consistent environments, and the ability to onboard new developers quickly.

**Needs:**
- Shared workspaces with team collections
- Environment management across team members
- Import/export for Git-based collection versioning
- Mock server for frontend developers
- Self-hosted deployment for data privacy
- User management with basic roles

**Deployment:** Self-hosted Docker Compose.

---

## 5. Architecture Overview

invoke uses an **isomorphic architecture** — the same core engine (`@invoke/core`) runs in different environments depending on the deployment phase.

### 5.0 MVP Architecture (Thick Client)

In the MVP, `@invoke/core` runs **inside the browser** alongside the Vue UI. It reads IndexedDB directly, resolves variables, orchestrates flows, runs assertions, and generates code. The Node.js server is a thin proxy that forwards fully-resolved requests to the Go executor.

```
┌───────────────────────────────────────────────────┐
│  Vue 3 Web UI + @invoke/core (browser)             │
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
│  - Serves Vue SPA static files                     │
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

### 5.0.1 Why Thick Client for MVP

The MVP stores all data in browser IndexedDB (no server-side database, no accounts). If business logic ran on the Node.js server, it would have no way to access the browser's IndexedDB — the server cannot read the user's local storage. This creates a "split-brain" problem where state lives in the browser but logic runs on the server.

The thick client approach solves this cleanly:
- `@invoke/core` runs in the browser, directly accessing IndexedDB
- No state needs to be shipped between browser and server on every request
- The user experience works fully offline (except for the Go executor proxy)
- The Node.js server is genuinely thin — ~200-300 lines of proxy code

### 5.0.2 v2+ Architecture (Server-Side Core)

When user accounts and PostgreSQL are added in v2, `@invoke/core` moves to the server. The browser becomes a presentation-only layer again, and the server reads PostgreSQL directly.

```
v2+ Architecture:

┌───────────────────────────────────────────────────┐
│  Vue 3 Web UI (presentation only)                  │
└──────────────────┬────────────────────────────────┘
                   │ REST API / WebSocket
┌──────────────────▼────────────────────────────────┐
│  Node.js + @invoke/core (server)                   │
│  - Reads PostgreSQL directly                       │
│  - Full business logic server-side                 │
│  - JWT authentication                              │
└──────────────────┬────────────────────────────────┘
                   │ gRPC
┌──────────────────▼────────────────────────────────┐
│  Go HTTP Executor                                  │
└───────────────────────────────────────────────────┘
```

Anonymous users in v2+ still use the thick client (IndexedDB). Logged-in users use the server-side core (PostgreSQL). The storage adapter pattern makes this transparent.

### 5.1 Why This Architecture

**Why a separate Go sidecar?**
The browser cannot make arbitrary API requests due to CORS. A server-side proxy is required. Go provides nanosecond-precision HTTP timing via `net/http/httptrace`, TLS certificate inspection, client certificate authentication, and efficient concurrent request execution — capabilities that are difficult or impossible in Node.js or the browser.

**Why TypeScript for the core engine?**
The core engine is **isomorphic** — it runs in both the browser (MVP) and Node.js (v2+). TypeScript provides type safety shared across all layers. The storage adapter pattern (`IndexedDBAdapter` for browser, `PostgresAdapter` for server) and script sandbox adapter pattern (`WebWorkerSandbox` for browser, `IsolatedVmSandbox` for server) let the same business logic work in both environments.

**Why gRPC between Node.js proxy and Go?**
gRPC provides typed contracts (protobuf), response streaming for large payloads and SSE, bidirectional communication for cancellation, and better performance than JSON over REST. In the MVP, the browser sends fully-resolved requests to the Node.js proxy via REST, which forwards to Go via gRPC.

**Why keep Node.js in the MVP if core runs in the browser?**
The Node.js server is still needed for:
1. **Proxying requests to Go** — the browser can't call gRPC directly
2. **Hosting the mock server** — mock servers must run server-side to accept connections from external clients
3. **Relaying WebSocket streams** — SSE and streaming responses need server-side relay
4. **Serving the Vue SPA** — static file serving in production
5. **v2 readiness** — Node.js absorbs `@invoke/core` when accounts are added, avoiding the need to add it back later

---

## 6. System Architecture Detail

### 6.1 Layer Responsibilities

#### 6.1.1 Vue 3 Web UI + @invoke/core (MVP)

**Responsibility:** Presentation, user interaction, AND business logic in MVP.

In the MVP, the Vue UI imports `@invoke/core` directly. The core engine runs in the browser:

- Renders all UI components (request builder, response viewer, collection tree, etc.)
- Manages UI state (active tab, panel sizes, theme) via Pinia stores
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

**Does NOT (MVP):**
- Execute HTTP requests directly (delegates to Go executor via Node.js proxy)
- Host mock servers (Node.js handles this)
- Access gRPC directly (browser limitation)

**v2+ change:** When accounts are added, business logic moves to the Node.js server. The Vue UI becomes presentation-only, delegating to the server via REST API calls. Anonymous users continue using the thick client.

#### 6.1.2 Node.js Proxy (MVP) / Node.js Backend (v2+)

**MVP Responsibility:** Thin proxy and mock server host.

- Serves the Vue SPA as static files
- Proxies fully-resolved HTTP requests to the Go executor via gRPC
- Relays WebSocket/SSE streams from Go executor to browser
- Hosts mock server (receives full config from UI, holds state in memory)
- ~200-300 lines of code total

**MVP Does NOT:**
- Contain business logic (core runs in browser)
- Access IndexedDB (browser-only)
- Store any user data

**v2+ Responsibility:** Full API gateway with business logic.

- Imports `@invoke/core` for all business logic
- Reads PostgreSQL for authenticated users
- Manages authentication and authorization
- Full REST API with CRUD endpoints

#### 6.1.3 @invoke/core (Isomorphic TypeScript Library)

**Responsibility:** All business logic. Runs in browser (MVP) or Node.js (v2+).

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

#### 6.1.4 Go HTTP Executor

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

### 6.2 Communication Patterns (MVP)

#### 6.2.1 Single Request Execution (MVP)

```
User clicks "Send"
  → @invoke/core (in browser) reads active environment from IndexedDB
  → @invoke/core resolves all {{variables}} in URL, headers, body
  → @invoke/core resolves auth config (Bearer, Basic, OAuth2, etc.)
  → Vue UI sends fully-resolved request to POST /api/proxy/execute
  → Node.js proxy forwards resolved request to Go executor via gRPC Execute()
  → Go executes HTTP request with httptrace instrumentation
  → Go returns HttpResponse (status, headers, body, timing, TLS info) via gRPC
  → Node.js proxy returns HttpResponse to Vue UI
  → @invoke/core (in browser) runs assertions against the response
  → @invoke/core saves request + response to history in IndexedDB
  → Vue UI renders response body, timing waterfall, headers, TLS info, assertion results
```

#### 6.2.2 Flow Execution (MVP)

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
        → Emit progress event to Vue UI (in-browser, no WebSocket needed)
  → @invoke/core returns FlowResult (all steps, all responses, all assertions)
  → Vue UI renders flow timeline with per-step results
```

#### 6.2.3 Response Streaming (SSE / Large Body)

```
User sends request to SSE endpoint
  → @invoke/core resolves request in browser
  → Vue UI opens WebSocket to /api/proxy/stream with resolved request
  → Node.js proxy calls Go executor via gRPC ExecuteStream()
  → Go opens HTTP connection, receives chunks
  → Go streams ResponseChunk messages back via gRPC stream
  → Node.js proxy forwards chunks to Vue UI via WebSocket
     (backpressure: if WebSocket buffer exceeds high-water mark,
      Node pauses gRPC stream read until buffer drains)
  → Vue UI renders chunks in real-time in the response viewer
```

#### 6.2.4 Mock Server (MVP)

```
User clicks "Start Mock"
  → @invoke/core (in browser) reads collection from IndexedDB
  → @invoke/core generates mock endpoint config (routes, responses, conditions)
  → Vue UI sends full mock config to POST /api/mock/start
  → Node.js starts Hono mock server on specified port, holds config in memory
  → External clients hit mock server → Node matches routes → serves responses
  → Mock request log accessible via GET /api/mock/log

Note: Mock server state is held in Node.js memory. If the container
restarts, mock state is lost. The UI detects this via GET /api/mock/status
and prompts the user to restart the mock (re-pushing config from IndexedDB).
```

---

## 7. Core Engine Specification

The core engine (`@invoke/core`) is a standalone TypeScript library with zero framework dependencies. It can be imported by the Node.js server, a CLI tool, or any other TypeScript/JavaScript application.

### 7.1 Module Inventory

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
| `auth` | Auth helper logic (Bearer, Basic, OAuth2, API Key, Digest, AWS Sig V4) |

### 7.2 Collection Manager

#### 7.2.1 Data Model

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

#### 7.2.2 Operations

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

### 7.3 Variable Resolver

#### 7.3.1 Variable Scope Hierarchy

Variables resolve in the following order (later scopes override earlier):

1. **Global variables** — available across all collections
2. **Environment variables** — from the active environment
3. **Collection variables** — defined on the collection
4. **Folder variables** — defined on the folder (inherits from parent folders)
5. **Request variables** — defined on the request
6. **Flow variables** — extracted from previous steps during flow execution
7. **Dynamic variables** — built-in generated values (`{{$uuid}}`, `{{$timestamp}}`, `{{$randomInt}}`)

#### 7.3.2 Template Syntax

Variables use double curly brace syntax: `{{variableName}}`

Nested resolution is supported: `{{base_url}}/{{api_version}}/users`

#### 7.3.3 Dynamic Variables

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

#### 7.3.4 Variable Extraction (from responses)

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

#### 7.3.5 Operations

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

### 7.4 Auth Module

#### 7.4.1 Supported Auth Types

```typescript
type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'api-key'; key: string; value: string; addTo: 'header' | 'query' }
  | { type: 'oauth2'; grantType: OAuth2GrantType; config: OAuth2Config }
  | { type: 'digest'; username: string; password: string }
  | { type: 'aws-sig-v4'; accessKey: string; secretKey: string; region: string; service: string }
  | { type: 'inherit' };         // inherit from folder or collection

interface OAuth2Config {
  grantType: 'authorization_code' | 'client_credentials' | 'password' | 'implicit';
  authUrl?: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
  redirectUri?: string;
  username?: string;             // for password grant
  password?: string;             // for password grant
  accessToken?: string;          // cached token
  refreshToken?: string;
  tokenExpiry?: string;
}
```

#### 7.4.2 Auth Inheritance

Auth configuration cascades: Request → Folder → Collection. If a request has `type: 'inherit'`, it uses the parent folder's auth. If the folder also inherits, it uses the collection's auth.

### 7.5 Scripting

#### 7.5.1 Pre-Request Scripts

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

#### 7.5.2 Post-Response Scripts

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

#### 7.5.3 Script Execution

Scripts execute in a sandboxed environment that prevents file system access, network access, process spawning, and infinite loops. The sandbox implementation varies by runtime:

```typescript
interface ScriptSandbox {
  execute(code: string, context: ScriptContext, timeout: number): Promise<ScriptResult>;
  dispose(): void;
}

// MVP (browser): Web Worker sandbox
class WebWorkerSandbox implements ScriptSandbox {
  // Creates a Blob URL Web Worker with pre-bundled utility libraries
  // (lodash, uuid, CryptoJS) available on `self`
  // Memory isolated by browser's Worker thread model
  // Timeout enforced via Worker.terminate()
}

// v2+ (server): isolated-vm sandbox
class IsolatedVmSandbox implements ScriptSandbox {
  // Creates V8 isolate with 128MB memory limit
  // Timeout enforced via isolate timeout parameter
  // Same V8 engine as Node.js for 100% behavior consistency
}
```

**Web Worker sandbox (MVP):** The worker script is pre-bundled at build time (via Vite/tsup) with allowed utility libraries attached to `self`. User code executes inside the worker with no access to the main thread's DOM, IndexedDB, or network. The worker communicates results back via `postMessage`.

**isolated-vm sandbox (v2+):** When `@invoke/core` runs on the server, uses V8 isolates for stronger isolation with configurable memory and CPU limits.

---

## 8. Go HTTP Executor Specification

### 8.1 Responsibilities

The Go executor is a standalone gRPC server that receives request configurations and returns complete response data with precise timing measurements.

### 8.2 Timing Instrumentation

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

### 8.3 TLS Certificate Inspection

For every HTTPS request, the executor captures:

- Protocol version (TLS 1.2, TLS 1.3)
- Cipher suite used
- Full certificate chain (subject, issuer, validity dates, serial number, SANs)
- Certificate expiry warnings

### 8.4 Redirect Tracking

For requests that follow redirects, the executor captures per-hop data:

- Redirect URL
- Status code (301, 302, 307, 308)
- Response headers at each hop
- Timing data for each hop

### 8.5 Parallel Execution

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

### 8.6 WebSocket Support

The executor handles WebSocket connections:

- Upgrade HTTP connection to WebSocket
- Send text/binary frames
- Receive frames with timestamps
- Track connection duration
- Support ping/pong for keepalive
- Clean close with status codes

### 8.7 gRPC Protocol Support

The executor can act as a gRPC client:

- Server reflection to discover services and methods
- Unary, server streaming, client streaming, and bidirectional streaming calls
- Protobuf message encoding/decoding
- Metadata (header) management

### 8.8 Proxy Support

- HTTP proxy (CONNECT method)
- SOCKS5 proxy
- Proxy authentication (basic)
- Per-request proxy configuration

### 8.9 Client Certificate Authentication

- PEM-encoded client certificate and key
- PKCS12 (.p12) support
- Custom CA bundle for self-signed server certificates
- Per-request TLS configuration

---

## 9. Web UI Specification

### 9.1 Design Principles

1. **Dark mode default** — Light mode available, but dark mode is the primary design target.
2. **Keyboard-first** — All primary actions accessible via keyboard shortcuts. Command palette for discovery.
3. **Information density** — Show more data per screen than Postman with better visual hierarchy. No wasted space.
4. **Instant feedback** — No loading spinners for navigation. Skeleton screens for data fetching.
5. **Single-page feel** — No full-page route transitions. Panel-based navigation with smooth transitions.

### 9.2 Layout Structure

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

### 9.3 Screen Specifications

#### 9.3.1 Request Builder (Primary Screen)

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

#### 9.3.2 GraphQL Request Builder

Extends the standard request builder with:

- **Query editor** — Syntax-highlighted GraphQL query editor with autocomplete (if schema is available)
- **Variables editor** — JSON editor for GraphQL variables
- **Schema explorer** — Sidebar showing types, queries, mutations, and subscriptions. Click to insert into query. Loaded via introspection query or uploaded schema file.
- **Operation selector** — If query contains multiple operations, dropdown to select which to execute

#### 9.3.3 WebSocket Client

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

#### 9.3.4 gRPC Client

Dedicated interface for gRPC requests:

- **Server URL** — Host and port input
- **Service/Method selector** — Populated via server reflection or uploaded proto files
- **Message editor** — JSON editor for the request message (auto-generated from proto definition)
- **Metadata editor** — Key-value editor for gRPC metadata (equivalent to headers)
- **Response viewer** — Shows response message, metadata, status code, and timing
- **Streaming support** — For server/client/bidirectional streaming, shows a message log similar to WebSocket client

#### 9.3.5 Collection Sidebar

- **Tree view** — Hierarchical display of collections → folders → requests
- **Icons** — Protocol indicator (REST, GraphQL, WS, gRPC) and method badge (colored GET, POST, etc.)
- **Drag and drop** — Reorder requests and folders. Move between collections.
- **Context menu** — Right-click for rename, duplicate, delete, move, export
- **Git status indicators** — (for exported collections) modified, untracked, committed markers
- **New request button** — Quick-create at any level
- **Search** — Filter tree by name. Link to full-text search (Ctrl+K).

#### 9.3.6 Command Palette (Ctrl+K)

Global search and command execution interface:

- **Search scope** — Collections, requests, history, environments, commands
- **Quick actions** — "New request", "Switch environment", "Import collection", "Open settings"
- **Keyboard navigation** — Arrow keys, Enter to select, Esc to close
- **Recent items** — Show recently opened requests at the top
- **Fuzzy matching** — Forgiving search that matches partial strings

#### 9.3.7 Environment Manager

- **Environment list** — Sidebar showing all environments with active indicator
- **Variable editor** — Table with key, initial value, current value, and description columns
- **Sensitive values** — Toggle to mask/unmask values (stored encrypted for sensitive variables)
- **Bulk edit** — Raw text editor (key=value format) for quick editing
- **Import/export** — Import from `.env` files, export as `.env` or JSON

#### 9.3.8 Flow Builder

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

#### 9.3.9 Response Diff View

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

#### 9.3.10 Mock Server Manager

Interface for managing mock servers:

- **Create mock** — Select a collection to mock. Each request becomes an endpoint that returns the last recorded response.
- **Endpoint list** — Table showing mocked routes with method, URL pattern, status code, and response body preview.
- **Response editor** — Edit the mock response body, headers, status code, and delay per endpoint.
- **Dynamic templates** — Support `{{$randomInt}}` and other dynamic variables in mock responses.
- **Start/stop controls** — Start mock server on a specified port. Show the base URL for frontend teams.
- **Request log** — Live log of incoming requests to the mock server.

#### 9.3.11 History View

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

#### 9.3.12 Settings

- **General** — Theme (dark/light/system), language (English), auto-save interval
- **Proxy** — Global proxy configuration (HTTP/SOCKS5)
- **Certificates** — Client certificate management, custom CA bundles
- **Data** — Import/export all data, clear history, reset application
- **Editor** — Font size, tab size, word wrap, line numbers
- **Keyboard shortcuts** — View and customize keyboard shortcuts
- **Team** (self-hosted only) — User management, workspace settings

---

## 10. CLI Specification

> **Note:** CLI is planned for v6. This section is included for architectural reference to ensure the core engine is designed to support both web UI and CLI interfaces.

### 10.1 Overview

The CLI (`invoke`) will import `@invoke/core` directly and communicate with the Go executor via the same gRPC protocol used by the Node.js server. Collections are YAML files on disk.

### 10.2 Command Structure

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

### 10.3 Collection File Format (YAML)

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

### 10.4 Flow File Format (YAML)

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

### 10.5 Environment File Format

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

## 11. Protocol Support

### 11.1 REST (HTTP/HTTPS)

**Methods:** GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

**Body types:** JSON, plain text, XML, form-data (multipart), form-urlencoded, binary, raw

**Features:**
- Full header management with autocomplete
- Query parameter editor with URL sync
- Cookie management (auto-send, manual override)
- Response body rendering (JSON tree, raw text, HTML preview, image preview)
- Redirect chain visualization
- All auth types supported

### 11.2 GraphQL

**Transport:** HTTP POST (standard), HTTP GET (persisted queries), WebSocket (subscriptions)

**Features:**
- Schema introspection and caching
- Query editor with syntax highlighting
- Schema explorer sidebar (types, fields, arguments, descriptions)
- Variables editor (JSON)
- Operation name selector (for multi-operation documents)
- Subscription support via WebSocket transport
- Query history

### 11.3 WebSocket

**Protocols:** ws://, wss://

**Features:**
- Connection lifecycle management (connect, disconnect, reconnect)
- Send/receive text and binary frames
- Message history with timestamps and direction
- Custom headers on upgrade request
- Subprotocol negotiation
- Auto-reconnect option
- Ping/pong monitoring
- Connection duration tracking

### 11.4 gRPC

**Transport:** HTTP/2

**Features:**
- Server reflection for service/method discovery
- Proto file upload for offline schema
- All call types: unary, server streaming, client streaming, bidirectional streaming
- Metadata (header) management
- Message editor with proto-based field hints
- Deadline/timeout configuration
- TLS and plaintext connections
- Response metadata display

---

## 12. Collection & Data Management

### 12.1 Workspace Model

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

### 12.2 Collection File Format

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

## 13. Environment & Variable System

### 13.1 Environment Data Model

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

### 13.2 Variable Resolution Order

When resolving `{{variableName}}`:

1. Flow scope (variables extracted from previous flow steps)
2. Request-level variables
3. Folder-level variables (nearest folder first, then parent folders)
4. Collection-level variables
5. Environment variables (active environment)
6. Global variables
7. Dynamic variables (`{{$uuid}}`, etc.)

If unresolved after all scopes, the raw `{{variableName}}` string is kept and the UI highlights it as unresolved.

### 13.3 Environment Operations

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

## 14. Flow Runner (Request Chaining)

### 14.1 Flow Data Model

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

### 14.2 Flow Execution

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

## 15. Response Diffing

### 15.1 Diff Modes

1. **Environment diff** — Same request executed against two different environments. Useful for verifying staging matches production.
2. **Temporal diff** — Same request compared at two points in time (from history). Useful for detecting API changes after deployments.
3. **Request diff** — Two different requests compared. Useful for comparing endpoints.

### 15.2 Diff Output

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

### 15.3 Diff Options

```typescript
interface DiffOptions {
  ignorePaths?: string[];        // JSONPaths to ignore (e.g., "$.timestamp", "$.requestId")
  ignoreArrayOrder?: boolean;    // treat arrays as sets
  showUnchanged?: boolean;       // include unchanged fields
  depthLimit?: number;           // max nesting depth to compare
}
```

---

## 16. Mock Server

### 16.1 Overview

invoke can start a mock HTTP server that serves recorded responses from a collection. This allows frontend teams to develop against stable endpoints while the real API is being built or modified.

**MVP limitation:** The mock server runs on the Node.js proxy and holds its configuration **in memory**. Since MVP data lives in browser IndexedDB, the UI must send the full mock configuration (all routes, responses, conditions) in the `POST /api/mock/start` payload. If the Node.js container restarts, mock server state is lost. The UI detects this via `GET /api/mock/status` and prompts the user to restart the mock, which re-pushes the configuration from IndexedDB. In v2+ (with PostgreSQL), mock configurations are persisted server-side.

### 16.2 Mock Configuration

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

### 16.3 Mock Operations

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

## 17. Import & Export

### 17.1 Import Formats

#### 17.1.1 Postman Collection (v2.1)

- File format: JSON
- Import path: `.json` file or URL
- Mapping: Postman collections → invoke collections, folders → folders, requests → requests
- Variable mapping: Postman environment variables → invoke environments
- Auth mapping: Postman auth configs → invoke auth configs
- Script mapping: Postman pre-request/test scripts → invoke scripts (compatible JavaScript API with adapter layer)
- Limitation: Postman monitors and mock servers are not imported (invoke has its own implementation)

#### 17.1.2 OpenAPI (3.0, 3.1)

- File format: JSON or YAML
- Import: Generate one request per operation (path + method)
- Collection structure: Tags → folders, operations → requests
- Parameter mapping: path/query/header parameters → invoke params with `{{variable}}` defaults
- Request body: Generate example body from schema (uses `example`, `examples`, or generates from type)
- Auth mapping: Security schemes → invoke auth configs
- Server mapping: Server URLs → invoke environments

#### 17.1.3 cURL

- Input: Single cURL command string or file with multiple commands
- Parsing: Extract method, URL, headers, body, auth from curl flags
- Mapping: Each cURL command → one invoke request
- Supported flags: `-X`, `-H`, `-d`, `--data-raw`, `-u`, `--user`, `-b`, `--cookie`, `--compressed`, `-k`, `--insecure`, `-L`, `--location`, `--connect-timeout`, `-F`, `--form`

#### 17.1.4 Insomnia (v4)

- File format: JSON or YAML
- Mapping: Insomnia workspaces → invoke workspaces, request groups → folders, requests → requests
- Environment mapping: Insomnia environments → invoke environments
- Plugin compatibility: Insomnia template tags → invoke variables where possible

#### 17.1.5 Hoppscotch

- File format: JSON
- Mapping: Hoppscotch collections → invoke collections
- Environment mapping: Hoppscotch environments → invoke environments

### 17.2 Export Formats

- **invoke YAML** — Native format, file-per-request structure for Git versioning
- **invoke JSON** — Single-file export of entire collection (for sharing)
- **Postman Collection v2.1** — For users migrating back or sharing with Postman users
- **OpenAPI 3.0** — Generate OpenAPI spec from collection (best-effort, may need manual refinement)
- **cURL** — Export individual requests as cURL commands

### 17.3 Import Operations

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

type ImportFormat = 'postman-v2.1' | 'openapi-3.0' | 'openapi-3.1' | 'curl' | 'insomnia-v4' | 'hoppscotch' | 'invoke-yaml' | 'invoke-json';
```

---

## 18. Code Generation

### 18.1 Supported Targets

| Target | Language | Library/Style |
|--------|----------|---------------|
| `curl` | Shell | curl command |
| `fetch` | JavaScript | Fetch API |
| `axios` | JavaScript | Axios library |
| `node-fetch` | JavaScript (Node.js) | node-fetch |
| `spring-resttemplate` | Java | Spring RestTemplate |
| `spring-webclient` | Java | Spring WebClient (reactive) |
| `okhttp` | Java/Kotlin | OkHttp |
| `python-requests` | Python | requests library |
| `python-httpx` | Python | httpx (async) |
| `go-net-http` | Go | net/http |
| `php-guzzle` | PHP | Guzzle |
| `csharp-httpclient` | C# | HttpClient |
| `ruby-net-http` | Ruby | Net::HTTP |

### 18.2 Code Generation Interface

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

## 19. Assertion Engine

### 19.1 Assertion Data Model

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

### 19.2 Assertion Result

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

### 19.3 Assertion Examples

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

## 20. History & Search

### 20.1 History Data Model

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

### 20.2 Search Capabilities

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

### 20.3 Full-Text Search Scope

Search indexes the following fields:

- Request URL (raw and resolved)
- Request headers (keys and values)
- Request body (raw text)
- Response body (raw text)
- Request name
- Request description
- Collection name
- Folder name

### 20.4 History Retention

- Default retention: 30 days
- Configurable per workspace: 7 / 14 / 30 / 60 / 90 days / unlimited
- Manual clear option (clear all, clear by date range, clear by collection)
- Maximum entries limit: configurable, default 10,000

---

## 21. Team & Collaboration

> **Note:** Team features are planned for v3. Logged-in user accounts are planned for v2. This section is included for architectural reference.

### 21.1 Workspace Sharing (v3)

In self-hosted mode, team workspaces provide:

- Shared collections visible to all workspace members
- Shared environments (with sensitive value handling — see below)
- Role-based access control (Owner, Admin, Editor, Viewer)
- Audit log of collection changes (who modified what, when)

### 21.2 Roles & Permissions

| Permission | Owner | Admin | Editor | Viewer |
|-----------|-------|-------|--------|--------|
| View collections & requests | ✓ | ✓ | ✓ | ✓ |
| Send requests | ✓ | ✓ | ✓ | ✓ |
| Create/edit requests | ✓ | ✓ | ✓ | ✗ |
| Delete requests | ✓ | ✓ | ✓ | ✗ |
| Create/edit collections | ✓ | ✓ | ✓ | ✗ |
| Delete collections | ✓ | ✓ | ✗ | ✗ |
| Manage environments | ✓ | ✓ | ✓ | ✗ |
| View sensitive env values | ✓ | ✓ | ✗ | ✗ |
| Manage workspace members | ✓ | ✓ | ✗ | ✗ |
| Manage workspace settings | ✓ | ✓ | ✗ | ✗ |
| Delete workspace | ✓ | ✗ | ✗ | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ | ✗ |

### 21.3 Sensitive Variable Handling

Environment variables marked as `sensitive: true`:

- Are masked in the UI (shown as `••••••••`)
- Are not included in collection exports
- Can only be viewed by Owner and Admin roles
- Are stored encrypted at rest in PostgreSQL
- Are resolved only at request execution time

---

## 22. Authentication & Authorization

> **Note:** Authentication is not included in MVP. User accounts are added in v2, team auth in v3.

### 22.1 MVP (Anonymous Only)

- No authentication required
- All data stored in browser IndexedDB
- No server-side storage
- Full feature access (no limitations)
- Users export/import YAML files for backup

### 22.2 v2: Logged-In Users (Public Hosted)

**Authenticated users (optional):**
- Sign up with email + password or OAuth (GitHub, Google)
- Data synced to server-side PostgreSQL
- Multiple personal workspaces
- Cross-device access
- Account deletion with full data purge

### 22.3 v3: Team Mode (Self-Hosted)

- Local user accounts (email + password)
- Optional LDAP/OIDC integration for enterprise SSO
- Admin panel for user management
- Invitation-based onboarding (invite link or email)

### 22.4 Session Management (v2+)

- JWT-based authentication
- Access token (short-lived, 15 minutes)
- Refresh token (long-lived, 7 days, stored httpOnly cookie)
- Session revocation on password change

---

## 23. Deployment Models

### 23.1 Public Hosted (invoke.dev)

**MVP Infrastructure:**
- Vue SPA served via CDN (Cloudflare)
- Node.js backend + Go executor on VPS (Contabo Singapore or equivalent)
- No database — all user data in browser IndexedDB
- PostgreSQL added in v2 when user accounts are introduced

**MVP Architecture:**
```
[User Browser] → [CDN: Vue SPA] → [API Server: Node.js + @invoke/core]
                                         ↓ gRPC
                                   [Go Executor]
```

**v2+ Architecture (with accounts):**
```
[User Browser] → [CDN: Vue SPA] → [API Server: Node.js + @invoke/core]
                                         ↓ gRPC          ↓
                                   [Go Executor]    [PostgreSQL]
```

### 23.2 Self-Hosted (Docker Compose)

**Minimum requirements:**
- Docker and Docker Compose
- 2 CPU cores, 2 GB RAM
- 10 GB disk space

**Docker Compose services (MVP — no database):**

| Service | Image | Purpose |
|---------|-------|---------|
| `ui` | `invoke/ui:latest` | Vue SPA served by Nginx |
| `server` | `invoke/server:latest` | Node.js API server with @invoke/core |
| `executor` | `invoke/executor:latest` | Go HTTP executor (gRPC) |

**Configuration via environment variables:**

```yaml
# docker-compose.yml (MVP)
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

**Docker Compose services (v2+ — with PostgreSQL):**

| Service | Image | Purpose |
|---------|-------|---------|
| `ui` | `invoke/ui:latest` | Vue SPA served by Nginx |
| `server` | `invoke/server:latest` | Node.js API server with @invoke/core |
| `executor` | `invoke/executor:latest` | Go HTTP executor (gRPC) |
| `db` | `postgres:16-alpine` | PostgreSQL database (added in v2) |

```yaml
# docker-compose.yml (v2+ with accounts)
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
      DATABASE_URL: postgresql://invoke:invoke@db:5432/invoke
      EXECUTOR_ADDR: executor:50051
      JWT_SECRET: <generated-secret>
      STORAGE_MODE: postgres
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      - db
      - executor

  executor:
    image: invoke/executor:latest
    # internal only, no ports exposed to host

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: invoke
      POSTGRES_PASSWORD: invoke
      POSTGRES_DB: invoke
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 23.3 Single-Container Option

For quick local use, a single Docker image bundles all services:

```bash
docker run -p 3000:3000 invoke/all-in-one:latest
```

In MVP, this runs Node.js server + Go executor with IndexedDB in the browser (no embedded database needed). In v2+, uses embedded SQLite for logged-in user data.

---

## 24. Storage Architecture

### 24.1 Storage Adapter Interface

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

### 24.2 IndexedDB Implementation (MVP)

- Used for all users in MVP (anonymous only)
- All data stored in browser-local IndexedDB via Dexie.js
- Database name: `invoke`
- Object stores: `collections`, `environments`, `history`, `flows`, `workspaces`
- Full-text search via Dexie.js full-text addon or client-side filtering
- Data survives browser restarts but is device-specific
- Export/import for backup and migration

### 24.3 PostgreSQL Implementation (v2+)

- Added in v2 for logged-in users, required in v3 for team workspaces
- Schema managed via Drizzle ORM migrations
- Full-text search via PostgreSQL `tsvector` and `tsquery`
- Sensitive environment variables encrypted at rest (AES-256-GCM)
- Connection pooling via built-in Node.js pool or PgBouncer

### 24.4 File/YAML Implementation (Export)

- Used for Git-friendly collection export
- Each request is a separate YAML file
- Folder structure mirrors collection hierarchy
- Read-only import; write creates/updates from files

---

---

## 25. Desktop App (v4)

> **Note:** Desktop app is planned for v4. This section is included for architectural reference.

### 25.1 Overview

The invoke desktop app is a native-feeling application for macOS, Windows, and Linux built with **Tauri**. It packages the existing Vue UI and Hono server into a lightweight native binary — typically ~40MB total (Tauri runtime + embedded Node.js + UI + Go executor sidecar), compared to ~150-300MB for equivalent Electron apps.

### 25.2 Why Tauri (Not Electron)

- **Size:** ~40MB vs Electron's 150-300MB — aligns with invoke's "zero bloat" positioning
- **Memory:** ~50-80MB per window vs Electron's 150-400MB
- **Native webview:** Uses OS webview (WebKit/WebView2/WebKitGTK) instead of bundling Chromium
- **Positioning:** Postman's primary complaint is Electron bloat — invoke should not replicate this

### 25.3 Architecture

The desktop app reuses the entire web architecture:

```
┌─────────────────────────────────────┐
│   Tauri App (~40MB total)            │
│                                       │
│  ┌─────────────────────────────┐    │
│  │  OS Webview                  │    │
│  │  Renders Vue UI (same as web)│    │
│  └──────────┬──────────────────┘    │
│             │ IPC                    │
│  ┌──────────▼──────────────────┐    │
│  │  Tauri Rust Shim             │    │
│  │  Spawns sidecars on launch   │    │
│  └──────────┬──────────────────┘    │
│             │                         │
│  ┌──────────▼──────────────────┐    │
│  │  Node.js Runtime (sidecar)   │    │
│  │  Runs Hono + @invoke/core    │    │
│  │  on localhost                │    │
│  └──────────┬──────────────────┘    │
│             │ gRPC                   │
│  ┌──────────▼──────────────────┐    │
│  │  Go Executor (sidecar)       │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

The desktop app is functionally identical to the self-hosted web version running on localhost. All features inherited from MVP, v2, and v3 work without modification.

### 25.4 Desktop-Specific Features

Beyond the packaged web app, the desktop version adds:

- **Native menu bar** — File, Edit, View, Window, Help menus with standard OS conventions
- **System tray** — Background operation with tray icon
- **Native notifications** — OS-level alerts for mock server events, flow completion
- **Global keyboard shortcuts** — System-wide hotkeys (e.g., `Cmd+Shift+I` to open invoke)
- **Protocol handler** — `invoke://` URL scheme opens collections/requests from browser links
- **Multi-window support** — Multiple workspaces in separate windows
- **Drag-and-drop file import** — Drop Postman/OpenAPI files onto the app to import
- **Auto-update** — Tauri's built-in update mechanism with signature verification

### 25.5 Distribution

- **macOS:** Signed `.dmg` and `.app` bundle, notarized by Apple, distributed via direct download and Homebrew cask
- **Windows:** Signed `.msi` installer and portable `.exe`, distributed via direct download and Winget
- **Linux:** AppImage, `.deb`, `.rpm`, distributed via direct download and Flatpak/Snap
- **Code signing:** macOS notarization via Apple Developer account, Windows Authenticode certificate

### 25.6 Connection to Team Features

Desktop users can:
- Use personal workspaces stored entirely locally (no server required)
- Connect to a self-hosted invoke server for team workspaces (configured in settings)
- Connect to invoke.dev for team workspaces (if using hosted service)

The desktop app detects the workspace type and routes storage accordingly — personal → embedded Node.js server with local storage, team → remote server via HTTP.

---

## 26. Real-Time Collaboration (v5)

> **Note:** Real-time collaboration is planned for v5. This section is included for architectural reference.

### 26.1 Overview

Real-time collaboration allows multiple team members to work on the same workspace simultaneously, seeing each other's changes in real-time. Because the desktop app (v4) is a Tauri wrapper around the same Vue UI, collaboration features appear simultaneously on web and desktop from the same codebase.

### 26.2 Features

- Live cursors — see where team members are editing
- Conflict-free merging — simultaneous edits to different requests merge automatically
- Presence indicators — see who is online and what they're viewing
- Change notifications — real-time toast notifications when a collection is modified

### 26.3 Technical Approach

- WebSocket connections from Vue UI to Node.js server
- CRDT (Conflict-free Replicated Data Type) or OT (Operational Transform) for conflict resolution
- Y.js or Automerge as the CRDT library
- Redis pub/sub for multi-instance server coordination

---

## 27. CLI (v6)

> **Note:** CLI is planned for v6. See section 10 for full CLI specification.

The CLI will import `@invoke/core` and communicate with the Go executor via the same gRPC protocol. It will read YAML collection files from disk and support all core features (send requests, run flows, assertions, diffing, mock server, code generation).

---

## 28. Tech Stack

### 28.1 Core Engine

The core engine is **isomorphic** — it runs in the browser (MVP) and Node.js (v2+). It produces two entry points:
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

### 28.2 Node.js Backend

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

### 28.3 Vue 3 Web UI

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Vue 3 (Composition API) | 3.x |
| Build tool | Vite | 5.x |
| State management | Pinia | latest |
| UI library | PrimeVue | latest |
| CSS framework | Tailwind CSS | 3.x |
| Code editor | Monaco Editor or CodeMirror 6 | latest |
| JSON viewer | Custom (tree component) | — |
| Drag and drop | vuedraggable or dnd-kit | latest |
| HTTP client (UI → server) | Native Fetch API | — |
| WebSocket client | Native WebSocket API | — |
| IndexedDB | Dexie.js | latest |
| Router | Vue Router | latest |
| Charts (timing waterfall) | D3.js or custom SVG | latest |
| Keyboard shortcuts | @vueuse/core (useMagicKeys) | latest |
| i18n (future) | vue-i18n | latest |

### 28.4 Go HTTP Executor

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Go | 1.22+ |
| gRPC server | google.golang.org/grpc | latest |
| Protobuf | google.golang.org/protobuf | latest |
| HTTP client | net/http (standard library) | — |
| HTTP tracing | net/http/httptrace | — |
| TLS | crypto/tls | — |
| WebSocket | gorilla/websocket or nhooyr/websocket | latest |
| gRPC reflection | google.golang.org/grpc/reflection | latest |
| Logging | zerolog or slog | latest |

### 28.5 Desktop App (v4)

| Component | Technology | Version |
|-----------|-----------|---------|
| Native shell | Tauri | 2.x |
| Native backend language | Rust (for Tauri shim) | 1.75+ |
| Webview | OS native (WebKit/WebView2/WebKitGTK) | — |
| Embedded runtime | Node.js (bundled sidecar) | 20 LTS |
| Auto-updater | Tauri Updater | latest |
| Code signing (macOS) | Apple Developer ID + notarization | — |
| Code signing (Windows) | Authenticode certificate | — |
| Linux packaging | AppImage, deb, rpm | — |

### 28.6 Infrastructure

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

## 29. Project Structure

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
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
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
│   └── ui/                               # Vue 3 SPA
│       ├── src/
│       │   ├── App.vue
│       │   ├── main.ts
│       │   ├── router/
│       │   │   └── index.ts
│       │   ├── api/                      # API client (UI → server)
│       │   │   ├── client.ts             # Base HTTP client
│       │   │   ├── requests.ts
│       │   │   ├── collections.ts
│       │   │   ├── environments.ts
│       │   │   ├── flows.ts
│       │   │   ├── history.ts
│       │   │   ├── diff.ts
│       │   │   ├── mock.ts
│       │   │   ├── import-export.ts
│       │   │   ├── codegen.ts
│       │   │   └── auth.ts
│       │   ├── components/
│       │   │   ├── request/
│       │   │   │   ├── RequestBuilder.vue
│       │   │   │   ├── UrlBar.vue
│       │   │   │   ├── MethodSelector.vue
│       │   │   │   ├── ParamsEditor.vue
│       │   │   │   ├── HeadersEditor.vue
│       │   │   │   ├── BodyEditor.vue
│       │   │   │   ├── AuthConfig.vue
│       │   │   │   ├── ScriptEditor.vue
│       │   │   │   └── VariableHighlight.vue
│       │   │   ├── response/
│       │   │   │   ├── ResponseViewer.vue
│       │   │   │   ├── JsonTreeView.vue
│       │   │   │   ├── RawTextView.vue
│       │   │   │   ├── HtmlPreview.vue
│       │   │   │   ├── TimingWaterfall.vue
│       │   │   │   ├── HeadersTable.vue
│       │   │   │   ├── TlsInfoPanel.vue
│       │   │   │   ├── CookiesTable.vue
│       │   │   │   └── AssertionResults.vue
│       │   │   ├── collection/
│       │   │   │   ├── CollectionTree.vue
│       │   │   │   ├── CollectionNode.vue
│       │   │   │   ├── FolderNode.vue
│       │   │   │   ├── RequestNode.vue
│       │   │   │   ├── CreateCollectionDialog.vue
│       │   │   │   └── ImportDialog.vue
│       │   │   ├── environment/
│       │   │   │   ├── EnvSwitcher.vue
│       │   │   │   ├── EnvEditor.vue
│       │   │   │   └── VariableTable.vue
│       │   │   ├── flow/
│       │   │   │   ├── FlowCanvas.vue
│       │   │   │   ├── FlowStepNode.vue
│       │   │   │   ├── ConditionNode.vue
│       │   │   │   ├── DelayNode.vue
│       │   │   │   ├── LoopNode.vue
│       │   │   │   ├── FlowTimeline.vue
│       │   │   │   └── VariableFlowLine.vue
│       │   │   ├── diff/
│       │   │   │   ├── DiffViewer.vue
│       │   │   │   ├── JsonDiff.vue
│       │   │   │   ├── HeaderDiff.vue
│       │   │   │   └── TimingDiff.vue
│       │   │   ├── mock/
│       │   │   │   ├── MockManager.vue
│       │   │   │   ├── EndpointEditor.vue
│       │   │   │   └── MockRequestLog.vue
│       │   │   ├── history/
│       │   │   │   ├── HistoryList.vue
│       │   │   │   └── HistoryDetail.vue
│       │   │   ├── graphql/
│       │   │   │   ├── GraphQLEditor.vue
│       │   │   │   ├── SchemaExplorer.vue
│       │   │   │   └── VariablesEditor.vue
│       │   │   ├── websocket/
│       │   │   │   ├── WebSocketClient.vue
│       │   │   │   ├── MessageComposer.vue
│       │   │   │   └── MessageLog.vue
│       │   │   ├── grpc/
│       │   │   │   ├── GrpcClient.vue
│       │   │   │   ├── ServiceExplorer.vue
│       │   │   │   └── MessageEditor.vue
│       │   │   ├── codegen/
│       │   │   │   └── CodeExportPanel.vue
│       │   │   ├── settings/
│       │   │   │   ├── SettingsView.vue
│       │   │   │   ├── GeneralSettings.vue
│       │   │   │   ├── ProxySettings.vue
│       │   │   │   ├── CertificateSettings.vue
│       │   │   │   ├── EditorSettings.vue
│       │   │   │   └── TeamSettings.vue
│       │   │   └── shared/
│       │   │       ├── CommandPalette.vue
│       │   │       ├── KeyValueEditor.vue
│       │   │       ├── TabBar.vue
│       │   │       ├── SplitPane.vue
│       │   │       ├── ConfirmDialog.vue
│       │   │       ├── ToastNotification.vue
│       │   │       └── LoadingSkeleton.vue
│       │   ├── composables/
│       │   │   ├── useRequest.ts
│       │   │   ├── useCollection.ts
│       │   │   ├── useEnvironment.ts
│       │   │   ├── useFlow.ts
│       │   │   ├── useHistory.ts
│       │   │   ├── useDiff.ts
│       │   │   ├── useMock.ts
│       │   │   ├── useCodegen.ts
│       │   │   ├── useKeyboard.ts
│       │   │   ├── useWebSocket.ts
│       │   │   ├── useTheme.ts
│       │   │   └── useAuth.ts
│       │   ├── stores/
│       │   │   ├── request.ts
│       │   │   ├── collection.ts
│       │   │   ├── environment.ts
│       │   │   ├── flow.ts
│       │   │   ├── history.ts
│       │   │   ├── ui.ts                 # layout, panels, tabs, theme
│       │   │   ├── workspace.ts
│       │   │   └── auth.ts
│       │   ├── views/
│       │   │   ├── WorkspaceView.vue     # Main workspace (request builder)
│       │   │   ├── FlowView.vue
│       │   │   ├── DiffView.vue
│       │   │   ├── MockView.vue
│       │   │   ├── HistoryView.vue
│       │   │   ├── SettingsView.vue
│       │   │   ├── LoginView.vue
│       │   │   └── RegisterView.vue
│       │   └── assets/
│       │       └── styles/
│       │           ├── variables.css
│       │           └── themes/
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
│   ├── Dockerfile.ui                     # Vue build → Nginx
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

## 30. gRPC Contract (Proto Definition)

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

## 31. API Routes

### 31.1 Request Execution

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/requests/execute` | Execute a single request |
| WS | `/api/requests/stream` | Execute with streaming response |
| POST | `/api/requests/batch` | Execute batch (benchmarking) |

### 31.2 Collections

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

### 31.3 Environments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/environments` | List all environments |
| POST | `/api/environments` | Create environment |
| GET | `/api/environments/:id` | Get environment |
| PUT | `/api/environments/:id` | Update environment |
| DELETE | `/api/environments/:id` | Delete environment |
| POST | `/api/environments/:id/duplicate` | Duplicate environment |
| PUT | `/api/environments/active` | Set active environment |

### 31.4 Flows

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/flows` | List all flows |
| POST | `/api/flows` | Create flow |
| GET | `/api/flows/:id` | Get flow |
| PUT | `/api/flows/:id` | Update flow |
| DELETE | `/api/flows/:id` | Delete flow |
| POST | `/api/flows/:id/run` | Execute flow |
| POST | `/api/flows/:id/cancel` | Cancel running flow |

### 31.5 History

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/history` | List history (with filters) |
| GET | `/api/history/:id` | Get history entry |
| DELETE | `/api/history` | Clear history (with filters) |
| GET | `/api/history/search?q=` | Full-text search history |

### 31.6 Diff

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/diff/responses` | Diff two responses |
| POST | `/api/diff/environments` | Execute + diff across envs |

### 31.7 Mock

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mock/start` | Start mock server |
| POST | `/api/mock/stop` | Stop mock server |
| GET | `/api/mock/status` | Get mock server status |
| GET | `/api/mock/log` | Get mock request log |
| PUT | `/api/mock/endpoints/:id` | Update mock endpoint |

### 31.8 Import / Export

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/import` | Import collection (multipart file) |
| POST | `/api/import/detect` | Detect import format |
| POST | `/api/export/:format` | Export collection |

### 31.9 Code Generation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/codegen` | Generate code snippet |
| GET | `/api/codegen/targets` | List available targets |

### 31.10 Workspaces (v3)

> **Note:** Workspace management routes are added in v3 (team workspaces). In MVP, a single implicit workspace exists per browser.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces` | List workspaces |
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces/:id` | Get workspace |
| PUT | `/api/workspaces/:id` | Update workspace |
| DELETE | `/api/workspaces/:id` | Delete workspace |
| POST | `/api/workspaces/:id/members` | Add member |
| DELETE | `/api/workspaces/:id/members/:userId` | Remove member |
| PUT | `/api/workspaces/:id/members/:userId` | Update member role |

### 31.11 Authentication (v2)

> **Note:** Authentication routes are added in v2 (logged-in users). MVP has no auth endpoints.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout (revoke refresh token) |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |
| DELETE | `/api/auth/me` | Delete account + data |

### 31.12 TLS

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tls/inspect` | Inspect TLS certificate |

### 31.13 Settings

> **Note:** In MVP, settings are stored in browser localStorage. Server-side settings storage is added in v2.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get user settings (v2+) |
| PUT | `/api/settings` | Update user settings (v2+) |

---

## 32. UI Component Inventory

### 32.1 Shared Components

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

### 32.2 Component Count Summary

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
| Settings | 4 (MVP) + 1 (v3: team) |
| Shared/utility | 9 |
| Auth (v2) | 3 |
| Team (v3) | 4 |
| **MVP Total** | **~62 components** |
| **All Phases Total** | **~69 components** |

---

## 33. Keyboard Shortcuts

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

## 34. Non-Functional Requirements

### 34.1 Performance

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

### 34.2 Reliability

- Go executor process recovery: auto-restart on crash
- Node.js server graceful shutdown: drain active requests
- IndexedDB data integrity: transactions for multi-object writes
- PostgreSQL: connection pool with health checks and retry
- gRPC: connection retry with exponential backoff

### 34.3 Security

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

### 34.4 Scalability (Self-Hosted)

| Metric | Target |
|--------|--------|
| Concurrent users per instance | Up to 50 |
| Collections per workspace | Up to 10,000 |
| Requests per collection | Up to 5,000 |
| History entries | Up to 1,000,000 (with retention) |
| Mock server concurrent connections | Up to 100 |

### 34.5 Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome / Edge | Latest 2 major versions |
| Firefox | Latest 2 major versions |
| Safari | Latest 2 major versions |

### 34.6 Accessibility

- Keyboard navigation for all primary actions
- ARIA labels on interactive elements
- Focus management in dialogs and command palette
- Sufficient color contrast in both light and dark themes
- Screen reader compatible tree views and tables

### 34.7 Failure Modes & Edge Cases

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

### 34.8 Observability

**MVP observability is minimal** — focused on operational health, not analytics:

- **Health endpoint:** `GET /api/ping` returns Go executor version, uptime, and connection status
- **Structured logging:** Pino (Node.js) and zerolog (Go) with JSON output, log levels, request IDs
- **Error tracking:** All errors include a request ID that traces through Node.js proxy → Go executor for debugging
- **Request timing:** Every proxy request logs total proxy overhead (time from receiving browser request to returning Go response)
- **Mock server metrics:** Request count and error count exposed via `GET /api/mock/status`

**Not in MVP:** APM integration, distributed tracing, metrics dashboards, usage analytics. These are deferred to v3+ when team usage creates a need for operational visibility.

---

## 35. Feature Inventory & Roadmap

All features organized by release phase.

### 35.1 MVP — Public Anonymous Users

> **Goal:** A fully functional API testing tool that anyone can use without an account. All data stored in browser IndexedDB. Public hosted + self-hosted Docker deployment.

#### MVP: Core Engine

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
| C12 | Auth helpers | Bearer, Basic, API Key, OAuth2, Digest, AWS Sig V4 |
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
| C33 | Import: Postman | Import Postman Collection v2.1 |
| C34 | Import: OpenAPI | Import OpenAPI 3.0 and 3.1 specs |
| C35 | Import: cURL | Parse cURL commands into requests |
| C36 | Import: Insomnia | Import Insomnia v4 collections |
| C37 | Import: Hoppscotch | Import Hoppscotch collections |
| C38 | Import: auto-detect | Detect import format automatically |
| C39 | Export: invoke YAML | Export as file-per-request YAML (Git-friendly) |
| C40 | Export: invoke JSON | Export as single JSON file |
| C41 | Export: Postman | Export as Postman Collection v2.1 |
| C42 | Export: OpenAPI | Generate OpenAPI spec from collection |
| C43 | Export: cURL | Export individual requests as cURL commands |
| C44 | Code generation | Generate code snippets (14 targets) |
| C45 | Request history | Store all executed requests with responses |
| C46 | History search | Full-text search across history entries |
| C47 | History retention | Configurable retention period and max entries |
| C48 | TLS inspection | Certificate chain, cipher suite, validity |
| C49 | Redirect tracking | Capture per-hop redirect data with timing |
| C50 | Batch execution | Run same request N times with concurrency |
| C51 | Batch statistics | p50, p95, p99, mean, std dev, status distribution |
| C52 | Proxy support | HTTP and SOCKS5 proxy configuration |
| C53 | Client certificates | Client cert auth for mTLS endpoints |
| C54 | Custom CA bundles | Support self-signed server certificates |
| C55 | Response streaming | Stream SSE and large response bodies |
| C56 | Storage: IndexedDB | Browser-local storage adapter |
| C58 | Storage: File/YAML | File-based storage for export/import |

#### MVP: Web UI

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
| U40 | Keyboard shortcuts | Full keyboard navigation (see section 32) |
| U41 | Resizable panels | Drag-to-resize sidebar, request/response split |
| U42 | Status bar | Response status, time, size, protocol |
| U43 | Toast notifications | Success, error, warning, info messages |
| U44 | Request body formatting | Auto-prettify JSON, XML |
| U45 | Request code editor | Syntax highlighting for JSON, XML, GraphQL, JavaScript |
| U46 | Bulk header editor | Raw text editing mode for headers |
| U47 | Bulk param editor | Raw text editing mode for query params |
| U48 | Response size indicator | Display response body and total sizes |

#### MVP: Deployment & Infrastructure

| # | Feature | Description |
|---|---------|-------------|
| D01 | Public hosted deployment | invoke.dev hosted on VPS with CDN |
| D02 | Self-hosted Docker Compose | Multi-container deployment (no database) |
| D03 | Single-container Docker | All-in-one image (server + executor) |
| D04 | Anonymous mode | Full features without account (IndexedDB) |
| D14 | CI/CD pipeline | GitHub Actions for lint, test, build, deploy |
| D15 | Docker image publishing | ghcr.io or Docker Hub |

---

### 35.2 v2 — Logged-In Users

> **Goal:** Add optional user accounts to the public hosted version. Users who create an account get cross-device sync and persistent server-side storage. Anonymous mode continues to work as before.

| # | Feature | Description |
|---|---------|-------------|
| C57 | Storage: PostgreSQL | Server-side storage adapter |
| D05 | Optional accounts | Email/password registration for sync |
| D06 | OAuth login | GitHub and Google OAuth2 |
| D07 | JWT authentication | Access + refresh token flow |
| D13 | Account deletion | Full data purge on account deletion |
| D16 | Database migrations | Automated Drizzle ORM schema migrations |
| U49 | Login / Register UI | Login and registration views |
| U50 | Account settings | Profile management, password change, account deletion |
| U51 | Data sync indicator | Visual indicator showing sync status (local vs synced) |

---

### 35.3 v3 — Team Workspaces

> **Goal:** Add team functionality for self-hosted deployments. Shared workspaces, role-based access, user invitation, and audit logging.

| # | Feature | Description |
|---|---------|-------------|
| D08 | Team workspaces | Shared collections and environments |
| D09 | Role-based access | Owner, Admin, Editor, Viewer roles |
| D10 | Audit logging | Track collection changes with user attribution |
| D11 | Sensitive variable encryption | AES-256-GCM at rest in PostgreSQL |
| D12 | User invitation | Invite links and email invitations |
| U38 | Settings: team | User management, roles (self-hosted) |
| U52 | Workspace switcher | Switch between personal and team workspaces |
| U53 | Member management UI | Invite, remove, change roles for workspace members |
| U54 | Audit log viewer | View who changed what and when |
| U55 | Sensitive variable masking | Mask/unmask sensitive env values based on role |

---

### 35.4 v4 — Desktop App

> **Goal:** Package the existing web application as a lightweight native desktop app using Tauri. Supports macOS, Windows, and Linux. Inherits all features from MVP, v2, and v3.

| # | Feature | Description |
|---|---------|-------------|
| D17 | Tauri desktop app shell | Native window wrapper using OS webview (WebKit/WebView2/WebKitGTK) |
| D18 | Native file system access | Drag-and-drop files, save collections to disk without browser permissions |
| D19 | System tray integration | Run in background with tray icon on all platforms |
| D20 | Native notifications | OS-level notifications for mock server events, flow completion |
| D21 | Auto-update | Built-in update mechanism (Tauri updater) with signature verification |
| D22 | Global keyboard shortcuts | System-wide hotkey to open invoke or send request |
| D23 | Protocol handler | Register `invoke://` URL scheme to open collections/requests from browser links |
| D24 | Multi-window support | Open multiple workspaces in separate windows |
| D25 | Code signing | macOS notarization, Windows Authenticode signing for distribution |
| U56 | Desktop menu bar | Native menu bar with File, Edit, View, Window, Help menus |
| U57 | Desktop onboarding | First-launch setup: import from Postman/Insomnia detection |

---

### 35.5 v5 — Real-Time Collaboration

> **Goal:** Add real-time collaborative editing to team workspaces. Multiple users can work on the same workspace simultaneously with live cursors and conflict-free merging. Available on web and desktop simultaneously (same codebase).

| # | Feature | Description |
|---|---------|-------------|
| V09 | Real-time collaboration | Live cursors, presence, conflict-free editing |
| V10 | CRDT-based sync | Y.js or Automerge for collaborative state |
| V11 | WebSocket event hub | Server-side pub/sub for broadcasting changes to connected clients |
| V12 | Presence indicators | See who is online and what collection/request they're viewing |
| V13 | Change notifications | Real-time toasts when teammates modify shared collections |
| V14 | Redis pub/sub | Multi-instance server coordination for collaboration events |
| V15 | LDAP/OIDC integration | Enterprise SSO for self-hosted |

---

### 35.6 v6 — CLI

> **Goal:** Add a CLI tool (`invoke`) that imports @invoke/core and communicates with the Go executor via gRPC. Uses YAML collection files on disk. Enables CI/CD pipeline integration and terminal-based workflows.

| # | Feature | Description |
|---|---------|-------------|
| V01 | CLI tool | `invoke` CLI importing @invoke/core |
| V02 | CLI request execution | `invoke send GET https://...` |
| V03 | CLI flow execution | `invoke run <flow-name>` |
| V04 | CLI collection management | `invoke collection list/create/delete` |
| V05 | CLI mock server | `invoke mock <collection>` |
| V06 | CLI code generation | `invoke codegen <target> <request>` |
| V07 | CLI diff | `invoke diff <env1> <env2> <request>` |
| V08 | CLI import/export | `invoke import/export <format> <file>` |
| V25 | CLI team sync | `invoke pull` / `invoke push` for team workspace sync (non-realtime) |

---

### 35.7 Future (Unscheduled)

> **Features under consideration for future releases, not assigned to a specific version.**

| # | Feature | Description |
|---|---------|-------------|
| V16 | PWA offline support | Service worker for offline web UI |
| V17 | Browser extension | CORS bypass without proxy server |
| V18 | VS Code extension | invoke integrated into VS Code |
| V19 | Plugin system | Community extensions for auth types, importers, code gen targets |
| V20 | AI-assisted testing | LLM-powered assertion generation and test suggestions |
| V21 | API documentation generation | Interactive API docs from collections |
| V22 | Load testing | Ramp-up, sustained load, and reporting |
| V23 | Contract testing | Consumer-driven contract testing between microservices |
| V24 | Mobile app | Lightweight mobile client for monitoring and quick testing |

---

## 36. Licensing

**License:** Business Source License 1.1 (BSL 1.1)

- Source code is publicly visible and auditable
- Users may view, fork, modify, and self-host for personal and internal use
- **Additional Use Grant:** Usage of invoke is permitted for any purpose except offering invoke as a hosted commercial service that competes with invoke's own hosted offering
- **Change License:** Apache License 2.0
- **Change Date:** 4 years from each release date
- After the change date, each version automatically converts to Apache 2.0 (fully open source)
- This is the same license model used by HashiCorp, MariaDB, Sentry, and CockroachDB

---

## 37. Resolved Decisions & Future Considerations

### 37.1 Resolved Decisions

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

### 37.2 Future Considerations

- **Plugin system** — Allow community extensions for custom auth types, importers, code generation targets, or UI panels.
- **AI-assisted testing** — Use LLMs to generate assertions, suggest test cases, or explain response differences.
- **API documentation generation** — Generate interactive API docs from collections (similar to Postman's published docs).
- **Load testing** — Extend batch execution into a proper load testing tool with ramp-up, sustained load, and reporting.
- **Contract testing** — Consumer-driven contract testing between microservices using collection definitions.
- **Mobile app** — Lightweight mobile client for monitoring and quick request testing.

---

## 38. Glossary

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
