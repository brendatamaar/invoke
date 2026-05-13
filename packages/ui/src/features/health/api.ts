import { readJson } from "../../lib/http";

export async function ping() {
  const response = await fetch("/api/ping");
  return readJson<{
    message: string;
    version: string;
    uptimeMs: number;
  }>(response);
}
