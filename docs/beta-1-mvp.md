# invoke — Beta 1 MVP

**Purpose:** The second milestone after Alpha. Closes the daily-use gaps that prevent a Postman user from switching for everyday work, while staying self-hosted only.
**Audience:** The implementer (you), and anyone reviewing whether the scope is honest.
**Relationship to other docs:**
- `prd.md` — the full product specification (v1 destination)
- `mvp-features.md` — the full v1 feature catalog
- `execution-detail.md` — task-level breakdown for the full v1 build
- `alpha-mvp.md` — the first ship (REST-only)
- `beta-1-mvp.md` (this file) — the second ship (daily-use upgrade)
- `beta-2-mvp.md` — the third ship (testing and comparison upgrade)
- `v1` — public release with hosting, WebSocket, gRPC, flow builder, mock server, scripting (no doc yet)

---

## 1. Why Beta 1 (and why split Beta in two)

Alpha proved the core loop: open browser, send REST request, see response, save it, reuse it. That's enough to use invoke for personal projects, but it's not enough to migrate from Postman for real work.

The original Beta plan tried to close every Postman-switcher gap and add the validation/comparison layer in one milestone. Three separate reviews (ChatGPT, Codex, and Claude) all flagged that scope as another oversized MVP — the same trap we corrected when shrinking the original 142-feature MVP into Alpha. The mature response is to split.

**Beta 1 closes the daily-use gaps.** After Beta 1, a Postman user can switch over for a week and not feel handicapped on the things they actually do every day:

- GraphQL works (the biggest protocol gap in 2026)
- The timing claim is visually obvious (waterfall, not just numbers)
- Code can be exported as cURL or as a script for a bug report
- Migration from OpenAPI specs works
- Large collections are organizable (nested folders)
- Power users get keyboard-first navigation (command palette)
- History is searchable

**Beta 2 adds the validation/comparison layer:** assertions, response diff, GraphQL schema explorer, additional importers, response streaming, all-in-one Docker. Those are higher-value-per-feature but lower-frequency in daily use, so they earn a separate milestone where they get full attention.

The competitive thesis is unchanged from Alpha:

> **Open the browser, send requests fast, keep data local, export to Git-friendly files.**

Beta 1 stays self-hosted only. Public hosting waits for v1.

---

## 2. Beta 1 Scope

### 2.1 What's IN Beta 1 (additions on top of Alpha)

**Protocols**
- GraphQL Basic: query and mutation, variables panel, headers, send, save into collections. No schema explorer, no autocomplete, no introspection in Beta 1 — those are Beta 2.

**Core engine (browser)**
- Code generation: 4 targets — cURL, JavaScript `fetch`, Python `requests`, Node `axios`. Generated from `RequestConfig` after variable resolution.
- History search: naive string matching across URL, request name, request body, response body, headers. No inverted index in Beta 1; profile under realistic data and add `flexsearch` only if measured lag justifies it.
- Variable scope expansion: add **collection-level** and **folder-level** scopes (Alpha had only environment + request). Resolution chain: environment → collection → folder → request.

**Storage (IndexedDB)**
- Nested folders inside collections (recursive `folders` table with `parentFolderId`)

**Web UI**
- Timing waterfall: D3-rendered horizontal stacked bar showing DNS / TCP / TLS / TTFB / transfer segments with millisecond labels and tooltip-on-hover. Replaces Alpha's numeric-only timing display (Alpha numbers stay below the bar as a precision readout). **Ships first in this milestone** because it's the visible proof of the timing claim.
- GraphQL Basic UI: query editor with `codemirror-graphql` for syntax highlighting (no autocomplete yet — that needs introspection, which is Beta 2), variables panel as a JSON editor, dedicated GraphQL request type accessible via a protocol switcher
- Command palette (`Ctrl+K` / `Cmd+K`): fuzzy search across collections, requests, environments, settings, recent history, and named commands ("Toggle theme", "Open settings", "New request"). Built with `fuse.js`.
- Code export panel in response viewer: dropdown to pick target, formatted code in a CodeMirror read-only block, "copy to clipboard" and "save as file" buttons
- History panel upgrade: search input at the top, results re-rank as you type (debounced)
- Collection sidebar upgrade: nested folder rendering, folder collapse/expand state persisted, basic right-click context menu (rename, delete, new folder, new request, duplicate)

