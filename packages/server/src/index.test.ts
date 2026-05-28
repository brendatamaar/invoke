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
              {
                source: "header",
                expression: "x-mode",
                matcher: "equals",
                expected: "pro",
              },
              {
                source: "query",
                expression: "plan",
                matcher: "equals",
                expected: "pro",
              },
              {
                source: "bodyJsonPath",
                expression: "$.role",
                matcher: "equals",
                expected: "admin",
              },
            ],
          },
          {
            id: "fallback",
            enabled: true,
            method: "POST",
            pathPattern: "/users/:id",
            status: 200,
            headers: [],
            body: "fallback",
          },
        ],
      }),
    });

    const matched = await app.request("/mock/users/42?plan=pro", {
      method: "POST",
      headers: { "x-mode": "pro" },
      body: JSON.stringify({ role: "admin" }),
    });
    expect(matched.status).toBe(202);
    expect(await matched.json()).toMatchObject({
      matched: true,
      id: "42",
      plan: "pro",
    });

    const fallback = await app.request("/mock/users/42?plan=free", {
      method: "POST",
      headers: { "x-mode": "pro" },
      body: JSON.stringify({ role: "admin" }),
    });
    expect(fallback.status).toBe(200);
    expect(await fallback.text()).toBe("fallback");
  });

  it("cycles response sequences and resets them when routes are synced", async () => {
    const route = {
      id: "sequence",
      enabled: true,
      method: "GET",
      pathPattern: "/sequence",
      status: 200,
      headers: [],
      body: "default",
      sequences: [
        { status: 200, headers: [], body: "first" },
        { status: 201, headers: [], body: "second" },
      ],
    };

    await app.request("/api/mock/routes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routes: [route] }),
    });

    const first = await app.request("/mock/sequence");
    expect(first.status).toBe(200);
    expect(await first.text()).toBe("first");

    const second = await app.request("/mock/sequence");
    expect(second.status).toBe(201);
    expect(await second.text()).toBe("second");

    const wrapped = await app.request("/mock/sequence");
    expect(wrapped.status).toBe(200);
    expect(await wrapped.text()).toBe("first");

    await app.request("/api/mock/routes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routes: [route] }),
    });

    const reset = await app.request("/mock/sequence");
    expect(reset.status).toBe(200);
    expect(await reset.text()).toBe("first");
  });
});

describe("webhook receiver", () => {
  it("captures and clears webhook logs", async () => {
    const webhookId = "webhook-test";
    await app.request(`/api/webhook/${webhookId}/logs`, { method: "DELETE" });

    const received = await app.request(`/webhook/${webhookId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Test": "yes",
      },
      body: JSON.stringify({ ok: true }),
    });

    expect(received.status).toBe(200);
    expect(await received.json()).toMatchObject({
      ok: true,
      validationPassed: true,
    });

    const logsResponse = await app.request(`/api/webhook/${webhookId}/logs`);
    const logs = (await logsResponse.json()) as { entries: any[] };
    expect(logs.entries).toHaveLength(1);
    expect(logs.entries[0]).toMatchObject({
      method: "POST",
      body: '{"ok":true}',
      validationPassed: true,
    });
    expect(
      logs.entries[0].headers.some(
        (header: any) => header.key.toLowerCase() === "x-webhook-test" && header.value === "yes",
      ),
    ).toBe(true);

    await app.request(`/api/webhook/${webhookId}/logs`, { method: "DELETE" });
    const clearedResponse = await app.request(`/api/webhook/${webhookId}/logs`);
    const cleared = (await clearedResponse.json()) as { entries: any[] };
    expect(cleared.entries).toEqual([]);
  });
});
