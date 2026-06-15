import { chromium } from "playwright";

const BASE = "https://transport-management-ruddy.vercel.app";
const b = await chromium.launch();
const ctx = await b.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 1400 },
  deviceScaleFactor: 2,
});
const p = await ctx.newPage();
await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await p.fill('input[type="email"]', "omazmz@gmail.com");
await p.fill('input[type="password"]', "Omar2026");
await p.click('button[type="submit"]');
await p.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 }).catch(() => {});

// 1. Trips list
await p.goto(`${BASE}/trips`, { waitUntil: "networkidle" });
await p.waitForTimeout(900);
await p.screenshot({ path: `/tmp/trips-list.png`, fullPage: false });
console.log("captured trips-list");

// 2. First trip detail — to show the BOL gate (locked sections)
const firstTrip = await p.locator('a[href^="/trips/"]').first();
const href = await firstTrip.getAttribute("href").catch(() => null);
if (href) {
  await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `/tmp/trips-detail.png`, fullPage: true });
  console.log("captured trips-detail");
}

await b.close();
