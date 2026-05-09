# TX System — UI Direction

Status: **Direction agreed; awaiting brand assets.**
Last updated: 2026-05-09

---

## 0. The bar — "beautiful enough that people *want* to use it"

Per Nile Valley: TX System must not be a utility you tolerate; it must be a product your team **reaches for** every day. The standard is *beautiful + addictive*, not *functional + acceptable*.

Every screen we ship is held against this checklist before merge:

- [ ] **Instant feel** — actions respond in <100ms (optimistic updates, no spinners on the happy path)
- [ ] **Beautiful empty state** — never a blank screen; explains and looks intentional
- [ ] **Polished loading** — skeleton loaders, never a bare spinner
- [ ] **Delightful micro-interactions** — hover lifts, smooth status pill transitions, satisfying success animations
- [ ] **Friendly error state** — clear message + suggested fix, never a red wall of text
- [ ] **Keyboard accessible + shortcuts** — Cmd-K palette + shortcuts on every common action
- [ ] **Smart defaults** — remembers last filter, last truck, last route; fewer clicks
- [ ] **Live feel** — real-time updates without refresh where it matters (dispatch, KPIs, trip status)
- [ ] **Pixel-tight typography & spacing** — consistent scale; aligned to the 4px grid
- [ ] **Tasteful animation** — Framer Motion transitions; never gratuitous
- [ ] **Print-ready** — exports (Management Pack PDF, invoice, POD) look like a banker designed them
- [ ] **In-context help** — tooltips, hints, no need to open a manual
- [ ] **Mobile feel** — driver PWA has tactile feedback, big tap targets, sound/haptic on doc-scan success

PRs that fail this checklist do not merge. This is enforced via PR review, not just hoped for.

---

## 1. Visual language: "Fleet Command Centre"

TX System feels like a **logistics ops control room**, not a generic CRUD app:

- **Dark-first** (the default), with a **light mode toggle** in the user profile
- **Dense information layouts** — multiple KPIs visible at a glance, similar in feel to Samsara, Geotab, Datadog, Grafana, Cloudflare, Linear (dark)
- **Real-time motion** — updates, status changes, and trip events animate in subtly
- **Premium charting** — sparklines on KPI cards, trend arrows, drill-downs, filter bars
- **One strong accent colour** drawn from Nile Valley brand (incoming) for status/active states; muted neutrals everywhere else
- **Clear typography hierarchy** — figures are the hero; labels are quiet
- **Micro-interactions** — hover states, optimistic updates, skeleton loaders, toast notifications

### Reference apps for the look-and-feel
- **Samsara** — gold standard fleet command UI
- **Geotab** — dense fleet dashboards
- **Linear** (dark mode) — premium typography + tight spacing
- **Vercel dashboard** — chart polish + dark mode
- **Cloudflare dashboard** — dense data, strong navigation
- **Datadog / Grafana** — real-time dense panels (for the dispatch board specifically)

## 2. Light mode

Even with dark-first, a clean light mode is required for:
- Finance / accounting screens (long sessions, printouts, accountants prefer light)
- Customer portal (lower-stakes, broader audience)
- Driver PWA in bright sunlight (legibility)

Light mode uses the same component library, just a swapped colour token set. shadcn/ui + Tailwind handles this with a single `data-theme` switch.

## 3. Component & tooling stack

| Concern | Tool | Why |
|---|---|---|
| Component primitives | **shadcn/ui** (Radix-based) | Accessible, owned-source components we can theme deeply |
| Styling | **Tailwind CSS** + CSS variables | Theme tokens; dark/light without rewriting components |
| Charts | **Tremor** (built on Recharts) | Best-in-class dashboard charts out of the box; plays well with shadcn |
| Icons | **Lucide React** | Clean, consistent, huge set, free |
| Motion | **Framer Motion** | Tasteful transitions, page slides, KPI count-up animations |
| Theme toggle | **next-themes** | Standard Next.js dark/light implementation |
| Maps (later, with GPS) | **Mapbox GL** or **MapLibre** | Dark map styles match the command-centre aesthetic |
| Tables | **TanStack Table** | Sorting, filtering, virtualisation for big trip/expense lists |
| Forms | **React Hook Form + Zod** | Already in plan for validation |
| Data fetching | **TanStack Query** | Optimistic updates, caching, real-time feel |

## 4. Layout patterns by area

| Area | Layout | Mode |
|---|---|---|
| **Dispatch board** (live trips) | Wide left-nav, big map (later), trip list with status pills, real-time updates | Dark-first; dramatic |
| **Per-truck dashboard** | KPI cards (cost/km, revenue/km, profit, fuel eff., utilisation, downtime) with sparklines + drill-downs | Dark-first |
| **Finance screens** (GL, AR/AP, journals, bank rec) | Two-pane: list + detail; tight tables | Light-first (with dark available) |
| **Monthly Management Pack** | Long scrollable report with section nav; print-ready | Light-first |
| **Driver PWA** | Single-column, big tap targets, camera-prominent, offline indicators | Auto (matches phone setting) |
| **Customer portal** | Branded, simple status timeline + ETA + POD download | Light-first |
| **HR** | Tab-based employee profile (contract, payroll, leave, appraisal, loans) | Light-first |
| **Workshop / Job Cards** | Two-pane job list + job card detail; spares grid | Dark-first (workshop floor screen) |

## 5. Polish in the MVP (Phase 0 deliverables)

To avoid every phase looking "basic" in early demos, **Phase 0 is widened by ~1 week** to ship:

- Themed shadcn/ui component library (buttons, cards, inputs, modals, tabs, toasts) in both modes
- Layout shell: top bar, left nav (collapsible), breadcrumbs, command palette (Cmd-K)
- A real **dashboard skeleton** with sample KPI cards, sparkline, chart, and filter bar
- Theme toggle wired in
- Typography scale, spacing scale, colour tokens locked in
- Storybook or a simple `/design` route to preview every component

Every later phase plugs into this skeleton — no module ever ships unstyled.

## 6. Brand assets — what we need from Nile Valley

1. **Logo** — vector preferred (SVG / AI / PDF). Horizontal *and* icon-mark versions if you have them.
2. **Brand colour palette** — primary, secondary, plus any greys / status colours you already use. Hex or RGB codes.
3. **Typography** — if Nile Valley has a brand font, send the name (and the file if it's a paid font). Otherwise we'll pick a clean web font (likely Inter or Geist) that matches the command-centre feel.
4. **Favicon / app icon** — for browser tab + PWA home-screen icon.

When these arrive, we encode them as design tokens (CSS variables) so the whole product re-themes by changing a single file.

## 7. Decisions log

- 2026-05-09: Visual style = **Fleet Command Centre** (dark-first dense, light mode available, real-time feel).
- 2026-05-09: Both modes required; user-toggleable.
- 2026-05-09: Premium dashboards from day 1; Phase 0 widened by ~1 wk to ship the design system + dashboard skeleton.
- 2026-05-09: Tooling: shadcn/ui + Tailwind + Tremor + Lucide + Framer Motion + next-themes + TanStack Table/Query.
- 2026-05-09: Reference apps: Samsara, Geotab, Linear (dark), Vercel, Cloudflare, Datadog, Grafana.
- 2026-05-09: Brand assets pending from Nile Valley (logo + colours + font + favicon).
