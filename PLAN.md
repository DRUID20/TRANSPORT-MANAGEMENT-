# Transport Management System — Plan

Status: **Draft v2 — approved to save, not yet approved to build.**
Branch: `claude/plan-truck-system-Mfwm8`
Last updated: 2026-05-09

---

## 1. Business context

- **Operator type**: Cross-border road freight, exports out of Kenya (likely to Uganda, Tanzania, Rwanda, DRC, South Sudan).
- **Base country**: Kenya. Base currency: **KES**. Operational currencies: **USD, UGX, TZS, RWF** (multi-currency required).
- **Initial scale**: 1–20 trucks, under 50 users.
- **Tax**: KRA eTIMS **not** in scope. Exports are typically zero-rated; we do not generate eTIMS-compliant invoices.
- **GPS hardware**: Teltonika **FMC** series already installed. Integration is **deferred** to a later phase. The data model will include a `telematics_provider` abstraction so plugging in Wialon/Flespi/direct ingest later is additive, not a rewrite.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend (web + driver PWA) | **Next.js 15 + TypeScript + Tailwind + shadcn/ui** | One codebase serves the office web app *and* the driver PWA. Installable to phone home screen, works offline. |
| Backend | **Next.js server actions / route handlers** | No separate API server — less surface area, fewer moving parts, fewer bugs. |
| Database | **Supabase (managed Postgres)** | Free tier covers 1–20 trucks; scales up cleanly. Built-in auth, storage, realtime, row-level security (RLS). |
| Auth | **Supabase Auth** (email + phone OTP) | Drivers sign in by phone number. |
| File storage | **Supabase Storage** | Scanned docs, receipts, license/passport photos, POD. |
| Realtime | **Supabase Realtime** | Live trip updates for the dispatch board. |
| Hosting | **Vercel** (frontend) + **Supabase** (DB/storage) | Both have generous free tiers; deploy on `git push`. |
| AI | **Claude (Anthropic API)** | OCR/extraction, anomaly detection, NL report Q&A, weekly summaries. |
| Mobile money | **M-Pesa Daraja** | Driver advances, expense reimbursements. |
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
| **0 — Foundation** | Repo, CI/CD, auth, roles, multi-currency primitives, Sentry, deployment, base UI | 1–2 wks |
| **1 — Asset Register + Fleet** | Assets, trucks, drivers, expiry alerts | 1–2 wks |
| **2 — Trips + Cross-border + Driver PWA + Doc scan** | Trip lifecycle, customs docs, driver phone app, camera + AI extract, POD | 3 wks |
| **3 — Customer Portal + Tracking** | Customer login / shareable link, status, ETA, POD download | 1 wk |
| **4 — Expenses + Fuel + M-Pesa** | Receipt scan, approval, fuel logs, reimbursement | 2 wks |
| **5 — Finance / Accounting** | CoA, GL, AP, AR, bank rec, multi-currency, FX | 3–4 wks |
| **6 — HR** | Contracts, leave, expiries, payroll inputs | 1–2 wks |
| **7 — Notifications** | WhatsApp + SMS via Africa's Talking, email, in-app | 1 wk |
| **8 — Reports + AI assistant** | Dashboards, exports, NL Q&A, weekly summary email | 1–2 wks |
| **Later — GPS / Teltonika** | Wialon or Flespi or direct ingest, live map, geofences | when ready |

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
- Workshop / jobcards / tyre & parts inventory (not requested in this round).
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
- 2026-05-09: GPS integration deferred; Teltonika FMC abstraction included in data model.
- 2026-05-09: KRA eTIMS out of scope.
- 2026-05-09: Notifications via Africa's Talking.
- 2026-05-09: Customer portal in scope.
- 2026-05-09: Workshop / tyre inventory out of scope (this round).
- 2026-05-09: Plan saved; **build not yet authorized**.
