const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  return btoa(
    String.fromCharCode(
      ...new Uint8Array(
        buf instanceof ArrayBuffer
          ? buf
          : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      ),
    ),
  );
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as Uint8Array<ArrayBuffer>,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function generateSalt(): Promise<{
  salt: Uint8Array;
  saltBase64: string;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return { salt, saltBase64: toBase64(salt) };
}

export async function deriveKeyFromPassphrase(
  passphrase: string,
  saltBase64: string,
): Promise<CryptoKey> {
  return deriveKey(passphrase, fromBase64(saltBase64));
}

export async function encryptJson(data: unknown, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  // pack: iv(12) | ciphertext
  const packed = new Uint8Array(IV_BYTES + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), IV_BYTES);
  return toBase64(packed);
}

export async function decryptJson<T>(encrypted: string, key: CryptoKey): Promise<T> {
  const packed = fromBase64(encrypted);
  const iv = packed.slice(0, IV_BYTES);
  const ciphertext = packed.slice(IV_BYTES);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
