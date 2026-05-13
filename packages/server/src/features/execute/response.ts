export function normalizeResponse(response: any) {
  const bodyBuffer = bytesFrom(response.body);
  const contentType =
    (response.headers ?? []).find(
      (header: any) => header.key?.toLowerCase() === "content-type",
    )?.value ?? "";
  const isText =
    /text\/|json|xml|html|javascript|css|yaml|csv|urlencoded/i.test(
      contentType,
    ) || contentType === "";
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers ?? [],
    body: isText ? bodyBuffer.toString("utf8") : bodyBuffer.toString("base64"),
    bodyEncoding: isText ? "utf8" : "base64",
    timing: response.timing ?? {},
    tls: response.tls,
    redirects: response.redirects ?? [],
    attempts: response.attempts ?? [],
    requestSize: response.requestSize,
    responseSize: response.responseSize,
    error: response.error,
  };
}

export function bytesFrom(value: unknown) {
  if (!value) return Buffer.alloc(0);
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(value as any);
}
