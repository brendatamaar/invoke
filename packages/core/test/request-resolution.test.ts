import { describe, expect, it } from "vitest";
import {
  emptyRequest,
  graphQLToRequestConfig,
  resolveGraphQLRequest,
  resolveRequest,
  signAwsSigV4Request,
} from "../src/index";

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
    const resolved = resolveRequest(request, [{ variables: { apiKey: "secret value" } }]);
    expect(new URL(resolved.request.url).searchParams.get("api_key")).toBe("secret value");
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
    expect(new URL(resolved.request.url).searchParams.get("q")).toBe("hello world");
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

    expect(resolved.request.url).toBe("https://env.example.com/v1/folder-token/request");
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
      signed.headers.find((header) => header.key === "Authorization")?.value ?? "";
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
        headers: [{ key: "Authorization", value: "Bearer {{token}}", enabled: true }],
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
