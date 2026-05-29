export function normalizeJsonBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body));
  } catch {
    return body;
  }
}

export function resolveDynamicVars(text: string): string {
  return text
    .replace(/\{\{\$timestamp\}\}/g, String(Date.now()))
    .replace(/\{\{\$isoTimestamp\}\}/g, new Date().toISOString())
    .replace(/\{\{\$randomUUID\}\}/g, crypto.randomUUID())
    .replace(/\{\{\$randomInt\}\}/g, String(Math.floor(Math.random() * 1_000_000)));
}
