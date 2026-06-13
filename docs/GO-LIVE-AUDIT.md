# Nile Valley Logistics — Go-Live Readiness Audit

**Audit date:** 2026-06-13  ·  **Auditor:** engineering  ·  **Target:** production use
**Verdict: 🔴 NOT READY for go-live tomorrow.** One blocker (persistence) makes most
modules lose data on every deploy. Critical path below — est. focused effort to green.

---

## What a go-live audit covers (and how we ran it)
A production-readiness / go-live audit (GLA) checks six dimensions before a system
carries real business data:

1. **Functional / UAT** — every module's create→read→update→workflow path works end-to-end.
2. **Data persistence** — what actually survives a restart/redeploy (the #1 question here).
3. **Data integrity** — keys, constraints, FKs, numbering, multi-currency, org isolation.
4. **Security** — auth, password policy, RLS/grants, RBAC, secrets.
5. **Reporting / output** — branded, accountant-grade Excel + PDF.
6. **Operational readiness** — backups, migrations, env config, error handling, monitoring.

Method: static inspection of every `src/server/actions/*` (persistence source), the live
Supabase schema + advisors, the auth flow, and the export routes; plus the end-to-end
dispatch flow already verified on production.

---

## 1. Data persistence — 🟢 RESOLVED (post-build)
~~Only 10 of 32 action modules read/write Postgres.~~  **Now: 26 of 32 persist.** The other **22 use the in-memory
mock store**, which **resets on every redeploy** — that data is not real.

| Persisted ✅ (survives Postgres) | Intentionally in-memory (by design) |
|---|---|
| auth, customers, suppliers, subcontractors, rates | tracker (live driver positions) |
| trucks, trailers, drivers | driver-session (cookie/session state) |
| bookings, trips, trip events, trip documents, borders | assistant (LLM session) |
| expenses, fuel logs | rbac (JD catalogue — schema mismatch w/ permissions, not transactional) |
| customer invoices + lines + receipts (auto-posts to GL) | reports (aggregator — runs over the persisted tables) |
| supplier bills + lines + payments (auto-posts to GL) | calendar (aggregator — runs over bookings + trips + compliance) |
| chart of accounts, journal entries + lines, trial balance |  |
| bank statement transactions + matching |  |
| workshop job cards + services + spares |  |
| HR: departments, employees, contracts |  |
| leave requests + attendance |  |
| payroll periods + inputs + loans (PAYE/NSSF/SHA/AHL math) |  |
| appraisal cycles + reviews |  |
| HR compliance records |  |
| monthly management packs |  |

**Status:** all transactional modules now survive a redeploy. Every list page above
was smoke-tested live on production (no 500s).

## 2. Data integrity — 🟠 HIGH
- ✅ UUID PKs everywhere; org_id on every table; FK chain enforced.
- ✅ Atomic document numbering (counters table) — verified BK/TRP-2026-0001.
- 🟠 **Unique constraints missing** on natural keys — only `organizations.slug` is unique.
  Need `UNIQUE` on `users.email`, `(org, registration)` trucks, `(org, employee_number)`,
  `(org, number)` for bookings/trips/invoices/bills/journal_entries, `(org, code)` CoA/depts.
  (Migration prepared next.)

## 3. Security — 🟢 GOOD (with one item)
- ✅ Custom auth: bcrypt, lockout after 5, CSPRNG OTP reset (hashed, 15-min, attempt-capped).
- ✅ Public API locked: RLS enabled + grants revoked from anon/authenticated (two layers).
- ✅ Secrets in env (DB, session, Resend); none committed.
- 🟠 RBAC roles/permissions still mock-store (rbac module) — enforce in DB before relying on it.
- 🟠 `RESEND_FROM` is the Resend test sender — verify a domain before emailing real customers.

## 4. Reporting / output — 🟠 HIGH (explicit requirement)
- Current state: **CSV only**, hand-rolled, reading the mock store. **No Excel (xlsx),
  no PDF, no logo/branding.** Not accountant-grade.
- Required: branded **Excel** (header band w/ logo, frozen panes, number/currency formats,
  subtotal/grand-total bands, multi-sheet) and branded **PDF** (logo, report title in the
  display font, period + generated-at, KPI strip, sectioned tables, totals, page numbers).
  Print stylesheet (light theme) already exists as the PDF base (§13).
- Reports in scope: P&L, Balance Sheet, AR/AP aging, Expenses, Fleet utilisation,
  Fuel efficiency, Profit-per-truck/trip, Ullage, Payroll, Monthly management pack.

## 5. UX / design — 🟢 GOOD
- Full DESIGN.md redesign shipped (dark control-tower; KPI cards, Mercury tables, Cmd+K,
  custom Select/DatePicker, toasts/modals/slide-overs, charts, print). Verified on prod.

## 6. Operational readiness — 🟠 MEDIUM
- ✅ Migrations tracked (drizzle) + applied to Supabase.
- 🟠 **Backups/PITR**: confirm Supabase point-in-time recovery is enabled before go-live.
- 🟠 **Seed/admin**: one admin user exists; document the onboarding (org, CoA, first users).
- 🟠 **Monitoring/errors**: add error tracking (e.g. Sentry) + uptime check.
- 🟠 **RESEND_FROM** verified domain (see §3).

---

## Critical path to go-live (ordered)
1. 🔴 **Persist the remaining 22 modules** (repo-swap, verify each). *Gate for any real use.*
2. 🟠 **Unique constraints** migration (data integrity). *(in progress)*
3. 🟠 **Branded Excel + PDF reports** engine + per-report templates.
4. 🟠 RBAC enforcement in DB; verified `RESEND_FROM` domain.
5. 🟠 Enable Supabase PITR backups; add error monitoring; write the onboarding runbook.
6. 🟢 Full UAT pass per module with a test org, then sign-off.

**Bottom line:** the foundation (auth, security, design, dispatch core) is solid, but the
system is **not ready to carry real HR/finance/ops data tomorrow** until persistence is
finished. That is the work now.