**Import/Export**
- OpenAPI 3.0 import: parse spec via `@apidevtools/swagger-parser`, generate one request per operation, organize by `tags[]` into folders. Path/query/header parameters mapped to placeholder variables.

**Infrastructure**
- Still self-hosted only via Docker Compose (no public hosted yet)
- Still three-container deployment (all-in-one container is Beta 2)

**Go executor**
- No new RPCs in Beta 1. Alpha's `Execute` and `Ping` are sufficient. (Streaming, WebSocket, and gRPC RPCs all wait — streaming is Beta 2; WebSocket/gRPC are v1.)

**Server (Node.js)**
- Still no CRUD routes. Storage stays in IndexedDB. Same thin proxy as Alpha.

### 2.2 What's OUT of Beta 1 (deferred)

**Deferred to Beta 2:**
- Assertions engine
- Response diff viewer
- GraphQL Advanced (schema introspection, explorer, autocomplete)
- Insomnia v4 import
- Hoppscotch import
- Streaming responses (`ExecuteStream`, SSE coverage)
- Variable extraction from response (JSONPath chaining within a session)
- All-in-one Docker container

**Deferred to v1:**
- Public hosted deployment (`invoke.dev`) with rate limits, SSRF protection, abuse monitoring
- WebSocket protocol
- gRPC protocol
- Visual flow builder (request chaining with conditionals and extraction)
- Mock server
- Scripting (pre-request, post-response, Web Worker sandbox)
- Codegen for the remaining 10+ targets
- mTLS / client certificate manager UI
- Cookie jar UI
- Advanced auth: OAuth 2.0, Digest, AWS Sig V4, NTLM
- SOCKS5 proxy support
- Drag-and-drop reordering in collection sidebar

### 2.3 Feature Count

| Category | Alpha | Beta 1 additions | Beta 1 total |
|----------|-------|------------------|--------------|
| Core engine features | ~12 | ~5 | ~17 |
| Web UI features | ~10 | ~6 | ~16 |
| Protocols | 1 (REST) | +1 (GraphQL Basic) | 2 |
| Import/export | 4 | 1 (OpenAPI) | 5 |
| **Total** | **~27** | **~13** | **~40** |

Beta 1 adds ~13 features on top of Alpha's ~27, ending at ~40 total. That's roughly half of the size of the original combined Beta plan.

---

## 3. Vertical Slice Execution Plan

Continue the slice pattern from Alpha. Each slice ends with the app being more useful than before. Slices are numbered B1.1 through B1.5.

### Slice B1.1 — Timing waterfall (week 1)

**Why first:** the waterfall is the visible proof of invoke's timing positioning. Alpha shipped numeric timing only ("210ms total, DNS 12, TCP 18..."). The waterfall makes that data legible at a glance. It's also a tightly-scoped slice with no protocol or storage changes — a good warm-up for the larger slices to follow.

**Build:**
- Vue UI: D3-based horizontal stacked bar component. Segments for DNS, TCP, TLS, TTFB, transfer. Width proportional to duration. Hover shows tooltip with millisecond breakdown. Color tokens consistent with the existing dark/light theme.
- Vue UI: Replaces the numeric-only timing block in the response viewer. Numeric breakdown stays underneath the bar for precision.
- Edge cases: HTTP (no TLS segment), redirected requests (one bar per hop, stacked vertically with hop labels), failed requests (whatever segments completed before the failure)

**Skip for now:** Animation. Click-to-zoom. Comparing two waterfalls side-by-side (that's Beta 2's diff territory).

