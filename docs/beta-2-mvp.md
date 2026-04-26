# invoke — Beta 2 MVP

**Purpose:** The third milestone after Alpha. Adds the validation/comparison layer (assertions, response diff, GraphQL schema introspection) and finishes migration coverage and streaming support.
**Audience:** The implementer (you), and anyone reviewing whether the scope is honest.
**Relationship to other docs:**
- `prd.md` — the full product specification (v1 destination)
- `mvp-features.md` — the full v1 feature catalog
- `execution-detail.md` — task-level breakdown for the full v1 build
- `alpha-mvp.md` — the first ship (REST-only)
- `beta-1-mvp.md` — the second ship (daily-use upgrade)
- `beta-2-mvp.md` (this file) — the third ship (testing and comparison upgrade)
- `v1` — public release with hosting, WebSocket, gRPC, flow builder, mock server, scripting (no doc yet)

---

## 1. Why Beta 2 (and what it isn't)

Beta 1 closed the daily-use gaps: GraphQL Basic, timing waterfall, code export, OpenAPI import, nested folders, command palette, naive history search. After Beta 1, a Postman user can switch over for a week and not feel handicapped on the things they do daily.

Beta 2 adds what daily users start asking for once they've been using invoke for a few weeks:

- **"How do I check my response is correct?"** — Assertions
- **"Did anything change between staging and prod?"** — Response diff
- **"Why doesn't autocomplete work in the GraphQL editor?"** — GraphQL schema introspection + explorer
- **"Why can't I import my Insomnia collection?"** — Insomnia + Hoppscotch importers
- **"Why does my SSE/streaming endpoint hang?"** — `ExecuteStream` RPC for streaming responses
- **"Can I extract this token from the login response and reuse it in the next request?"** — Variable extraction (the missing piece between Alpha's variables and v1's full flow runner)
- **"Can I run this in one container instead of three?"** — All-in-one Docker (stretch goal)

Beta 2 is **not** the full v1. It does not add WebSocket, gRPC, visual flow builder, mock server, scripting, the remaining codegen targets, advanced auth (OAuth/Digest/AWS Sig V4/NTLM), mTLS, SOCKS5, drag-and-drop, or public hosted deployment. Those are v1.

The competitive thesis is unchanged from Alpha and Beta 1:

> **Open the browser, send requests fast, keep data local, export to Git-friendly files.**

Beta 2 stays self-hosted only. Public hosting waits for v1.

---

## 2. Beta 2 Scope

### 2.1 What's IN Beta 2 (additions on top of Beta 1)

**Protocols**
- GraphQL Advanced: schema introspection (`__schema` query), schema explorer sidebar, query autocomplete via `codemirror-graphql` once a schema is loaded, click-to-insert from the explorer

**Core engine (browser)**
- Assertion engine: types — status, responseTime, header, bodyJsonPath, bodySchema (Ajv), regex. Each assertion has a matcher (`equals`, `notEquals`, `exists`, `gt`, `lt`, `contains`, `matches`) and an expected value. Per-request assertion list runs after every send. Assertion results are part of `HistoryEntry`.
- Diff engine: structural diff between two `ResponseResult` objects using `microdiff`. Targets: same request across two environments, same request before/after a code change, two arbitrary history entries.
- Variable extraction from response: JSONPath-based extraction rules attached to a request. Extracted values populate a session-scoped variable bag that subsequent requests can reference. This is the bridge from Alpha's static variables to v1's full flow runner — useful immediately for "log in, then call protected endpoint" workflows without needing the visual flow builder.

**Storage (IndexedDB)**
- Persist assertion results in `HistoryEntry` so old runs can be reviewed
- Schema cache: introspected GraphQL schemas keyed by endpoint URL, refreshable on demand
- Session variable bag (in-memory, not persisted) for variable extraction within a tab session

**Web UI**
- Assertions tab in the request builder: list of assertions with type/expression/matcher/expected fields, "+ add assertion" button, per-row delete
- Assertion results in the response viewer: pass/fail badge per assertion with actual vs expected when failed. Summary badge at the top of the response (e.g. "3/4 assertions passed").
- Diff viewer modal: pick two history entries (or two environments for the same request), render side-by-side JSON trees with diff highlighting, summary at the top showing N additions / M deletions / K changes
- GraphQL schema explorer: collapsible tree of types, queries, mutations. Click a field to insert into the query at the cursor.
- GraphQL autocomplete: enabled in `codemirror-graphql` once the schema is loaded; suggests fields, arguments, directives based on cursor position.
- "Introspect schema" button in GraphQL UI; cached in IndexedDB per endpoint with manual refresh
- Streaming response indicator in the response viewer: live byte counter + "streaming..." label while chunks arrive, finalized status at the end. Particularly important for SSE endpoints.
- Extraction rules tab next to assertions in the request builder: list of extraction rules (variable name, source = body/header/status, expression, fallback)

