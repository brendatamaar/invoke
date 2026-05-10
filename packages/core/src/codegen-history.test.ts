import { describe, expect, it } from "vitest";
import {
  emptyRequest,
  generateCodeSnippet,
  resolveRequest,
  searchHistory,
  type HistoryEntry,
} from "./index";
import { responseFixture } from "./test-fixtures";

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
