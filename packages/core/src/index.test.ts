import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { emptyRequest, extractVariables, importYamlFiles, parseCurl, resolveRequest, resolveTemplate } from "./index";

describe("variables", () => {
  it("resolves environment and dynamic variables", () => {
    const result = resolveTemplate("{{base_url}}/{{$randomInt}}", { base_url: "https://api.example.com" });
    expect(result.value).toMatch(/^https:\/\/api\.example\.com\/\d+$/);
    expect(result.unresolved).toEqual([]);
  });

  it("tracks unresolved variables", () => {
    const result = resolveTemplate("{{missing}}", {});
    expect(result.value).toBe("{{missing}}");
    expect(result.unresolved).toEqual(["missing"]);
  });
});

describe("request resolution", () => {
  it("applies bearer auth and query params", () => {
    const request = {
      ...emptyRequest(),
      url: "https://example.com/users",
      params: [{ key: "page", value: "1", enabled: true }],
      auth: { type: "bearer" as const, token: "abc" }
    };
    const resolved = resolveRequest(request);
    expect(resolved.request.url).toBe("https://example.com/users?page=1");
    expect(resolved.request.headers).toContainEqual({ key: "Authorization", value: "Bearer abc", enabled: true });
  });
});

describe("imports", () => {
  it("parses a basic curl command", () => {
    const parsed = parseCurl(`curl -H "Authorization: Bearer xyz" https://api.example.com/me`);
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
        timing: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 1, transferMs: 1, totalMs: 2 },
        requestSize: 0,
        responseSize: 18
      },
      [{ name: "token", jsonPath: "$.token" }]
    );
    expect(values.token).toBe("secret");
  });

  it("loads YAML with JSON schema instead of JavaScript tags", async () => {
    const file = new File(["type: !!js/function 'function () { return 1 }'"], "bad.invoke.yaml");
    await expect(importYamlFiles([file])).rejects.toThrow();
  });
});