**Import/Export**
- Insomnia v4 import: read Insomnia's JSON export structure (`_type: "request"`, `_type: "request_group"`), map to invoke's request and folder models
- Hoppscotch import: read Hoppscotch's JSON collection structure

**Infrastructure**
- All-in-one Docker container (`Dockerfile.aio`) bundling UI static files + Node server + Go executor in one image with a small entrypoint script. **Stretch goal** — does not gate the Beta 2 release.
- Updated `docker-compose.yml` documenting both three-container and single-container deployment options if the all-in-one ships

**Go executor**
- New RPC: `ExecuteStream` — streams response body chunks from Go executor to Node server as gRPC server-streaming. Node server forwards as Server-Sent Events to the browser. Enables proper handling of LLM streaming endpoints, SSE feeds, and large responses without buffering everything in Node memory.

**Server (Node.js)**
- New route: `POST /api/execute/stream` — calls Go's `ExecuteStream` and forwards chunks as SSE to the browser.

### 2.2 What's OUT of Beta 2 (deferred to v1)

**Deferred to v1:**
- Public hosted deployment (`invoke.dev`) with rate limits, SSRF protection, abuse monitoring
- WebSocket protocol (client + UI)
- gRPC protocol (reflection + execution + UI)
- Visual flow builder (drag-and-drop request chaining with conditional branching)
- Mock server (browser-defined → Node-hosted endpoints with state)
- Scripting (pre-request, post-response, Web Worker sandbox with bundled lodash/uuid)
- Codegen for the remaining 10+ targets (Go, Java/OkHttp, Ruby, PHP, C#, Swift, Kotlin, Rust, PowerShell, HTTPie)
- mTLS / client certificate manager UI
- Cookie jar UI
- Advanced auth: OAuth 2.0 (auth code, client credentials, password, implicit), Digest, AWS Sig V4, NTLM
- SOCKS5 proxy support
- Drag-and-drop reordering in collection sidebar
- All v2+ features (accounts, PostgreSQL, teams, desktop, collaboration, CLI) — unchanged from PRD roadmap

### 2.3 Feature Count

| Category | Beta 1 total | Beta 2 additions | Beta 2 total |
|----------|--------------|------------------|--------------|
| Core engine features | ~17 | ~5 | ~22 |
| Web UI features | ~16 | ~6 | ~22 |
| Protocols | 2 | +0 (GraphQL upgraded, no new) | 2 |
| Import/export | 5 | +2 (Insomnia, Hoppscotch) | 7 |
| Infrastructure | 1 (three-container) | +1 (all-in-one stretch) | 2 |
| **Total** | **~40** | **~14** | **~54** |

Beta 2 ends at ~54 features. That's roughly 38% of the original v1 vision (~142 features), with v1 itself bringing the rest.

---

## 3. Vertical Slice Execution Plan

Continue the slice pattern. Slices are numbered B2.1 through B2.5.

### Slice B2.1 — Assertions (week 1–2)

**Why first:** Assertions are the highest-impact daily-use feature among Beta 2 additions. "Did this response match what I expected?" is asked on every test run. Shipping assertions first means even if Beta 2 stalls, the most-asked-for feature is live.

**Build:**
- Core engine: `Assertion` type (id, type, expression, matcher, expected, enabled). `AssertionResult` type (assertionId, passed, actual, expected, message). `AssertionEngine.run(response, assertions): AssertionResult[]`.
- Core engine: matchers — equals, notEquals, exists, gt, lt, contains, matches (regex). Type-specific evaluation: status compares numeric, header looks up by name, bodyJsonPath uses `jsonpath-plus`, bodySchema validates against Ajv schema, responseTime compares against `durationMs`, regex matches body string.
- Storage: extend `HistoryEntry` to include `assertions: AssertionResult[]`
- Vue UI: Assertions tab in request builder — table with rows for each assertion, type dropdown, expression input, matcher dropdown, expected value input, enabled checkbox, delete button per row
- Vue UI: Assertion results panel in response viewer — pass/fail badges, summary count at the top ("3/4 passed"), expandable rows showing actual vs expected for failures
- Vue UI: Assertion results in the history panel — small pass/fail summary badge per entry

**Skip for now:** Custom matcher functions (need scripting, which is v1). Collection-level shared assertions (run on every request in the collection) — can wait for v1.

**Acceptance:** On a saved request, add three assertions: `status equals 200`, `body $.users[0].id exists`, `responseTime lt 500`. Send to a working endpoint — all three show green with "3/3 passed" at the top of the response panel. Send to a 404 endpoint — first assertion shows red with "expected 200, got 404", overall summary "0/3 passed". Add a regex assertion — `body matches /^\\{/` — passes for JSON responses, fails for plain text. Add a body schema assertion using a small Ajv schema — passes for matching shapes, fails with a useful error path on mismatch. History panel shows the pass/fail summary for each historical run.

### Slice B2.2 — Response diff viewer (week 3)

**Why second:** Diff is the most visually impressive Beta 2 feature and pairs naturally with assertions ("the assertion failed — let me see what changed"). Building it after assertions means assertion-failure entries in history can be diffed against earlier passing runs.

**Build:**
- Core engine: `DiffEngine.compare(a: ResponseResult, b: ResponseResult): DiffResult` using `microdiff`. `DiffResult` includes the structured patch and a summary of additions/removals/changes counts.
- Vue UI: "Diff" entry point in two places —
  1. From history panel: select any two entries, click "Compare"
  2. From environment switcher: "Compare across environments" → run the same saved request against two environments and diff the responses
- Vue UI: side-by-side JSON tree view with diff highlighting (green for added, red for removed, yellow for changed). Synchronized scrolling between the two panes.
- Vue UI: summary header showing N additions / M deletions / K changes, and total response time delta

**Skip for now:** Diffing of binary or non-JSON responses (text fallback for now). Three-way diff. Saved diff configurations.

**Acceptance:** Run the same `GET /users` request against two environments (local and staging) — both responses go to history. Open diff viewer, select both entries — side-by-side JSON trees render with one identical block at the top, then divergence in `users[0].email` highlighted yellow with both old and new values shown. Summary reads "0 additions, 0 deletions, 1 change". Diff a 200 response with a 500 response — additions and deletions show appropriately, summary reflects the structural difference. Diff non-JSON responses (e.g. plain text) — falls back to a unified text diff (using the `diff` library already in the dependencies).

### Slice B2.3 — GraphQL Advanced + variable extraction (week 4–5)

**Why grouped:** Both upgrade existing surfaces from Beta 1 (GraphQL editor and the variable system) without adding new top-level features. Doing them together means one slice covers the "make existing things smarter" theme.

**Build:**
- Core engine: GraphQL introspection request (`__schema { queryType { ... } types { ... } }`) and response parser. Cache schemas in IndexedDB keyed by endpoint URL with a `lastFetched` timestamp.
- Core engine: extraction engine — `ExtractionRule` type (variableName, source = body/header/status, expression, fallback). `extractVariables(response, rules): Record<string, unknown>`. Extracted values go to a session-scoped variable bag accessible by `{{varName}}` in subsequent requests.
- Vue UI: "Introspect schema" button in GraphQL UI — fetches schema, populates the schema explorer sidebar, enables autocomplete in the query editor
- Vue UI: schema explorer sidebar — collapsible tree of `Query`, `Mutation`, types. Click a field to insert into the query at the cursor with proper field syntax.
- Vue UI: GraphQL autocomplete via `codemirror-graphql` activates once a schema is loaded for the current endpoint
- Vue UI: extraction rules tab in request builder (next to Assertions) — list of rules, "+ add rule" button. Same UX pattern as assertions.
- Vue UI: indicator in the URL bar / variable preview showing which active variables came from extraction vs environment vs collection vs folder

**Skip for now:** Schema diff (compare schemas across environments). GraphQL fragment management. Saved query persistence at the schema level.

**Acceptance:** Open a GraphQL request from Beta 1, click "Introspect schema" against `https://countries.trevorblades.com/` — schema explorer populates with `Country`, `Continent`, `Language` types. Click `Country.name` in the explorer — `name` is inserted into the query at the cursor. Type `query { country(code: "ID") { ` — autocomplete suggests `name`, `capital`, `continent`, etc. For extraction: save a `POST /auth/login` request, add an extraction rule (`variableName: token`, `source: body`, `expression: $.data.accessToken`). Send the request. Open a second request `GET /me` with header `Authorization: Bearer {{token}}`. Send — the bearer token resolves from the extracted variable. Open a third tab in the same browser session — `{{token}}` is still resolved (session bag). Reload the browser — `{{token}}` is no longer set (session bag intentionally not persisted; that's flow runner territory in v1).

### Slice B2.4 — Streaming + remaining importers (week 6)

**Why grouped:** Both are smaller, independent additions. Bundling keeps the slice cycle reasonable while shipping two finishing features.

**Build:**
- Go executor: `ExecuteStream` RPC — server-streaming response chunks. Sends `ResponseChunk` messages with body bytes, then a `final_response` message with full timing. Handles SSE (`text/event-stream`) by flushing on each event boundary.
- Node server: `POST /api/execute/stream` — calls `ExecuteStream`, forwards chunks as Server-Sent Events to the browser. SSE is the right transport because it's already a streaming format and works through HTTP.
- Vue UI: response viewer streaming mode — when a streaming response is detected (or requested via a "Stream" toggle in the request builder), shows a live-updating body panel with byte counter, "streaming..." label, and elapsed time. Final state shows total bytes, final timing waterfall.
- Core engine: Insomnia v4 importer — read Insomnia's JSON export structure, map `_type: "request_group"` to folders, `_type: "request"` to requests. Handle Insomnia's environment format and convert to invoke's environment model.
- Core engine: Hoppscotch importer — read Hoppscotch's JSON collection structure, map to invoke's collection/folder/request model.
- Vue UI: Import dialog supports Insomnia and Hoppscotch in addition to Beta 1's OpenAPI/Postman/cURL/YAML zip

**Skip for now:** Bidirectional streaming (request body streaming) — that's v1 territory near WebSocket. Resumable downloads. Insomnia's plugin format.

**Acceptance:** Send a request to an SSE endpoint (e.g. `https://stream.wikimedia.org/v2/stream/recentchange`) — response viewer shows live-updating body with byte counter incrementing, "streaming..." indicator. Press a "Stop" button — stream terminates cleanly, final timing shows. For LLM-style streaming (e.g. an OpenAI-compatible chat completions endpoint with `stream: true`), individual SSE events render as they arrive. Import a real Insomnia v4 export — folder structure preserved, environments converted, sample request sends correctly. Import a real Hoppscotch export — same.

### Slice B2.5 — All-in-one Docker (stretch) + polish + ship (week 7)

**Why last:** All-in-one Docker is the lowest-risk feature of Beta 2 (no logic changes, just packaging) but adds release complexity. Doing it last means it can be cut without impacting the product if the slice runs long.

**Build:**
- *Stretch goal:* `Dockerfile.aio` bundling UI static files + Node server + Go executor in one image. Use a small entrypoint script (or `s6-overlay` if supervisord feels heavy) to start Node and Go together, with healthchecks for each.
- *Stretch goal:* Updated `docker-compose.yml` and README documenting both three-container and one-container deployment paths
- README updates: Beta 2 feature highlights, screenshots of assertions panel, diff viewer, GraphQL schema explorer, streaming response, extraction rules
- E2E test pass: extend the Beta 1 Playwright suite to cover Slices B2.1–B2.4 happy paths
- Performance pass: profile the diff viewer on a 100KB JSON response — should render in under 500ms. If lag exceeds that, add virtualization to the JSON tree component.
- Dark mode pass: every new Beta 2 surface gets dark-mode parity
- Tag `v0.2.0-beta.2` and publish three-container Docker images to ghcr.io. If all-in-one is ready, also publish that image.
- Append Beta 1 → Beta 2 entry to `CHANGELOG.md`

**Acceptance:** A user upgrading from Beta 1 runs `docker compose pull && docker compose up` and gets the new Beta 2 features without losing IndexedDB data. README screenshots match the actual UI. All E2E tests pass on CI for Linux + Chromium. *If the all-in-one stretch ships:* `docker run ghcr.io/brendatama/invoke:0.2.0-beta.2-aio` produces a working invoke at `localhost:8080` within 30 seconds in a single container.

---

## 4. Timeline

| Slice | Goal | Estimated Effort (side-project hours) |
|-------|------|---------------------------------------|
| B2.1 — Assertions | Engine + UI + history integration | 25–35 hours |
| B2.2 — Response diff viewer | microdiff + side-by-side UI | 20–28 hours |
| B2.3 — GraphQL Advanced + extraction | Introspection + explorer + autocomplete + extraction rules | 30–40 hours |
| B2.4 — Streaming + Insomnia/Hoppscotch import | ExecuteStream RPC + SSE forwarding + 2 importers | 20–30 hours |
| B2.5 — Docker AIO (stretch) + polish + ship | Bundled image (optional) + README + tests + tag | 15–25 hours |
| **Total** | | **110–158 hours** |

At 8 hours/week, that's 14–20 weeks (3.5–5 months). Cumulative Alpha + Beta 1 + Beta 2 is roughly 310–471 hours, or 9–14 months of side-project work.

That's a real commitment. The mitigation continues to be the slice structure: at the end of any slice you have a usable, shippable product. If life intervenes during B2.3 you can release an interim "Beta 1 + assertions + diff" build (`v0.2.0-beta.2-rc1` or similar) and resume B2.3 later.

---

## 5. Acceptance Criteria Pattern

Same as Alpha and Beta 1. Every task has a concrete observable outcome a different person could verify. Don't write "diff working" — write "diff a 200 vs 500 response of the same request: green additions for new fields, red removals for missing fields, yellow for changed values; summary header reads N/M/K."

---

## 6. After Beta 2

Beta 2 → v1 brings invoke to public release with the remaining differentiators:

- **WebSocket protocol** — full client with frame send/receive, ping/pong, connection registry
- **gRPC protocol** — reflection-based service discovery, unary call execution, TLS modes
- **Visual flow builder** — drag-and-drop canvas for chaining requests with conditionals and variable extraction (Beta 2's extraction engine becomes the foundation; v1 adds the visual layer on top)
- **Mock server** — browser-configured, Node-hosted endpoints with response stubs and dynamic templating
- **Scripting** — pre-request and post-response JavaScript in a Web Worker sandbox with bundled lodash/uuid
- **The remaining 10 codegen targets** — Go, Java, Ruby, PHP, C#, Swift, Kotlin, Rust, PowerShell, HTTPie
- **Advanced auth** — OAuth 2.0 flows, Digest, AWS Sig V4, NTLM
- **mTLS / client certificate manager**
- **Cookie jar UI**
- **SOCKS5 proxy support**
- **Drag-and-drop reordering** in the collection sidebar
- **Public hosted deployment (`invoke.dev`)** — preceded by `security-threat-model.md` with explicit threat model, SSRF protection, request size/timeout limits, per-IP rate limits, abuse monitoring playbook, terms of use

The roadmap from v1 onward (v2 accounts, v3 teams, v4 desktop, v5 collaboration, v6 CLI) is unchanged from the PRD.

---

## 7. Notes for the Implementer

1. **Assertions ship before diff for a reason.** Assertions are higher-frequency (run on every send), diff is occasional (run when investigating a discrepancy). Higher-frequency features pay back faster per hour invested.

2. **Variable extraction is the bridge to v1's flow runner.** Don't try to build the visual flow builder in Beta 2. Extraction with a session variable bag handles the most common chaining case ("log in, then call protected endpoint") without UI complexity. The visual flow builder in v1 layers on top of this — it doesn't replace it.

3. **GraphQL Advanced is bigger than it looks.** Introspection, schema caching, schema explorer UI, click-to-insert, and autocomplete are five separate sub-features. Plan B2.3 with that in mind. If it overruns, ship introspection + schema explorer first; autocomplete can be a follow-up patch.

4. **All-in-one Docker is a stretch goal.** Three-container Docker Compose works fine. The all-in-one image is real value for self-hosters but adds complexity (process supervision, healthchecks, log streaming) that doesn't earn its place if the slice timeline is tight. Cut it before cutting any other Beta 2 feature.

5. **Streaming is product-driven, not performance-driven.** The reason to ship `ExecuteStream` in Beta 2 isn't memory efficiency — it's that LLM endpoints and SSE feeds are increasingly common in 2026, and not handling them at all is a bigger user-visible bug than a slow large response. Frame it as protocol coverage, not optimization.

6. **The naive history search from Beta 1 either works or it doesn't.** If during Beta 2 you start seeing real lag on history search, file a single Beta 2 task to swap in `flexsearch` rather than building a full inverted index from scratch. If it's still fast enough at the end of Beta 2, leave it alone until v1.

7. **Reference `prd.md` for type definitions and contracts.** This document tells you what to build and in what order; the PRD tells you exactly how each feature should behave at the interface level (TypeScript types, gRPC proto, YAML schema).
