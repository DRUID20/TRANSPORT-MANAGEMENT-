import { NextResponse } from "next/server";
import { refreshFxRates } from "@/server/repos/fx";

/**
 * Vercel Cron — daily FX refresh at 17:30 EAT (= 14:30 UTC, Mon–Fri).
 * Schedule lives in vercel.json: { "schedule": "30 14 * * 1-5" }
 *
 * Pulls today's KES/USD/UGX rates from the live providers (CBK → ERAPI →
 * Frankfurter, first that succeeds) and upserts them into fx_rates.
 *
 * Auth: if CRON_SECRET (or FX_CRON_SECRET) is set, we require Vercel's
 * `Authorization: Bearer ${secret}` header. If neither is configured the job
 * still runs — it only fetches public rates and writes them — so live FX works
 * out of the box; set the secret to lock the endpoint down.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.FX_CRON_SECRET ?? process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await refreshFxRates();
    return NextResponse.json({
      status: result.ok ? "ok" : "failed",
      source: result.source ?? null,
      rates: result.rates,
      error: result.error ?? null,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "unknown", ranAt: new Date().toISOString() },
      { status: 500 },
    );
  }
}
