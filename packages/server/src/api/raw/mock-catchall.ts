import type { KeyValue } from "@invoke/core";
import { HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import { renderMockTemplate } from "../../services/mock-match.js";
import { MockStore } from "../../services/mock-store.js";

const MAX_MOCK_REQUEST_BODY_BYTES = 1024 * 1024;

const requestHeaders = (headers: Record<string, string>): KeyValue[] =>
  Object.entries(headers).map(([key, value]) => ({
    key,
    value,
    enabled: true,
  }));

export const mockCatchAll = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const url = new URL(request.url, "http://_");
  const path = url.pathname.replace(/^\/mock/, "") || "/";
  const method = request.method.toUpperCase();
  const headers = requestHeaders(request.headers as Record<string, string>);

  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (contentLength > MAX_MOCK_REQUEST_BODY_BYTES) {
    return HttpServerResponse.text("Mock request body too large", {
      status: 413,
    });
  }

  const body = yield* request.text;
  if (Buffer.byteLength(body) > MAX_MOCK_REQUEST_BODY_BYTES) {
    return HttpServerResponse.text("Mock request body too large", {
      status: 413,
    });
  }

  const store = yield* MockStore;
  const matched = yield* store.findMatch(method, path, headers, url.searchParams, body);

  if (!matched) {
    yield* store.appendLog({
      matched: false,
      method,
      path,
      status: 404,
      headers,
      body,
    });
    return HttpServerResponse.text("No mock route matched", { status: 404 });
  }

  const activeItem = yield* store.nextSequenceItem(matched.route);
  if (activeItem.latencyMs) {
    yield* Effect.sleep(`${activeItem.latencyMs} millis`);
  }

  const responseBody = renderMockTemplate(activeItem.body, matched.params, url.searchParams);
  const responseHeaders = Object.fromEntries(
    ((activeItem.headers ?? []) as KeyValue[])
      .filter((header) => header.enabled !== false && header.key.trim())
      .map((header) => [header.key, header.value]),
  );

  yield* store.appendLog({
    routeId: matched.route.id,
    matched: true,
    method,
    path,
    status: activeItem.status,
    headers,
    body,
  });

  return HttpServerResponse.text(responseBody, {
    status: activeItem.status,
    headers: responseHeaders,
  });
});
