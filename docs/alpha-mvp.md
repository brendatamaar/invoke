# invoke — Alpha MVP

**Purpose:** The actual first ship. A deliberately small, opinionated subset of the v1 vision focused on proving the core request-execution loop end-to-end.
**Audience:** The implementer (you), and anyone reviewing whether the scope is honest.
**Relationship to other docs:**
- `prd.md` — the full product specification (v1 destination)
- `mvp-features.md` — the full v1 feature catalog (everything we eventually want)
- `execution-detail.md` — task-level breakdown for the full v1 build
- `alpha-mvp.md` (this file) — what we actually build first

---

## 1. Why an Alpha (and not the full MVP)

The original `mvp-features.md` cataloged ~142 features across 4 protocols, visual flow builder, mock server, response diffing, scripting, codegen for 14 targets, 5 import formats, public hosted deployment, and self-hosting. That is a v1.0 of a mature product, not a side-project MVP.

For a side project, shipping nothing because you tried to ship everything is the dominant failure mode. The Alpha exists to short-circuit that.

The Alpha proves one thing:

> **You can open the browser, send a REST request, see the response, save it, and reuse it later — fully local, no account, with timing data Postman can't match.**

Everything else — GraphQL, WebSocket, gRPC, flow builder, mock server, scripting, response diff, all 14 codegen targets, 5 import formats, public hosting — is deferred to Beta or v1.

This isn't pessimism about the product. It's recognizing that the value proposition (privacy-first, fast, Git-friendly, local-first, accurate timing) can be proven with a fraction of the surface area. Bruno did not match Postman feature-for-feature on day one. Hoppscotch shipped with way less. invoke can too.

---

## 2. Alpha Scope

### 2.1 What's IN the Alpha

