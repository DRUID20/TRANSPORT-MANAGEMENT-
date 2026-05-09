import { NextResponse } from "next/server";

/**
 * Vercel Cron — daily FX refresh at 17:30 EAT (= 14:30 UTC).
 * Phase 0: stub returns OK with todo. Real implementation lands in Phase 5.
 *
 * Cron schedule lives in vercel.json: { "schedule": "30 14 * * 1-5" }
 *
 * Auth: protected by FX_CRON_SECRET header so only Vercel Cron can hit it.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.FX_CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "FX_CRON_SECRET not configured" }, { status: 500 });
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
