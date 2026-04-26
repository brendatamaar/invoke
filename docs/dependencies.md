# invoke — Third-Party Dependencies

**Purpose:** Complete list of all third-party libraries used in the invoke MVP, organized by layer with rationale for key choices.

**Audience:** Developers setting up the project, evaluating security/license compliance, or onboarding new contributors.

---

## Table of Contents

1. [Core Engine (@invoke/core)](#1-core-engine-invokecore)
2. [Server (@invoke/server)](#2-server-invokeserver)
3. [Web UI (@invoke/ui)](#3-web-ui-invokeui)
4. [Go Executor](#4-go-executor)
5. [Monorepo Tooling](#5-monorepo-tooling)
6. [Infrastructure Tools](#6-infrastructure-tools)
7. [Summary](#7-summary)
8. [Key Decisions & Rationale](#8-key-decisions--rationale)

---

## 1. Core Engine (`@invoke/core`)

The core TypeScript library containing all business logic. **Isomorphic** — runs in browser (MVP) and Node.js (v2+). Produces two entry points:
- `@invoke/core` — browser-safe (no Node.js APIs)
- `@invoke/core/server` — Node.js-only (gRPC, isolated-vm)

### Runtime & Build

| Library | Purpose | Environment |
|---------|---------|-------------|
| typescript | Language | Both |
| tsup | Library build tool (two entry points: browser + server) | Both |
| vitest | Test framework | Both |
| @vitest/coverage-v8 | Code coverage | Dev |

### HTTP & Networking (Server-Only)

> **⚠ These are NOT imported in the browser build.** They live in `@invoke/core/server`.

| Library | Purpose | Environment |
|---------|---------|-------------|
| @grpc/grpc-js | gRPC client to communicate with Go executor | **Node.js only** |
| @grpc/proto-loader | Load `.proto` files at runtime | **Node.js only** |

### Data Processing

| Library | Purpose | Environment |
|---------|---------|-------------|
| jsonpath-plus | JSONPath evaluation for variable extraction and assertions | Both |
| js-yaml | YAML parsing and serialization for collection import/export | Both |
| ajv | JSON Schema validation (used in assertions) | Both |
| ajv-formats | Format validators for Ajv (date, email, URI, etc.) | Both |
| uuid | UUID v7 generation for entity IDs (time-ordered, uses `crypto.randomUUID()`) | Both |
| microdiff | Structural JSON diffing (wraps for response comparison) | Both |

### Scripting

| Library | Purpose | Environment |
|---------|---------|-------------|
| Web Worker + Blob URL | Script sandbox for browser (pre-bundled with allowed libs) | **Browser only** |
| isolated-vm | Script sandbox for server (V8 isolates, 128MB limit) | **Node.js only** |

> **Note:** `isolated-vm` is a native C++ module that cannot run in browsers. It must be excluded from the browser build via the separate `@invoke/core/server` entry point. The Web Worker sandbox is browser-native and needs no npm package.

### Worker Bundle Libraries

These libraries are bundled into the Web Worker script at build time (via Vite), available on the worker's `self` global for user scripts:

| Library | Purpose | Environment |
|---------|---------|-------------|
| lodash-es | Utility functions available in scripts | Browser (worker) |
| uuid | UUID generation available in scripts | Browser (worker) |

### Storage

| Library | Purpose | Environment |
|---------|---------|-------------|
| dexie | IndexedDB wrapper with Promise-based API | Browser |
| dexie-export-import | Dexie addon for database export/import | Browser |

### Import Parsers

| Library | Purpose |
|---------|---------|
| openapi-types | TypeScript types for OpenAPI 3.x spec |
| @apidevtools/swagger-parser | Parse and validate OpenAPI/Swagger specs |

### Utilities

| Library | Purpose |
|---------|---------|
| lodash-es | Utility functions (debounce, deep clone, pick, omit — ES module version for tree-shaking) |
| zod | Runtime type validation (shared with server package) |

### Code Generation

| Library | Purpose |
|---------|---------|
| prettier | Format generated code snippets |

### Auth Utilities

| Library | Purpose |
|---------|---------|
| jsrsasign | Used for Digest auth hashing and AWS Sig V4 (HMAC-SHA256) |

---

## 2. Server (`@invoke/server`)

The thin Node.js API gateway. Delegates all business logic to `@invoke/core`.

### Runtime & Build

| Library | Purpose |
|---------|---------|
| typescript | Language |
| tsx | TypeScript execution in development (replaces ts-node) |
| vitest | Test framework |
| supertest | HTTP integration testing |

### HTTP Framework

| Library | Purpose |
|---------|---------|
| hono | HTTP framework for route handling |
| @hono/node-server | Node.js adapter for Hono |
| @hono/zod-validator | Zod-based request validation middleware for Hono |

### WebSocket

| Library | Purpose |
|---------|---------|
| ws | WebSocket server implementation |

### Validation

| Library | Purpose |
|---------|---------|
| zod | Schema validation (also used in core) |

### Logging

| Library | Purpose |
|---------|---------|
| pino | Structured logging |
| pino-pretty | Human-readable log formatting in development |

### Utilities

| Library | Purpose |
|---------|---------|
| @invoke/core | Internal dependency — the core engine |
| @grpc/grpc-js | gRPC client (re-exported via core) |
| dotenv | Load environment variables from `.env` files (for server config) |

---

## 3. Web UI (`@invoke/ui`)

The Vue 3 SPA. In MVP, the UI imports `@invoke/core` directly and runs business logic (variable resolution, assertions, flow orchestration, diffing, code generation, import/export) in the browser, persisting through the IndexedDB storage adapter. In v2+, when authenticated user accounts and PostgreSQL are added, the UI becomes a presentation layer that delegates business logic to the server for logged-in users. Anonymous users continue using the thick-client MVP behavior.

### Framework & Build

| Library | Purpose |
|---------|---------|
| vue | UI framework (Composition API) |
| vite | Build tool and dev server |
| typescript | Language |
| @vitejs/plugin-vue | Vite plugin for Vue SFC support |
| vite-plugin-vue-devtools | Vue devtools in development |

### Routing & State

| Library | Purpose |
|---------|---------|
| vue-router | Client-side routing |
| pinia | State management |

### UI Components

| Library | Purpose |
|---------|---------|
| primevue | UI component library (tables, dialogs, dropdowns, etc.) |
| primeicons | Icon font for PrimeVue |

### Styling

| Library | Purpose |
|---------|---------|
| tailwindcss | Utility-first CSS framework |
| postcss | CSS processor (required by Tailwind) |
| autoprefixer | CSS vendor prefixes |
| @tailwindcss/forms | Tailwind plugin for form element styling |

### Code Editor

| Library | Purpose |
|---------|---------|
| @codemirror/state | CodeMirror 6 core |
| @codemirror/view | CodeMirror 6 view layer |
| @codemirror/commands | Editor commands |
| @codemirror/language | Language support base |
| @codemirror/lang-json | JSON language mode |
| @codemirror/lang-javascript | JavaScript language mode (for scripts) |
| @codemirror/lang-xml | XML language mode |
| @codemirror/lang-html | HTML language mode |
| codemirror-graphql | GraphQL language mode |
| @codemirror/theme-one-dark | Dark theme for CodeMirror |
| @codemirror/autocomplete | Autocomplete support |
| @codemirror/search | Search within editor |
| @codemirror/linter | Error highlighting |

### Data Visualization

| Library | Purpose |
|---------|---------|
| d3-scale | Scales for timing waterfall |
| d3-shape | SVG shape helpers |

### Drag & Drop

| Library | Purpose |
|---------|---------|
| vuedraggable | Drag-and-drop for collections tree and tabs |

### Utilities

| Library | Purpose |
|---------|---------|
| @vueuse/core | Composable utilities (useMagicKeys for keyboard shortcuts, useDebounce, useStorage, etc.) |
| dexie | IndexedDB wrapper |
| graphql | GraphQL parsing for schema introspection |
| graphql-request | Lightweight GraphQL client for introspection queries |
| fuse.js | Fuzzy search for command palette |
| diff | Text diff algorithm for response diff viewer |
| fast-json-patch | JSON patch operations |
| nanoid | Short unique IDs for UI state |

### Formatting

| Library | Purpose |
|---------|---------|
| prettier | Format JSON/code in editors |
| @prettier/plugin-xml | Prettier plugin for XML formatting |

### Testing

| Library | Purpose |
|---------|---------|
| vitest | Test framework (unit + integration) |
| @vue/test-utils | Vue component testing |
| jsdom | DOM implementation for Vitest |
| fake-indexeddb | IndexedDB mock for testing |
| @playwright/test | E2E testing (canvas drag-and-drop, visual components, cross-browser) |

### Build Safety

| Library | Purpose |
|---------|---------|
| vite-plugin-node-polyfills | Optional safety net — polyfills Node.js built-ins if any `@invoke/core` dependency accidentally imports them. Ideally not needed; install as insurance. |

---

## 4. Go Executor

The standalone Go sidecar for HTTP execution with precise timing.

### Core

| Library | Purpose |
|---------|---------|
| google.golang.org/grpc | gRPC server |
| google.golang.org/protobuf | Protocol Buffers |
| google.golang.org/grpc/reflection | gRPC server reflection |
| google.golang.org/grpc/credentials | TLS credentials for gRPC |

### HTTP (Standard Library)

| Library | Purpose |
|---------|---------|
| net/http | Standard library HTTP client |
| net/http/httptrace | Request timing instrumentation |
| crypto/tls | TLS configuration and inspection |
| golang.org/x/net/proxy | SOCKS5 proxy support |

### WebSocket

| Library | Purpose |
|---------|---------|
| nhooyr.io/websocket | WebSocket client (modern, context-aware) |

### gRPC Client (for testing target gRPC servers)

| Library | Purpose |
|---------|---------|
| google.golang.org/grpc | Also used as client |
| google.golang.org/protobuf/reflect | Dynamic message handling |
| google.golang.org/protobuf/encoding/protojson | JSON ↔ protobuf conversion |

### Utilities

| Library | Purpose |
|---------|---------|
| github.com/rs/zerolog | Structured logging |
| github.com/google/uuid | UUID generation for connection IDs |

### Development

| Library | Purpose |
|---------|---------|
| github.com/air-verse/air | Hot-reload for Go in development |

---

## 5. Monorepo Tooling

Shared development and quality tools for the entire repository.

| Library | Purpose |
|---------|---------|
| pnpm | Package manager with workspace support |
| eslint | Linting |
| @typescript-eslint/eslint-plugin | TypeScript linting rules |
| @typescript-eslint/parser | TypeScript parser for ESLint |
| eslint-plugin-vue | Vue-specific linting |
| prettier | Code formatting |
| husky | Git hooks |
| lint-staged | Run linters on staged files |
| @commitlint/cli | Conventional commit message enforcement |
| @commitlint/config-conventional | Conventional commit config |
| typescript | Shared TypeScript |

---

## 6. Infrastructure Tools

External tools used for build, packaging, and deployment. Not libraries in the traditional sense.

| Tool | Purpose |
|------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| nginx | Reverse proxy and SPA serving |
| node:20-alpine | Node.js runtime image |
| golang:1.22-alpine | Go build image |
| alpine:latest | Minimal runtime base image |
| GitHub Actions | CI/CD |
| protoc | Protocol Buffers compiler (build-time) |
| grpc-tools | TypeScript gRPC code generation (build-time) |

---

## 7. Summary

### Count by Layer

| Layer | Library Count | Notes |
|-------|--------------|-------|
| Core Engine (browser-safe) | ~15 | Runs in browser for MVP |
| Core Engine (server-only) | ~3 | gRPC, isolated-vm, proto-loader — v2+ only |
| Server | ~10 | Thin proxy in MVP |
| Web UI | ~37 | Includes @invoke/core, Playwright, vite-plugin-node-polyfills |
| Go Executor | ~10 | |
| Monorepo Tooling | ~11 | |
| **Total distinct dependencies** | **~86** | |

### License Compliance

All libraries listed use permissive open-source licenses (MIT, Apache 2.0, BSD, ISC) compatible with invoke's BSL 1.1 license. No GPL or copyleft dependencies.

Before each release, run `pnpm licenses list` to verify no unexpected license changes in transitive dependencies.

### Security

- Run `pnpm audit` before every release to check for known vulnerabilities
- Run `govulncheck ./...` for Go dependencies
- Dependabot or Renovate should be configured on the GitHub repo for automated dependency updates
- Keep `@grpc/grpc-js`, `isolated-vm`, `ws`, and `zod` especially up to date — these handle untrusted input
- Verify browser build has no Node.js API imports: `vite build` should succeed without `vite-plugin-node-polyfills` triggering — if it does, find and remove the Node.js import leak in `@invoke/core`

### Isomorphic Build Verification

Before every release, verify the core engine builds cleanly for both targets:

```bash
# Browser build — must succeed with zero Node.js polyfills
cd packages/ui && pnpm build

# Server build — must succeed with native modules
cd packages/server && pnpm build

# If the UI build fails with "Cannot resolve 'fs'" or similar,
# there is a Node.js import leak in @invoke/core's browser entry point.
# Fix it — do not rely on vite-plugin-node-polyfills to mask the issue.
```

---

## 8. Key Decisions & Rationale

Why these libraries were chosen over alternatives.

### Native `fetch()` over `axios` / `ofetch` (UI HTTP client)

Modern browsers have full `fetch()` support with streaming, AbortController for cancellation, and proper error handling. For invoke's UI-to-server communication, which only needs JSON POST/GET requests with the same origin, native `fetch()` is sufficient and adds zero bundle size. Avoiding an HTTP client library saves ~5-15KB. A thin wrapper in `api/client.ts` handles base URL prefixing, JSON serialization, and error normalization.

### `nhooyr.io/websocket` over `gorilla/websocket` (Go)

Gorilla's websocket library is the old default but is no longer actively developed (it's in maintenance mode). nhooyr's websocket has better `context.Context` support, cleaner API design, and is actively maintained.

### `isolated-vm` over alternatives (script sandboxing)

vm2 was the previous standard but has been **deprecated due to sandbox escape vulnerabilities**. Alternatives considered:
- **QuickJS via quickjs-emscripten:** Uses a different JS engine than Node.js, causing subtle behavior differences. Slower for complex scripts.
- **Deno subprocess:** Adds 50-100ms per script execution and requires bundling Deno.
- **isolated-vm (chosen):** Uses V8 isolates (same engine as Node.js) for 100% behavior consistency. Configurable memory and CPU limits. Used in production by Figma, Replit, and others.

### `dexie` over raw IndexedDB

Raw IndexedDB has a notoriously difficult API — callback-based, verbose, error-prone. Dexie wraps it with a Promise-based API, transaction management, schema versioning, and automatic migrations. Only ~30KB minified. Used by ProseMirror, Excalidraw, and many production apps.

### `hono` over `express` / `fastify`

- **Express:** Older, great ecosystem, but TypeScript support is bolted-on. Middleware ecosystem is massive but often outdated.
- **Fastify:** Faster than Express, schema-based, but more opinionated.
- **Hono (chosen):** TypeScript-first by design. Faster than both Express and Fastify. Clean middleware API. Works on Node.js, Bun, Deno, Cloudflare Workers, and more — future-proof if runtime changes later.

### `zod` for validation

Zod is used in both core and server, so type schemas are defined once and shared. The schema can be used both for validation and to infer TypeScript types, eliminating duplication. Alternatives:
- **Yup:** Older, less TypeScript-integrated
- **Joi:** Runtime-only validation, no type inference
- **io-ts:** More functional style, steeper learning curve

### `@vueuse/core` for keyboard shortcuts

The `useMagicKeys()` composable makes shortcut handling trivial and idiomatic to Vue 3. Avoids older jQuery-era libraries like `mousetrap` or `hotkeys-js` that don't integrate as cleanly with Vue's reactivity.

### Native `Date` over `date-fns` / `dayjs` / `moment`

For invoke's date needs — current timestamps, ISO 8601 formatting, simple comparisons for history filtering — JavaScript's built-in `Date` class and `Intl.DateTimeFormat` are sufficient. Operations we need:
- `Date.now()` for timestamps
- `new Date().toISOString()` for ISO formatting
- `new Date(timestamp)` for parsing
- `Intl.DateTimeFormat` for user-facing formatting

Adding a date library for these basic operations adds bundle size without meaningful benefit. If we ever need complex operations (date math, timezone handling, parsing ambiguous formats), we'll reconsider.

### `lodash-es` over `lodash`

`lodash-es` uses ES modules, enabling Vite and other modern bundlers to tree-shake unused functions. The default `lodash` package is CommonJS and imports everything, bloating bundles.

### `tsx` over `ts-node`

`tsx` is faster than `ts-node` (uses esbuild under the hood), handles TypeScript more reliably in ESM projects, and has zero configuration required.

### `pnpm` over `npm` / `yarn`

- **True workspace support** without symlink hacks
- **Content-addressable storage** makes `pnpm install` significantly faster
- **Strict by default** — prevents phantom dependencies (accessing packages not declared in package.json)
- **Smaller `node_modules`** due to hard linking

### `Drizzle ORM` (v2+ only) over `Prisma`

Noted for future reference — not used in MVP since there's no database. When v2 arrives:
- **Prisma:** Better tooling, auto-generated migrations, bigger community. But heavier abstraction, slower queries in complex cases.
- **Drizzle (chosen):** Lighter weight, SQL-like API, better performance, smaller bundle. Fits a self-hostable deployment better.

### Not Using

Libraries we deliberately chose NOT to use:

| Library | Why Not |
|---------|---------|
| axios | Native `fetch()` is sufficient for our needs |
| ofetch | Native `fetch()` is sufficient for our needs |
| moment.js | Deprecated; native `Date` is sufficient |
| date-fns | Native `Date` is sufficient for our use cases |
| dayjs | Native `Date` is sufficient for our use cases |
| vm2 | Deprecated due to security vulnerabilities |
| gorilla/websocket | No longer actively developed |
| express | Hono is a better modern choice |
| jsonwebtoken | Not needed in MVP (no auth) |
| redux / vuex | Pinia replaces Vuex; Redux is React-only |
| styled-components / emotion | Tailwind covers styling needs without runtime overhead |
| jest | Vitest is faster and integrates better with Vite |

---

## Installation Commands

For convenience when scaffolding the project:

### Core (browser-safe dependencies)
```bash
cd packages/core
pnpm add jsonpath-plus js-yaml ajv ajv-formats uuid microdiff \
         dexie dexie-export-import openapi-types @apidevtools/swagger-parser \
         lodash-es zod prettier jsrsasign
pnpm add -D typescript tsup vitest @vitest/coverage-v8 \
            @types/js-yaml @types/uuid @types/lodash-es @types/jsrsasign
```

### Core Server-Only Dependencies
```bash
# These are optional peer dependencies, only installed when running on Node.js (v2+)
cd packages/core
pnpm add --save-optional @grpc/grpc-js @grpc/proto-loader isolated-vm
```

### Server
```bash
cd packages/server
pnpm add @invoke/core@workspace:* hono @hono/node-server @hono/zod-validator \
         ws zod pino dotenv @grpc/grpc-js @grpc/proto-loader
pnpm add -D typescript tsx vitest supertest pino-pretty @types/ws @types/supertest
```

### UI
```bash
cd packages/ui
pnpm add vue vue-router pinia primevue primeicons tailwindcss postcss autoprefixer \
         @tailwindcss/forms @vueuse/core @invoke/core@workspace:* \
         dexie graphql graphql-request \
         fuse.js diff fast-json-patch nanoid prettier @prettier/plugin-xml \
         @codemirror/state @codemirror/view @codemirror/commands @codemirror/language \
         @codemirror/lang-json @codemirror/lang-javascript @codemirror/lang-xml \
         @codemirror/lang-html codemirror-graphql @codemirror/theme-one-dark \
         @codemirror/autocomplete @codemirror/search @codemirror/linter \
         d3-scale d3-shape vuedraggable
pnpm add -D typescript vite @vitejs/plugin-vue vite-plugin-vue-devtools \
            vite-plugin-node-polyfills \
            vitest @vue/test-utils jsdom fake-indexeddb \
            @playwright/test \
            @types/d3-scale @types/d3-shape @types/diff
```

### Go Executor
```bash
cd executor
go get google.golang.org/grpc google.golang.org/protobuf \
       golang.org/x/net/proxy nhooyr.io/websocket \
       github.com/rs/zerolog github.com/google/uuid
go install github.com/air-verse/air@latest
```

### Root
```bash
# At repo root
pnpm add -Dw eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser \
             eslint-plugin-vue prettier husky lint-staged \
             @commitlint/cli @commitlint/config-conventional typescript
```

---

## Notes

- Version numbers are intentionally omitted — use `latest` at project start and then pin after verification
- All libraries are chosen to have permissive licenses compatible with BSL 1.1
- This list covers only MVP dependencies; v2+ phases will add: Drizzle ORM, pg (PostgreSQL client), jsonwebtoken, bcrypt or argon2, passport (OAuth strategies), etc.
- Dependencies should be reviewed quarterly for security updates and deprecations
- **Isomorphic core rule:** Any library added to `@invoke/core` (browser entry point) must work in browsers. Check for Node.js built-in imports (`fs`, `path`, `crypto` from Node, `Buffer`, `process`). Libraries in `@invoke/core/server` have no such restriction.
- **Web Worker bundle:** Libraries bundled into the worker script (lodash-es, uuid) increase the worker's load time. Keep the bundle under 500KB total. Do not add heavy libraries without justification.
- `isolated-vm` requires `node-gyp` and C++ build tools at `npm install` time. This is a build-time concern only — the Docker image uses pre-built binaries.
