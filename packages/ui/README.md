# @invoke/ui

The invoke web client. A React 19 + Vite SPA that consumes `@invoke/core`
for domain logic and storage, talks to `@invoke/server` for protocol
execution, and renders the request/response workbench, collections,
flows, mocks, and settings.

## Run

```bash
pnpm --filter @invoke/ui dev
pnpm --filter @invoke/ui build
pnpm --filter @invoke/ui preview
pnpm --filter @invoke/ui test
```

The dev server listens on port `3000` and proxies `/api` and `/health`
to `http://localhost:4000` (the `@invoke/server` default). `build` runs
`tsc -b` then `vite build` into `dist/`.

In Vite, `@invoke/core` is aliased to `../core/src/index.ts` so changes
in the core package hot-reload without a rebuild. `@` is aliased to
`./src`.

## Stack

- React 19 with `<StrictMode>` and `createRoot`
- Zustand for global state (sliced store)
- TanStack Query for server-state caching (no window refocus, single retry)
- Dexie + `dexie-react-hooks` for IndexedDB reactivity
- CodeMirror 6 for all in-app editors (JSON, JS, Python, XML, plain text)
- Tailwind v4 via `@tailwindcss/vite` and `@tailwindcss/postcss`
- Lucide icons, MiniSearch for client-side full-text search
- `vite-plugin-node-polyfills` for `buffer`, `path`, `util` (needed by
  some `@invoke/core` parsers)

## Layout

```
src/
├── App.tsx, main.tsx          Root, providers, theme bootstrap
├── components/
│   ├── editors/CodeEditor.tsx CodeMirror wrapper used everywhere
│   ├── layout/                TopBar, Sidebar, resizable panes
│   ├── palette/               Command palette
│   └── shared/                Toasts and other reusable primitives
├── features/                  Feature folders (see below)
├── hooks/                     useDb, useResizablePane
├── lib/                       api, http, protocolDefaults — server client
├── search/                    MiniSearch-backed history search
├── store/                     Zustand store + per-feature slices
├── styles.css                 Tailwind entry
└── types/                     UI-only types (store shape, etc.)
```

## Feature Folders

Each folder under `src/features/` owns the UI, hooks, and selectors for
one slice of the product. They import domain types and helpers from
`@invoke/core` rather than reimplementing them.

| Folder         | Responsibility                                                        |
| -------------- | --------------------------------------------------------------------- |
| `bootstrap`    | App startup — `useAppBootstrap`, initial DB read, crypto unlock       |
| `codegen`      | Snippet panel — uses `@invoke/core` codegen                           |
| `collections`  | Tree, save/save-as, batch + collection runner modals                  |
| `cookies`      | Cookie manager modal                                                  |
| `diff`         | Response diff modal                                                   |
| `environments` | Active environment selector and persistence hook                      |
| `execute`      | HTTP execute panel client                                             |
| `execution`    | `useRequestExecution` — orchestrates send, history write, extraction  |
| `flows`        | Flow editor and run panel (drives `FlowRunner` from core)             |
| `graphql`      | GraphQL editor, schema panel                                          |
| `grpc`         | gRPC request and streaming UI                                         |
| `health`       | Server health indicator                                               |
| `help`         | Help modal                                                            |
| `history`      | History list, search, retention controls                              |
| `mock`         | Mock server routes UI                                                 |
| `oauth2`       | OAuth2 flows and token storage UI                                     |
| `proxy`        | Proxy panel and recording UI                                          |
| `request`      | Request builder — method, URL, params, headers, body, auth, scripts  |
| `response`     | Response viewer — body, headers, assertions, timing                   |
| `settings`     | Settings panel, passphrase modal, `useCrypto`                         |
| `variables`    | Variable editor modal and scope helpers                               |
| `webhook`      | Webhook receiver panel                                                |
| `websocket`    | WebSocket client UI                                                   |

## Store

`useStore` (`src/store/index.ts`) is a single Zustand store composed of
slice creators. Each slice owns one product area:

`cookieSlice`, `examplesSlice`, `flowSlice`, `historySlice`, `mockSlice`,
`protocolSlice`, `requestSlice`, `responseSlice`, `runnerSlice`,
`uiSlice`, `workspaceSlice`.

`coreStore` is a separate non-React store used by hooks and effects that
need to read snapshot state outside the React tree.

## Server Client

`src/lib/api.ts` re-exports per-feature client modules
(`features/<name>/api.ts`). Each module calls the typed
`@invoke/server` HttpApi via the shared `http.ts` fetch wrapper. Base
URL defaults to same-origin so the Vite proxy handles dev traffic.

## Theming

`main.tsx` reads `localStorage.theme` (`light`, `dark`, or `system`) and
sets `data-theme` on `<html>`. The `system` mode listens to
`prefers-color-scheme` changes. UI font size is also pulled from
`localStorage.uiFontSize` (default `13px`).

## Tests

```bash
pnpm --filter @invoke/ui test
```

Vitest suites live in `src/test/` and cover UI-side logic — cookie
helpers, flow-step utilities, mock route utilities, OAuth2 helpers,
response formatting. The script passes when no tests match
(`--passWithNoTests`). A benchmark for MiniSearch lives in
`src/benchmarks/minisearch.bench.ts`.
