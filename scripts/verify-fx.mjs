import { chromium } from "playwright";

const BASE = "https://transport-management-ruddy.vercel.app";

// 1) Cron endpoint: should fetch live rates and report source + rates.
const cron = await fetch(`${BASE}/api/cron/fx`).then((r) => r.json()).catch((e) => ({ error: String(e) }));
console.log("CRON /api/cron/fx →", JSON.stringify(cron));

// 2) FX page renders with rates + converter.
const b = await chromium.launch();
const ctx = await b.newContext({ ignoreHTTPSErrors: true });
const p = await ctx.newPage();
await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await p.fill('input[type="email"]', "omazmz@gmail.com");
await p.fill('input[type="password"]', "Omar2026");
await p.click('button[type="submit"]');
await p.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 }).catch(() => {});
await p.goto(`${BASE}/fx`, { waitUntil: "networkidle" });
await p.waitForLoadState("networkidle");
const body = await p.textContent("body");
for (const t of ["Foreign Exchange", "Converter", "1 USD → KES", "1 KES → UGX"]) {
  console.log((body.includes(t) ? "PASS " : "FAIL ") + t);
}
// invoice form auto-fill present
await p.goto(`${BASE}/invoices/new`, { waitUntil: "networkidle" });
const inv = await p.textContent("body");
console.log((inv.includes("Auto-filled from the latest live rate") ? "PASS " : "FAIL ") + "invoice FX auto-fill hint");
await b.close();
