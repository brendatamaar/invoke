# UAT Test Scenarios

Use the `Sample Data Usage` column for optional fixture guidance. Use the `Output Result` column to record the actual result during manual UAT.

## Sample Data Setup

Before running sample-backed scenarios:

1.  Start the local mock API with `node uat-data/mock-api.mjs`.
2.  Import `uat-data/invoke-uat-workspace.json` from `Settings > Backup > Import workspace`.
3.  Select `UAT Local Mock API` from the environment dropdown when running imported requests, collection runs, or flows.

## Application Startup and Navigation

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Open the app with the local UI and server running. |   | The app loads without a blank screen, shows the top bar, sidebar, request builder, and response panel. | Passed |
| Positive - Switch between sidebar sections: Collections, History, Environments, Flows, and Mock. | Import `uat-data/invoke-uat-workspace.json` so Collections, Environments, and Flows contain sample data. | Each sidebar section opens and renders its own panel without losing the current request draft. | Passed |
| Positive - Collapse and reopen the sidebar from the active sidebar icon. |   | Sidebar collapses to the icon rail and reopens to the last selected section. | Passed |
| Positive - Resize the request and response panes. |   | The divider changes pane height smoothly and both panes remain usable. | Passed |
| Negative - Refresh the browser while local data exists. | Import `uat-data/invoke-uat-workspace.json`, then refresh the browser. | Local collections, environments, cookies, history, flows, and settings remain available after reload. | Passed |
| Negative - Start the UI while the API server is unavailable, then attempt an API-backed action. |   | The UI stays usable and displays an error toast or failed request state instead of crashing. | Passed |

## Command Palette and Help

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Open the command palette from the top bar or `Ctrl+K`. | Import `uat-data/invoke-uat-workspace.json` first so sample requests, environments, and flows appear in results. | Command palette opens, focuses the search input, and shows commands or recent items. | Passed |
| Positive - Search for a saved request, environment, flow, history entry, or mock route. | After importing the workspace, search `GET Health Check`, `UAT Local Mock API`, or `UAT Happy Path Flow`. | Matching results are filtered and selecting one performs the expected navigation or load action. | Passed |
| Positive - Use keyboard navigation in the command palette. | Use any imported workspace result, such as `GET Health Check`, while testing arrow keys and Enter. | Arrow keys move selection, Enter runs the selected item, and Escape closes the palette. | Passed |
| Positive - Use command palette to create a new REST, GraphQL, WebSocket, or gRPC request. |   | Selected "New ..." command opens a blank request of the correct protocol in the builder. | Passed |
| Positive - Use command palette to navigate to Collections, History, Environments, Flows, or Mock. | Import `uat-data/invoke-uat-workspace.json` so each section has data to display. | "Go to ..." command switches the sidebar to the chosen section. | Passed |
| Positive - Toggle the sidebar from the command palette. |   | Sidebar collapses or expands without affecting the current request draft. | Not Passed, Sidebar not expanded from command palette |
| Positive - Send the active request via `Ctrl+Enter`. | Open `GET Health Check` with mock API running. | Request is sent and response panel updates as if Send was clicked. | Passed |
| Positive - Save the active request via `Ctrl+S`. | Open or modify any imported request. | Request is saved/updated in its collection without opening a dialog. | Not Passed, CTRL + S save the web page instead |
| Positive - Open Help from the top bar. |   | Help modal displays keyboard shortcuts and tips, and can be closed. | Passed |
| Negative - Search for a value that has no matches. |   | Palette shows a no-results state without errors. | Passed |
| Negative - Press Escape in a modal or palette. |   | The active overlay closes and the main workspace remains unchanged. | Passed |

