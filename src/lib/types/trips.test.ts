import { describe, expect, it } from "vitest";
import {
  computeFuelRevenue,
  correctVolumeTo20C,
  ullageVariancePct,
  ULLAGE_ALERT_THRESHOLD_PCT,
} from "./trips";

describe("correctVolumeTo20C", () => {
  // Cubical expansion: V20 = V_obs / (1 + β · (Tobs - 20))
  // AGO β = 0.00084 / °C, PMS β = 0.00120 / °C
  it("loads warmer than 20 °C shrink down to 20 °C — AGO", () => {
    expect(correctVolumeTo20C("AGO", 40_000, 35)).toBe(39_502);
  });

  it("loads cooler than 20 °C grow up — AGO", () => {
    expect(correctVolumeTo20C("AGO", 40_000, 10)).toBe(40_339);
  });

  it("PMS contracts faster than AGO for the same Δ°C", () => {
    const ago = correctVolumeTo20C("AGO", 40_000, 35);
    const pms = correctVolumeTo20C("PMS", 40_000, 35);
    expect(pms).toBeLessThan(ago);
  });

  it("at exactly 20 °C the volume is unchanged", () => {
    expect(correctVolumeTo20C("AGO", 40_000, 20)).toBe(40_000);
    expect(correctVolumeTo20C("PMS", 30_000, 20)).toBe(30_000);
  });
});

describe("ullageVariancePct", () => {
  it("returns 0 when discharge equals load", () => {
    expect(ullageVariancePct(40_000, 40_000)).toBe(0);
  });

  it("is positive when there's a loss", () => {
    expect(ullageVariancePct(40_000, 39_800)).toBeCloseTo(0.5, 2);
  });

  it("is negative when discharge exceeds loaded (suspicious gain)", () => {
    expect(ullageVariancePct(40_000, 40_200)).toBeCloseTo(-0.5, 2);
  });

  it("loss exactly at the threshold is acceptable; just above is an alert", () => {
    const loaded = 40_000;
    const atThreshold = loaded * (1 - ULLAGE_ALERT_THRESHOLD_PCT / 100);
    expect(ullageVariancePct(loaded, atThreshold)).toBeCloseTo(
      ULLAGE_ALERT_THRESHOLD_PCT,
      5,
    );
    const justAbove = loaded * (1 - (ULLAGE_ALERT_THRESHOLD_PCT + 0.05) / 100);
    expect(ullageVariancePct(loaded, justAbove)).toBeGreaterThan(
      ULLAGE_ALERT_THRESHOLD_PCT,
    );
  });
});

describe("end-to-end: loading + discharge → ullage", () => {
  it("typical AGO round-trip — Mombasa to Nairobi", () => {
    const loaded20C = correctVolumeTo20C("AGO", 40_000, 32);
    const discharged20C = correctVolumeTo20C("AGO", 39_820, 25);
    const ullage = ullageVariancePct(loaded20C, discharged20C);
    expect(Math.abs(ullage)).toBeLessThan(ULLAGE_ALERT_THRESHOLD_PCT);
  });
});

describe("computeFuelRevenue", () => {
  it("per_m3 × cubic metres (litres ÷ 1000)", () => {
    // 40 000 L = 40 m³ @ USD 85 / m³ → 3 400 USD
    expect(
      computeFuelRevenue({
        basis: "per_m3",
        amount: 85,
        cargoQuantityLitres: 40_000,
      }),
    ).toBe(3_400);
  });

  it("per_litre × cargo litres", () => {
    // 40 000 L AGO @ KES 8.50 / L → 340 000 KES
    expect(
      computeFuelRevenue({
        basis: "per_litre",
        amount: 8.5,
        cargoQuantityLitres: 40_000,
      }),
    ).toBe(340_000);
  });

  it("per_trip is the flat amount regardless of volume", () => {
    expect(
      computeFuelRevenue({
        basis: "per_trip",
        amount: 250_000,
        cargoQuantityLitres: 40_000,
      }),
    ).toBe(250_000);
  });
});
