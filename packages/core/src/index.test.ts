import "fake-indexeddb/auto";
import Dexie from "dexie";
import yaml from "js-yaml";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  compareResponses,
  emptyRequest,
  FlowRunner,
  generateCodeSnippet,
  graphQLToRequestConfig,
  exportCollectionZip,
  extractVariables,
  importHoppscotchCollection,
  importInsomniaExport,
  importOpenApiSpec,
  importInvokeZip,
  importPostmanCollection,
  importYamlFiles,
  InvokeStore,
  parseCurl,
  resolveGraphQLRequest,
  resolveRequest,
  resolveTemplate,
  runPostResponseScript,
  runPreRequestScript,
  runAssertions,
  searchHistory,
  signAwsSigV4Request,
  toRequestConfig,
  validateFlow,
  validateMockRoutes,
  type Collection,
  type ExecuteResponse,
  type Folder,
  type HistoryEntry,
  type Flow,
  type MockRoute,
  type SavedRequest,
} from "./index";

beforeEach(async () => {
  await Dexie.delete("invoke-alpha");
});

afterEach(async () => {
  await Dexie.delete("invoke-alpha");
});

describe("variables", () => {
  it("resolves environment and dynamic variables", () => {
    const result = resolveTemplate("{{base_url}}/{{$randomInt}}", {
      base_url: "https://api.example.com",
    });
    expect(result.value).toMatch(/^https:\/\/api\.example\.com\/\d+$/);
    expect(result.unresolved).toEqual([]);
  });

  it("tracks unresolved variables", () => {
    const result = resolveTemplate("{{missing}}", {});
    expect(result.value).toBe("{{missing}}");
    expect(result.unresolved).toEqual(["missing"]);
  });
});

describe("mock validation", () => {
  it("accepts a valid mock route", () => {
    const result = validateMockRoutes([mockRoute()]);
    expect(result.errors).toEqual([]);
  });

  it("rejects unsafe paths, headers, conditions, and templates", () => {
    const result = validateMockRoutes([
      mockRoute({
        pathPattern: "https://api.example.com/users?id=1",
        headers: [
          { key: "Content-Length", value: "12", enabled: true },
          { key: "X-Bad Header", value: "ok", enabled: true },
        ],
        body: "{{param.missing}}",
        conditions: [
          {
            source: "header",
            expression: "Bad Header",
            matcher: "equals",
            expected: "x",
          },
          {
            source: "query",
            expression: "page=1",
            matcher: "equals",
            expected: "1",
          },
          {
            source: "bodyJsonPath",
            expression: "$.items[",
            matcher: "exists",
            expected: "",
          },
          {
            source: "query",
            expression: "age",
            matcher: "gt",
            expected: "old",
          },
          {
            source: "query",
            expression: "name",
            matcher: "matches",
            expected: "[",
          },
        ],
      }),
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Route 1: path must start with /",
        "Route 1: path must not include protocol or host",
        "Route 1: path must not include a query string; use conditions instead",
        "Route 1, header 1: Content-Length is managed by the server and cannot be set manually",
        "Route 1, header 2: invalid header name",
        "Route 1: template references unknown path parameter missing",
        "Route 1, condition 1: invalid header name",
        "Route 1, condition 2: query expression must be a parameter name",
        "Route 1, condition 3: invalid JSON path",
        "Route 1, condition 4: expected value must be numeric for gt",
        "Route 1, condition 5: expected value must be a valid regular expression",
      ]),
    );
  });

  it("warns for overlapping routes and bodyless responses", () => {
    const result = validateMockRoutes([
      mockRoute({ id: "first", method: "GET", pathPattern: "/users/:id" }),
      mockRoute({
        id: "second",
        method: "GET",
        pathPattern: "/users/:userId",
        status: 204,
        headers: [{ key: "Content-Type", value: "text/plain", enabled: true }],
        body: "ok",
      }),
    ]);

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Route 2: status 204 should not include a response body",
        "Route 2: overlaps route 1 and may never be reached",
      ]),
    );
  });
});

