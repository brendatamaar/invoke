import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import type { ProxyRequestInput } from "../../types/index.js";
import { MockStore } from "../../services/mock-store.js";
import { ProxyRecordStore } from "../../services/proxy-record-store.js";
import { InvokeApi } from "../index.js";

const MAX_BODY_BYTES = 10 * 1024 * 1024;

export const ProxyLive = HttpApiBuilder.group(InvokeApi, "proxy", (handlers) =>
  handlers
    .handle("request", ({ payload }) =>
      Effect.gen(function* () {
        const input = payload as ProxyRequestInput;
        const headers: Record<string, string> = {};
        for (const header of input.headers) {
          if (header.enabled !== false && header.key) headers[header.key] = header.value;
        }

        const fetchOptions: RequestInit = {
          method: input.method,
          headers,
        };
        if (input.body && input.method !== "GET" && input.method !== "HEAD") {
          fetchOptions.body = input.body;
        }

        const fetched = yield* Effect.tryPromise(() => fetch(input.targetUrl, fetchOptions)).pipe(
          Effect.either,
        );
        if (fetched._tag === "Left") {
          return HttpServerResponse.unsafeJson(
            { error: `Proxy fetch failed: ${String(fetched.left)}` },
            { status: 502 },
          );
        }

        const targetRes = fetched.right;
        const contentLength = Number(targetRes.headers.get("content-length") ?? 0);
        if (contentLength > MAX_BODY_BYTES) {
          return HttpServerResponse.unsafeJson(
            { error: "Response body exceeds 10 MB limit" },
            { status: 502 },
          );
        }

        const responseBody = yield* Effect.promise(() => targetRes.text());
        if (responseBody.length > MAX_BODY_BYTES) {
          return HttpServerResponse.unsafeJson(
            { error: "Response body exceeds 10 MB limit" },
            { status: 502 },
          );
        }

        const responseHeaders: { key: string; value: string }[] = [];
        targetRes.headers.forEach((value, key) => {
          if (
            !["content-encoding", "transfer-encoding", "connection"].includes(key.toLowerCase())
          ) {
            responseHeaders.push({ key, value });
          }
        });

        const url = new URL(input.targetUrl);
        const record = {
          id: crypto.randomUUID(),
          method: input.method,
          path: url.pathname + url.search,
          requestHeaders: input.headers.filter((header) => header.enabled !== false && header.key),
          requestBody: input.body,
          status: targetRes.status,
          responseHeaders,
          responseBody,
          createdAt: Date.now(),
        };
        const records = yield* ProxyRecordStore;
        yield* records.append(record);

        return {
          status: targetRes.status,
          statusText: targetRes.statusText,
          headers: responseHeaders,
          body: responseBody,
          recordId: record.id,
        };
      }),
    )
    .handle("records", () =>
      Effect.gen(function* () {
        const records = yield* ProxyRecordStore;
        return { records: yield* records.list() };
      }),
    )
    .handle("clearRecords", () =>
      Effect.gen(function* () {
        const records = yield* ProxyRecordStore;
        yield* records.clear();
        return { ok: true };
      }),
    )
    .handle("recordsToMocks", ({ payload }) =>
      Effect.gen(function* () {
        const records = yield* ProxyRecordStore;
        const mock = yield* MockStore;
        const selected = yield* records.selectByIds(payload.ids);
        return yield* mock.proxyImport(selected);
      }),
    ),
);
