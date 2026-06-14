import { NextResponse } from "next/server";
import { refreshFxRates } from "@/server/repos/fx";

/**
 * Vercel Cron — daily FX refresh at 17:30 EAT (= 14:30 UTC, Mon–Fri).
 * Schedule lives in vercel.json: { "schedule": "30 14 * * 1-5" }
 *
 * Pulls today's KES/USD/UGX rates from the live providers (CBK → ERAPI →
 * Frankfurter, first that succeeds) and upserts them into fx_rates.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sets this
 * automatically when CRON_SECRET is configured in Vercel project settings).
 * The route refuses to run without it — an open endpoint here would let
 * anyone trigger writes to the fx_rates table.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.FX_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        status: "misconfigured",
        message: "CRON_SECRET (or FX_CRON_SECRET) must be set in Vercel for the FX cron to run.",
      },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
