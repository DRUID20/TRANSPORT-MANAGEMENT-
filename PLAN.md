# TX System — Transport Management Plan

**Customer:** Nile Valley Logistics
**Product name:** TX System
Status: **Draft v3 — approved to save, not yet approved to build.**
Branch: `claude/plan-truck-system-Mfwm8`
Last updated: 2026-05-09

---

## 1. Business context

- **Operator type**: Cross-border road freight, exports out of Kenya (likely to Uganda, Tanzania, Rwanda, DRC, South Sudan).
- **Base country**: Kenya. Base / primary currency: **KES (KSh)**. Operational currencies: **USD, UGX, TZS, RWF** (multi-currency required).
- **Reporting currency rule**: All financial reports show **KES as primary**, with a **USD equivalent column / total** alongside (FX-converted at the relevant posting date). Users can also toggle a report to USD-primary if needed. This applies to P&L, trip profitability, AR/AP aging, expense reports, and dashboards.
- **Initial scale**: 1–20 trucks, under 50 users.
- **Tax**: KRA eTIMS **not** in scope. Exports are typically zero-rated; we do not generate eTIMS-compliant invoices.
- **GPS hardware**: Teltonika **FMC** series already installed. Integration is **deferred** to a later phase. The data model will include a `telematics_provider` abstraction so plugging in Wialon/Flespi/direct ingest later is additive, not a rewrite.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend (web + driver PWA) | **Next.js 15 + TypeScript + Tailwind + shadcn/ui + Tremor + Framer Motion + next-themes** | One codebase serves the office web app *and* the driver PWA. Installable to phone home screen, works offline. UI direction = **Fleet Command Centre** (dark-first dense, light mode available); details in [`docs/design/ui-direction.md`](./docs/design/ui-direction.md). |
| Backend | **Next.js server actions / route handlers** | No separate API server — less surface area, fewer moving parts, fewer bugs. |
| Database | **Supabase (managed Postgres)** | Free tier covers 1–20 trucks; scales up cleanly. Built-in auth, storage, realtime, row-level security (RLS). |
| Auth | **Supabase Auth** (email + phone OTP) | Drivers sign in by phone number. |
| File storage | **Supabase Storage** | Scanned docs, receipts, license/passport photos, POD. |
| Realtime | **Supabase Realtime** | Live trip updates for the dispatch board. |
| Hosting | **Vercel** (frontend) + **Supabase** (DB/storage) | Both have generous free tiers; deploy on `git push`. |
| AI | **Claude (Anthropic API)** | OCR/extraction, anomaly detection, NL report Q&A, weekly summaries. |
| Mobile money | **M-Pesa Daraja** | Driver advances, expense reimbursements. |
| FX rates | **Central Bank of Kenya (CBK) — primary**, **Frankfurter.app — fallback** | CBK = official Kenyan rate (KRA-aligned, audit-acceptable). Frankfurter (ECB-sourced, free, REST) covers gaps + weekends. See [`docs/finance/fx-rate-strategy.md`](./docs/finance/fx-rate-strategy.md). |
| Notifications | **Africa's Talking** (WhatsApp + SMS) + transactional email | Regional coverage for Kenya/EAC. |
| Error monitoring | **Sentry** | Catches production bugs as they happen. |
| Testing | **Vitest** (unit) + **Playwright** (E2E) | Targets the "no critical bugs" bar. |

### Why this stack vs alternatives
- **Next.js + Supabase** vs Laravel/Django: smallest ops footprint, fastest iteration, lowest cost at this scale.
- **PWA** vs native React Native: chosen because the user requested PWA. Offline-first via service worker + IndexedDB queue for doc uploads. We can add native app later if needed for background GPS.

---

## 3. Modules (MVP scope)

