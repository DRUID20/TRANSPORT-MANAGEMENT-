import { describe, expect, it } from "vitest";
import { formatMoney, formatNumber, formatPercent } from "./format";

describe("formatMoney", () => {
  it("formats positive KES with two decimals", () => {
    expect(formatMoney(1234567.89, "KES")).toBe("KSh 1,234,567.89");
  });

  it("formats negative amounts with a minus sign", () => {
    expect(formatMoney(-1500, "KES")).toContain("KSh");
    expect(formatMoney(-1500, "KES").startsWith("−")).toBe(true);
  });

  it("formats USD", () => {
    expect(formatMoney(99.5, "USD")).toBe("$ 99.50");
  });

  it("compact form uses suffixes", () => {
    expect(formatMoney(1_500_000, "KES", { compact: true })).toContain("KSh");
  });

  it("signed adds + on positives", () => {
    expect(formatMoney(100, "KES", { signed: true }).startsWith("+")).toBe(true);
  });
});

describe("formatNumber", () => {
  it("formats with thousand separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

describe("formatPercent", () => {
  it("formats fraction as percent", () => {
    expect(formatPercent(0.082)).toBe("8.2%");
  });
});