describe("flow validation", () => {
  it("accepts a runnable flow", () => {
    const result = validateFlow(flowFixture(), { requireSteps: true });
    expect(result.errors).toEqual([]);
  });

  it("rejects invalid request, assertion, extraction, and condition data", () => {
    const result = validateFlow(
      {
        ...flowFixture(),
        steps: [
          {
            id: "",
            type: "request",
            name: "",
            request: {
              ...emptyRequest(),
              method: "GET",
              url: "not-a-url",
              headers: [{ key: "Bad Header", value: "ok", enabled: true }],
              params: [{ key: "", value: "1", enabled: true }],
              bodyMode: "json",
              body: "{",
              assertions: [
                {
                  id: "",
                  type: "bodyJsonPath",
                  expression: "$.items[",
                  matcher: "matches",
                  expected: "[",
                },
              ],
              extractionRules: [
                {
                  variableName: "bad name",
                  source: "body",
                  expression: "$.items[",
                  enabled: true,
                },
              ],
            },
            continueOnFailure: false,
          },
          {
            id: "condition",
            type: "condition",
            name: "Check",
            condition: {
              source: "header",
              expression: "Bad Header",
              matcher: "gt",
              expected: "old",
            },
            thenSteps: [],
          },
        ],
      },
      { requireSteps: true },
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Step 1: id is required",
        "Step 1: name is required",
        "Step 1: request URL must be an absolute http(s) URL",
        "Step 1, header 1: invalid header name",
        "Step 1, param 1: key is required when value is set",
        "Step 1: JSON body must be valid JSON",
        "Step 1, assertion 1: id is required",
        "Step 1, assertion 1: invalid JSONPath expression",
        "Step 1, assertion 1: expected value must be a valid regular expression",
        "Step 1, extraction 1: variable name is required and must be valid",
        "Step 1, extraction 1: invalid JSONPath expression",
        "Step 2: header condition needs a valid header name",
        "Step 2: condition: expected value must be numeric for gt",
      ]),
    );
  });

  it("warns for draft and no-op flow behavior", () => {
    const result = validateFlow({
      ...flowFixture(),
      steps: [
        { id: "delay", type: "delay", name: "Wait", delayMs: 60000 },
        {
          id: "condition",
          type: "condition",
          name: "No branches",
          condition: {
            source: "status",
            expression: "ignored",
            matcher: "equals",
            expected: "200",
          },
          thenSteps: [],
        },
        {
          id: "loop",
          type: "loop",
          name: "Loop",
          count: 10,
          maxIterations: 3,
          steps: [],
        },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Step 1: long delay may make the flow feel stalled",
        "Step 2: status condition expression is ignored",
        "Step 2: condition has no branch steps",
        "Step 3: loop has no steps",
        "Step 3: maxIterations is lower than count and will stop the loop first",
      ]),
    );
  });
});

describe("request resolution", () => {
  it("applies bearer auth and query params", () => {
    const request = {
      ...emptyRequest(),
      url: "https://example.com/users",
      params: [{ key: "page", value: "1", enabled: true }],
      auth: { type: "bearer" as const, token: "abc" },
    };
    const resolved = resolveRequest(request);
    expect(resolved.request.url).toBe("https://example.com/users?page=1");
    expect(resolved.request.headers).toContainEqual({
      key: "Authorization",
      value: "Bearer abc",
      enabled: true,
    });
  });

  it("resolves Basic auth variables before encoding credentials", () => {
    const request = {
      ...emptyRequest(),
      url: "https://example.com/me",
      auth: {
        type: "basic" as const,
        username: "{{username}}",
        password: "{{password}}",
      },
    };
    const resolved = resolveRequest(request, [
      { variables: { username: "ada", password: "lovelace" } },
    ]);
    expect(resolved.request.headers).toContainEqual({
      key: "Authorization",
      value: `Basic ${Buffer.from("ada:lovelace").toString("base64")}`,
      enabled: true,
    });
  });

  it("resolves API key query auth before building the URL", () => {
    const request = {
      ...emptyRequest(),
      url: "https://example.com/me",
      auth: {
        type: "api-key" as const,
        apiKeyName: "api_key",
        apiKeyValue: "{{apiKey}}",
        apiKeyIn: "query" as const,
      },
    };
    const resolved = resolveRequest(request, [
      { variables: { apiKey: "secret value" } },
    ]);
    expect(new URL(resolved.request.url).searchParams.get("api_key")).toBe(
      "secret value",
    );
  });

  it("resolves ordinary query param variables before URL encoding", () => {
    const request = {
      ...emptyRequest(),
      url: "https://example.com/search",
      params: [{ key: "{{queryKey}}", value: "{{queryValue}}", enabled: true }],
    };
    const resolved = resolveRequest(request, [
      { variables: { queryKey: "q", queryValue: "hello world" } },
    ]);
    expect(new URL(resolved.request.url).searchParams.get("q")).toBe(
      "hello world",
    );
  });

  it("resolves environment, collection, folder, and request scopes in order", () => {
    const request = {
      ...emptyRequest(),
      url: "{{base_url}}/{{version}}/{{token}}/{{override}}",
      variables: [{ key: "override", value: "request", enabled: true }],
    };
    const resolved = resolveRequest(request, [
      {
        name: "environment",
        variables: { base_url: "https://env.example.com", override: "env" },
      },
      {
        name: "collection",
        variables: { version: "v1", override: "collection" },
      },
      {
        name: "folder",
        variables: { token: "folder-token", override: "folder" },
      },
      { name: "request", variables: request.variables ?? [] },
    ]);

    expect(resolved.request.url).toBe(
      "https://env.example.com/v1/folder-token/request",
    );
  });

  it("formats GraphQL requests as JSON POST requests", () => {
    const graphql = {
      url: "https://api.example.com/graphql",
      headers: [{ key: "X-Trace", value: "abc", enabled: true }],
      auth: { type: "none" as const },
      query: "query Country($code: ID!) { country(code: $code) { name } }",
      variables: '{ "code": "ID" }',
      timeoutMs: 30000,
    };
    const request = graphQLToRequestConfig(graphql);

    expect(request.method).toBe("POST");
    expect(request.headers).toContainEqual({
      key: "Content-Type",
      value: "application/json",
      enabled: true,
    });
    expect(JSON.parse(request.body)).toMatchObject({
      query: graphql.query,
      variables: { code: "ID" },
    });
  });

  it("signs AWS SigV4 requests with deterministic canonical headers", async () => {
    const signed = await signAwsSigV4Request(
      {
        ...emptyRequest(),
        method: "GET",
        url: "https://iam.amazonaws.com/?Version=2010-05-08&Action=ListUsers",
        auth: {
          type: "aws-sigv4",
          awsAccessKeyId: "AKIAIOSFODNN7EXAMPLE",
          awsSecretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
          awsRegion: "us-east-1",
          awsService: "iam",
        },
      },
      { now: new Date("2015-08-30T12:36:00Z") },
    );

    const authorization =
      signed.headers.find((header) => header.key === "Authorization")?.value ??
      "";
    expect(signed.headers).toContainEqual({
      key: "X-Amz-Date",
      value: "20150830T123600Z",
      enabled: true,
    });
    expect(authorization).toContain(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20150830/us-east-1/iam/aws4_request",
    );
    expect(authorization).toContain("SignedHeaders=host;x-amz-date");
    expect(authorization).toMatch(/Signature=[0-9a-f]{64}$/);
  });

  it("resolves GraphQL endpoint, headers, query, and variables", () => {
    const resolved = resolveGraphQLRequest(
      {
        url: "{{base_url}}/graphql",
        headers: [
          { key: "Authorization", value: "Bearer {{token}}", enabled: true },
        ],
        auth: { type: "none" },
        query: 'query { user(id: "{{user_id}}") { name } }',
        variables: '{ "id": "{{user_id}}" }',
        timeoutMs: 30000,
      },
      [
        {
          variables: {
            base_url: "https://api.example.com",
            token: "secret",
            user_id: "123",
          },
        },
      ],
    );

    expect(resolved.unresolved).toEqual([]);
    expect(resolved.request.url).toBe("https://api.example.com/graphql");
    expect(resolved.request.headers[0].value).toBe("Bearer secret");
    expect(resolved.request.query).toContain('"123"');
    expect(resolved.request.variables).toContain('"123"');
  });
});