1. **Asset Register** — trucks, trailers, equipment, ownership, value, depreciation, service history, insurance, registration, inspections, attachments.
2. **Fleet Operations** — assignments, fuel (per country/currency), service schedules, expiry alerts (insurance, license, NTSA, COMESA Yellow Card).
3. **Trips & Cross-border** — trip lifecycle (planned → loaded → in-transit → border → delivered → closed), customs documents (manifest, T1/SAD where applicable), border-post timestamps, axle-load/weighbridge slips, transit permits, country-specific fuel logs.
4. **Loading & Documents** — manifest, weighbridge, POD. Driver scans on phone; Claude extracts fields; manager approves. All originals stored in Supabase Storage.
5. **Goods Tracking** — cargo per trip, milestones, status timestamps.
6. **Customer Portal** — customer login or shareable link, cargo status, ETA, POD download.
7. **Expenses & Fuel** — driver submits receipt photo → AI extracts amount/vendor/date → manager approves → optional M-Pesa reimbursement. Fuel logs tie to truck for L/100km analytics, by country/currency.
8. **Finance / Accounting** — Chart of Accounts, General Ledger, AP (supplier bills), AR (customer invoices), bank reconciliation, multi-currency (KES base + USD/UGX/TZS/RWF), FX gain/loss, profit per trip / per truck / per customer / per route.
9. **HR** — staff, contracts, licence/medical/passport expiry, leave, attendance, payroll inputs (export to your payroll provider).
10. **Reports & AI** — dashboards, exports (PDF/Excel), natural-language Q&A on a read-only reporting view, weekly fleet summary email.
11. **Notifications** — WhatsApp + SMS (Africa's Talking) + in-app + email for trip events, expiries, customer ETAs, driver alerts.
12. **Admin** — users, roles (Admin / Finance / Ops Manager / Dispatcher / Driver / Customer), audit log, org settings.
13. **Truck Performance Tracker** — analytics layer over Fleet + Trips + Fuel + Maintenance + HR data. Per-truck KPIs and rankings (extended after studying the Fleet Logistics monthly pack — see [`docs/finance/management-pack-reference.md`](./docs/finance/management-pack-reference.md)):
    - **Volume KPIs (top of P&L)**: trips completed, tonnes hauled, TEUs moved, total km, laden km, deadhead km %, active truck-days
    - **Per-customer × per-route matrix**: Actual vs Budget vs Projection volume; under/over-achievement flags
    - **Fleet vs Subcontractor split**: % volume per executor type per customer/route
    - **Idle truck list**: truck reg, last trip, days idle, status, expected next-trip date
    - **Efficiency**: km/L (and L/100km), cost per km, revenue per km, **profit per km / per truck / per route**
    - **Utilization**: % days on trip, idle days, deadhead km % (empty running)
    - **Reliability**: mean time between breakdowns, unplanned downtime hours, maintenance-interval adherence
    - **Tyres**: km per tyre, tyre cost per km
    - **Driver behaviour** (until GPS arrives — based on trip log + fuel + on-time stats; richer when Teltonika integrated)
    - **Compliance**: insurance/COMESA/NTSA/transit-permit status, days-to-expiry
    - **Cross-border**: average border-crossing time per route, top-3 slowest borders
    - **Fleet leaderboard**: best/worst trucks on each KPI for the period
    - Drill-down from any KPI to the underlying trips, fuel logs, expenses, and service records.
14. **Monthly Management Pack** — auto-generated end-of-month close package modelled on the Fleet Logistics pack ([reference doc](./docs/finance/management-pack-reference.md)). Schedules:
    - Cover narrative (AI-assisted draft, FM edits & signs off)
    - Income Statement (KES + USD), volume KPIs at top, comparatives + budget + variance
    - Statement of Financial Position (KES + USD), comparatives
    - Statement of Cash Flow (indirect)
    - Trial Balance with categorisation columns (so IS/SFP rebuild from GL is auditable)
    - OPEX Analysis (Actual / Budget / %Met / Comments) by cost group
    - Aged AR & Aged AP (KES + USD)
    - Bank Reconciliation per account
    - Fixed Asset Register + monthly depreciation run + Disposals schedule
    - Intercompany reconciliation per affiliate (if applicable)
    - FX rates: daily feed, period average, period closing
    - Inventory: physical-count vs system, variance qty + value
    - Structured close checklist with sign-off (FM → CM → MD)

> **Workflow discovery**: at the start of each phase, the user walks Claude through the exact screens and rules for that module before any code is written.

---

## 4. Where AI is used (and where it isn't)

**Used (each pays back clearly):**
- **Document & receipt OCR** — Claude vision extracts fields from scans → pre-fills forms → human approves.
- **Expense anomaly flagging** — flags duplicated, altered, or off-route receipts.
- **Natural-language reports** — "How much did Truck KCA-123 cost last quarter?" → SQL on a read-only view → chart + answer.
- **Weekly fleet summary** — every Monday, a 1-page summary emailed to managers.
- **Expiry coach** — proactive reminders with action steps for insurance, licences, COMESA, passports.

**Deliberately not used:** AI for anything that affects financial postings, payroll calculations, or compliance documents — those are deterministic rule-based code with audit trails.

---

## 5. Data model — high-level entities

`organizations`, `users`, `roles`, `assets`, `trucks`, `trailers`, `drivers`, `customers`, `suppliers`, `trips`, `trip_legs`, `border_crossings`, `cargo_items`, `documents`, `expense_claims`, `fuel_logs`, `service_records`, `licenses_permits`, `leave_requests`, `payroll_inputs`, `chart_of_accounts`, `journal_entries`, `gl_lines`, `ap_bills`, `ar_invoices`, `payments`, `bank_accounts`, `bank_transactions`, `fx_rates`, `notifications`, `audit_log`, `telematics_provider`, `gps_pings` (later phase).

Postgres with **row-level security** so each org only sees its own data. Multi-currency is a first-class primitive (every monetary column carries currency + FX-rate-at-posting).

---

## 6. Delivery phases

| Phase | Scope | Estimate |
|---|---|---|
| **0 — Foundation** | Repo, CI/CD, auth, roles, multi-currency primitives, Sentry, deployment, **themed design system + dashboard skeleton (Fleet Command Centre, dark/light)** | 2–3 wks |
| **1 — Asset Register + Fleet + Workshop/Job Cards** | Assets, trucks, drivers, expiry alerts, **Job Card workflow (mechanic analysis, services, spares posted to truck, supplier AP statement)** | 2–3 wks |
| **2 — Trips + Cross-border + Driver PWA + Doc scan** | Trip lifecycle, customs docs, driver phone app, camera + AI extract, POD | 3 wks |
| **3 — Customer Portal + Tracking** | Customer login / shareable link, status, ETA, POD download | 1 wk |
| **4 — Expenses + Fuel + M-Pesa** | Receipt scan, approval, fuel logs, reimbursement | 2 wks |
| **5 — Finance / Accounting** | CoA, GL, AP, AR, bank rec, multi-currency, FX, **Budget framework**, **Cost-centre dimension**, **FAR + auto-depreciation**, **inventory (spares/tyres)** | 4–5 wks |
| **6 — HR** | Contracts, leave, expiries, payroll inputs | 1–2 wks |
| **7 — Notifications** | WhatsApp + SMS via Africa's Talking, email, in-app | 1 wk |
| **8 — Reports + AI assistant** | Dashboards, exports, NL Q&A, weekly summary email | 1–2 wks |
| **8b — Truck Performance Tracker** | KPI engine + leaderboard + per-truck profit, fuel efficiency, tyre cost, downtime, compliance, idle-truck list, customer × route volume matrix, fleet-vs-subcontractor split | 1–2 wks (built on top of Phase 8) |
| **9 — Monthly Management Pack** | Auto-generated monthly close pack: narrative, IS, SFP, SCF, TB, OPEX, AR/AP aging, bank rec, FAR, disposals, intercompany, FX, inventory, sign-off workflow | 2 wks |
| **Later — GPS / Teltonika** | Wialon or Flespi or direct ingest, live map, geofences, driver-behaviour score | when ready |

Total ≈ **16–20 weeks** to full MVP, but Phase 1 is usable in production around week 3–4.

---

## 7. Quality strategy ("no critical bugs in production")

- TypeScript **strict** mode everywhere.
- **Zod** validation on every external input.
- Postgres constraints + **RLS** policies enforce invariants at the data layer too.
- **Vitest** unit tests on business logic (especially Finance).
- **Playwright** E2E tests on the ~10 critical flows (login, trip lifecycle, expense approval, invoice posting, payroll export, etc.).
- **Sentry** in production — alerts on every uncaught error.
- **Staging environment** mirroring prod, gated by `/review` and `/security-review` on every PR.
- Daily automated DB backups (Supabase) + tested restore once a month.

> Honest note: zero bugs total is not achievable in any software. The realistic target is **zero critical bugs in production**, with bugs fixed within hours of detection.

---

## 8. Cost estimate (USD/month, small fleet)

| Item | Cost |
|---|---|
| Vercel | $0 (Hobby) → $20 (Pro) |
| Supabase | $0 (Free) → $25 (Pro) when storage/DB grows |
| Sentry | Free tier |
| Anthropic API | ~$10–40 (depends on doc-scan volume) |
| Africa's Talking | Pay-per-message (WhatsApp + SMS) |
| M-Pesa Daraja | Per-transaction |
| Domain | ~$12/year |
| **Total** | **≈ $0–85 / month** to start |

---

## 9. Out of scope (explicitly)

- KRA eTIMS invoicing.
- Native iOS / Android apps (PWA is the chosen mobile path).
- GPS device integration (deferred — abstraction is in the data model).
- ~~Workshop / jobcards / tyre & parts inventory~~ → **NOW IN SCOPE** (added 2026-05-09 from Nile Valley notes — Workshop & Job Cards module).
- Payroll calculation engine (we export inputs to an external payroll provider).

---

## 10. Risks and how we handle them

| Risk | Mitigation |
|---|---|
| Scope creep ("best possible system" is unbounded) | Phased delivery; each phase has a written workflow approved before build. |
| Driver phones offline at borders | PWA service worker queues uploads; syncs when network returns. |
| Multi-currency / FX errors in Finance | Every money column stores `(amount, currency, fx_rate_at_posting, posted_amount_in_base_ccy)`. Heavy unit tests. |
| AI hallucination on documents | AI is **never** the system of record. Extracted fields are **proposals** that a human approves. Originals always stored. |
| Vendor lock-in (Supabase / Vercel) | Postgres is portable; Next.js can be self-hosted. We avoid Supabase-only features where a portable alternative exists. |
| Data residency concerns | Supabase region choice (EU or future Africa region). Backups can be exported to Kenyan storage if required. |

---

## 11. Decisions log (so we don't re-litigate)

- 2026-05-09: Stack = Next.js + Supabase + Vercel.
- 2026-05-09: Mobile = PWA, not native.
- 2026-05-09: Region = Kenya, currency base = KES, multi-currency required for cross-border.
- 2026-05-09: Reports show KES (primary) + USD (secondary/equivalent) by default; per-report toggle allowed.
- 2026-05-09: GPS integration deferred; Teltonika FMC abstraction included in data model.
- 2026-05-09: KRA eTIMS out of scope.
- 2026-05-09: Notifications via Africa's Talking.
- 2026-05-09: Customer portal in scope.
- 2026-05-09: Workshop / tyre inventory out of scope (this round).
- 2026-05-09: Plan saved; **build not yet authorized**.
- 2026-05-09: Customer = Nile Valley Logistics; Product = TX System.
- 2026-05-09: Chart of Accounts inherited and being re-numbered. Cleaned CoA in [`docs/finance/coa-proposed.csv`](./docs/finance/coa-proposed.csv); design notes in [`docs/finance/coa-design.md`](./docs/finance/coa-design.md); original import preserved in [`docs/finance/coa-imported.csv`](./docs/finance/coa-imported.csv). 201 accounts in proposed CoA (vs 175 imported, after dropping 8 orphan rows + 4 closed garbage rows + dedupes, and adding FX, trucking-specific, USD bank, and additional expense groups).
- 2026-05-09: New CoA numbering = 6-digit flat with class prefix (1=Asset, 2=Liability, 3=Equity, 4=Income, 5=Direct Cost, 6=Operating Expense, 7=Other/Finance, 8=Tax). Country / truck / trip handled as transaction dimensions, not separate accounts.
- 2026-05-09: Module 13 added — **Truck Performance Tracker** (KPIs: cost/km, revenue/km, profit/truck, fuel efficiency, tyre cost, utilisation, downtime, compliance, border-crossing time). Phase 8b in delivery sequence.
- 2026-05-09: Studied Fleet Logistics monthly management pack (18 sheets — narrative, IS, SFP, SCF, TB, OPEX, AR/AP aging, bank rec, KPIs, inventory, FAR, disposals, intercompany, FX, last-month). Reference doc at `docs/finance/management-pack-reference.md`. Added:
  - Module 14: Monthly Management Pack
  - Volume KPIs (trips/tonnes/TEUs/km) at top of P&L
  - Customer × route volume matrix in Performance Tracker
  - Fleet-vs-subcontractor split as a first-class report
  - Idle-truck list as a managed schedule
  - TB → IS/SFP categorisation columns baked into CoA
  - USD-equivalent column on every monetary report (using daily FX rate feed + period-end / period-average rules)
  - Budget framework, cost-centre dimension, FAR + auto-depreciation, inventory (spares/tyres) added to Phase 5
  - Phase 9 = Monthly Management Pack
- 2026-05-09: Open questions raised by management-pack study captured in `management-pack-reference.md` §5 (affiliates? budget already exists? cost centres? subcontractor share? stock-take frequency? close cut-off & sign-off path?).
- 2026-05-09: FX rate provider chosen — **CBK primary (user confirmed), Frankfurter.app fallback, manual override with audit trail.** Strategy documented in `docs/finance/fx-rate-strategy.md`. Daily Vercel Cron at 17:30 EAT. Pluggable `FxRateProvider` interface so the source can be swapped without touching business logic.
- 2026-05-09: Operational workflow baseline adopted (standard cross-border TMS lifecycle: Lead → Plan → Dispatch → Load → Transit → Border → Deliver → POD → Close → Invoice → Collect, plus assets/maintenance/cost-capture/customer-portal/daily-weekly-monthly cycles). Saved to `docs/operations/workflow-baseline.md`. **Nile Valley to layer specific deviations and extensions on top** in the same file as it walks through its real process.
- 2026-05-09: UI direction = **Fleet Command Centre** (dark-first dense, light mode available, real-time motion, premium dashboards from day 1). Details in `docs/design/ui-direction.md`. Phase 0 widened by ~1 wk to ship themed design system + dashboard skeleton up front so no module ever ships unstyled. Brand assets (logo, colours, font, favicon) pending from Nile Valley.
- 2026-05-09: **UI quality bar = "beautiful + addictive"** — TX System is not a utility users tolerate; it is a product they reach for. Documented in `docs/design/ui-direction.md` §0 as a 13-point per-screen checklist (instant feel, beautiful empty states, friendly errors, smart defaults, live feel, print-ready exports, tactile mobile feedback, etc.). Enforced at PR review — screens that fail the checklist do not merge.
- 2026-05-09: **Palette LOCKED — Apple × SpaceX fusion.** SpaceX = pure-black surfaces, JetBrains Mono numerals, high contrast; Apple = refined greys, soft shadows, Apple Blue accent, Apple semantic status colours, Inter typography, frosted-glass overlays. Full design tokens in `docs/design/color-tokens.md`.
- 2026-05-09: Nile Valley extensions captured from handwritten notes (`docs/operations/workflow-baseline.md` §5):
  - **TX System replaces "Pumas"** (Nile Valley's current system).
  - **Workshop / Job Cards module pulled back IN scope** (was previously out-of-scope) — every yard service generates a Job Card with mechanic analysis, services done, spares used; spares charged to truck; supplier AP statement auto-generated.
  - **Journey Log** is the per-trip record with: quantity, loading/offloading dates, distance covered (with destinations), mileage rate, mileage, fuel consumed, **road wear**.
  - **Per-truck P&L** elevated from analytic to core deliverable.
  - **Road Wear accrual deferred** (parked) — concept retained in the workflow doc for future revisit; no CoA accounts and no posting logic.
  - **"Mileage" clarified** as driver road-use cash allowance (not a billing rate). New CoA account `502150 Driver Mileage Allowance (Road Use)` added.
  - **Workshop scope confirmed cost-only** (internal trucks; no third-party workshop revenue).
  - **RBAC design deferred** until just before Phase 0 auth wiring (Nile Valley wants distinct roles per system area; catalogue to be defined together at that point).
  - **HR module extended**: payroll, statutory deductions per employee, employee appraisal/performance, salaries & loans, **job-description-driven RBAC** (each employee's screens are activated by job description, stricter than standard RBAC).
  - **Subcontractor vs Own** tagging confirmed as a first-class dimension on every entry.
