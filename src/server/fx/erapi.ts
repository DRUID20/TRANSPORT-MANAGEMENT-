import type { FxRate, FxRateProvider } from "./types";

/**
 * open.er-api.com (ExchangeRate-API open access) — the live source that
 * actually covers the currencies this business runs on: KES, USD and UGX.
 *
 * ECB-based feeds (Frankfurter) do NOT publish KES or UGX, so they can't price
 * the KES/USD/UGX triangle. This endpoint is free, needs no API key, and
 * refreshes daily.
 *
 * It returns rates with USD as base (`rates[X]` = units of X per 1 USD), so we
 * derive "1 unit of CCY = N KES" as (KES per USD) / (CCY per USD).
 */
export const erApiProvider: FxRateProvider = {
  name: "ERAPI",
  async fetch(date: Date, currencies: string[]): Promise<FxRate[]> {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (!res.ok) throw new Error(`er-api ${res.status}`);
    const json = (await res.json()) as {
      result: string;
      rates?: Record<string, number>;
    };
    const rates = json.rates;
    if (json.result !== "success" || !rates || !rates.KES) {
      throw new Error("er-api: response missing KES rate");
    }
    const kesPerUsd = rates.KES;
    const dateStr = date.toISOString().slice(0, 10);

    const out: FxRate[] = [];
    for (const ccy of currencies) {
      if (ccy === "KES") {
        out.push({ date: dateStr, currency: "KES", rateToKes: 1, source: "ERAPI" });
        continue;
      }
      const perUsd = rates[ccy];
      if (!perUsd || perUsd <= 0) continue;
      out.push({ date: dateStr, currency: ccy, rateToKes: kesPerUsd / perUsd, source: "ERAPI" });
    }
    return out;
  },
};
