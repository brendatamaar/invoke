import { describe, expect, it } from "vitest";
import { app } from "./index.js";

describe("mock routes", () => {
  it("evaluates header, query, and body JSONPath conditions before selecting a route", async () => {
    await app.request("/api/mock/routes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routes: [
          {
            id: "conditional",
            enabled: true,
            method: "POST",
            pathPattern: "/users/:id",
            status: 202,
            headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
            body: '{ "matched": true, "id": "{{param.id}}", "plan": "{{query.plan}}" }',
            conditions: [
              { source: "header", expression: "x-mode", matcher: "equals", expected: "pro" },
              { source: "query", expression: "plan", matcher: "equals", expected: "pro" },
              { source: "bodyJsonPath", expression: "$.role", matcher: "equals", expected: "admin" }
            ]
          },
          {
            id: "fallback",
            enabled: true,
            method: "POST",
            pathPattern: "/users/:id",
            status: 200,
            headers: [],
            body: "fallback"
          }
        ]
      })
    });

    const matched = await app.request("/mock/users/42?plan=pro", {
      method: "POST",
      headers: { "x-mode": "pro" },
      body: JSON.stringify({ role: "admin" })
    });
    expect(matched.status).toBe(202);
    expect(await matched.json()).toMatchObject({ matched: true, id: "42", plan: "pro" });

    const fallback = await app.request("/mock/users/42?plan=free", {
      method: "POST",
      headers: { "x-mode": "pro" },
      body: JSON.stringify({ role: "admin" })
    });
    expect(fallback.status).toBe(200);
    expect(await fallback.text()).toBe("fallback");
  });
});