**Protocols**
- REST only (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Request body: JSON, form-data, x-www-form-urlencoded, raw text, none
- Headers (key/value list)
- Query parameters (key/value list)
- Auth: none, Basic, Bearer token, API key (header or query)

**Core engine (browser)**
- Variable system: `{{variable}}` resolution in URL, headers, body, auth
- Variable scope: environment → request (no global, collection, folder, flow scopes yet)
- Built-in dynamic variables: `$uuid`, `$timestamp`, `$isoTimestamp`, `$randomInt`
- Variable extraction from response (JSONPath only) for chaining within a session

**Storage (IndexedDB via Dexie)**
- Collections (one workspace, no nested folders — flat list under each collection)
- Requests (saved into collections)
- Environments (named variable sets)
- History (last 1,000 entries, no full-text search yet)

**Web UI**
- Request builder: URL bar, method dropdown, tabs for params/headers/auth/body
- Response viewer: status, timing summary (DNS, TCP, TLS, TTFB, total — no waterfall yet), headers, body (JSON pretty-printed via CodeMirror, raw text fallback)
- Collection sidebar: list collections, expand to show requests, click to open, save current request, basic rename/delete
- Environment switcher: dropdown in top bar, edit environments in a side panel
- History panel: list of recent requests with method/URL/status/timestamp, click to reload
- Send button + `Ctrl+Enter` shortcut
- Light/dark theme

**Import/Export**
- YAML export (file-per-request, matching the PRD's `.invoke.yaml` format)
- YAML import (read directory back into a collection)
- Postman v2.1 collection import (REST requests only, ignore scripts/tests)
- cURL import (paste cURL command into URL bar, parse to request fields)

**Infrastructure**
- Local development via `docker-compose.dev.yml`
- Self-hosted via `docker-compose.yml` (single command, runs locally on user's machine)
- **No public hosted deployment in Alpha** — invoke.dev waits for Beta

**Go executor**
- HTTP execution with `net/http/httptrace` for timing
- Redirect tracking
- TLS inspection (cert chain, expiry)
- Configurable timeout
- HTTP and SOCKS5 proxy support
- gRPC service exposing `Execute` and `Ping` RPCs

**Server (Node.js)**
- Thin proxy: `POST /api/execute` → Go executor `Execute` RPC
- `GET /api/ping` → Go executor `Ping` RPC
- That's it. ~100 lines of Hono routing.

### 2.2 What's OUT of the Alpha (deferred to Beta or later)

**Deferred to Beta:**
- GraphQL (with schema explorer)
- Assertions engine
- Response diff viewer
- Code export (start with 3–4 targets: cURL, JS fetch, Python requests, Node axios)
- OpenAPI import
- Insomnia, Hoppscotch import
- Full-text history search
- Command palette (`Ctrl+K`)
- Timing waterfall visualization (D3)
- Public hosted deployment (`invoke.dev`) with rate limits, SSRF protection, abuse monitoring
- Nested folders inside collections

**Deferred to v1:**
- WebSocket protocol
- gRPC protocol
- Visual flow builder (request chaining UI)
- Mock server
- Scripting (pre-request, post-response)
- Codegen for the remaining 10+ targets
- mTLS / client certificate manager
- Cookie jar UI
- Advanced auth: OAuth 2.0 flows, Digest, AWS Sig V4, NTLM
- Drag-and-drop reordering in collection sidebar
- Multiple workspaces

**Deferred to v2+ (already in roadmap):**
- User accounts, PostgreSQL, server-side core
- Team workspaces
- Desktop app (Tauri)
- Real-time collaboration
- CLI

### 2.3 Feature Count

| Category | Count |
|----------|-------|
| Core engine features | ~12 |
| Web UI features | ~10 |
| Import/export | 4 |
| Infrastructure | 1 (self-hosted Docker) |
| **Total** | **~27 features** |

Compare to the full v1: ~142 features. Alpha is roughly 19% of v1 surface area.

---

## 3. Vertical Slice Execution Plan

The full `execution-detail.md` is organized layer-by-layer (build all of Go executor → all of core → all of server → all of UI). That is architecturally clean but produces no visible product until very late.

The Alpha uses **vertical slices** instead. Each slice ends with something the user can actually do. After each slice, the app is more useful than before. If you stop after Slice 1, you have a worse but still real version of curl. If you stop after Slice 4, you have a Postman-replacement for solo REST work.

### Slice 0 — Scaffold (week 1)

This is the only "horizontal" stage. You can't avoid it — the build system, gRPC contract, and dev environment have to exist before any vertical slice can run.

Reuse `execution-detail.md` Stage 1 (Parts 1.1 through 1.9) as-is. The deliverable is unchanged: a ping travels Vue UI → Hono proxy → Go executor → back, and `@invoke/core` is importable in the browser without Node polyfills.

**Acceptance:** Open browser. Page loads. Click "ping". See "pong from Go 1.22.x" in the UI. `@invoke/core` is imported and a sample function (e.g. UUID generation) runs in the browser console.

### Slice 1 — Send a REST request (week 2)

The single most important slice. After this, invoke does something Postman does, and you can use it to debug an actual API.

**Build:**
- Go executor `Execute` RPC: `net/http` request with `httptrace` timing, return status, headers, body, timing breakdown
- Hono proxy: `POST /api/execute` forwards to Go via gRPC
- Vue UI: minimal request builder — URL input, method dropdown, raw JSON body textarea, headers as a key/value list, "Send" button
- Vue UI: response panel — status code, total duration, headers list, body pretty-printed (CodeMirror with JSON mode)

**Skip for now:** auth, query params tab, env vars, save, collections, history.

**Acceptance:** Type `https://jsonplaceholder.typicode.com/users` into URL bar, press Send. Within 1 second, response panel shows `200 OK`, `~XXX ms`, the JSON array of users formatted with syntax highlighting, and response headers. Same for a `POST` with a JSON body to `https://httpbin.org/post`. Switch to a URL that 404s and verify the status badge turns red.

### Slice 2 — Save and reuse a request (week 3)

After this slice, invoke replaces the "I'll save that curl command in a notes file" workflow.

**Build:**
- IndexedDB store via Dexie: `collections` table (id, name), `requests` table (id, collectionId, name, method, url, headers, body)
- Core engine: `CollectionStore` interface + IndexedDB implementation
- Vue UI: sidebar component listing collections and requests, "New collection" / "New request" buttons, click-to-load
- Vue UI: "Save" button on the request builder — prompts for name + collection if new, otherwise overwrites
- Browser refresh persistence

**Acceptance:** Create a collection called "JSONPlaceholder". Save a `GET /users` request and a `POST /posts` request inside it. Refresh the browser. Both collections and requests are still there. Click `GET /users` in the sidebar — the request builder loads with the saved URL, method, and headers. Click Send. It works.

### Slice 3 — Variables & environments (week 4)

After this slice, invoke handles the "swap between local/staging/prod" workflow that is the daily reality of API testing.

**Build:**
- Core engine: variable resolver (`{{name}}` → value lookup with environment scope)
- Core engine: dynamic variables (`{{$uuid}}`, `{{$timestamp}}`, `{{$isoTimestamp}}`, `{{$randomInt}}`)
- IndexedDB: `environments` table (id, name, variables as JSON)
- Vue UI: environment switcher dropdown in top bar
- Vue UI: environment editor (modal or side panel) — add/edit/delete variables per environment
- Vue UI: variable resolution preview (hover over `{{base_url}}` in URL bar, see resolved value)
- Pre-send: resolve variables in URL, headers, body, auth before forwarding to proxy

**Acceptance:** Create environments "local" and "staging" with `base_url` set to `http://localhost:3000` and `https://api.staging.example.com` respectively. Edit a saved request to use `{{base_url}}/users`. Switch environment to "local", press Send — request goes to localhost. Switch to "staging", press Send — request goes to staging. Hovering over `{{base_url}}` shows the currently resolved value. Insert `{{$uuid}}` into a request body field and verify each Send produces a different UUID in the request.

### Slice 4 — Import/export & basic auth (week 5)

After this slice, invoke is migration-ready (Postman users can come over) and handles real-world authenticated APIs.

**Build:**
- Core engine: YAML serializer (collection → file-per-request directory structure)
- Core engine: YAML deserializer (directory → collection)
- Core engine: Postman v2.1 importer (REST only — ignore scripts, tests, monitors)
- Core engine: cURL parser (paste curl command → request fields)
- Vue UI: "Export" button on collections (downloads a `.zip` of YAML files via `dexie-export-import` + `js-yaml` pipeline)
- Vue UI: "Import" dropdown (Postman / cURL / YAML directory)
- Auth tab in request builder: None / Basic / Bearer / API Key
- Auth resolution applied before forwarding to proxy

**Acceptance:** Export the "JSONPlaceholder" collection from Slice 2 — get a zip with one YAML file per request. Unzip, inspect — files are human-readable, valid YAML, match the PRD's collection format. Re-import into a new collection — same structure restored. Import a real Postman v2.1 collection export — at least 80% of REST requests load correctly. Paste `curl -H "Authorization: Bearer xyz" https://api.example.com/me` into the URL bar — fields populate correctly. Add Bearer auth to a saved request, send to a protected endpoint, get 200 back.

### Slice 5 — Polish & ship (week 6)

After this slice, invoke is shippable as Alpha.

**Build:**
- History panel: last 1,000 requests, click to reload
- History persists to IndexedDB
- Light/dark theme toggle
- Keyboard shortcuts: `Ctrl+Enter` to send, `Ctrl+S` to save, `Ctrl+N` for new request, `Ctrl+,` for settings
- TLS inspection in response panel (cert subject, issuer, expiry — text only, no fancy UI)
- Timeout configuration (default 30s, configurable per request)
- Self-hosted `docker-compose.yml` (production build, single command)
- README with screenshots, installation instructions, "open browser, send request" quickstart
- Basic E2E test with Playwright covering Slice 1 → 4 happy paths
- Tag `v0.1.0-alpha` and publish Docker images to ghcr.io

**Acceptance:** A new user runs `docker compose up`, opens `http://localhost:8080`, and within 60 seconds has sent their first request. Existing user can do everything from Slices 1–4 without bugs. README is good enough to post on Hacker News without being embarrassed.

---

## 4. Timeline

| Slice | Goal | Estimated Effort (side-project hours) |
|-------|------|---------------------------------------|
| 0 — Scaffold | Build system + ping works | 15–25 hours |
| 1 — Send REST | Request → response loop | 20–30 hours |
| 2 — Save & reuse | Collections + IndexedDB | 15–25 hours |
| 3 — Variables | Environments + dynamics | 15–25 hours |
| 4 — Import/auth | Postman/cURL/YAML + Bearer | 25–40 hours |
| 5 — Polish & ship | History, theme, Docker, README | 15–25 hours |
| **Total** | | **105–170 hours** |

At 8 hours/week of side-project time, that's 13–21 weeks (3–5 months). At 4 hours/week, double it. Plan accordingly.

---

## 5. Acceptance Criteria Pattern

Every slice above ends with concrete observable acceptance criteria, not "X working." Continue this pattern for any task added to the Alpha. The test is: could a different person, given only the acceptance criteria, decide whether the task is done?

**Bad:**
> Collection CRUD working

**Good:**
> User can create a collection, save a request inside it, refresh the browser, and see the saved request restored. Deleting a collection prompts for confirmation and removes both the collection and all its requests from IndexedDB.

**Bad:**
> Timing data accurate

**Good:**
> DNS, TCP, TLS, TTFB, transfer, and total timing are returned for HTTPS requests and displayed numerically (no waterfall yet) in the response panel. A Go unit test using `httptest` verifies all six timing fields are populated and non-negative for a sample request.

---

## 6. After Alpha

Alpha → Beta is where the product becomes broadly competitive. Beta is roughly:

- GraphQL client + schema explorer
- Assertions engine
- Response diff viewer
- Code export (3–4 targets to start)
- OpenAPI import, Insomnia import
- Full-text history search
- Command palette (`Ctrl+K`)
- Timing waterfall (D3)
- Public hosted deployment with rate limits, SSRF protection, basic abuse monitoring
- Nested folders in collections
- A `security-threat-model.md` document, written before public hosted goes live

Beta → v1 is the long tail: WebSocket, gRPC, visual flow builder, mock server, scripting, the rest of codegen, advanced auth, mTLS, drag-and-drop. These are differentiators but none of them is on the critical path to "open browser, send REST, save it."

The roadmap from v1 onward (v2 accounts, v3 teams, v4 desktop, v5 collaboration, v6 CLI) is unchanged from the PRD.

---

## 7. Notes for the Implementer

1. **Do not add scope to a slice mid-flight.** If something feels missing, write it down and decide at the next slice boundary. The single biggest risk to Alpha is creep.

2. **Each slice produces a usable app.** If you stop after Slice 2, you have something — strictly worse than after Slice 4, but still something. That property is what makes the side-project failure mode (burnout at 60%) survivable.

3. **Test as you go, but don't over-test for Alpha.** Unit tests for core engine logic (variable resolution, YAML serialization, cURL parsing) are worth it. Component tests for Vue UI are worth it sparingly. A few Playwright E2E tests covering the happy paths of each slice are worth it. Aiming for 80% coverage everywhere is not.

4. **Public hosted deployment waits.** Running a public proxy that lets anonymous users send arbitrary HTTP through your VPS is an abuse magnet (SSRF probes, credential stuffers, scrapers eating your egress). Self-hosted via Docker is a feature in the privacy-first positioning, not a limitation. Add public hosted in Beta with the threat model in place.

5. **Reference `prd.md` for type definitions and contracts.** This document tells you what to build and in what order; the PRD tells you exactly how each feature should behave at the interface level (TypeScript types, gRPC proto, YAML schema).
