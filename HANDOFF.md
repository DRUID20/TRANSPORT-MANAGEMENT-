# HANDOFF — read this first after a context reset

> Single source of truth for continuing this session. Concise on purpose.
> Deeper history: `docs/RUNBOOK.md`, `docs/GO-LIVE-AUDIT.md`, `docs/SECURITY-rls.md`.

## ⭐ CHECKPOINT (2026-07-02) — read this first
Full system audit done (4 parallel agents: security, financial integrity, performance, product/UX).
Fixed **#1–#5 of the recommended order** (all blockers). **#6 remains (larger).**

**DONE & pushed this checkpoint** (all tsc+lint+build clean, 38 tests pass, each deployed Ready):
- `0a8cd73` **#1 RBAC lockdown** — every mutating action now capability-gated (was ~11/40 files; a `viewer` could mutate everything). New `commercial.write` cap (admin+dispatcher+accountant → customers/rates/suppliers). New helpers in `src/server/auth/permissions.ts`: `guard(cap)` (returns `{ok:false}` denial) + `guardFleetOrDriver()` (fleet.write OR authenticated driver kiosk cookie `tx_drv`, used by the 3 driver-shared actions: `transitionTrip`, `createExpense`, `uploadDocument`). Also gated the previously-missed `createInvoice`/`createBill`.
- `0a8cd73` **#2 backdoors** — `/api/dev-login` now 404s unless `NODE_ENV==="development"` (dead on Vercel prod+preview). Driver login (`authenticateDriver` in `actions/driver-session.ts`) now requires phone + National ID matched vs active driver via real repo (was pick-any-name).
- `a42c488` **#3 money bugs** — `cancelInvoice` refuses while `paidAmount>0` (was orphaning payments); shortage loan reversed on invoice-cancel too (`src/server/finance/shortage.ts` `reverseTripShortageLoan`, reused by `reopenTrip`); payroll `setPayrollPeriodStatus('paid')` now idempotent + transactional with row lock (was double-recovering loans).
- `1d95c94` **#4 payroll → GL** — `setPayrollPeriodStatus` posts a balanced JE on not-paid→paid (gross 600100, employer 600400/600600/600700, payables 220100/200/300/400/500, staff-loans 111600, clearing 211300, net→bank 121200). Idempotent by `referenceType:"payroll"`+`referenceId:periodId`. New `"payroll"` JournalReferenceType.
- `8207ea7` **#5 assistant real data** — `src/server/assistant/executor.ts` now imports async dual-mode repos (`repos/reports` + entity repos) instead of mock-store; `executeIntent` is async; `actions/assistant.ts` awaits it.

**#6 — NOT STARTED (the "larger" work, do next):**
- **Edit UIs (start here — contained, high value):** six entities have `update*Action` server actions but NO UI calling them — customers, suppliers, drivers, trucks, trailers, subcontractors. Detail pages at `src/app/(app)/{entity}/[id]/page.tsx` are read-only. Rates are create-only (no `[id]` page, no `updateRateAction`). Wire edit forms; the actions are already RBAC-gated.
- **Scale refactor (bigger, needs care):** `/tracker/matrix` (`repos/tracker.ts truckLeaderboard`) + `/reports/profit-per-truck` (`repos/reports.ts fleetProfitAndLoss`) are quadratic (per-truck full-table scans + `refreshInvoiceStatuses` per truck). No DB-level pagination anywhere (Paginator slices in JS after fetching whole tables). Repos filter status/tripId/truckId in JS leaving indexes dead → push into SQL. Zero Suspense/streaming. `getTripById` fetched twice per wizard nav (layout+page, no request cache).

**Other audit MEDIUM items (not yet done):** `runDepreciation` concurrency guard (read-then-write, `repos/assets.ts`); FX fallback `129.41` hardcoded in 4 files (`repos/fx.ts` + 3 forms) → consolidate; POD/delivery-note capture at Delivery stage (only Loading mounts `TripDocuments`); credit notes absent (reopen blocks sent invoices); **zero tests on money paths** (`billableFreight`, `monthlyDepreciation`, `allowedTransitions`, `refreshInvoiceStatuses`, `tripFuelDerivation`); stale "once Supabase connected" copy in settings; Sentry stubbed. Supabase RLS-info advisories = expected noise (server-only access).

