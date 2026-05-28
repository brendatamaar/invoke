import { describe, expect, it } from "vitest";
import {
  emptyRequest,
  FlowRunner,
  runPostResponseScript,
  runPreRequestScript,
  type Flow,
} from "../src/index";
import { responseFixture } from "./fixtures";

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
            extractionRules: [{ variableName: "token", source: "body", expression: "$.token" }],
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
          request.headers.find((header) => header.key === "Authorization")?.value ?? request.url,
        );
        return {
          ...responseFixture(),
          body: request.url.endsWith("/login") ? JSON.stringify({ token: "abc" }) : "{}",
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
