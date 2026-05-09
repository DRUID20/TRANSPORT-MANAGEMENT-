# TX System

**Customer:** Nile Valley Logistics
**Status:** Phase 0 — Foundation (scaffolding, design system, dashboard skeleton)

A Transport Management System for cross-border road freight out of Kenya — fleet, trips, finance, and per-truck performance, with a dark-first **Fleet Command Centre** UI (Apple × SpaceX × Nile Valley).

---

## What's in Phase 0

- ✅ Next.js 15 + React 19 + TypeScript strict + Tailwind v3
- ✅ Locked design tokens (light + dark) — `src/app/globals.css`
- ✅ Inter (UI) + JetBrains Mono (numerals/IDs) via `next/font`
- ✅ UI primitives: Button, Card, Input, Badge, Separator, Tooltip
- ✅ Layout primitives: AppShell, Topbar, Sidebar, Logo, ThemeToggle
- ✅ Dashboard primitives: KPI card, Sparkline (Recharts), AreaChart card, StatusPill, FilterBar
- ✅ Pages: `/login` (glassy NVL-branded), `/dashboard` (KPIs + chart + recent trips), `/design` (component QA)
- ✅ Drizzle schema for organisations, users, roles, currencies, fx_rates, audit_log, chart_of_accounts, counters
- ✅ Supabase client (browser + server)
- ✅ `FxRateProvider` interface + CBK stub + Frankfurter stub + Vercel cron route
- ✅ Sentry instrumentation hook (env-gated)
- ✅ PWA manifest + theme colours
- ✅ Vitest + sample test (`format.ts` — 7 tests passing)
- ✅ GitHub Actions CI: typecheck · lint · test · build
- ✅ Error boundary (`global-error.tsx`) + 404 page

## What's NOT in Phase 0

No business logic. No trucks, no trips, no finance — those land in Phase 1+.
The dashboard data is sample data so you can see the visual language.

---

## Quick start

```bash
# 1. Install deps
npm install

# 2. Copy env
cp .env.example .env.local
# Fill in Supabase URL + anon key when you have them
# (the app boots without them but auth is dormant)

# 3. Run dev
npm run dev
# → http://localhost:3000  (auto-redirects to /dashboard)
```

## Useful pages

| URL | What it shows |
|---|---|
| `/` | Redirects to `/dashboard` (Phase 0 has no auth gate yet) |
| `/login` | Branded glassy login screen on pure-black background |
| `/dashboard` | Sample Fleet Command Centre with 6 KPIs + revenue chart + recent trips |
| `/design` | Internal: every component rendered for QA in both modes |

## Theme toggle

Top-right of the topbar. Persists to `localStorage` via `next-themes`. Default = dark.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | `next lint` |
| `npm test` | Vitest run |
| `npm run test:watch` | Vitest watch |
| `npm run test:e2e` | Playwright E2E (no smoke test wired yet — Phase 1) |
| `npm run db:generate` | Generate Drizzle SQL migrations |
| `npm run db:push` | Push schema to Supabase Postgres (dev only) |
| `npm run format` | Prettier write |

## Project layout

```
src/
├── app/
│   ├── layout.tsx              # Root layout: fonts, theme provider
│   ├── globals.css             # Design tokens (light + dark)
│   ├── page.tsx                # Root → redirects to /dashboard
│   ├── (auth)/login/           # Login page (glassy, branded)
│   ├── (app)/                  # All app screens — wrapped in AppShell
│   │   ├── layout.tsx          # AppShell (Sidebar + Topbar)
│   │   ├── dashboard/          # Sample Fleet Command Centre
│   │   └── design/             # Component preview (internal QA)
│   ├── api/cron/fx/            # Daily CBK FX cron (stub)
│   └── global-error.tsx        # Top-level error boundary
├── components/
│   ├── ui/                     # Button, Card, Input, Badge, Separator, Tooltip
│   ├── layout/                 # AppShell, Topbar, Sidebar, Logo, ThemeToggle
│   ├── dashboard/              # KPI card, Sparkline, AreaChart, StatusPill, FilterBar
│   └── theme-provider.tsx      # next-themes wrapper
├── lib/
│   ├── utils.ts                # cn(), etc.
│   ├── fonts.ts                # Inter + JetBrains Mono
│   └── format.ts               # Money/number/percent formatting (KES base)
├── server/
│   ├── db/                     # Drizzle schema + client
│   ├── supabase/               # Browser + server clients
│   └── fx/                     # FxRateProvider interface + CBK + Frankfurter stubs
└── instrumentation.ts          # Sentry hook (env-gated)

docs/                           # The plan + decision artifacts (don't delete)
├── design/                     # ui-direction.md, color-tokens.md
├── finance/                    # CoA, FX strategy, management pack reference
└── operations/                 # workflow-baseline.md (Nile Valley extensions)

.github/workflows/ci.yml        # CI: typecheck · lint · test · build
vercel.json                     # Vercel cron schedule (FX daily 14:30 UTC = 17:30 EAT)
```

## Environment variables

See `.env.example` for the full list. Phase 0 boots without any of them set; pages render with sample data and no real auth/DB calls.

For Phase 1, you'll need at minimum:

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — auth + RLS
- `DATABASE_URL` — Drizzle direct connection to Supabase Postgres
- `FX_CRON_SECRET` — protects the daily FX cron endpoint
- `SENTRY_DSN` (optional) — production error capture

## Design system

Locked tokens are documented in [`docs/design/color-tokens.md`](./docs/design/color-tokens.md):

- **SpaceX** surfaces: pure black → tonal greys → hairline borders, no fake shadows in dark mode
- **Apple** semantics: green (success) / orange (warning) / red (danger), refined greys in light mode, frosted-glass overlays
- **Nile Valley** brand: navy `#14266B` + bright blue `#1E5BB8` as the primary accent (replaces Apple Blue)
- **Inter** for UI, **JetBrains Mono** for all numerals and IDs (tabular figures)

Quality bar: every screen must pass the 13-point checklist in [`docs/design/ui-direction.md §0`](./docs/design/ui-direction.md).

## Phase plan

See [`PLAN.md`](./PLAN.md) for the full phasing. Next up: **Phase 1 — Asset Register + Fleet + Workshop / Job Cards.**
