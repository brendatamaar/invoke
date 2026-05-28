import { expect, it } from "vitest";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { SsrfGuard, SsrfGuardLive } from "./ssrf-guard.js";

const originalGuard = process.env.INVOKE_SSRF_GUARD;

beforeEach(() => {
  process.env.INVOKE_SSRF_GUARD = "true";
});

afterEach(() => {
  if (originalGuard === undefined) {
    delete process.env.INVOKE_SSRF_GUARD;
  } else {
    process.env.INVOKE_SSRF_GUARD = originalGuard;
  }
});

it("blocks private IPv4 targets when enabled", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const guard = yield* SsrfGuard;
      const result = yield* Effect.either(guard.check("http://10.0.0.5/path"));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("SsrfBlockedError");
      }
    }).pipe(Effect.provide(SsrfGuardLive)),
  );
});

it("blocks unsupported schemes when enabled", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const guard = yield* SsrfGuard;
      const result = yield* Effect.either(guard.check("file:///etc/passwd"));
      expect(result._tag).toBe("Left");
    }).pipe(Effect.provide(SsrfGuardLive)),
  );
});

it("allows public hosts when enabled", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const guard = yield* SsrfGuard;
      yield* guard.check("https://example.com/");
    }).pipe(Effect.provide(SsrfGuardLive)),
  );
});

it("is a no-op when disabled", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      process.env.INVOKE_SSRF_GUARD = "false";
      const guard = yield* SsrfGuard;
      yield* guard.check("http://127.0.0.1/");
    }).pipe(Effect.provide(SsrfGuardLive)),
  );
});