## REST and HTTP Requests

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Send a valid GET request to a reachable HTTP endpoint. | Start `node uat-data/mock-api.mjs`, import the workspace, then run `GET Health Check`. | Request completes, response status, body, headers, size, and timing are displayed. | Passed |
| Positive - Change method to POST, PUT, PATCH, DELETE, HEAD, or OPTIONS and send a valid request. | Use `POST Create User` and `PATCH Echo JSON`; duplicate `PATCH Echo JSON` for other methods against `/echo`. | Selected method is used and response reflects the requested method where the test endpoint supports it. | Passed |
| Positive - Paste a valid cURL command into the URL input. | Paste the command from `uat-data/sample-curl.txt`. | Method, URL, headers, and body are parsed into the request builder. | Passed, but cannot copy whole curl command and instead must copy several part sequentially |
| Positive - Add query parameters in the Params tab. | Use `GET Users by Role`; edit the `role` param or `role` variable. | URL query string updates with enabled parameters and excludes disabled parameters. | Passed |
| Positive - Open the active variables popover from the URL bar. | Select `UAT Local Mock API`, then open the variables popover next to a URL containing `{{local_api_url}}`. | Popover lists each referenced variable with its resolved value and source scope (session, environment, collection, folder). | Passed |
| Positive - Add request headers using the Headers tab. | Use `GET Health Check` or `PATCH Echo JSON`, which include `X-UAT-Trace` headers. | Enabled headers are sent; disabled or empty-key rows are ignored. | Passed, but should check X-UAT-Trace headers is not shown in Headers response |
| Positive - Use stream mode for an endpoint that returns streaming or chunked data. | Run `GET Stream NDJSON` with Stream mode enabled. | Streaming indicator appears and incoming bytes/body content are shown incrementally. | Passed, but the send button disabled state and cancel button show state is not happening |
| Positive - Cancel a long-running request while it is sending. | Run `GET Delayed Response` or change URL to `{{local_api_url}}/delay/5000`, then click Cancel. | Request is aborted and loading state returns to idle. | Passed, but should check {{local\_api\_url}}/delay/5000 return Get "[http://127.0.0.1:4545/delay/5000](http://127.0.0.1:4545/delay/5000)": context deadline exceeded |
| Negative - Click Send with an empty URL. |   | Send button is disabled and no request is executed. | Passed |
| Negative - Send a request to an invalid host or unreachable URL. |   | Response panel shows a request failed state with the error message. | Passed, but should define error message |
| Negative - Send a request that returns a 4xx or 5xx status. | Run `NEGATIVE GET Not Found`; change URL to `{{local_api_url}}/status/500` for a 5xx case. | Response status badge shows the failure status while body and headers remain inspectable. | Passed |

## Request Body Editing

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Select JSON body mode, enter valid JSON, and click Format. | Use the JSON body from `POST Create User`. | JSON body is pretty-printed without changing its data. | Passed |
| Positive - Click Minify for valid JSON. | Use the JSON body from `POST Create User`. | JSON body is minified into a compact single-line payload. | Passed |
| Positive - Use raw body mode for plain text. | Use `PATCH Echo JSON`, switch Body to raw, and send to `/echo`. | Raw text is preserved and sent as entered. | Not passed, the response is shown but get warning: Unresolved variables: service\_name |
| Positive - Use form-data rows with keys and values. | Use any `/echo` request from the sample collection and switch Body to form-data. | Form-data rows are stored and sent from enabled rows. | Not passed, error: Uncaught TypeError: rows.map is not a function KeyValueEditor. The page also changed into blank white page. |
| Positive - Use URL-encoded rows with special characters. | Use any `/echo` request from the sample collection and switch Body to urlencoded. | Values are encoded correctly in the outgoing body. | Not passed, error: Uncaught TypeError: rows.map is not a function KeyValueEditor. The page also changed into blank white page. |
| Positive - Use file body mode and select a file. |   | Selected file is loaded into the request body and can be removed. | Not passed, the file is not loaded into request body |
| Negative - Click Format or Minify with invalid JSON. | Use `POST Create User`, temporarily break the JSON body, then click Format or Minify. | Invalid JSON is left unchanged and the app does not crash. | Passed |
| Negative - Remove a selected file before sending. |   | File body is cleared and no stale file payload is sent. | Need confirm |

