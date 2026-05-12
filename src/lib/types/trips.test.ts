import { describe, expect, it } from "vitest";
import {
  computeFuelRevenue,
  correctVolumeTo20C,
  lookupRouteKm,
  ullageVariancePct,
  ULLAGE_ALERT_THRESHOLD_PCT,
} from "./trips";

describe("correctVolumeTo20C", () => {
  // Cubical expansion: V20 = V_obs / (1 + β · (Tobs - 20))
  // AGO β = 0.00084 / °C, PMS β = 0.00120 / °C
  it("loads warmer than 20 °C shrink down to 20 °C — AGO", () => {
    // 40,000 L observed at 35 °C → vcf = 1 / (1 + 0.00084 · 15) ≈ 0.98756
    // → 40,000 · 0.98756 ≈ 39,502 L (rounded)
    expect(correctVolumeTo20C("AGO", 40_000, 35)).toBe(39_502);
  });

  it("loads cooler than 20 °C grow up — AGO", () => {
    // 40,000 L at 10 °C → vcf = 1 / (1 - 0.00084 · 10) ≈ 1.00847
    // → 40,339 L
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
    // 40k loaded, 39.8k discharged → 0.5% loss
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
    // Loaded 40,000 L AGO at 32 °C at KPC Mombasa
    const loaded20C = correctVolumeTo20C("AGO", 40_000, 32);
    // Cooled in transit; discharged 39,820 L at 25 °C at Nairobi customer
    const discharged20C = correctVolumeTo20C("AGO", 39_820, 25);
    const ullage = ullageVariancePct(loaded20C, discharged20C);
    // After temperature correction the apparent loss should be within
    // the acceptable threshold (no real shrinkage, just thermal).
    expect(Math.abs(ullage)).toBeLessThan(ULLAGE_ALERT_THRESHOLD_PCT);
  });
});

describe("computeFuelRevenue", () => {
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

  it("per_litre_per_km × litres × km", () => {
    // 40 000 L × KES 0.012 / L / km × 480 km (Mombasa-Nairobi) = 230 400
    expect(
      computeFuelRevenue({
        basis: "per_litre_per_km",
        amount: 0.012,
        cargoQuantityLitres: 40_000,
        km: 480,
      }),
    ).toBeCloseTo(230_400, 0);
  });

  it("per_litre_per_km with missing km falls through to zero (caller surfaces)", () => {
    // Operator picked an unknown route — we'd rather show zero and let the
    // operator notice than silently bill a nonsense flat fee.
    expect(
      computeFuelRevenue({
        basis: "per_litre_per_km",
        amount: 0.012,
        cargoQuantityLitres: 40_000,
      }),
    ).toBe(0);
  });

  it("per_trip ignores cargo and km", () => {
    expect(
      computeFuelRevenue({
        basis: "per_trip",
        amount: 250_000,
        cargoQuantityLitres: 40_000,
        km: 480,
      }),
    ).toBe(250_000);
  });

  it("per_km × distance, regardless of litres", () => {
    expect(
      computeFuelRevenue({
        basis: "per_km",
        amount: 400,
        cargoQuantityLitres: 40_000,
        km: 480,
      }),
    ).toBe(192_000);
  });

  it("legacy per_tonne basis still multiplies by quantity (seed compatibility)", () => {
    expect(
      computeFuelRevenue({
        basis: "per_tonne",
        amount: 95,
        cargoQuantityLitres: 28,
      }),
    ).toBe(2_660);
  });
});

describe("lookupRouteKm", () => {
  it("returns km for known KPC pairs", () => {
    expect(lookupRouteKm("KPC Mombasa", "Nairobi")).toBe(480);
    expect(lookupRouteKm("KPC Nairobi", "Kampala")).toBe(660);
  });

  it("undefined for unknown pairs — caller must handle it", () => {
    expect(lookupRouteKm("KPC Mombasa", "Lokichogio")).toBeUndefined();
  });
});