**Acceptance:** Send any HTTPS request from Alpha — waterfall renders with five segments, total width matches total duration. Hovering each segment shows the millisecond breakdown. Send an HTTP request — same five-segment layout but TLS segment is zero-width and labeled as such. Send a request that 301-redirects through two hops — see two stacked bars labeled with their respective URLs. Switch theme — colors update correctly.

### Slice B1.2 — Nested folders + variable scope expansion (week 2)

**Why next:** Folders are a structural change to the storage model. Doing them before code export and GraphQL means later slices can save into nested folders without retrofitting. Pairing with variable scope expansion is natural because folder-level variables only make sense once folders exist.

**Build:**
- Core engine: extend `Collection` model — recursive `folders` array with `parentFolderId`, requests have optional `folderId`
- Core engine: variable scope chain expansion — environment → collection → folder → request. Resolution walks up the chain, deepest scope wins for conflicting names.
- IndexedDB schema migration: add `folders` table, add `folderId` to existing requests (nullable, defaulting to none for Alpha-era data)
- Vue UI: collection sidebar nested folder rendering with expand/collapse. Persist expand state in IndexedDB per workspace.
- Vue UI: right-click context menu on sidebar items (new folder, new request, rename, delete, duplicate)
- Vue UI: collection-level and folder-level variable editors (modal panels mirroring the environment editor pattern)

**Skip for now:** Drag-and-drop reordering — that's v1. Cross-folder moves work via context menu only in Beta 1.

**Acceptance:** Open Alpha-era data after upgrading — existing collections render with no nested folders, no data loss. Create a new collection with three nested folders (`auth/oauth/refresh`), add a `refresh_token` variable to the deepest folder. Save a request inside the deepest folder using `{{refresh_token}}` — sending resolves the variable from the folder scope. Move the request up one folder level via right-click — sending still works because lookup walks up the chain. Reload browser — folder structure, expand state, and variables all persist.

### Slice B1.3 — GraphQL Basic + OpenAPI import (week 3–4)

**Why grouped:** GraphQL is the headline new protocol. OpenAPI import is the migration story. Both rely on similar mechanics (parsing a spec/schema, generating requests) and ship best together since they're often complementary in real workflows.

**Build:**
- Core engine: GraphQL request type (`{ query, variables, operationName, headers }`), serialization to HTTP POST body with `Content-Type: application/json`
- Core engine: OpenAPI 3.0 importer using `@apidevtools/swagger-parser` — walk paths × operations, generate one REST request per operation, map path/query/header parameters to placeholder variables, map `servers[]` to environments with `base_url`, organize requests by `tags[]` into folders
- Vue UI: protocol switcher in the URL bar area (REST / GraphQL toggle) — switching changes the request builder layout
- Vue UI: GraphQL request builder — query editor with `codemirror-graphql` for syntax highlighting (no autocomplete in Beta 1), variables panel as a JSON editor below the query, headers tab shared with REST. "Send" button works the same way.
- Vue UI: Save GraphQL request to a collection — same flow as REST, but stored with `protocol: 'graphql'`
- Vue UI: Import dialog upgrade — dropdown for format, supports OpenAPI 3.0 in addition to existing Postman/cURL/YAML zip. Preview pane showing what will be imported (N requests in M folders).

**Skip for now:** Schema introspection. Schema explorer panel. Autocomplete. GraphQL subscriptions (need WebSocket). All Beta 2 or v1.

**Known limitation:** OpenAPI external `$ref` targets, including remote URLs, are not supported in the browser importer. Browser CORS makes remote dereferencing hard to support cleanly without a server-side fetch step, so this is deferred to v1.

**Acceptance:** Switch the protocol toggle to GraphQL. Point the endpoint at `https://countries.trevorblades.com/`. Type `query { country(code: "ID") { name capital } }` in the query editor with syntax highlighting. Add `{}` to the variables panel. Press Send — response shows the JSON result with the timing waterfall from Slice B1.1. Save the query to a collection. Reload browser — saved query restores correctly with its variables. For OpenAPI: import the Petstore spec — collection appears with one folder per tag (`pet`, `store`, `user`), each containing requests for the operations in that tag, with path parameters as `{{petId}}` placeholders. Pick one imported request, fill in the placeholder, send — get a real response from the Petstore.

