export function prettyBody(body: string, contentType = "") {
  if (contentType.includes("json") || /(^\s*\[|^\s*\{)/.test(body)) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

export function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "request";
}
