/**
 * FX rates repo — global (rates are not org-scoped), dual-mode.
 *
 * Stores one row per (rateDate, currency) with the rate expressed as
 * `rateToKes` = how many KES one unit of that currency is worth. KES itself is
 * always 1, so we only persist USD and UGX. Cross-rates (USD↔UGX) are derived
 * via KES by the consumers.
 *
 * `refreshFxRates` pulls today's rates from the live providers (CBK → ERAPI →
 * Frankfurter, first that succeeds) and upserts them; it's driven by the daily
 * Vercel Cron and the manual "refresh" button on the FX page.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { getDb } from "@/server/db/client";
import { fxRates } from "@/server/db/schema";
import { cbkProvider } from "@/server/fx/cbk";
import { erApiProvider } from "@/server/fx/erapi";
import { frankfurterProvider } from "@/server/fx/frankfurter";
import type { FxRateProviderName } from "@/server/fx/types";

/** Currencies we track against the KES base. */
export const TRACKED_CURRENCIES = ["USD", "UGX"] as const;

/** Sensible fallbacks used in demo mode or before the first live fetch. */
const FALLBACK_TO_KES: Record<string, number> = { KES: 1, USD: 129.41, UGX: 0.0347 };

export interface FxRateView {
  currency: string;
  rateToKes: number;
  rateDate: string;
  source: FxRateProviderName;
  fetchedAt?: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Latest stored rate for each tracked currency (newest rateDate wins). */
export async function getLatestFxRates(): Promise<FxRateView[]> {
  if (IS_DEMO_MODE) {
    return TRACKED_CURRENCIES.map((c) => ({
      currency: c,
      rateToKes: FALLBACK_TO_KES[c]!,
      rateDate: todayStr(),
      source: "MANUAL" as FxRateProviderName,
    }));
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(fxRates)
    .where(inArray(fxRates.currency, [...TRACKED_CURRENCIES]))
    .orderBy(desc(fxRates.rateDate));
  const byCcy = new Map<string, FxRateView>();
  for (const r of rows) {
    if (!byCcy.has(r.currency)) {
      byCcy.set(r.currency, {
        currency: r.currency,
        rateToKes: Number(r.rateToKes),
        rateDate: r.rateDate,
        source: r.source as FxRateProviderName,
        fetchedAt: r.fetchedAt?.toISOString(),
      });
    }
  }
  return TRACKED_CURRENCIES.map(
    (c) =>
      byCcy.get(c) ?? {
        currency: c,
        rateToKes: FALLBACK_TO_KES[c]!,
        rateDate: todayStr(),
        source: "MANUAL" as FxRateProviderName,
      },
  );
}

/** Convenience: `{ KES: 1, USD: n, UGX: n }` of KES-equivalents. */
export async function getRatesToKesMap(): Promise<Record<string, number>> {
  const rates = await getLatestFxRates();
  const map: Record<string, number> = { KES: 1 };
  for (const r of rates) map[r.currency] = r.rateToKes;
  return map;
}

/** Recent history for one currency, oldest→newest (for a sparkline). */
export async function listFxHistory(currency: string, limit = 30): Promise<FxRateView[]> {
  if (IS_DEMO_MODE) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(fxRates)
    .where(eq(fxRates.currency, currency))
    .orderBy(desc(fxRates.rateDate))
    .limit(limit);
  return rows
    .map((r) => ({
      currency: r.currency,
      rateToKes: Number(r.rateToKes),
      rateDate: r.rateDate,
      source: r.source as FxRateProviderName,
    }))
    .reverse();
}

export async function upsertFxRate(input: {
  rateDate: string;
  currency: string;
  rateToKes: number;
  source: FxRateProviderName;
  overrideReason?: string;
  overrideBy?: string;
}): Promise<void> {
  if (IS_DEMO_MODE) return;
  const db = getDb();
  const existing = (
    await db
      .select({ id: fxRates.id })
      .from(fxRates)
      .where(and(eq(fxRates.rateDate, input.rateDate), eq(fxRates.currency, input.currency)))
      .limit(1)
  )[0];
  if (existing) {
    await db
      .update(fxRates)
      .set({
        rateToKes: String(input.rateToKes),
        source: input.source,
        fetchedAt: new Date(),
        overrideReason: input.overrideReason ?? null,
        overrideBy: input.overrideBy ?? null,
      })
      .where(eq(fxRates.id, existing.id));
  } else {
    await db.insert(fxRates).values({
      rateDate: input.rateDate,
      currency: input.currency,
      rateToKes: String(input.rateToKes),
      source: input.source,
      overrideReason: input.overrideReason ?? null,
      overrideBy: input.overrideBy ?? null,
    });
  }
}

export interface RefreshResult {
  ok: boolean;
  source?: FxRateProviderName;
  rates: FxRateView[];
  error?: string;
}

/**
 * Pull today's rates from the providers in priority order and persist them.
 * CBK is preferred (auditor-grade) but is still a stub, so in practice this
 * falls through to ERAPI which covers KES/USD/UGX.
 */
export async function refreshFxRates(date = new Date()): Promise<RefreshResult> {
  if (IS_DEMO_MODE) {
    return {
      ok: true,
      source: "MANUAL",
      rates: await getLatestFxRates(),
    };
  }
  const providers = [cbkProvider, erApiProvider, frankfurterProvider];
  const wanted = new Set<string>([...TRACKED_CURRENCIES]);
  for (const provider of providers) {
    try {
      const fetched = await provider.fetch(date, [...TRACKED_CURRENCIES]);
      const useful = fetched.filter(
        (f) => wanted.has(f.currency) && Number.isFinite(f.rateToKes) && f.rateToKes > 0,
      );
      if (useful.length === 0) continue;
      for (const f of useful) {
        await upsertFxRate({
          rateDate: f.date,
          currency: f.currency,
          rateToKes: f.rateToKes,
          source: f.source,
        });
      }
      return {
        ok: true,
        source: provider.name,
        rates: useful.map((f) => ({
          currency: f.currency,
          rateToKes: f.rateToKes,
          rateDate: f.date,
          source: f.source,
        })),
      };
    } catch {
      // try the next provider
    }
  }
  return { ok: false, rates: [], error: "All FX providers failed" };
}
