import { chromium } from "playwright";

const BASE = "https://transport-management-ruddy.vercel.app";
const b = await chromium.launch();
const ctx = await b.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const p = await ctx.newPage();
await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await p.fill('input[type="email"]', "omazmz@gmail.com");
await p.fill('input[type="password"]', "Omar2026");
await p.click('button[type="submit"]');
await p.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 }).catch(() => {});

await p.goto(`${BASE}/trips`, { waitUntil: "networkidle" });
const firstTrip = await p.locator('a[href^="/trips/"]').first();
const href = await firstTrip.getAttribute("href").catch(() => null);
if (!href) { console.log("no trip"); await b.close(); process.exit(1); }
await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
await p.waitForTimeout(900);
// The app shell uses an internal <main overflow-y-auto>, not window scroll.
await p.evaluate(() => {
  const main = document.querySelector("main");
  if (main) main.scrollTo(0, 1400);
});
await p.waitForTimeout(500);
await p.screenshot({ path: `/tmp/trips-locked.png`, fullPage: false });
console.log("captured trips-locked");
// And one fullPage so we can see end-to-end
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(300);
await p.screenshot({ path: `/tmp/trips-detail-full.png`, fullPage: true });
console.log("captured trips-detail-full");
await b.close();