### Slice B1.4 — Code export + history search (week 5)

**Why grouped:** Both are independent core engine modules with simple UI surfaces. Bundling keeps the slice cycle to a manageable size while shipping two daily-use wins.

**Build:**
- Core engine: code generators for cURL, JavaScript `fetch`, Python `requests`, Node `axios`. Each takes `RequestConfig` (post-variable-resolution) and returns formatted source. Use `prettier` for JS/TS formatting.
- Core engine: naive history search — accepts query string, runs case-insensitive substring match across URL, request name, request body, response body, headers for the most recent N entries. No inverted index. Returns matches ranked by recency.
- Vue UI: Code export panel in the response viewer — dropdown for target, CodeMirror read-only block, "copy to clipboard" button, "save as file" button (downloads `.sh` for curl, `.py` for python, `.js` for fetch/axios)
- Vue UI: History search input at the top of the history panel — debounced 200ms, results re-rank as the user types. Click any history entry to load it into the request builder.

**Skip for now:** Customizable codegen options (async/await vs callbacks, variable substitution toggle). Inverted index for history search. The other 10 codegen targets — those are v1.

**Acceptance:** Open any saved REST request, switch to code export, pick cURL — see a working `curl` command with all headers and body inline. Copy, paste into a terminal, get the same response. Switch to Python — see a working `requests.post(...)` snippet that runs as-is when piped into `python`. Switch to fetch and axios — both produce valid, prettier-formatted JS. In history panel, type a partial URL like "users" — see all entries whose URL or body contained "users", ranked newest first. Type a body field value like "test@example.com" — see history entries that had that string anywhere. Profile against a 5,000-entry history — search results return in under 300ms.

### Slice B1.5 — Command palette + polish + ship (week 6)

**Why last:** The command palette ties together everything from Alpha plus Beta 1 — it indexes all the new resources (folders, GraphQL requests, history search). Doing it last means it's a thin layer over completed surfaces rather than racing ahead of them.

**Build:**
- Vue UI: command palette overlay (`Ctrl+K` / `Cmd+K`) — fuzzy search via `fuse.js`. Indexes:
  - All collections, folders, and requests
  - All environments
  - Recent 100 history entries (URL + method)
  - Named commands: "Toggle theme", "Open settings", "New request", "New collection", "New folder", "Import...", "Export collection..."
- Vue UI: keyboard navigation in palette (arrow keys, Enter to select, Escape to close)
- Vue UI: Help overlay (`Ctrl+/` or `?`) showing all keyboard shortcuts including the new ones
- README updates: Beta 1 feature highlights, screenshots of GraphQL editor, waterfall, command palette, OpenAPI import flow
- E2E test pass: extend Alpha's Playwright suite to cover Slices B1.1–B1.4 happy paths
- Performance pass: profile UI under a 10k-entry history with naive search. Acceptable: under 300ms response. If lag exceeds that, file a Beta 2 task to swap in `flexsearch` rather than fixing in Beta 1.
- Dark mode pass: every new Beta 1 surface gets dark-mode parity
- Tag `v0.2.0-beta.1` and publish three-container Docker images to ghcr.io
- Append Alpha → Beta 1 entry to `CHANGELOG.md`

**Acceptance:** Press `Ctrl+K` from anywhere in the app — palette opens. Type "ref" — fuzzy match shows the request, the folder, history entries with "ref" in the URL, and any named command containing "ref". Arrow down to a request, press Enter — request loads in the builder. Type "theme" — "Toggle theme" command appears. Enter — theme flips. A new user runs `docker compose pull && docker compose up` and gets all Beta 1 features without losing IndexedDB data from Alpha. README screenshots match the actual UI. All E2E tests pass on CI for Linux + Chromium.

---

## 4. Timeline

