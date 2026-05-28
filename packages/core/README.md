# @invoke/core

The invoke data-plane library. It owns request modeling, the runner and
flow engine, variable resolution, assertions, scripting, codegen,
import/export, and the Dexie-backed workspace store. Used by the desktop
app, the web app, and `@invoke/server` handlers.

The package is bundled with `tsup` to ESM + CJS with `.d.ts`. In Bun the
`exports` map resolves to `src/index.ts` directly so consumers in this
repo skip the build step during development.

## Build

```bash
pnpm --filter @invoke/core build
pnpm --filter @invoke/core dev
pnpm --filter @invoke/core test
pnpm --filter @invoke/core lint
```

## Modules

Everything is re-exported from `src/index.ts`.

| Module                | Purpose                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `assertions`          | Matcher-based response assertions used by the runner and flow steps                                    |
| `codegen`             | Request → snippet generators per protocol and language                                                 |
| `cookies`             | RFC 6265 cookie parsing, jar logic, redaction helpers                                                  |
| `flow`                | `FlowRunner` — Effect-based flow engine with cancellation via `Fiber.interrupt`                        |
| `graphql`             | GraphQL schema introspection and operation parsing                                                     |
| `history`             | History entry shaping and retention                                                                    |
| `import-export`       | Curl, grpcurl, HAR, Hoppscotch, Insomnia, Postman, OpenAPI, and invoke YAML/ZIP                        |
| `lib/crypto`          | WebCrypto wrappers — `encryptJson` / `decryptJson` for at-rest secret encryption                       |
| `lib/diff`            | Response diffing with ignore rules                                                                     |
| `lib/format`          | Pretty-printers for JSON, XML, GraphQL                                                                 |
| `lib/redact`          | Header and body redaction for sensitive values                                                         |
| `mock/validation`     | Mock fixture schema validation                                                                         |
| `request`             | `RequestConfig` construction, defaults merging, auth application                                       |
| `runner`              | `CollectionRunner` — batch execution with iteration, delay, and cancellation                           |
| `schema`              | Shared zod schemas                                                                                     |
| `scripting`           | Pre/post-request script sandbox and bindings                                                           |
| `storage`             | `InvokeDB` (Dexie) and `InvokeStore` — workspace persistence with encrypted secret columns             |
| `storage/services`    | Effect `Context.Tag` services (`CollectionStore`, `EnvironmentStore`, `HistoryStore`, `FlowStore`, …)  |
| `types`               | All shared TypeScript types — collections, flows, protocols, requests, responses, settings, workspace  |
| `variables`           | `{{var}}` template resolution, extraction rules, scope merging                                         |
| `workspace`           | Workspace import/export and storage stats                                                              |

## Storage

`InvokeDB` extends Dexie with eight tables: `collections`, `folders`,
`requests`, `environments`, `history`, `flows`, `meta`, `cookies`. The
database name is `invoke-alpha`. Schema upgrades are versioned in
`storage/db.ts`; migrations of stored shapes (e.g. network-option
defaults) live in `storage/migrations.ts`.

`InvokeStore` is the imperative facade most callers use. When a
`CryptoKey` is set it transparently encrypts and decrypts:

- auth secrets on saved requests (`encryptedAuth`)
- sensitive request metadata headers (`encryptedMetadata`)
- TLS client keys (`encryptedTlsKey`)
- environment variables flagged `sensitive` (`encryptedVariables`)

The key itself is verified against `crypto:verify` in the `meta` table.
Sensitive metadata is matched by `^(authorization|cookie|x-api-key|.*-token.*)$`.

`storage/services.ts` provides Effect `Context.Tag` interfaces for code
that prefers the Effect style — used by the server and flow runner.

## Effect Surface

Most runtime APIs are still imperative (Promises and classes), but newer
pieces return Effect:

- `FlowRunner` runs steps inside `Effect.runFork` and cancels via
  `Fiber.interrupt`.
- Tagged errors in `errors.ts` (`StorageError`, `NotFoundError`,
  `UndefinedVariableError`, `AssertionFailedError`, `StepTimeoutError`,
  `StepExecutionError`, `FlowCancelledError`, `ParseError`) are
  consumed by both flow execution and the storage service tags.

## Tests

```bash
pnpm --filter @invoke/core test
```

Vitest suites live in `test/`. `fake-indexeddb` backs the Dexie tests so
the storage layer runs without a browser. Coverage areas:

- `storage.test.ts` — workspace CRUD, encryption round-trips, migrations
- `request-resolution.test.ts` — variable templating and auth merging
- `response-processing.test.ts` — extraction, assertions, formatting
- `variables.test.ts` — scope merging and extraction rules
- `validation.test.ts` — schema validation paths
- `scripting-flows.test.ts` — script sandbox and flow execution
- `codegen-history.test.ts` — snippet generation and history shaping
- `openapi.test.ts`, `invoke-yaml.test.ts`, `third-party-imports.test.ts` — import/export round-trips
- `grpc.test.ts` — gRPC request modeling
