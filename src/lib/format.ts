/**
 * Money formatting for TX System.
 * KES is base; USD shows alongside on reports.
 */
export type Currency = "KES" | "USD" | "UGX" | "TZS" | "RWF";

const symbols: Record<Currency, string> = {
  KES: "KSh",
  USD: "$",
  UGX: "USh",
  TZS: "TSh",
  RWF: "RF",
};

export function formatMoney(
  amount: number,
  currency: Currency = "KES",
  opts: { compact?: boolean; signed?: boolean } = {},
): string {
  const sign = opts.signed && amount > 0 ? "+" : "";
  const abs = Math.abs(amount);
  const formatted = opts.compact
    ? new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(amount)
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(abs);
  const prefix = amount < 0 ? "−" : sign;
  return `${prefix}${symbols[currency]} ${formatted}`;
}

export function formatNumber(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPercent(n: number, fractionDigits = 1): string {
  return `${(n * 100).toFixed(fractionDigits)}%`;
}
