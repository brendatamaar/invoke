import { describe, expect, it } from "vitest";
import { emptyRequest, validateFlow, validateMockRoutes } from "../src/index";
import { flowFixture, mockRoute } from "./fixtures";

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

  it("validates mock response sequences", () => {
    const result = validateMockRoutes([
      mockRoute({
        pathPattern: "/users/:id",
        sequences: [
          {
            status: 204,
            headers: [{ key: "Content-Length", value: "12", enabled: true }],
            body: "sequence body",
            latencyMs: 6000,
          },
        ],
      }),
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toContain(
      "Route 1, sequence 1, header 1: Content-Length is managed by the server and cannot be set manually",
    );
    expect(result.warnings.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Route 1, sequence 1: status 204 should not include a response body",
        "Route 1, sequence 1: latency above 5000ms may make requests feel stalled",
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
