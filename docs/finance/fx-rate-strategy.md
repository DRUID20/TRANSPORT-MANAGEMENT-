# FX Rate Strategy — TX System

Status: **Plan only. No code yet.**
Last updated: 2026-05-09

---

## 1. Why this matters

TX System reports KES primary + USD equivalent and posts transactions in KES, USD, UGX, TZS, RWF (cross-border operations). Every monetary line stores its FX rate at posting; period-end revaluation needs reliable daily rates. The choice of FX source affects:

- **What auditors accept** in the year-end financials (in Kenya, CBK is the authoritative rate).
- **What KRA accepts** for VAT, PAYE, and corporation tax computations.
- **Reproducibility** of historical reports (we must always be able to recompute past months).
- **Resilience** when a single source is down (weekends, public holidays, outage).

## 2. Provider choice

### 2.1 Primary — Central Bank of Kenya (CBK)

- **URL**: <https://www.centralbank.go.ke/rates/forex-exchange-rates/>
- **Why primary**:
  - Official Kenyan FX rate. The reference rate KRA expects for tax computations.
  - Auditors (Kenya: KPMG, PwC, Deloitte, EY, RSM, etc.) sign off on CBK rates without question.
  - Free.
  - Covers KES vs USD, GBP, EUR, JPY, ZAR, UGX, TZS, RWF, ETB, BIF, SOS — all currencies we need.
- **How fetched**: HTML / downloadable CSV scraped on a scheduled daily job. CBK does not publish a formal REST API; we parse the table off the published page. A small, well-tested scraper with strict schema validation guards against silent breakage.
- **Cadence**: CBK publishes Mon–Fri (no public holidays). Job runs daily 17:30 EAT after publication.

### 2.2 Fallback — Frankfurter.app

- **URL**: <https://api.frankfurter.app>
- **Why fallback**:
  - Free, no API key, REST.
  - ECB-sourced — well-known, stable, mid-market rates.
  - REST means it's robust against parsing failures (CBK's HTML layout could change).
  - Used **only** when CBK is unavailable, on weekends/public holidays, or for cross-rates CBK doesn't publish.
- **Drawback**: ECB rates differ from CBK rates by typically 0.1–0.3%. For the reported financials we always prefer CBK; Frankfurter is only a gap-filler. Any day where CBK is missing and Frankfurter is used is **flagged in the audit log** so it can be revised once CBK publishes.

### 2.3 Manual override

A finance user with the `Finance` role can override any rate with a mandatory `reason` field. The override is captured in the audit log with user, timestamp, before/after values, and reason. Used for backdated corrections or unusual situations (rate halt, data error).

## 3. Why not the alternatives

| Provider | Reason rejected |
|---|---|
| openexchangerates.org | Free tier is USD-base only; full coverage is paid; not the rate KRA / Kenyan auditors use. |
| exchangerate.host | Reliability has been spotty in 2024–2025 (multiple outages, ownership change, rate-limited). |
| Fixer.io / CurrencyLayer | Paid for non-EUR base; not authoritative for Kenya. |
| Wise API | Mid-market rate — differs from CBK indicative rate; not what auditors accept. Also requires a Wise account. |
| xe.com Currency Data API | Paid; commercial mid-market; not aligned with Kenyan reporting standard. |
| OANDA | Paid; commercial; same alignment problem. |

## 4. Architecture (planned, not built)

### 4.1 `fx_rates` table

```
fx_rates(
  date          DATE,
  currency      TEXT,         -- e.g. 'USD', 'UGX', 'TZS', 'RWF'
  rate_to_kes   NUMERIC(18,8),
  source        TEXT,         -- 'CBK' | 'FRANKFURTER' | 'MANUAL'
  fetched_at    TIMESTAMPTZ,
  PRIMARY KEY (date, currency, source)
)
```

A view `fx_rate_authoritative(date, currency)` returns the highest-priority rate for each (date, currency): MANUAL > CBK > FRANKFURTER.

### 4.2 `FxRateProvider` interface

```ts
interface FxRateProvider {
  name: 'CBK' | 'FRANKFURTER' | 'MANUAL';
  fetch(date: Date, currencies: string[]): Promise<Rate[]>;
}
```

Daily job tries CBK → on any error, falls back to Frankfurter → logs to Sentry if both fail.

### 4.3 Daily refresh

- **Vercel Cron**: `30 14 * * 1-5` (= 17:30 EAT) Monday–Friday.
- Fetches today's rates for all currencies in use plus a configurable watchlist.
- Idempotent: re-running won't duplicate rows.
- Backfills: on first deploy and once a week, the job checks the last 30 days for any (date, currency) gaps and fetches them.

### 4.4 Usage rules

- **Posting transactions**: rate at posting date is captured immutably on each GL line (`amount`, `currency`, `fx_rate_at_posting`, `posted_amount_in_kes`).
- **Period-end IS**: period-average rate.
- **Period-end SFP**: period-end (closing) rate.
- **Revaluation entries**: difference between rate at posting and rate at period-end, posted to:
  - `710300 Unrealised FX Gain` / `710400 Unrealised FX Loss` for open balances at period-end
  - `710100 Realised FX Gain` / `710200 Realised FX Loss` when the underlying invoice/payment settles

### 4.5 Reporting

- All reports show KES primary; USD-equivalent column uses period-average (for IS rows) or period-end (for SFP rows) rate.
- A small "FX Rates" widget in the dashboard shows today's CBK rate for KES/USD with a sparkline of the last 30 days.
- Monthly Management Pack includes the EX RATE schedule (daily rates + period average + period close) — modelled on the FLK pack.

## 5. Risk and mitigation

| Risk | Mitigation |
|---|---|
| CBK changes its HTML layout, scraper breaks silently | Strict schema validation; alert on any parse failure; fallback to Frankfurter; manual override available |
| Both CBK and Frankfurter down on the same day | Manual override; the next successful run backfills the gap |
| Rate spike on the day a large invoice posts | Standard accounting — the rate at posting date is immutable; corrections only via manual journal with audit |
| Auditor questions a Frankfurter-sourced rate | Audit log shows source per rate; we re-fetch CBK and post a correction journal |
| Public holiday with no rate | Use the previous business-day's rate (standard practice); flag in audit log |

## 6. Decisions log

- 2026-05-09: **CBK confirmed by user as the primary FX rate source for TX System.** Frankfurter retained as fallback; manual override available to Finance role.

## 7. Still to confirm with you

1. Watchlist of currencies for daily refresh: KES base + **USD, UGX, TZS, RWF** for sure; also **EUR, GBP, ZAR**? Anything else?
2. Anyone other than the Finance role allowed to do manual overrides? (Default = Finance only, with FM approval over a threshold.)
