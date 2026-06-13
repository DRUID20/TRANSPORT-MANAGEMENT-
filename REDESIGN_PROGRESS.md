# REDESIGN PROGRESS — autonomous run checkpoint

> Living source of truth for the DESIGN.md redesign. **Read this first** after any
> context restart, then continue from the first unchecked item. Update the checkboxes
> + "last commit" as you go. Authoritative visual spec is `DESIGN.md` (§ refs below).

## Mission
Take every screen of Nile Valley Logistics to the DESIGN.md bar (dark control-tower:
Linear × Mercury × Stripe × Fleetio). Functionality may be mocked; visual quality may
not. Work top-down through the ordered list; each item is a shared primitive or surface
so it lifts many pages at once.

## Workflow knowledge (don't relearn this)
- **Branch:** `claude/plan-truck-system-Mfwm8`. Commit + push each item. PR already open.
- **Prod URL:** https://transport-management-ruddy.vercel.app  — auto-deploys on push (~2–2.5 min).
- **Screenshot login:** email `omazmz@gmail.com`, password `Omar2026` (Playwright via `npx playwright`).
- **Verify loop:** `npx tsc --noEmit` + `npx next lint` → `npm run build` → push → wait ~2.5min → Playwright screenshot → Read the PNG.
- **Local demo repro (for runtime 500s):** move `.env.local` aside, run
  `ALLOW_DEV_LOGIN=true SESSION_SECRET=devsecret... npx next dev -p <port>`, hit
  `/api/dev-login` then the page, grep dev log for the stack. **Always restore `.env.local`**
  afterward (back it up to /tmp first; it's ~783 bytes — Postgres creds).
- **RSC gotcha (already hit twice):** server components cannot pass **functions** (incl.
  Lucide icon components) to client components. Pass rendered nodes (`icon={<Truck/>}`) or
  string keys, not the component itself.
- **Empty workspace is correct:** real org has no seed data, so zeros/empty-states are the
  honest render. Never fabricate data (DESIGN.md §15 bans lorem ipsum).
- **Tokens:** all colors are CSS vars in `globals.css` (`--bg-app`, `--accent`, etc.) exposed
  as Tailwind `bg-app`, `text-fg-primary`, `surface-card`, `surface-interactive`, etc.
  Never hardcode hex. `.kpi-number`, `.pill`, `tnum` utilities exist.

## Ordered task list
- [x] **0. Design tokens + fonts** (§2,§3) — `f15a206`
- [x] **1. Sidebar** (§7) — `46baeef`
- [x] **2. KPI cards + dashboard top** (§10,§14) — `4829f11`, fix `b69ada0`
       (shared `components/dashboard/kpi-card.tsx`: 32px mono count-up, border-hover,
        delta pill, sparkline, tone. Icon prop is ReactNode.)
- [x] **3. Tables — Mercury standard** (§8) — `components/ui/data-table.tsx`.
       40px uppercase header w/ sortable arrows; 48px rows, bottom-border only (no zebra/
       vertical lines), hover `--bg-hover`, whole row → slide-over; numbers RIGHT in mono
       tnum; status pills centered; first-col truck(plate+icon)/driver(initials avatar);
       toolbar (search + filter chips + density + export); skeleton loading rows;
       empty-state; pagination "1–25 of 312". Touches every list page.
- [x] **4. Topbar + Cmd+K palette** (§7,§14) — `components/layout/topbar.tsx` + new command
       palette (Linear style, Esc/Enter, fuzzy nav across all routes). Breadcrumb left,
       search pill center w/ ⌘K keycap, bell + mono date right.
- [ ] **5. Buttons + Forms/Inputs** (§5,§6) — audit `button.tsx`, `input.tsx`, `select.tsx`,
       `textarea.tsx`, `label.tsx`, `form-section/footer`. 38px inputs, focus accent+glow ring,
       label-above, custom selects (no native), toggle/checkbox/radio, sticky form footer.
       Lifts every `/new` + `/[id]` edit page.
- [ ] **6. Slide-overs + modals + toasts + menus** (§12) — new right-panel detail pattern
       (520px, 250ms, scrim, tabs Details/Documents/History/Costs, sticky footer). Modals
       (scale-in, type-to-confirm destructive). Toasts (bottom-right, undo, auto-dismiss).
       Wire list rows → slide-over.
- [ ] **7. Status pills** (§8,§2) — one canonical pill component, tinted bg + dot, used app-wide.
- [ ] **8. Charts restyle** (§10) — area/line (gradient, crosshair, custom tooltip), bars
       (radius-4 top), donut (center total), sparklines. Restyle existing Recharts usages.
- [ ] **9. Calendar** (§9) — `/calendar` + scheduling to Notion-Calendar standard.
- [ ] **10. Reports + print** (§13) — report shells + **light** print stylesheet.
- [ ] **11. Micro-interactions + banned-list sweep** (§14,§15) — route fade/drift, stagger,
       skeletons everywhere, reduced-motion, scrollbars, selection color; grep for native
       controls / hardcoded hex / emoji icons / zebra tables and fix.

## Parallel track — DB persistence (separate from visuals)
- Schema is FULLY built in Postgres (50 tables, `693265b`) but only **master data**
  (trucks/trailers/drivers/customers/suppliers/subcontractors/rates) is wired to the DB.
  All other modules still read the **in-memory mock store** (`src/server/db/mock-store` or
  similar) so their data resets on redeploy. Wiring each module = build repo + swap the
  server action, following the fleet pattern. Not required for the visual redesign; do only
  if explicitly asked or if time remains after the redesign list.

## Notes / gotchas log
- HR pages crashed when seeds off (unconditional dept-head writes spread undefined) — fixed `151954f`.
- `npx next lint` and `npx tsc --noEmit` both must be clean before build.
