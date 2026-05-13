import { describe, expect, it } from "vitest";
import { compareResponses, extractVariables, runAssertions } from "./index";
import { responseFixture } from "./test-fixtures";

describe("response processing", () => {
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
});