describe("imports", () => {
  it("parses a basic curl command", () => {
    const parsed = parseCurl(
      `curl -H "Authorization: Bearer xyz" https://api.example.com/me`,
    );
    expect(parsed.url).toBe("https://api.example.com/me");
    expect(parsed.auth?.type).toBe("bearer");
  });

  it("extracts JSONPath variables", () => {
    const values = extractVariables(
      {
        status: 200,
        statusText: "200 OK",
        headers: [],
        body: JSON.stringify({ token: "secret" }),
        timing: {
          dnsMs: 0,
          tcpMs: 0,
          tlsMs: 0,
          ttfbMs: 1,
          transferMs: 1,
          totalMs: 2,
        },
        requestSize: 0,
        responseSize: 18,
      },
      [{ variableName: "token", source: "body", expression: "$.token" }],
    );
    expect(values.token).toBe("secret");
  });

  it("normalizes legacy extraction aliases without exposing them in the public type", () => {
    const values = extractVariables(
      { ...responseFixture(), body: JSON.stringify({ token: "secret" }) },
      [{ name: "token", jsonPath: "$.token" } as any],
    );

    expect(values.token).toBe("secret");
  });

  it("extracts variables from body, headers, and status with fallbacks", () => {
    const values = extractVariables(
      {
        ...responseFixture(),
        status: 201,
        headers: [{ key: "X-Token", value: "header-secret", enabled: true }],
        body: JSON.stringify({ data: { accessToken: "body-secret" } }),
      },
      [
        {
          variableName: "token",
          source: "body",
          expression: "$.data.accessToken",
        },
        {
          variableName: "headerToken",
          source: "header",
          expression: "X-Token",
        },
        { variableName: "createdStatus", source: "status", expression: "" },
        {
          variableName: "fallback",
          source: "body",
          expression: "$.missing",
          fallback: "default",
        },
      ],
    );

    expect(values).toMatchObject({
      token: "body-secret",
      headerToken: "header-secret",
      createdStatus: "201",
      fallback: "default",
    });
  });

  it("runs Beta 2 assertions including JSONPath, regex, response time, and schema validation", () => {
    const response = {
      ...responseFixture(),
      body: JSON.stringify({ users: [{ id: 1, email: "ada@example.com" }] }),
      timing: { ...responseFixture().timing, totalMs: 123 },
    };

    const results = runAssertions(response, [
      {
        id: "status",
        type: "status",
        expression: "",
        matcher: "equals",
        expected: "200",
      },
      {
        id: "jsonpath",
        type: "bodyJsonPath",
        expression: "$.users[0].id",
        matcher: "exists",
        expected: "",
      },
      {
        id: "time",
        type: "responseTime",
        expression: "",
        matcher: "lt",
        expected: "500",
      },
      {
        id: "regex",
        type: "regex",
        expression: "/^\\{/",
        matcher: "matches",
        expected: "",
      },
      {
        id: "schema",
        type: "bodySchema",
        expression: "",
        matcher: "equals",
        expected: JSON.stringify({
          type: "object",
          required: ["users"],
          properties: {
            users: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "email"],
                properties: {
                  id: { type: "number" },
                  email: { type: "string" },
                },
              },
            },
          },
        }),
      },
    ]);

    expect(results.every((result) => result.passed)).toBe(true);
  });

  it("diffs JSON responses structurally with summary counts", () => {
    const diff = compareResponses(
      {
        ...responseFixture(),
        body: JSON.stringify({ users: [{ id: 1, email: "old@example.com" }] }),
      },
      {
        ...responseFixture(),
        body: JSON.stringify({
          users: [{ id: 1, email: "new@example.com" }],
          next: true,
        }),
      },
    );

    expect(diff.mode).toBe("json");
    expect(diff.summary).toMatchObject({
      additions: 1,
      deletions: 0,
      changes: 1,
    });
    expect(diff.changes.map((change) => change.path)).toContain(
      "body.users[0].email",
    );
  });

  it("does not report object key order as a structural diff", () => {
    const diff = compareResponses(
      { ...responseFixture(), body: JSON.stringify({ a: 1, b: 2 }) },
      { ...responseFixture(), body: JSON.stringify({ b: 2, a: 1 }) },
    );

    expect(diff.summary).toEqual({ additions: 0, deletions: 0, changes: 0 });
    expect(diff.changes).toEqual([]);
  });

  it("imports Insomnia v4 exports with folders, requests, and environments", () => {
    const imported = importInsomniaExport({
      resources: [
        { _id: "wrk_1", _type: "workspace", name: "Insomnia API" },
        {
          _id: "fld_1",
          _type: "request_group",
          parentId: "wrk_1",
          name: "auth",
        },
        {
          _id: "req_1",
          _type: "request",
          parentId: "fld_1",
          name: "Login",
          method: "POST",
          url: "{{ base_url }}/login",
          headers: [{ name: "Content-Type", value: "application/json" }],
          body: {
            mimeType: "application/json",
            text: '{ "email": "ada@example.com" }',
          },
        },
        {
          _id: "env_1",
          _type: "environment",
          name: "staging",
          data: { base_url: "https://api.example.com" },
        },
      ],
    });

    expect(imported.collection.name).toBe("Insomnia API");
    expect(imported.folders[0].name).toBe("auth");
    expect(imported.requests[0].folderId).toBe(imported.folders[0].id);
    expect(imported.environments[0].variables).toContainEqual({
      key: "base_url",
      value: "https://api.example.com",
      enabled: true,
    });
  });

  it("imports Hoppscotch collections with nested folders", () => {
    const imported = importHoppscotchCollection({
      name: "Hoppscotch API",
      folders: [
        {
          name: "users",
          requests: [
            {
              name: "List users",
              method: "GET",
              endpoint: "{{base_url}}/users",
            },
          ],
        },
      ],
      environments: [
        {
          name: "local",
          variables: [{ key: "base_url", value: "http://localhost:3000" }],
        },
      ],
    });

    expect(imported.collection.name).toBe("Hoppscotch API");
    expect(imported.folders[0].name).toBe("users");
    expect(imported.requests[0].folderId).toBe(imported.folders[0].id);
    expect(imported.requests[0].request.url).toBe("{{base_url}}/users");
  });

  it("imports OpenAPI operations into tag folders with placeholders", async () => {
    const imported = await importOpenApiSpec({
      openapi: "3.0.3",
      info: { title: "Petstore" },
      servers: [{ url: "https://petstore.example.com" }],
      paths: {
        "/pet/{petId}": {
          get: {
            tags: ["pet"],
            operationId: "getPetById",
            parameters: [
              {
                name: "petId",
                in: "path",
                required: true,
                schema: { type: "integer" },
              },
              { name: "include", in: "query", schema: { type: "string" } },
              { name: "X-Client", in: "header", schema: { type: "string" } },
            ],
          },
        },
      },
    });

    expect(imported.collection.name).toBe("Petstore");
    expect(imported.folders).toHaveLength(1);
    expect(imported.folders[0].name).toBe("pet");
    expect(imported.requests[0].folderId).toBe(imported.folders[0].id);
    expect(imported.environments).toHaveLength(1);
    expect(imported.environments[0].variables).toContainEqual({
      key: "base_url",
      value: "https://petstore.example.com",
      enabled: true,
    });
    expect(imported.requests[0].request).toMatchObject({
      method: "GET",
      url: "{{base_url}}/pet/{{petId}}",
      params: [{ key: "include", value: "{{include}}", enabled: true }],
      headers: [{ key: "X-Client", value: "{{X-Client}}", enabled: true }],
    });
  });

  it("merges OpenAPI allOf schemas when generating request body examples", async () => {
    const imported = await importOpenApiSpec({
      openapi: "3.0.3",
      info: { title: "Petstore" },
      paths: {
        "/pet": {
          post: {
            tags: ["pet"],
            operationId: "createPet",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/PetBase" },
                      {
                        type: "object",
                        properties: {
                          tag: { type: "string", example: "featured" },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          PetBase: {
            type: "object",
            properties: {
              id: { type: "integer", example: 123 },
              name: { type: "string", example: "Nori" },
            },
          },
        },
      },
    });

    expect(JSON.parse(String(imported.requests[0].request.body))).toEqual({
      id: 123,
      name: "Nori",
      tag: "featured",
    });
  });

  it("resolves local OpenAPI component refs before walking operations", async () => {
    const imported = await importOpenApiSpec({
      openapi: "3.0.3",
      info: { title: "Component Ref API" },
      servers: [{ url: "https://api.example.com" }],
      paths: {
        "/accounts/{accountId}": {
          parameters: [{ $ref: "#/components/parameters/AccountId" }],
          get: {
            tags: ["accounts"],
            operationId: "retrieveAccount",
            parameters: [
              { $ref: "#/components/parameters/Expand" },
              { $ref: "#/components/parameters/ApiVersion" },
            ],
          },
        },
      },
      components: {
        parameters: {
          AccountId: {
            name: "accountId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          Expand: { name: "expand", in: "query", schema: { type: "string" } },
          ApiVersion: {
            name: "Stripe-Version",
            in: "header",
            schema: { type: "string" },
          },
        },
      },
    });

    expect(imported.requests[0].request).toMatchObject({
      url: "{{base_url}}/accounts/{{accountId}}",
      params: [{ key: "expand", value: "{{expand}}", enabled: true }],
      headers: [
        { key: "Stripe-Version", value: "{{Stripe-Version}}", enabled: true },
      ],
    });
  });

  it("imports a vendored GitHub OpenAPI subset", async () => {
    const imported = await importOpenApiSpec({
      openapi: "3.0.3",
      info: { title: "GitHub REST API" },
      servers: [{ url: "https://api.github.com" }],
      paths: {
        "/repos/{owner}/{repo}/issues": {
          get: {
            tags: ["issues"],
            operationId: "issues/list-for-repo",
            parameters: [
              {
                name: "owner",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
              {
                name: "repo",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
              {
                name: "state",
                in: "query",
                schema: { type: "string", enum: ["open", "closed", "all"] },
              },
              {
                name: "X-GitHub-Api-Version",
                in: "header",
                schema: { type: "string" },
              },
            ],
          },
        },
      },
    });

    expect(imported.collection.name).toBe("GitHub REST API");
    expect(imported.folders[0].name).toBe("issues");
    expect(imported.environments[0].variables).toContainEqual({
      key: "base_url",
      value: "https://api.github.com",
      enabled: true,
    });
    expect(imported.requests[0].request).toMatchObject({
      method: "GET",
      url: "{{base_url}}/repos/{{owner}}/{{repo}}/issues",
      params: [{ key: "state", value: "{{state}}", enabled: true }],
      headers: [
        {
          key: "X-GitHub-Api-Version",
          value: "{{X-GitHub-Api-Version}}",
          enabled: true,
        },
      ],
    });
  });

  it("imports Postman nested folders into Invoke folders", () => {
    const imported = importPostmanCollection({
      info: { name: "Postman API" },
      item: [
        {
          name: "auth",
          item: [
            {
              name: "oauth",
              item: [
                {
                  name: "Refresh token",
                  request: {
                    method: "POST",
                    url: "https://api.example.com/token",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const auth = imported.folders.find((folder) => folder.name === "auth");
    const oauth = imported.folders.find((folder) => folder.name === "oauth");
    expect(auth).toBeDefined();
    expect(oauth).toBeDefined();
    expect(oauth?.parentFolderId).toBe(auth?.id);
    expect(imported.requests[0].folderId).toBe(oauth?.id);
  });

  it("throws a clear error for external OpenAPI refs in the browser importer", async () => {
    await expect(
      importOpenApiSpec({
        openapi: "3.0.3",
        info: { title: "Remote Ref API" },
        paths: {
          "/pets": {
            get: {
              tags: ["pets"],
              parameters: [
                {
                  $ref: "https://example.com/openapi.yaml#/components/parameters/PetId",
                },
              ],
            },
          },
        },
      }),
    ).rejects.toThrow(/external \$ref not supported in browser context/);
  });

  it("returns a useful OpenAPI import error for malformed specs", async () => {
    await expect(
      importOpenApiSpec({
        openapi: "3.0.3",
        info: { title: "Malformed" },
      }),
    ).rejects.toThrow(
      /OpenAPI import failed: OpenAPI document is missing required paths object/,
    );
  });

  it("loads YAML with JSON schema instead of JavaScript tags", async () => {
    const file = new File(
      ["type: !!js/function 'function () { return 1 }'"],
      "bad.invoke.yaml",
    );
    await expect(importYamlFiles([file])).rejects.toThrow();
  });
});

describe("code export and history search", () => {
  it("generates a cURL command with resolved URL, auth headers, and body", async () => {
    const resolved = resolveRequest(
      {
        ...emptyRequest(),
        method: "POST",
        url: "https://api.example.com/users",
        params: [{ key: "source", value: "test", enabled: true }],
        auth: { type: "bearer", token: "abc" },
        headers: [
          { key: "Content-Type", value: "application/json", enabled: true },
        ],
        bodyMode: "json",
        body: '{ "email": "test@example.com" }',
      },
      [{ variables: {} }],
    ).request;

    const snippet = await generateCodeSnippet(resolved, "curl");

    expect(snippet.code).toContain("curl");
    expect(snippet.code).toContain(
      "'https://api.example.com/users?source=test'",
    );
    expect(snippet.code).toContain("'Authorization: Bearer abc'");
    expect(snippet.code).toContain("--data-raw");
    expect(snippet.code).toContain('\'{ "email": "test@example.com" }\'');
  });

  it("generates prettier-formatted fetch, axios, and Python requests snippets", async () => {
    const request = {
      ...emptyRequest(),
      method: "POST" as const,
      url: "https://api.example.com/users",
      headers: [
        { key: "Content-Type", value: "application/json", enabled: true },
      ],
      bodyMode: "json" as const,
      body: '{ "email": "test@example.com", "active": true }',
    };

    const fetch = await generateCodeSnippet(request, "fetch");
    const axios = await generateCodeSnippet(request, "node-axios");
    const python = await generateCodeSnippet(request, "python-requests");

    expect(fetch.code).toContain("await fetch(");
    expect(fetch.code).toContain("JSON.stringify({");
    expect(axios.code).toContain('import axios from "axios";');
    expect(axios.code).toContain("data: {");
    expect(python.code).toContain("import json");
    expect(python.code).toContain("response = requests.post(");
    expect(python.code).toContain("json=payload");
  });

  it("generates the v1 code export targets", async () => {
    const request = {
      ...emptyRequest(),
      method: "POST" as const,
      url: "https://api.example.com/users",
      headers: [
        { key: "Content-Type", value: "application/json", enabled: true },
      ],
      bodyMode: "json" as const,
      body: '{ "name": "Ada" }',
    };

    const go = await generateCodeSnippet(request, "go-net-http");
    const java = await generateCodeSnippet(request, "java-okhttp");
    const httpie = await generateCodeSnippet(request, "httpie");
    const powershell = await generateCodeSnippet(request, "powershell");

    expect(go.code).toContain("http.NewRequest");
    expect(java.code).toContain("OkHttpClient");
    expect(httpie.code).toContain("http \\\n  POST");
    expect(powershell.code).toContain("Invoke-RestMethod");
  });

  it("searches history by URL, request body, response body, and headers newest first", () => {
    const entries: HistoryEntry[] = [
      {
        id: "old",
        createdAt: 1,
        request: {
          ...emptyRequest(),
          url: "https://api.example.com/users",
          body: "",
        },
        response: { ...responseFixture(), body: '{ "name": "Ada" }' },
      },
      {
        id: "body",
        createdAt: 3,
        request: {
          ...emptyRequest(),
          method: "POST" as const,
          url: "https://api.example.com/echo",
          bodyMode: "json" as const,
          body: '{ "email": "test@example.com" }',
        },
        response: responseFixture(),
      },
      {
        id: "new",
        createdAt: 4,
        request: {
          ...emptyRequest(),
          url: "https://api.example.com/admin/users",
          headers: [{ key: "X-Trace", value: "users-header", enabled: true }],
        },
        response: { ...responseFixture(), body: "latest users" },
      },
    ];

    expect(searchHistory(entries, "users").map((entry) => entry.id)).toEqual([
      "new",
      "old",
    ]);
    expect(
      searchHistory(entries, "test@example.com").map((entry) => entry.id),
    ).toEqual(["body"]);
    expect(
      searchHistory(entries, "users-header").map((entry) => entry.id),
    ).toEqual(["new"]);
  });
});

describe("scripting and flows", () => {
  it("runs pre-request and post-response scripts with mutable variables", async () => {
    const pre = await runPreRequestScript(
      { ...emptyRequest(), url: "https://api.example.com", headers: [] },
      {},
      "invoke.setHeader('X-Trace', 'abc'); variables.set('token', 'secret');",
    );

    expect(pre.request.headers).toContainEqual({
      key: "X-Trace",
      value: "abc",
      enabled: true,
    });
    expect(pre.variables.token).toBe("secret");

    const post = await runPostResponseScript(
      pre.request,
      { ...responseFixture(), body: JSON.stringify({ id: 42 }) },
      pre.variables,
      "const parsed = JSON.parse(response.body); variables.set('createdId', parsed.id); console.log('created', parsed.id);",
    );

    expect(post.variables.createdId).toBe("42");
    expect(post.logs).toEqual(["created 42"]);
  });

  it("runs Postman-style script tests and extended expect helpers", async () => {
    const result = await runPostResponseScript(
      emptyRequest(),
      { ...responseFixture(), body: JSON.stringify({ items: [1, 2] }) },
      {},
      "test('response shape', () => { expect(response.status).toBe(200); expect(JSON.parse(response.body).items).toHaveLength(2); expect(variables.get('missing')).toBeUndefined(); });",
    );

    expect(result.logs).toContain("PASS response shape");
  });

  it("runs a sequential flow and carries extracted variables into later steps", async () => {
    const flow: Flow = {
      id: "flow_1",
      name: "Auth flow",
      createdAt: 1,
      updatedAt: 1,
      steps: [
        {
          id: "login",
          type: "request",
          name: "Login",
          request: {
            ...emptyRequest(),
            method: "POST",
            url: "https://api.example.com/login",
            extractionRules: [
              { variableName: "token", source: "body", expression: "$.token" },
            ],
          },
        },
        {
          id: "me",
          type: "request",
          name: "Me",
          request: {
            ...emptyRequest(),
            url: "https://api.example.com/me",
            headers: [
              {
                key: "Authorization",
                value: "Bearer {{token}}",
                enabled: true,
              },
            ],
          },
        },
      ],
    };
    const seen: string[] = [];
    const runner = new FlowRunner();
    const result = await runner.run(flow, {
      execute: async (request) => {
        seen.push(
          request.headers.find((header) => header.key === "Authorization")
            ?.value ?? request.url,
        );
        return {
          ...responseFixture(),
          body: request.url.endsWith("/login")
            ? JSON.stringify({ token: "abc" })
            : "{}",
        };
      },
    });

    expect(result.status).toBe("passed");
    expect(result.variables.token).toBe("abc");
    expect(seen).toEqual(["https://api.example.com/login", "Bearer abc"]);
  });

  it("runs conditional loops until a condition is met", async () => {
    const flow: Flow = {
      id: "flow_loop",
      name: "Conditional loop",
      createdAt: 1,
      updatedAt: 1,
      steps: [
        {
          id: "loop",
          type: "loop",
          name: "Poll",
          conditionMode: "until",
          condition: {
            source: "variable",
            expression: "counter",
            matcher: "equals",
            expected: "3",
          },
          maxIterations: 10,
          steps: [
            {
              id: "poll",
              type: "request",
              name: "Poll request",
              request: {
                ...emptyRequest(),
                url: "https://api.example.com/poll",
                extractionRules: [
                  {
                    variableName: "counter",
                    source: "body",
                    expression: "$.counter",
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    let counter = 0;
    const runner = new FlowRunner();
    const result = await runner.run(flow, {
      execute: async () => ({
        ...responseFixture(),
        body: JSON.stringify({ counter: String(++counter) }),
      }),
    });

    expect(result.status).toBe("passed");
    expect(counter).toBe(3);
    expect(result.variables.counter).toBe("3");
  });
});

function responseFixture(): ExecuteResponse {
  return {
    status: 200,
    statusText: "200 OK",
    headers: [
      { key: "Content-Type", value: "application/json", enabled: true },
    ],
    body: "{}",
    timing: {
      dnsMs: 0,
      tcpMs: 0,
      tlsMs: 0,
      ttfbMs: 1,
      transferMs: 1,
      totalMs: 2,
    },
    requestSize: 0,
    responseSize: 2,
  };
}

function mockRoute(partial: Partial<MockRoute> = {}): MockRoute {
  return {
    id: "route_1",
    enabled: true,
    method: "GET",
    pathPattern: "/users/:id",
    status: 200,
    headers: [
      { key: "Content-Type", value: "application/json", enabled: true },
    ],
    body: "{}",
    latencyMs: 0,
    ...partial,
  };
}

function flowFixture(partial: Partial<Flow> = {}): Flow {
  return {
    id: "flow_1",
    name: "Smoke flow",
    createdAt: 1,
    updatedAt: 1,
    steps: [
      {
        id: "request_1",
        type: "request",
        name: "List users",
        request: {
          ...emptyRequest(),
          url: "https://api.example.com/users",
          headers: [
            { key: "Accept", value: "application/json", enabled: true },
          ],
        },
      },
    ],
    ...partial,
  };
}

describe("storage migrations", () => {
  it("migrates Alpha v1 flat requests into v2 protocol-aware envelopes", async () => {
    const alpha = new Dexie("invoke-alpha");
    alpha.version(1).stores({
      collections: "id, name, updatedAt",
      requests: "id, collectionId, name, updatedAt",
      environments: "id, name, updatedAt",
      history: "id, createdAt",
      meta: "key",
    });
    await alpha
      .table("collections")
      .add({ id: "col_1", name: "Alpha", createdAt: 1, updatedAt: 1 });
    await alpha.table("requests").add({
      id: "req_1",
      collectionId: "col_1",
      name: "List users",
      method: "GET",
      url: "{{base_url}}/users",
      params: [{ key: "page", value: "1", enabled: true }],
      headers: [{ key: "Accept", value: "application/json", enabled: true }],
      bodyMode: "none",
      body: "",
      auth: { type: "none" },
      timeoutMs: 30000,
      createdAt: 2,
      updatedAt: 2,
    });
    alpha.close();

    const store = new InvokeStore();
    const [collection] = await store.listCollections();
    const [request] = await store.listRequests("col_1");

    expect(collection.variables).toEqual([]);
    expect(collection.sortOrder).toBe(1);
    expect(request.protocol).toBe("rest");
    expect(request.folderId).toBeNull();
    expect(request.request).toMatchObject({
      method: "GET",
      url: "{{base_url}}/users",
      params: [{ key: "page", value: "1", enabled: true }],
    });
    expect(await store.listFolders("col_1")).toEqual([]);
    store.close();
  });

  it("creates nested folders and cascades deletes their requests", async () => {
    const store = new InvokeStore();
    const collection = await store.createCollection("Nested API");
    const auth = await store.createFolder(collection.id, "auth");
    const oauth = await store.createFolder(collection.id, "oauth", auth.id);
    await store.saveRequest(emptyRequest(), "Refresh token", collection.id, {
      folderId: oauth.id,
    });

    expect(await store.listFolders(collection.id)).toHaveLength(2);
    expect(await store.listRequests(collection.id)).toHaveLength(1);

    await store.deleteFolder(auth.id);

    expect(await store.listFolders(collection.id)).toEqual([]);
    expect(await store.listRequests(collection.id)).toEqual([]);
    store.close();
  });

  it("persists v1 flow definitions in IndexedDB", async () => {
    const store = new InvokeStore();
    const saved = await store.saveFlow({
      name: "Smoke flow",
      steps: [{ id: "delay", type: "delay", name: "Wait", delayMs: 1 }],
    });

    expect(saved.id).toBeTruthy();
    expect(await store.listFlows()).toHaveLength(1);

    await store.deleteFlow(saved.id);
    expect(await store.listFlows()).toEqual([]);
    store.close();
  });
});

describe("invoke YAML", () => {
  it("round-trips a .invoke.zip export back into the same collection structure", async () => {
    const { collection, folders, requests } = fixtureCollection();
    const blob = await exportCollectionZip(collection, requests, folders);
    const imported = await importInvokeZip(blob);

    expect(imported.collection.name).toBe(collection.name);
    expect(imported.folders).toHaveLength(1);
    expect(imported.folders[0].name).toBe(folders[0].name);
    expect(imported.requests).toHaveLength(1);
    expect(imported.requests[0].name).toBe(requests[0].name);
    expect(imported.requests[0].folderId).toBe(imported.folders[0].id);
    expect(imported.requests[0].protocol).toBe("rest");
    expect(imported.requests[0].request).toMatchObject({
      method: "POST",
      url: "{{base_url}}/users",
      bodyMode: "json",
      body: '{ "name": "Ada" }',
    });
  });

  it("exports request YAML in the PRD flat request format", async () => {
    const { collection, folders, requests } = fixtureCollection();
    const blob = await exportCollectionZip(collection, requests, folders);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const folderEntry = Object.values(zip.files).find((entry) =>
      entry.name.endsWith("folder.invoke.yaml"),
    );
    const requestEntry = Object.values(zip.files).find((entry) =>
      entry.name.endsWith("create-user.invoke.yaml"),
    );
    expect(folderEntry).toBeDefined();
    expect(requestEntry).toBeDefined();

    const folderDoc = yaml.load(await folderEntry!.async("string")) as any;
    expect(folderDoc).toMatchObject({
      invoke_version: "1.0",
      type: "folder",
      id: folders[0].id,
      name: "users",
    });

    const doc = yaml.load(await requestEntry!.async("string")) as any;
    expect(doc.request).toBeUndefined();
    expect(doc).toMatchObject({
      invoke_version: "1.0",
      type: "request",
      folderId: folders[0].id,
      name: "Create user",
      protocol: "rest",
      method: "POST",
      url: "{{base_url}}/users",
      headers: { "Content-Type": "application/json" },
      body: { type: "json", content: '{ "name": "Ada" }' },
    });
  });

  it("disambiguates duplicate folder and request slugs in ZIP export", async () => {
    const { collection, requests } = fixtureCollection();
    const duplicateFolders: Folder[] = [
      {
        id: "fld_a",
        collectionId: collection.id,
        parentFolderId: null,
        name: "users",
        variables: [],
        sortOrder: 1,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "fld_b",
        collectionId: collection.id,
        parentFolderId: null,
        name: "users",
        variables: [],
        sortOrder: 2,
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    const duplicateRequests: SavedRequest[] = [
      {
        ...requests[0],
        id: "req_a",
        folderId: duplicateFolders[0].id,
        name: "Create user",
      },
      {
        ...requests[0],
        id: "req_b",
        folderId: duplicateFolders[0].id,
        name: "Create user",
      },
      {
        ...requests[0],
        id: "req_c",
        folderId: duplicateFolders[1].id,
        name: "Create user",
      },
    ];

    const blob = await exportCollectionZip(
      collection,
      duplicateRequests,
      duplicateFolders,
    );
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);

    expect(
      names.some((name) => name.includes("users/create-user.invoke.yaml")),
    ).toBe(true);
    expect(
      names.some((name) => name.includes("users/create-user-2.invoke.yaml")),
    ).toBe(true);
    expect(
      names.some((name) => name.includes("users-2/create-user.invoke.yaml")),
    ).toBe(true);
  });
});

function fixtureCollection(): {
  collection: Collection;
  folders: Folder[];
  requests: SavedRequest[];
} {
  const collection: Collection = {
    id: "col_1",
    name: "JSONPlaceholder",
    variables: [
      {
        key: "base_url",
        value: "https://jsonplaceholder.typicode.com",
        enabled: true,
      },
    ],
    sortOrder: 1,
    createdAt: 1,
    updatedAt: 1,
  };
  const request = toRequestConfig({
    ...emptyRequest(),
    method: "POST",
    url: "{{base_url}}/users",
    headers: [
      { key: "Content-Type", value: "application/json", enabled: true },
    ],
    bodyMode: "json",
    body: '{ "name": "Ada" }',
  });
  const folder: Folder = {
    id: "fld_1",
    collectionId: collection.id,
    parentFolderId: null,
    name: "users",
    variables: [],
    sortOrder: 1,
    createdAt: 1,
    updatedAt: 1,
  };
  return {
    collection,
    folders: [folder],
    requests: [
      {
        id: "req_1",
        collectionId: collection.id,
        folderId: folder.id,
        name: "Create user",
        protocol: "rest",
        request,
        sortOrder: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
}
