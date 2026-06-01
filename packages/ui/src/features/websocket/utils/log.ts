export function tryPrettyJson(body: string): string | null {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return null;
  }
}

export function byteSize(str: string): number {
  return new TextEncoder().encode(str).length;
}

export function decodeBinaryBody(base64: string): string {
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
    }
  } catch {
    return base64;
  }
}

export function decodedByteSize(base64: string): number {
  try {
    return atob(base64).length;
  } catch {
    return byteSize(base64);
  }
}
