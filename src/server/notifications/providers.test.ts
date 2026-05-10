import { describe, expect, it } from "vitest";
import { smsSegments } from "./providers";

describe("smsSegments", () => {
  it("returns 1 for a short ASCII body", () => {
    expect(smsSegments("Hello, world.")).toBe(1);
  });

  it("counts a 161-char ASCII body as 2 segments", () => {
    expect(smsSegments("a".repeat(161))).toBe(2);
  });

  it("counts a 160-char ASCII body as 1 segment (single-segment limit)", () => {
    expect(smsSegments("a".repeat(160))).toBe(1);
  });

  it("counts a 306-char ASCII body as 2 segments (multipart cap is 153 each)", () => {
    expect(smsSegments("a".repeat(306))).toBe(2);
  });

  it("counts a 307-char ASCII body as 3 segments", () => {
    expect(smsSegments("a".repeat(307))).toBe(3);
  });

  it("counts a 71-char unicode body as 2 segments", () => {
    expect(smsSegments("è".repeat(71))).toBe(2);
  });

  it("counts a 70-char unicode body as 1 segment", () => {
    expect(smsSegments("è".repeat(70))).toBe(1);
  });
});