---

## Where things stand (2026-06-15)
Nile Valley Logistics — cross-border fuel-haulage TMS. **Production-deployed, near go-live.**

- **Branch:** `claude/plan-truck-system-Mfwm8`. Draft **PR #1** open (`druid20/transport-management-`). Commit + push every unit.
- **Prod:** https://transport-management-ruddy.vercel.app · auto-deploys on push (~2–2.5 min).
- **Login (Playwright):** `omazmz@gmail.com` / `Omar2026`. Run scripts FROM the repo dir (so `playwright` resolves); context needs `ignoreHTTPSErrors:true`. Theme stored in `localStorage.theme` ("light"|"dark"); next-themes, default dark.
- **Supabase project id:** `jpfvhfcjduimnjijdang` · **org id (nile-valley):** `73aa3af1-5bd5-42cc-b3a9-b60e67f01f1f`. Apply SQL via the Supabase MCP (`apply_migration`/`execute_sql`) — the sandbox can't resolve Supabase DNS for `db:*` scripts.
- **Verify loop:** `npx tsc --noEmit` + `npx next lint` → `npx next build` → commit + push → wait ~2.5min → Playwright check on prod.

## Stack / conventions
- Next 15 App Router, React 19, server actions, Tailwind w/ CSS-var tokens in `src/app/globals.css` + `tailwind.config.ts`.
- Dual-mode repos: `actions/*` → `repos/*`; each repo `if (IS_DEMO_MODE) return store…()` else Postgres scoped by `requireOrgId()`.
- Drizzle: numeric columns round-trip as strings (`Number()` read, `String()` write); jsonb arrays need `as unknown as` casts.
- Fonts (`src/lib/fonts.ts`): **Outfit for everything** — `--font-display` AND `--font-sans` both Outfit (Inter retired this session per UNOC/Mofi ref). JetBrains Mono for `--font-mono` (numbers/data).

## DONE & verified (this session + prior)
- Full dark UI redesign; **26/32 modules persist to Postgres** (tracker/driver-session/rbac/reports-catalogue stay in-memory by design — reports + performance aggregators READ via repos).
- Security: custom auth (bcrypt, lockout, CSPRNG OTP + premium email), RLS + grants revoked from anon/authenticated (false-positive `rls_enabled_no_policy` is expected — see docs/SECURITY-rls.md).
- File uploads (Supabase Storage private `documents` bucket): trip docs (+ Bill of Lading + Road User Charge kinds), HR compliance, leave attachments, employee photos. Auth-proxied, org-isolated.
- Branded Excel + PDF reports. New reports: Revenue by Customer, Driver Performance, Monthly Trend (chart), VAT Summary, **Truck Statement** (per-truck cumulative retained-earnings memo). Reports + tracker read real Postgres data.
- **FX live** (`open.er-api.com`, covers KES/USD/UGX): `repos/fx.ts`, daily cron `/api/cron/fx` (REQUIRES `CRON_SECRET`), `/fx` page + converter, invoice/bill/expense forms auto-fill the rate.
- **Subcontractor accounting** (10% commission): `subcontractor_payments` ledger, supplier-direct → AP bill (502500), account statement on the detail page.
- **Workshop → AP:** completing a job card raises draft supplier bill(s) for spares (mapped to 504xxx); in-house labour excluded from GL; optional trip link.
- **Expenses:** choose KES/USD/UGX (auto-FX), delete (detail + list-row), truck-expenses require a trip, closed trips hidden from assignment.
- **Trips workflow base:**
  - Destination is NOT set at booking — only customer + product + volume + origin. Destination is **bound on the trip** at the depot or transit border (Malaba/Busia) via `ConfirmDestinationCard`, with audit (`destination_confirmed_at/by`) + timeline event + Road User Charge doc kind.
  - **Rate is destination-driven → looked up on the trip** when the destination is confirmed (`lookupRate(origin→dest)`); rate removed from the booking form; `bookings.agreed_*` now nullable.
  - **One invoice per trip**, billed on **delivered L20**; fuel shortage → driver payroll loan (idempotent via `loans.shortage_trip_id`, valued in KES).
  - "No new trip on a truck with an unfinished trip" guard in `planTrip`.
