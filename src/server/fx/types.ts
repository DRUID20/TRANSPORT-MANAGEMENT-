/**
 * FxRateProvider — pluggable interface so we can swap CBK / Frankfurter / a
 * tracking-platform-specific source without touching business logic.
 * See docs/finance/fx-rate-strategy.md.
 */
export type FxRateProviderName = "CBK" | "FRANKFURTER" | "ERAPI" | "MANUAL";

export interface FxRate {
  date: string; // YYYY-MM-DD
  currency: string; // ISO 4217 (e.g. 'USD')
  rateToKes: number;
  source: FxRateProviderName;
}

export interface FxRateProvider {
  name: FxRateProviderName;
  fetch(date: Date, currencies: string[]): Promise<FxRate[]>;
}
