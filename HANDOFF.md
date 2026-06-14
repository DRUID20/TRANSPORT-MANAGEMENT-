# HANDOFF — read this first after a context reset

> Single source of truth for continuing this session. Concise on purpose.
> Deeper history: `docs/RUNBOOK.md`, `docs/GO-LIVE-AUDIT.md`, `docs/SECURITY-rls.md`.

## Where things stand (2026-06-14, late)
Nile Valley Logistics — cross-border fuel-haulage TMS. **Production-deployed, near go-live.**

- **Branch:** `claude/plan-truck-system-Mfwm8`. Draft **PR #1** open (`druid20/transport-management-`). Commit + push every unit.
- **Prod:** https://transport-management-ruddy.vercel.app · auto-deploys on push (~2–2.5 min).
- **Login (Playwright):** `omazmz@gmail.com` / `Omar2026`. Run scripts FROM the repo dir (so `playwright` resolves); context needs `ignoreHTTPSErrors:true`. Theme stored in `localStorage.theme` ("light"|"dark"); next-themes, default dark.
- **Supabase project id:** `jpfvhfcjduimnjijdang` · **org id (nile-valley):** `73aa3af1-5bd5-42cc-b3a9-b60e67f01f1f`. Apply SQL via the Supabase MCP (`apply_migration`/`execute_sql`) — the sandbox can't resolve Supabase DNS for `db:*` scripts.
- **Verify loop:** `npx tsc --noEmit` + `npx next lint` → `npm run build` → commit + push → wait ~2.5min → Playwright check on prod.

## Stack / conventions
- Next 15 App Router, React 19, server actions, Tailwind w/ CSS-var tokens in `src/app/globals.css` + `tailwind.config.ts`.
- Dual-mode repos: `actions/*` → `repos/*`; each repo `if (IS_DEMO_MODE) return store…()` else Postgres scoped by `requireOrgId()`.
- Drizzle: numeric columns round-trip as strings (`Number()` read, `String()` write); jsonb arrays need `as unknown as` casts.
- Fonts: Outfit (display `--font-display`), Inter (sans `--font-sans`), JetBrains Mono (`--font-mono`) — see `src/lib/fonts.ts`. (Base font-family bug already fixed to use `--font-sans`.)

## DONE & verified (everything shipped this session)
- Full dark UI redesign; **26/32 modules persist to Postgres** (tracker/driver-session/rbac/reports-catalogue stay in-memory by design — but reports + performance aggregators now READ via repos).
- Security: custom auth (bcrypt, lockout, CSPRNG OTP + premium email), RLS + grants revoked from anon/authenticated (false-positive `rls_enabled_no_policy` is expected — see docs/SECURITY-rls.md).
- File uploads (Supabase Storage private `documents` bucket): trip docs (+ Bill of Lading + Road User Charge kinds), HR compliance, leave attachments, employee photos. Auth-proxied, org-isolated.
- Branded Excel + PDF reports. New reports: Revenue by Customer, Driver Performance, Monthly Trend (chart), VAT Summary, **Truck Statement** (per-truck cumulative retained-earnings memo). Reports + tracker read real Postgres data.
- **FX live** (`open.er-api.com`, covers KES/USD/UGX): `repos/fx.ts`, daily cron `/api/cron/fx` (now REQUIRES `CRON_SECRET`), `/fx` page + converter, invoice/bill/expense forms auto-fill the rate.
- **Subcontractor accounting** (10% commission): `subcontractor_payments` ledger, supplier-direct → AP bill (502500), account statement on the detail page.
- **Workshop → AP:** completing a job card raises draft supplier bill(s) for spares (mapped to 504xxx); in-house labour excluded from GL; optional trip link.
- **Expenses:** choose KES/USD/UGX (auto-FX), delete (detail + list-row), truck-expenses require a trip, closed trips hidden from assignment.
- **Trips workflow (the big recent one):**
  - Destination is NOT set at booking — only customer + product + volume + origin. Destination is **bound on the trip** at the depot or transit border (Malaba/Busia) via `ConfirmDestinationCard`, with audit (`destination_confirmed_at/by`) + timeline event + Road User Charge doc kind.
  - **Rate is destination-driven → looked up on the trip** when the destination is confirmed (`lookupRate(origin→dest)`); rate removed from the booking form; `bookings.agreed_*` now nullable.
  - **One invoice per trip**, billed on **delivered L20**; fuel shortage → driver payroll loan (idempotent via `loans.shortage_trip_id`, valued in KES).
  - "No new trip on a truck with an unfinished trip" guard in `planTrip`.
- **Audit + RBAC:** `audit_log` now written on finance mutations (`server/auth/audit.ts`); `requireCapability()` role gate (`server/auth/permissions.ts`) on AR/AP/ledger/loan mutations; read-only `/admin/audit-log` (admin-gated).
- **Perf:** `borderChargesByTrip(ids[])` batched (killed 4 N+1s); `fleetProfitAndLoss` parallel; server-side pagination on /expenses /invoices /bills /trips /bookings (`components/ui/paginator.tsx`).
- Theme contrast pass: per-mode font smoothing (subpixel light / grayscale dark), darker borders, fixed the `animate-content-in` lingering-transform blur (fill-mode `backwards`), bolder sidebar.

