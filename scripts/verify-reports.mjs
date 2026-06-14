import { chromium } from "playwright";

const BASE = "https://transport-management-ruddy.vercel.app";
const EMAIL = "omazmz@gmail.com";
const PASSWORD = "Omar2026";

const browser = await chromium.launch();
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();

const errors = [];
page.on("response", (r) => {
  if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
});

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForLoadState("networkidle");
console.log("login →", page.url());

async function check(path, needle) {
  const resp = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const body = await page.textContent("body");
  const ok = resp.status() < 400 && body.includes(needle);
  console.log(`${ok ? "PASS" : "FAIL"}  ${resp.status()}  ${path}  (“${needle}”)`);
}

await check("/reports", "Revenue by Customer");
await check("/reports/revenue-by-customer", "Collection rate");
await check("/reports/driver-performance", "Driver Performance");
await check("/reports/monthly-trend", "Monthly Performance Trend");
await check("/reports/vat-summary", "Net VAT");
await check("/reports/fleet-utilisation", "Fleet Utilisation");
await check("/reports/profit-and-loss", "Profit");

if (errors.length) console.log("5xx seen:\n" + errors.join("\n"));
else console.log("no 5xx responses");

await browser.close();