- **Audit + RBAC:** `audit_log` written on finance mutations; `requireCapability()` role gate on AR/AP/ledger/loan mutations; read-only `/admin/audit-log`.
- **Perf:** `borderChargesByTrip(ids[])` batched (killed 4 N+1s); `fleetProfitAndLoss` parallel; server-side pagination on /expenses /invoices /bills /trips /bookings.

## UI/UX work shipped this session
1. **UNOC light-mode restyle** (commit `8030378`) — black sidebar + gold active pill, raised white cards, collapsible nav groups (grid-rows 0fr↔1fr trick), `DrivingTruck` component on tracker hero. Tokens: `--sidebar-bg/-fg/-active-bg/-active-fg/-border`, `--accent-gold`, `--shadow-card`. Dark mode keeps a dark sidebar with gold active too; depth via border (no light-mode drop-shadow).
2. **Sidebar + table refinements** (commit `478416f`) — nav items **14.5px bold** (was 13px), group headers **12.5px extrabold**, 20px icons strokeWidth 2. Group collapse now **fades + slides down with a staggered item cascade** (`navItemIn` keyframe @25ms apart) instead of blinking. DataTable header: 12px bold, `border-b-2 border-border-strong`, `text-fg-secondary`. Darkened light-mode tokens for visible borders: `--border: 210 216 226`, `--border-strong: 178 187 201`, `--text-secondary: 44 53 67`, `--text-tertiary: 84 94 111`.
3. **Trips overhaul** (commit `cff499a`) — see next section.
4. **Outfit everywhere** — `src/lib/fonts.ts` swapped `--font-sans` from Inter to Outfit (weights 400/500/600/700). Inter retired.
5. **Blank-page-on-scroll fixed** — `src/app/layout.tsx` body `min-h-screen` → `min-h-[100dvh]` (100vh on mobile includes URL-bar area, so the page grew past the viewport).
6. **3D surfaces** added to globals.css:
   - `.surface-3d` — inner-top highlight + inner-bottom shadow + brand-tinted halo + soft drop. Dark mode strips the bright highlight but keeps depth.
   - `.page-3d-bg` — fixed radial glow backdrop (brand-blue top-left, accent-gold top-right, brand-cyan bottom). Applied to `/trips` and `/trips/[id]`.
   - DataTable wrapper now `border-2 border-border surface-3d` for the "thick lifted" look the user asked for.

## Trips workflow this session — BOL-first sequential gate
**The big one.** User requirement: "loaded first first only then you can move on to the other parts… really concentrate on the trips page that's where everything almost happens."

- **`src/app/(app)/trips/[id]/page.tsx`** — `hasBOL = documents.some(d => d.kind === 'bill_of_lading')`. Render order:
  1. PageHeader + StatusPipeline + NextActionPanel + Facts + Related-rail (always visible)
  2. `<BOLGate />` (amber banner) shown when `!hasBOL`
  3. `<TripDocuments />` (always reachable — must be uploadable to unlock the rest)
  4. `<LockedStep locked={!hasBOL} stepNumber={2} title="Confirm destination">` → `<ConfirmDestinationCard />`
  5. `<LockedStep stepNumber={3} title="Capture loading & discharge">` → `<FuelCargoCard />`
  6. `<LockedStep stepNumber={4} title="Borders & expenses">` → `<TripBorders /> + <TripExpensesCard />`
  7. `<LockedStep stepNumber={5} title="Invoice & reconcile">` → `<TripInvoiceCard /> + <TripReconciliation />`
- `LockedStep` renders `opacity-40 blur-[1px] pointer-events-none` children with a centered "STEP N — upload the BOL to unlock" overlay (lock icon + bold step number + title). Verified on prod with `scripts/shot-trips-2.mjs`.
- **Loading/discharge simplified per user spec ("BOL already has volume at 20 no need for temp or density"):**
  - `src/components/trips/fuel-capture.tsx` rewritten. `CaptureLoadingButton` now takes `bolVolumeL` prop, pre-fills the litres input from `Trip.cargoQuantity` (the BOL volume). Only asks for (loaded litres, seal numbers). `CaptureDischargeButton` likewise — only (discharged litres, seals).
  - `src/lib/validators/trips.ts`: `loadingTempC`, `density15C`, `dischargeTempC` made **optional** (back-compat with legacy entries).
  - `src/server/actions/trips.ts`: when temp/density absent, observed = corrected (`loaded20C = parsed.data.loadedLitres`). When present (legacy data), still runs `correctVolumeTo20C`.
  - `FuelCargoCard` in `[id]/page.tsx`: dropped Temp + Density + separate `@ 20 °C` rows. Now shows only "Loaded (@ 20 °C)" + Seals + Variance.
  - Removed `correctVolumeTo20C` import and `Thermometer` icon import from the page (they were unused after the simplification).
  - `NextActionPanel` copy updated: "BOL volume (already @ 20 °C) and seal numbers — that's it."