## NEXT — UNOC light-mode restyle (USER's current ask; 2 reference screenshots of the UNOC portal)
User wants **LIGHT MODE specifically** to look like the UNOC (Uganda National Oil) portal. **"Not the layout, just the fonts and colours."** Plus collapsible nav, 3D-looking cards/forms, and real animation. Be honest about scope; don't claim more than done.

### Design language extracted from the screenshots (build to THIS)
1. **Sidebar = solid BLACK** (`#0B0B0C`-ish), white text/icons, in LIGHT mode (today it's `bg-bg-surface` light grey). Active item = **gold/amber pill** (`~#F2A93B`) with dark text, full-rounded. Group headers are collapsible with a chevron; expanded groups show sub-items connected by a thin tree line (e.g. Discharge Inst → Outturn Values / Original DIs). There's a rounded "OPERATIONS" section chip. Likely needs a dedicated `--sidebar-bg` / `--sidebar-active` token rather than reusing surface tokens, so dark mode is untouched.
2. **Top bar = white**, clean; icon buttons sit in light circular chips; right side = avatar + name + company + chevron.
3. **Content bg = very light grey** (`~#F4F5F7`). **Cards = white, rounded ~14px, soft drop shadow (the "3D"/raised look) + hairline border.** This is the key "make forms 3D like they have a background" ask → bump light-mode card shadow (today depth is border-only; add a real soft shadow in light mode) and give form sections the same raised white panel.
4. **Buttons = black filled, rounded, icon + label** (Filter / Export / New Order); some black-outline. Primary CTA stays black in light mode (gold is the *accent/active*, not the button fill).
5. **Tables = black rounded header row**, white body rows, subtle separators.
6. **Status pills = outlined, colour-coded** (green APPROVED/✓, blue COMPLETED, amber for urgency/ageing). Expiry-style tags as small pills, colour by urgency.
7. **Font = rounded geometric sans** (Poppins/Outfit feel; headings bold). Outfit is already loaded as `--font-display`; consider using it (or Poppins) for headings + a rounded sans for body in light mode. Keep mono for numbers.
8. Accent palette: **black + gold/amber + green success + blue info**; lots of whitespace.

### Concrete tasks
- **A. Light tokens (globals.css):** introduce sidebar tokens (black bg, gold active, white fg) used by the sidebar in light mode only; lift `--bg-base` to a soft grey; add a light-mode card shadow (`--shadow-card`) and apply to `.surface-card` + `<Card>` + `FormSection` so cards look raised/3D. Keep DARK mode as-is.
- **B. Sidebar collapsible groups:** `src/components/layout/sidebar-body.tsx` + `nav-data.ts`. Make each nav GROUP a collapsible accordion (click header → expand/collapse, chevron rotates, smooth height animation), persist open/closed per group in localStorage. Active group auto-opens. The user said "make them appear and disappear at a click" → this is the deliverable. (Today groups are always-expanded.)
- **C. 3D forms:** the `FormSection` component (`src/components/ui/form-section.tsx`) + `Card` → white raised panel with the new shadow in light mode.
- **D. Real animation:** a tasteful moving-truck animation where it fits — e.g. the app loading state, the tracker page hero, and/or empty states. Keep it CSS/lightweight, respect `prefers-reduced-motion`. Don't fake GPS movement; it's decorative/feedback only. Be upfront it's decorative.
- **E. Restyle status pills** to the outlined colour-coded look if not already.

### Gotchas for the restyle
- Only touch LIGHT-mode token values + add sidebar/shadow tokens; the dark "control tower" theme must stay. Test BOTH themes after.
- The sidebar currently uses `bg-bg-surface` / `text-fg-*`. Switching it to black in light mode means it should NOT follow the surface token — give it its own classes/tokens that resolve to black in light AND stay dark-appropriate in dark mode (in dark mode a near-black sidebar is already fine, so a single dark sidebar token works for both).
- `animate-content-in` must keep fill-mode `backwards` (lingering transform = blurry text). Don't reintroduce `both`.
- Mobile drawer shares `SidebarBody` — collapsible groups must work there too.

## Ops still on the USER (not code)
Set `CRON_SECRET` in Vercel (FX cron now 503s without it) · verify `RESEND_FROM` domain · Supabase PITR backups · Sentry (Vercel integration; `global-error.tsx` has the TODO) · UptimeRobot.

## Known deferred (not blockers)
Backdated FX for historical expenses · spares inventory module · real server-rendered invoice PDF + email-send · soft-delete/recover · driver wallet · customer credit-limit block · SQL-level (not render-level) pagination · full RBAC coverage beyond finance mutations · block trip leaving `loading` until destination+rate set (offered, not yet built).
