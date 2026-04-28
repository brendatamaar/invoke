# Changelog

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
