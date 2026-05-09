import type { FxRate, FxRateProvider } from "./types";

/**
 * Frankfurter.app FX rate provider — used as a fallback when CBK is
 * unavailable (weekends, public holidays, parse failures). ECB-sourced.
 *
 * Phase 0: scaffold only; real impl lands in Phase 5.
 */
export const frankfurterProvider: FxRateProvider = {
  name: "FRANKFURTER",
  async fetch(date: Date, currencies: string[]): Promise<FxRate[]> {
    const dateStr = date.toISOString().slice(0, 10);
    const symbols = currencies.filter((c) => c !== "KES").join(",");
    const url = `https://api.frankfurter.app/${dateStr}?from=KES&to=${symbols}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Frankfurter ${res.status}`);
    }
    const json = (await res.json()) as { date: string; rates: Record<string, number> };
    return Object.entries(json.rates).map(([currency, kesPerUnit]) => ({
      date: json.date,
      currency,
      // Frankfurter returns "1 KES = X CCY"; we want "1 CCY = Y KES" → invert.
      rateToKes: 1 / kesPerUnit,
      source: "FRANKFURTER",
    }));
  },
};
