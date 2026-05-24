import { describe, expect, it } from "vitest";
import { fmt, fmtMs, fmtSize } from "../features/response/components/responseFormatting";

describe("response formatting", () => {
  it("formats request timings", () => {
    expect(fmt(999)).toBe("999ms");
    expect(fmt(1500)).toBe("1.50s");
  });

  it("formats byte sizes", () => {
    expect(fmtSize(512)).toBe("512 B");
    expect(fmtSize(2048)).toBe("2.0 KB");
    expect(fmtSize(2 * 1024 * 1024)).toBe("2.00 MB");
  });

  it("formats millisecond segments with clamping and precision", () => {
    expect(fmtMs(-5)).toBe("0.0ms");
    expect(fmtMs(0.456)).toBe("0.46ms");
    expect(fmtMs(12.34)).toBe("12.3ms");
    expect(fmtMs(123.45)).toBe("123ms");
  });
});
