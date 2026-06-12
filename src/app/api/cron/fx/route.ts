import { NextResponse } from "next/server";

/**
 * Vercel Cron — daily FX refresh at 17:30 EAT (= 14:30 UTC).
 * Phase 0: stub returns OK with todo. Real implementation lands with the
 * Supabase fx_rates table.
 *
 * Cron schedule lives in vercel.json: { "schedule": "30 14 * * 1-5" }
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` using the
 * reserved CRON_SECRET env var, so we accept that name as well as the
 * project-specific FX_CRON_SECRET. With neither configured the stub
 * answers 200/skipped — a missing secret on a no-op stub should not page
 * anyone with 5xx noise in the cron logs.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.FX_CRON_SECRET ?? process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({
      status: "skipped",
      message: "No cron secret configured — set CRON_SECRET (or FX_CRON_SECRET) in Vercel.",
    });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // TODO (Phase 5): try CBK → fallback to Frankfurter → upsert into fx_rates.
  return NextResponse.json({
    status: "stub",
    message: "FX cron not yet implemented (Phase 5).",
    ranAt: new Date().toISOString(),
  });
}
