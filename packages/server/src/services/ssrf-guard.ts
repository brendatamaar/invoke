import { Context, Effect, Layer } from "effect";
import { SsrfBlockedError } from "../errors.js";

const PRIVATE_PATTERNS: readonly RegExp[] = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/,
  /^0\.\d+\.\d+\.\d+$/,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];

const ALLOWED_SCHEMES = new Set(["ws:", "wss:", "http:", "https:"]);

export class SsrfGuard extends Context.Tag("SsrfGuard")<
  SsrfGuard,
  {
    readonly check: (url: string) => Effect.Effect<void, SsrfBlockedError>;
  }
>() {}

export const SsrfGuardLive = Layer.succeed(SsrfGuard, {
  check: (rawUrl) =>
    Effect.gen(function* () {
      if (process.env.INVOKE_SSRF_GUARD !== "true") return;

      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return yield* Effect.fail(new SsrfBlockedError({ url: rawUrl, reason: "Invalid URL" }));
      }

      if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
        return yield* Effect.fail(
          new SsrfBlockedError({
            url: rawUrl,
            reason: `Unsupported scheme: ${parsed.protocol}`,
          }),
        );
      }

      const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
      if (PRIVATE_PATTERNS.some((pattern) => pattern.test(hostname))) {
        return yield* Effect.fail(
          new SsrfBlockedError({
            url: rawUrl,
            reason: "Requests to private/internal addresses are not allowed",
          }),
        );
      }
    }),
});