## Files touched this session
- `src/app/globals.css` — surface-3d, page-3d-bg, navItemIn collapse cascade, darker border tokens
- `src/app/layout.tsx` — `min-h-[100dvh]`
- `src/lib/fonts.ts` — Outfit for `--font-sans` (Inter retired)
- `src/lib/validators/trips.ts` — temp/density optional
- `src/server/actions/trips.ts` — skip @20°C math when temp absent
- `src/components/layout/sidebar-body.tsx` — bigger/bolder nav, staggered collapse
- `src/components/ui/data-table.tsx` — border-2 + surface-3d, bolder header
- `src/components/trips/fuel-capture.tsx` — full rewrite, drops temp/density, accepts `bolVolumeL`
- `src/app/(app)/trips/[id]/page.tsx` — BOLGate + LockedStep wrapper + page-3d-bg + simplified FuelCargoCard
- `src/app/(app)/trips/page.tsx` — page-3d-bg
- `scripts/shot-unoc.mjs`, `scripts/shot-trips.mjs`, `scripts/shot-trips-2.mjs` — Playwright verification

## Recent commits (top of branch)
- `02218a8` test: add trips list + detail screenshot scripts
- `cff499a` feat(trips): BOL-first sequential flow, Outfit font, 3D cards, fix blank-scroll
- `478416f` feat(ui): bolder/bigger sidebar nav, smooth slide-down group collapse, stronger table borders + crisper fonts
- `321c6ae` test: add UNOC light/dark screenshot script
- `8030378` feat(ui): UNOC light-mode restyle — black/gold sidebar, raised cards, collapsible nav, truck animation

## Gotchas / honest caveats
- `animate-content-in` must stay fill-mode `backwards` (lingering transform = blurry text). Don't reintroduce `both`.
- Outfit is now the body font too. If a future change wants Inter back for body, edit `src/lib/fonts.ts` and globals.css comment.
- Documents card is **intentionally not locked** by `LockedStep` — it has to be reachable for the BOL to be uploadable to unlock the rest. User mentioned wanting "STEP 1 — Documents" header for visible 1→5 numbering (not done yet).
- Legacy trips with temp+density data still display their old corrected @20°C value correctly. DB columns kept for back-compat — only the new-entry path is simplified.
- BOL gate currently uses **only** document presence (`kind === 'bill_of_lading'`). User might want it tightened to require BOL + trip status (e.g. `loading`).
- Build is clean; last `npx tsc --noEmit` (post-cff499a) passed silently; last `npx next build` succeeded.

## Open follow-ups (user flagged or implied, NOT done)
1. **Rename Documents header to "STEP 1 — Documents"** so the locked steps read 1→5 with no jump.
2. **Apply `.page-3d-bg` + `.surface-3d` to other operational pages** (dashboard, bookings, trucks, invoices) for visual consistency.
3. **Tighten BOL gate** to require both document + status = `loading` (or stricter).
4. **UNOC table exact-match** — filled black header background (currently 2px underline). Optional aesthetic match.
5. **`/trips` quick-filter chips** (Planned / In transit / At border / Delivered) — clickable counters.
6. **Block trip leaving `loading` until destination+rate set** — offered earlier, not built.

## Ops still on the USER (not code)
Set `CRON_SECRET` in Vercel (FX cron now 503s without it) · verify `RESEND_FROM` domain · Supabase PITR backups · Sentry (Vercel integration; `global-error.tsx` has the TODO) · UptimeRobot.

## Known deferred (not blockers)
Backdated FX for historical expenses · spares inventory module · real server-rendered invoice PDF + email-send · soft-delete/recover · driver wallet · customer credit-limit block · SQL-level (not render-level) pagination · full RBAC coverage beyond finance mutations.
