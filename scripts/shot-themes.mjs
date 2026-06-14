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

for (const theme of ["light", "dark"]) {
  await p.evaluate((t) => localStorage.setItem("theme", t), theme);
  await p.goto(`${BASE}/reports/fleet-utilisation`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700); // let content-in settle
  await p.screenshot({ path: `/tmp/theme-${theme}.png` });
  console.log(`captured ${theme}`);
}
await b.close();
