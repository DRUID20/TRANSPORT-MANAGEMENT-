import type { FxRate, FxRateProvider } from "./types";

/**
 * Central Bank of Kenya FX rate provider.
 *
 * Phase 0: scaffold only — full HTML scrape lands in Phase 5 when we wire the
 * Vercel Cron + persistence to the fx_rates table. Endpoint:
 * https://www.centralbank.go.ke/rates/forex-exchange-rates/
 */
export const cbkProvider: FxRateProvider = {
  name: "CBK",
  async fetch(_date: Date, _currencies: string[]): Promise<FxRate[]> {
    // TODO (Phase 5): scrape CBK HTML / CSV; parse to FxRate[]; validate schema.
    throw new Error("cbkProvider.fetch not yet implemented (Phase 5)");
  },
};
