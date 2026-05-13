import { describe, expect, it, vi } from "vitest";
import type { RequestConfig, StoredCookie } from "@invoke/core";
import { injectCookies } from "./cookies";

vi.mock("../../store", () => ({
  coreStore: {
    listCookies: vi.fn(),
    upsertCookies: vi.fn(),
  },
}));

const request: RequestConfig = {
  url: "https://api.example.com/users",
  method: "GET",
  params: [],
  headers: [],
  bodyMode: "none",
  body: "",
  auth: { type: "none" },
  timeoutMs: 30000,
};

const cookies: StoredCookie[] = [
  {
    id: "cookie_1",
    name: "sid",
    value: "abc",
    domain: "api.example.com",
    path: "/",
    secure: true,
    httpOnly: false,
    sameSite: "Lax",
    createdAt: 1,
    updatedAt: 1,
  },
];

describe("execution cookies", () => {
  it("injects matching cookies into requests", () => {
    expect(injectCookies(request, cookies).headers).toContainEqual({
      key: "Cookie",
      value: "sid=abc",
      enabled: true,
    });
  });

  it("appends matching cookies to an existing Cookie header", () => {
    const updated = injectCookies(
      {
        ...request,
        headers: [{ key: "Cookie", value: "theme=dark", enabled: true }],
      },
      cookies,
    );

    expect(updated.headers).toContainEqual({
      key: "Cookie",
      value: "theme=dark; sid=abc",
      enabled: true,
    });
  });

  it("leaves requests unchanged when no cookies match", () => {
    const updated = injectCookies(request, [
      { ...cookies[0], domain: "other.example.com" },
    ]);

    expect(updated).toBe(request);
  });
});