## Authentication and Network Options

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Configure Bearer token auth with a literal token. | Run `GET Bearer Auth Success`; token value is `uat-token`. | Outgoing request includes the expected `Authorization: Bearer` header. | Passed |
| Positive - Configure Basic auth with username and password. | Run `GET Basic Auth Success`; credentials are `uat-user` and `uat-pass`. | Outgoing request includes a valid Basic authorization header. | Passed |
| Positive - Configure API key auth in a header. | Use `PATCH Echo JSON`, set API key auth in header, and confirm `/echo` returns the header. | Outgoing request includes the configured API key header. | Not passed, the response is shown but get warning: Unresolved variables: service\_name |
| Positive - Configure API key auth in a query parameter. | Use `PATCH Echo JSON`, set API key auth in query, and confirm `/echo` returns the query value. | Request URL includes the configured API key query parameter. | Not passed, the response is shown but get warning: Unresolved variables: service\_name |
| Positive - Configure OAuth2 client credentials for a valid token endpoint. |   | Token is obtained and used for the request, or a clear success toast/status appears. | Need confirm |
| Positive - Configure OAuth2 authorization code with PKCE. |   | Authorization opens in a new window and stores the returned token when the callback succeeds. | Need confirm |
| Positive - Configure digest or AWS SigV4 auth for a compatible endpoint. |   | Request is signed or challenged correctly and endpoint accepts valid credentials. | Need confirm |
| Positive - Set timeout and retry policy in Options. | Use `GET Delayed Response`; for retry visibility, change URL to `{{local_api_url}}/status/500` and enable retry. | Timeout and retry behavior are applied; retry count appears after retried requests. | Need confirm.<br>Timeout: url: {{local\_api\_url}}/delay/1000, timeout: 500ms,message: Get "[http://127.0.0.1:4545/delay/1000](http://127.0.0.1:4545/delay/1000)": context deadline exceeded<br>Retry: Passed |
| Positive - Open Settings > Network from Options. |   | Settings opens on Network and protocol-specific defaults can be edited. | Need confirm |
| Negative - Send with missing auth fields. | Run `NEGATIVE Bearer Auth Missing Token`. | Request fails gracefully or endpoint returns unauthorized without UI crash. | Passed |
| Negative - Set an invalid proxy URL or certificate config. |   | Request or save action reports a clear error and keeps the app responsive. | Need confirm |
| Negative - Set very low timeout for a slow endpoint. | Use `GET Delayed Response`, set timeout to `100`, then send. | Request times out according to the configured timeout and shows a failed state. | Need confirm. get error message: "Get "[http://127.0.0.1:4545/delay/650](http://127.0.0.1:4545/delay/650)": context deadline exceeded" |

## Variables and Environments

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Create a new environment with public variables. | Use values from `uat-data/sample.env` if you want a ready-made variable set. | Environment is saved and appears in the environment selector. | Passed, need confirm on what trigger sensitive variable |
| Positive - Select an environment and reference `{{variableName}}` in a request URL. | Import workspace, select `UAT Local Mock API`, then run `GET Health Check`. | Variable resolves before execution and the active variables popover shows the source value. | Passed |
| Positive - Mark a variable as sensitive. | Imported environment already marks `auth_token` and `basic_password` as sensitive. | Value is masked by default and can be revealed only through the reveal control. | Passed, need confirm on what trigger sensitive variable |
| Positive - Import variables from a valid `.env` file. | Import `uat-data/sample.env` from the environment editor. | Variables are added or merged into the environment and a success toast appears. | Passed |
| Positive - Export an environment with no sensitive variables. | Import `uat-data/sample.env`, remove or mark sensitive variables public as needed, then export. | A `.env` file is downloaded with the exported variables. | Passed |
| Positive - Export an environment with sensitive variables. | Use imported `UAT Local Mock API`, which includes sensitive values. | Dialog asks whether to export non-sensitive values only or export all values. | Passed |
| Positive - Edit and delete an existing environment. | Use imported `UAT Local Mock API`, or duplicate it first to avoid removing the fixture. | Changes persist; deletion removes the environment and clears it if it was active. | Partially passed, but should show toast delete success. Also some cases get error: SyntaxError: JSON.parse: unexpected character at line 1 column 1 of the JSON data |
| Negative - Reference an undefined variable in the URL. | Open `NEGATIVE Missing Variable Warning`. | URL input is marked with a warning and lists missing variable names. | Passed |
| Negative - Import an invalid or empty `.env` file. |   | App shows an error or warning toast and existing variables remain intact. | Passed |
| Negative - Cancel environment deletion. | Use imported `UAT Local Mock API` and cancel the delete confirmation. | Environment remains unchanged. | Passed |

## Collections, Requests, Import, and Export

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Create a new collection. |   | Collection appears in the Collections sidebar and can be expanded. | Passed |
| Positive - Add a new request under a collection. |   | Request appears under the collection and selecting it loads the request builder. | Passed with note: New request modal only set the Request name, not whole request info. |
| Positive - Rename a collection and add a description. | Use imported `UAT Sample API` collection. | New name and description indicator persist after closing and reopening the collection. | Passed |
| Positive - Duplicate a saved request. | Use imported `GET Health Check` request. | A second request is created with matching request details. | Not Passed, should check onclick func for duplicate button. |
| Positive - Delete a saved request after confirmation. | Duplicate `GET Health Check`, then delete the duplicate. | Request is removed from the collection. | Passed |
| Positive - Run a collection or folder with saved requests. | Start mock API, import workspace, select `UAT Local Mock API`, then run `Happy Path` or `UAT Sample API`. | Runner modal shows request progress, statuses, assertion counts, and final pass/fail summary. | Passed |
| Positive - Export a collection as Invoke ZIP. | Export imported `UAT Sample API` collection. | ZIP file is generated and success toast appears. | Passed |
| Positive - Export a REST collection as OpenAPI. | Export imported `UAT Sample API` collection. | OpenAPI YAML file is generated and success toast appears. | Passed |
| Positive - Import supported formats: Invoke ZIP, Postman, Insomnia, Hoppscotch, OpenAPI, Invoke YAML, HAR, or cURL. | Use `uat-data/sample-openapi.yaml` for OpenAPI and `uat-data/sample-curl.txt` for cURL. | Valid imports create collection data or load a cURL request into the builder. | Not Passed, must define further the import collection feature |
| Negative - Import an invalid or unsupported file. |   | Import fails with an error toast and existing collections remain unchanged. | Not Passed, must define further the import collection feature |
| Negative - Run an empty collection or folder. |   | Run button is disabled or runner shows a no-requests message. | Passed, runner modal shows "No requests in this folder." |
| Negative - Cancel collection deletion. | Use imported `UAT Sample API` and cancel the delete confirmation. | Collection and child requests remain unchanged. | Passed |

## GraphQL

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Switch protocol to GraphQL. |   | GraphQL query and variables tabs appear, and the request uses GraphQL behavior. | Passed, but should the combo method be displayed? |
| Positive - Enter a valid query and send it to a GraphQL endpoint. | Start mock API, then copy endpoint, query, variables, and operation name from `uat-data/graphql-query.json`. | Response body displays GraphQL data and HTTP response details. | Passed, but the request is not put into History |
| Positive - Add variables referenced by the query. | Use the `variables` object from `uat-data/graphql-query.json`. | Variables JSON is accepted and sent with the request. | Passed |
| Positive - Use query Prettify. | Use the query from `uat-data/graphql-query.json`. | Query formatting is improved without changing query meaning. | Not Passed, should check onClick Prettify button |
| Positive - Import schema from a URL with a valid introspection endpoint. |   | Schema loads, is cached, and schema-aware behavior becomes available. | Need confirm |
| Positive - Import schema from introspection JSON or SDL. | Use SDL file `uat-data/graphql-schema.graphql`. | Schema loads successfully and explorer/autocomplete can use it. | Not Passed in tab JSON File, use graphql-query.json, get error: Failed: JSON.parse: unexpected character at line 1 column 1 of the JSON data<br>Passed in tab SDL, but perhaps add help section or tooltip to use the explorer, or perhaps need redesign for the explorer |
| Positive - Use operation picker with multiple named operations. |   | Correct operation name is selected and sent. | Need confirm, perhaps need help section to use explorer |
| Positive - Enable APQ or Batch mode when supported. | Use endpoint and query from `uat-data/graphql-query.json` for the base request. | Request body changes to persisted-query or batched format and endpoint handles it. | Need confirm, the request is shown but no difference between apq or batch mode. query: query Echo(name: String!) {\\n echo(name: name)\\n} |
| Positive - Add GraphQL file upload mapping. |   | File upload entry is stored with variable path and included during send. | Passed with note: the file is loaded into request, but perhaps need sample data that accomodate the UAT |
| Positive - Run a subscription query. |   | Subscription connects, messages appear, and unsubscribe stops the subscription. | Need confirm, need more sample data to do this |
| Positive - View the Errors tab when a GraphQL response includes errors. | Send a known-invalid query to the imported GraphQL endpoint, or any endpoint that returns a `errors` array. | Errors tab lists each error with message, path, locations, and extension metadata. | Need confirm, need more sample data to do this |
| Positive - View the Deferred tab for a query that uses `@defer` or `@stream`. | Point the GraphQL request at an endpoint that supports incremental delivery. | Deferred tab shows incremental payloads with path tracking as they arrive. | Need confirm, need more sample data to do this |
| Positive - Open the schema explorer/browser, search a type or field, and insert into the query. | Import `uat-data/graphql-schema.graphql` first, then open the schema sidebar. | Selected field is inserted into the query editor at the cursor position. | Passed, but perhaps need more sample data to do this |
| Positive - Save and reuse a GraphQL fragment. | Use the query from `uat-data/graphql-query.json` as a base. | Saved fragment appears in the fragments list and can be inserted into other queries. | Need confirm, need explanation on how to do this |
| Positive - Refresh the cached GraphQL schema. | Import `uat-data/graphql-schema.graphql`, edit it (add or remove a type), then trigger refresh. | Toast or diff indicator summarizes added and removed types/fields. | Need confirm, where is the edit or remove type button. Also when refresh get error: Refresh failed: GraphQL introspection response did not include data.\_\_schema. Search button works. |
| Negative - Enter invalid variables JSON. | Use `uat-data/graphql-query.json`, then temporarily break the variables JSON. | Variables tab shows an inline JSON error and does not crash. | Need confirm, still can use graphql-query.json even though breaking the json. query: { "endpoint": "[http://127.0.0.1:4545/graphql](http://127.0.0.1:4545/graphql)" "query": query Echo(name: String!) {\\n echo(name: name)\\n}, "variables": { "name": "Manual UAT", } "operationName": Echo } |
| Negative - Fetch schema with unresolved variables in the schema URL or headers. | Use schema URL `{{missing_gql_url}}` to trigger unresolved-variable handling. | Schema import reports missing variables and does not start the fetch. | Need confirm, there are no {{missing\_gql\_url}} |
| Negative - Import invalid SDL or introspection JSON. | Use `uat-data/graphql-schema.graphql` as a starting point, then paste intentionally invalid SDL in the import dialog. | Import reports failure and keeps the previous schema state. | Need confirm, need explanation to do this |
| Negative - Enable APQ and then try to enable Batch mode. |   | Mutually exclusive option is disabled or prevents conflicting state. | Need confirm, need explanation and sample data to do this |

## WebSocket

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Switch protocol to WebSocket and connect to a valid WebSocket URL. |   | Session state changes to connected and the log is ready for messages. |   |
| Positive - Send a text message after connecting. |   | Sent message appears in the log and any echo or server response appears as received. |   |
| Positive - Send a binary message from the composer. |   | Binary payload is sent and logged without corrupting the session. |   |
| Positive - Use the `graphql-transport-ws` preset. |   | Connection init behavior and subscription helpers are available. |   |
| Positive - Add handshake headers and auth. |   | Headers/auth are applied on connect and visible through successful server behavior. |   |
| Positive - Create multiple WebSocket sessions. |   | New session tab is created and sessions can be switched or closed independently. |   |
| Positive - Save message templates and enable auto-send on connect. |   | Saved messages persist in the request and auto-send after connecting. |   |
| Positive - Use search, direction filter, pretty JSON, copy, and clear log. |   | Log tools filter or transform display without losing actual session state unexpectedly. |   |
| Positive - Use the MQTT, STOMP, or Socket.IO message preset. |   | Selected preset inserts a valid template payload that can be sent and parsed by a compatible endpoint. |   |
| Positive - Connect or disconnect via `Ctrl+R`. |   | Session toggles between connected and disconnected states. |   |
| Positive - Clear the message log via `Ctrl+L`. |   | Log is emptied while the connection state remains unchanged. |   |
| Positive - Enable auto-reconnect and disconnect the server. |   | Client attempts reconnect according to settings. |   |
| Negative - Connect with an invalid WebSocket URL. |   | Connection fails with an error toast and state returns to disconnected. |   |
| Negative - Send a message while disconnected. |   | Message is not sent and UI remains stable. |   |
| Negative - Cancel while connection is in progress. |   | Connection attempt stops and state returns to disconnected. |   |

## gRPC

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Switch protocol to gRPC and enter a valid server address. |   | gRPC bar and client tabs appear. |   |
| Positive - Run reflection against a server with reflection enabled. |   | Method list loads and status shows the number of methods found. |   |
| Positive - Search and select a reflected method. |   | Selected service and method populate the request editor. |   |
| Positive - Invoke a unary method with a valid JSON message. |   | Response metadata, body, trailers, status, and duration are displayed. |   |
| Positive - Invoke a server-streaming method. |   | Stream messages appear with timing and final status. |   |
| Positive - Open a client-streaming or bidirectional stream. |   | Stream opens, messages can be sent, and close stream returns final status. |   |
| Positive - Add metadata and gRPC auth. |   | Metadata or authorization values are sent with the call. |   |
| Positive - Upload a protoset when reflection is unavailable. |   | Methods can be selected from the uploaded descriptor. |   |
| Positive - Run gRPC health check. |   | Health status and latency are displayed when the server supports health check. |   |
| Positive - Save and reuse a gRPC message template. |   | Saved message appears and can populate or send the body. |   |
| Positive - Run reflection via `Ctrl+R`. |   | Method list reloads using the same shortcut path as the Reflect button. |   |
| Positive - Clear the stream log via `Ctrl+L`. |   | Stream log is emptied while the call state remains unchanged. |   |
| Positive - Use the stress test panel to send messages at a fixed rate on an open stream. |   | Throughput, latency, and total message counts update during the run. |   |
| Positive - Compare two messages from a streaming call via inline diff. |   | Selected messages render side-by-side with field-level differences highlighted. |   |
| Positive - Verify deadline countdown timer during a streaming call with a configured timeout. |   | Countdown decreases in real time and call is cancelled when the deadline is reached. |   |
| Negative - Reflect against an unreachable or non-gRPC endpoint. |   | Error toast appears and method list remains unchanged or empty. |   |
| Negative - Enable TLS for a localhost plaintext server. |   | Warning is displayed and failed call is reported clearly. |   |
| Negative - Invoke with malformed JSON body. |   | Call fails gracefully and the body editor retains the invalid content for correction. |   |
| Negative - Cancel an in-progress unary or streaming call. |   | Call stops and gRPC status changes to cancelled or idle. |   |

## Response Viewer, History, Diff, and Code Generation

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - View response Body tab for JSON and raw responses. | Run `GET Health Check`, `PATCH Echo JSON`, or `GET Stream NDJSON`. | Body renders in a readable viewer and remains copyable/selectable. | Passed |
| Positive - View Headers, Timing, TLS, Assertions, Auth, Code, and Visualize tabs. | Run `GET Health Check`; run `GET Set Cookie` for header/cookie-related inspection. | Each tab displays relevant data or an empty state without errors. | Passed |
| Positive - Create a quick assertion from response status, body, or header. | Run `GET Health Check`, then create quick assertions from the response. | Assertion is added to the request Assertions tab. | Passed |
| Positive - Create a quick extraction from response body or header. | Run `GET Users by Role` or `GET Set Cookie`, then create extraction rules from response data. | Extraction rule is added to the request Extract tab. | Passed, but perhaps need explanation about extraction |
| Positive - Save a response example. | Run `GET Health Check`, then save the response example. | Example is saved with name, status, headers, and body. | Passed, but need confirmation to display the saved request |
| Positive - Create a mock route from a response. | Run `GET Users by Role`, then create a mock route from the response. | Mock route is added and Mock sidebar opens. | Passed |
| Positive - Generate code snippets for REST, GraphQL, and gRPC targets. | Use `GET Health Check` for REST and `uat-data/graphql-query.json` for GraphQL. | Selected target renders code and copy button copies it to clipboard. | Passed |
| Positive - Open History and restore a previous request. | Run several imported sample requests, then restore one from History. | Request builder is populated from the selected history entry. | Not Passed: Only URLBar is populated, the other panel is not. Also combo method is not set the method of request |
| Positive - Pin, label, search, and delete history entries. | Run imported sample requests to populate History. | History updates correctly and pinned entries are grouped separately. | Passed, but should check order in the pin section |
| Positive - Compare the last two history responses. | Run `GET Health Check`, then `GET Users by Role`, then compare last two entries. | Diff modal opens and shows differences between selected responses. | Passed |
| Positive - Add a diff ignore path and re-run the comparison. | Run two requests that differ only in a known field (e.g. `timestamp`), open Diff, then add the path to ignore rules. | Ignored path no longer appears as a difference in the diff result. | Need confirm, need sample data |
| Positive - Remove a previously saved diff ignore path. | Use any ignore path from the previous scenario. | Path is removed from the rule list and reappears as a difference where applicable. | Need confirm, need sample data |
| Positive - Visualize an image, HTML, or SVG response in the Visualize tab. | Point a GET request at an image URL (or any public HTML/SVG endpoint). | Visualize tab renders the media inline instead of raw bytes. | Need confirm, need sample data |
| Negative - Open response viewer before any request is sent. |   | Empty state prompts the user to send a request. | Passed |
| Negative - Diff history when insufficient entries exist. |   | Diff action is hidden, disabled, or shows a safe empty state. | Passed |
| Negative - Clear history and cancel confirmation. |   | History remains unchanged. | Passed |

## Assertions, Extraction, and Scripts

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Add a status assertion that should pass. | Use `GET Health Check`, which already includes passing status and body assertions. | Assertion result is marked passed after request execution. | Need confirm, GET Health Check is not have status and body assertion |
| Positive - Add header, response time, JSONPath, body schema, and regex assertions. | Use `GET Set Cookie`, `GET Delayed Response`, and `GET Users by Role` as assertion targets. | Supported assertion types evaluate and show pass/fail details. | Need confirm, GET Set Cookie, GET Delayed Response, GET Users by Role has no assertion |
| Positive - Add an extraction rule from response body. | Use `GET Users by Role`, which extracts `first_user_id`. | Extracted value is stored as a session variable and can be used as `{{variable}}`. | Need confirm, GET Users by Role has no extraction |
| Positive - Add an extraction rule from response header or status. | Use `GET Set Cookie` for header extraction or any sample request for status extraction. | Extracted value is stored correctly in session variables. | Need confirm, GET Set Cookie has no extraction |
| Positive - Add a pre-request script that mutates request data. | Use `POST Create User`, which includes a pre-request script adding `X-Script-Trace`. | Script runs before sending and resulting request is used. | Not Passed, POST Create User has two pre request script, and both does not show in the response viewer |
| Positive - Add a post-response script that logs or sets variables. | Use `POST Create User` or `GET Health Check`, both include post-response log examples. | Script runs after response and logs appear in the Scripts panel. | Not Passed, the post response script is not shown in the response viewer |
| Negative - Add an assertion expected to fail. | Duplicate `GET Health Check`, then change expected status from `200` to `201`. | Assertion result is marked failed without blocking response inspection. | Not Passed, duplicate button not working |
| Negative - Add invalid JSONPath, regex, or schema assertion. | Use any successful sample response, then add an intentionally invalid assertion. | Assertion reports failure or error clearly and request execution completes. | Need confirm, the assertion is displaying with red overlay |
| Negative - Throw an error inside pre-request or post-response script. | Edit script in `POST Create User` to throw `new Error("UAT script failure")`. | Error is contained, user is informed, and UI does not crash. | Not Passed, no information regarding error in pre and post request. |

## Batch Runner and Flow Runner

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Open Batch Runner from the request toolbar. | Open imported `GET Health Check`, then open Batch Runner. | Batch Runner modal opens with iterations, concurrency, delay, and stop-on-failure settings. | Passed |
| Positive - Run batch with a valid request. | Use imported `GET Health Check` while mock API is running. | Progress reaches 100 percent and result summary shows total, passed, failed, latency, status counts, and errors if any. | Need confirm with Mock Server |
| Positive - Run batch with concurrency greater than 1. | Use imported `GET Health Check` with concurrency greater than 1. | Requests execute concurrently and stats are still accurate. | Passed, but should check behavior Concurenncy input field and Status distribution design |
| Positive - Cancel a running batch. | Use `GET Delayed Response` with high iterations, then cancel while running. | Batch execution stops and modal returns to a non-running state. | Passed, but should redesign cancel button |
| Positive - Create a flow with request, delay, condition, and loop steps. | Use imported `UAT Happy Path Flow` as a reference for request and delay steps. | Steps can be added, edited, reordered, and removed. | Need confirm: add, remove, reorder and edited worked, but need confirmation for loop and condition step |
| Positive - Run a valid flow. | Start mock API, select `UAT Local Mock API`, then run imported `UAT Happy Path Flow`. | Flow log shows step progress and final passed or failed status. | Passed |
| Positive - Save a flow and reopen it from the Flows sidebar. | Use imported `UAT Happy Path Flow`. | Saved flow persists and opens with its configured steps. | Passed, but no import flow button |
| Positive - Switch between flow list and canvas views. | Open imported `UAT Happy Path Flow`. | Both views represent the same flow and selection stays consistent. | Passed |
| Negative - Run a flow with no steps. |   | Validation prevents the run and shows a clear error. | Passed |
| Negative - Run a flow with an invalid request URL or invalid condition. | Duplicate `UAT Happy Path Flow`, then change a step URL to `{{local_api_url}}/status/500` or an invalid URL. | Flow fails gracefully with error status in the log/results. | Need confirm, the error status is not in the log but in the step itself |
| Negative - Delete a flow and cancel confirmation. | Use imported `UAT Happy Path Flow` and cancel delete confirmation. | Flow remains in the list. | Passed |

## Mock Server, Webhooks, and Proxy Recording

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Add a mock route with method, path, status, body, headers, and latency. | Use `uat-data/mock-routes.json` as the route values to recreate manually in the UI. | Route appears in the route list and can be edited. | Passed, but perhaps add edit button |
| Positive - Sync valid mock routes. | Sync `uat-data/mock-routes.json` through the API command shown in `uat-data/README.md`, or recreate and sync the routes in UI. | Mock server status changes to Active and a success toast appears. | Passed, but get warning Route 1: unknown template placeholder {{id}} will be returned unchanged |
| Positive - Call a synced `/mock/*` route. | After syncing `mock-routes.json`, call `http://localhost:4000/mock/manual/users/42`. | Configured response is returned and request appears in mock logs. | Passed |
| Positive - Disable a route and sync. | Use synced route `uat-mock-users` from `mock-routes.json`. | Disabled route no longer handles matching requests. | Passed, but need sync first |
| Positive - Configure route response sequence. | Use synced route `uat-mock-sequence` from `mock-routes.json`. | Matching calls cycle through the configured sequence responses. | Passed |
| Positive - Stop the mock server. | Use synced routes from `uat-data/mock-routes.json`, then click Stop. | Status changes to Inactive and routes are no longer served by the server. | Passed |
| Positive - Create a webhook endpoint and copy its URL. |   | Webhook URL is available and incoming requests appear in webhook logs. | Need confirm, need sample data |
| Positive - Configure webhook validation with header token or signature. |   | Valid requests are accepted and invalid requests are logged with validation error. | Need confirm, need sample data |
| Positive - Use proxy recording and convert selected records to mock routes. | Use `uat-data/mock-api.mjs` as the upstream target while recording proxy traffic. | Recorded traffic appears and selected records create mock routes. | Need confirm, need explanation |
| Negative - Sync an invalid mock route, such as empty path or invalid status. | Start from a route in `uat-data/mock-routes.json`, then clear its path or set an invalid status before sync. | Validation error toast appears and sync is blocked. | Need confirm, invalid code get Error: {"success":false,"error":{"issues":\[{"code":"too\_big","maximum":599,"type":"number","inclusive":true,"exact":false,"message":"Number must be less than or equal to 599","path":\["routes",0,"status"\]}\],"name":"ZodError"}}, no path get Route 1: path is required |
| Negative - Call a mock route that does not match any configured route. | After syncing sample routes, call `http://localhost:4000/mock/manual/unknown`. | Server returns a not-found response and app remains stable. | Passed, get No mock route matched message |
| Negative - Clear mock, webhook, or proxy logs and cancel where applicable. | Generate logs by calling sample mock routes, then test clear/cancel behavior. | Logs are retained when cancelled and cleared only after the clear action is confirmed or executed. | Not passed, request log is not generated |

## Cookie Manager

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Send a request that returns `Set-Cookie`. | Start mock API and run imported `GET Set Cookie`. | Cookie is captured and the top-bar cookie indicator appears. | Passed, but cookies must enabled first |
| Positive - Open Cookie Manager. | Run `GET Set Cookie` first so a cookie exists. | Cookies are grouped by domain with name, path, expiry, Secure, HttpOnly, and SameSite metadata. | Passed, but need redesign for cookie manager modal |
| Positive - Toggle cookie jar enabled or disabled. | Run `GET Set Cookie`, then use Cookie Manager toggle. | Cookie handling state changes and is reflected in the manager. | Need confirm, disabled cookie still set cookie in the header |
| Positive - Reveal and hide a cookie value. | Run `GET Set Cookie`, then reveal the `invoke_uat` cookie. | Value toggles between masked and visible states. | Passed |
| Positive - Delete one cookie. | Run `GET Set Cookie`, then delete the stored `invoke_uat` cookie. | Cookie is removed from the manager and storage. | Passed |
| Positive - Clear cookies for one domain or all domains. | Run `GET Set Cookie`, then clear cookies for `127.0.0.1` or all domains. | Confirmation appears and selected cookies are removed after confirming. | Need confirm, clear cookie still set cookie in the header |
| Negative - Open Cookie Manager when no cookies exist. |   | Empty state explains that no cookies are stored. | Passed |
| Negative - Cancel clear-cookie confirmation. | Run `GET Set Cookie`, start clear action, then cancel. | Cookies remain unchanged. | Passed |

## Settings, Storage, Backup, and Security

| Scenario | Sample Data Usage | Expected Result | Output Result |
| --- | --- | --- | --- |
| Positive - Change theme to light, dark, and system. |   | Theme updates after saving and persists after reload. | Passed |
| Positive - Change UI font size within allowed range. |   | Font size changes and min/max controls prevent values outside the range. | Passed |
| Positive - Toggle editor word wrap. |   | Code editors respect the saved word-wrap preference. | Passed |
| Positive - Configure protocol network defaults for REST, GraphQL, WebSocket, and gRPC. |   | Saved defaults apply to new or executed requests for the selected protocol. | Need confirm, need sample data |
| Positive - Configure and remove proxy settings per protocol. |   | Proxy settings are saved, displayed, and removable. | Need confirm, need sample data |
| Positive - Configure TLS client certificate fields. |   | Values save and are included in relevant network configuration. | Need confirm, need sample data |
| Positive - Set history retention max entries and keep days. | Run several imported sample requests first so History has data. | Retention settings save and storage stats update as data changes. | Not Passed, when change max entries and days get error: Uncaught TypeError: can't access property "value", e.currentTarget is null onChange SettingsPanel.tsx:906 |
| Positive - Export workspace backup. | Import `uat-data/invoke-uat-workspace.json`, then export the workspace. | JSON backup file is downloaded and success toast appears. | Passed |
| Positive - Import a valid workspace backup. | Import `uat-data/invoke-uat-workspace.json`. | Collections, environments, requests, flows, and defaults merge into local data. | Passed |
| Positive - Set up a credential passphrase on first save of a sensitive credential. | Import `uat-data/invoke-uat-workspace.json` (env contains sensitive `auth_token`/`basic_password`) and save a credential when no passphrase exists. | Setup dialog requires passphrase and confirmation, then accepts and stores the encrypted credentials. | Passed |
| Positive - Unlock saved credentials with passphrase on app startup. | After setup, refresh the browser. | Unlock prompt appears; entering the correct passphrase decrypts credentials for the session. | Not passed, no prompt is appeared |
| Negative - Cancel the passphrase prompt during setup or unlock. |   | Dialog closes, no passphrase is stored, and sensitive credentials remain locked/unusable until provided. | Not passed, no prompt is appeared |
| Negative - Submit empty or mismatched confirmation when setting up a passphrase. |   | Form blocks submission and shows a clear validation message. | Not passed, no message is appeared |
| Negative - Close Settings with unsaved changes by Cancel or outside click. |   | Unsaved changes are discarded and persisted settings stay unchanged. | Passed |
| Negative - Import invalid workspace backup JSON. |   | Error toast appears and existing workspace data remains unchanged. | Passed, should check the z-index of toast message |
| Negative - Clear history or cookies from Settings and cancel confirmation. | Run sample requests and `GET Set Cookie` first, then cancel clear actions. | Data remains unchanged. | Passed |