| Slice | Goal | Estimated Effort (side-project hours) |
|-------|------|---------------------------------------|
| B1.1 — Timing waterfall | D3 stacked bar with hover details | 12–18 hours |
| B1.2 — Nested folders + scopes | Storage migration + scope chain + sidebar | 20–30 hours |
| B1.3 — GraphQL Basic + OpenAPI import | New protocol + migration path | 30–45 hours |
| B1.4 — Code export + history search | 4 codegen targets + naive search | 18–25 hours |
| B1.5 — Command palette + polish + ship | Cross-cutting palette + release polish | 15–25 hours |
| **Total** | | **95–143 hours** |

At 8 hours/week, that's 12–18 weeks (3–4.5 months). Cumulative Alpha + Beta 1 is roughly 200–313 hours, or 6–10 months of side-project work.

This is meaningfully smaller than the original Beta estimate (140–210 hours). Beta 2 will be similar in size, taking the cumulative Alpha + Beta 1 + Beta 2 to roughly the same total work as the original combined Beta — but with two release points instead of one, which is the entire point.

---

## 5. Acceptance Criteria Pattern

Same as Alpha. Every task has a concrete observable outcome a different person could verify. Don't write "GraphQL working" — write "send `query { country(code: \"ID\") { name } }` to the Countries API, response renders with the timing waterfall."

---

## 6. After Beta 1

Beta 1 → Beta 2 adds the validation and comparison layer. See `beta-2-mvp.md` for the full plan. In summary:

- Assertions engine (status, body JSONPath, header, response time, regex, schema)
- Response diff viewer (side-by-side, structural diff via `microdiff`)
- GraphQL Advanced (introspection, schema explorer, click-to-insert, autocomplete)
- Insomnia v4 import, Hoppscotch import
- Response streaming (`ExecuteStream` RPC, SSE coverage for LLM endpoints and similar)
- Variable extraction from response (JSONPath chaining within a session)
- All-in-one Docker container (stretch goal)

Beta 2 → v1 is the public release with the remaining differentiators: WebSocket, gRPC, visual flow builder, mock server, scripting, the rest of codegen, advanced auth, mTLS, SOCKS5 proxy, drag-and-drop, and the public hosted deployment with the threat model in place.

The roadmap from v1 onward (v2 accounts, v3 teams, v4 desktop, v5 collaboration, v6 CLI) is unchanged from the PRD.

---

## 7. Notes for the Implementer

1. **The waterfall ships first for a strategic reason, not a technical one.** It's the most visible proof of the timing claim that differentiates invoke from browser-tab Postman. Even if the rest of Beta 1 slips, having the waterfall live is a screenshot that justifies the project.

2. **GraphQL Basic is enough for now.** Schema explorer, autocomplete, introspection, and click-to-insert are real productivity wins, but each is its own engineering project. Shipping GraphQL Basic first means GraphQL users can use invoke; shipping GraphQL Advanced in Beta 2 means they can use it well. Both states are useful.

3. **Naive history search is the correct first implementation.** A `String.prototype.includes()` scan over recent N entries handles realistic history sizes (under 10k) at acceptable latency. Building an inverted index in Beta 1 is premature optimization. Profile first, optimize only if measurements demand it.

4. **OpenAPI before Insomnia/Hoppscotch is a deliberate ordering choice.** OpenAPI is a standard with lasting strategic value. Insomnia and Hoppscotch importers are competitor escape hatches. The standard wins on long-term ROI even if competitor migrations have shorter payback for individual users — those land in Beta 2.

5. **All-in-one Docker is Beta 2, not Beta 1.** Three containers via Docker Compose is acceptable for a technical beta release. Bundling them into one image is real value for self-hosters but adds release complexity (supervisord or entrypoint scripting, healthchecks, single-process logging) that doesn't earn its place in this milestone.

6. **Reference `prd.md` for type definitions and contracts.** This document tells you what to build and in what order; the PRD tells you exactly how each feature should behave at the interface level (TypeScript types, gRPC proto, YAML schema).
