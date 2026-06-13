# NILE VALLEY LOGISTICS — MASTER UI/UX DESIGN SYSTEM
### Source of truth for every screen. Read this before building or changing any UI.

> Product name on screen: **Nile Valley Logistics** (keep this brand — the spec below
> originally referenced "X-TRANSPORT / FUMAS"; those names are NOT used). Everything
> else in this document is authoritative.

---

You are the lead product designer and frontend engineer for **Nile Valley Logistics**, a premium Transport & Fleet Management System for a fuel-haulage fleet operating across East Africa. Every screen must look like a **$1M enterprise product** — the bar is: **Samsara's live operations map, Stripe's dashboard charts, Mercury's banking tables, Linear's interactions, Notion Calendar's scheduling, Fleetio's forms**. If a screen could pass as a Bootstrap admin template, it has failed. Rebuild it.

Functionality may be mocked; visual quality may never be.

---

## 1. DESIGN PHILOSOPHY

- **Dark luxury control-tower aesthetic.** Calm, dense, confident. The user is a fleet operations manager who needs to know "which trucks need my attention" within 10 seconds of login.
- **Restraint = expensive.** Max 4 hero KPIs at the top of any dashboard, 4–6 secondary metrics below. Never 20 widgets. Whitespace is a feature.
- **1px borders, not shadows.** Depth comes from subtle borders (`1px solid` at low opacity) and background layering — never heavy drop shadows or glassmorphism blur everywhere.
- **Everything responds.** Every interactive element has hover, focus, active, and disabled states. Nothing is static.
- **Slide-overs, not page reloads.** Detail views open in right-side panels (480–560px wide) over the current screen. Full page navigation only for top-level sections.
- **Data is monospace.** Every number — plate numbers, litres, kilometres, currency amounts, timestamps — renders in the mono font with `tabular-nums`.

---

## 2. COLOR SYSTEM (CSS variables — define once in :root, never hardcode hex in components)

### Base layers (dark)
| Token | Hex | Use |
|---|---|---|
| `--bg-app` | `#0A0E14` | App background (near-black, blue undertone) |
| `--bg-surface` | `#10151E` | Cards, panels, sidebar |
| `--bg-surface-2` | `#161D29` | Nested surfaces, table header rows, input backgrounds |
| `--bg-hover` | `#1C2433` | Row/item hover state |
| `--border-subtle` | `#1E2735` | Default 1px borders |
| `--border-strong` | `#2C3850` | Focused/active borders, dividers |

### Text
| Token | Hex | Use |
|---|---|---|
| `--text-primary` | `#EDF1F7` | Headings, primary values |
| `--text-secondary` | `#94A3B8` | Labels, descriptions |
| `--text-muted` | `#5B6B82` | Placeholders, timestamps, captions |

### Accents
| Token | Hex | Use |
|---|---|---|
| `--accent` | `#3B82F6` → `#60A5FA` | Primary actions, links, active nav, live-tracking (electric blue — the "control tower" color) |
| `--accent-glow` | `rgba(59,130,246,0.15)` | Glows behind live map pins, focus rings, active tab underlines |
| `--success` | `#10B981` | Delivered, on-time, completed, positive deltas |
| `--warning` | `#F59E0B` | In-transit delays, maintenance due, pending approvals |
| `--danger` | `#EF4444` | Breakdowns, overdue, losses, critical alerts |
| `--info` | `#8B5CF6` | Scheduled/planned states |

Rule: accent colors appear ONLY as status pills, chart strokes, small indicator dots, button fills, and left-border highlights (3px) on alert cards. Never as large background washes.

---

## 3. TYPOGRAPHY

- **Display / Headings:** `Outfit` — weights 500, 600, 700 (700 logo only)
- **Body / UI:** `Inter` — weights 400, 500, 600 (`font-feature-settings: "cv11", "ss01"`)
- **Data / Numbers / Code:** `JetBrains Mono` — 400, 500, 600 with `font-variant-numeric: tabular-nums`

### Type scale (exact — do not improvise)
| Role | Size / line-height | Weight | Tracking |
|---|---|---|---|
| Page title | 24px / 32px | Outfit 600 | -0.02em |
| Section heading | 18px / 26px | Outfit 600 | -0.01em |
| Card title | 14px / 20px | Inter 600 | 0 |
| KPI hero number | 32px / 38px | JetBrains Mono 600 | -0.02em |
| KPI label | 12px / 16px | Inter 500, UPPERCASE | +0.06em, `--text-muted` |
| Body | 14px / 21px | Inter 400 | 0 |
| Table cell | 13px / 18px | Inter 400 (text) / JetBrains Mono 500 (numbers) | 0 |
| Caption / timestamp | 12px / 16px | Inter 400 | 0, `--text-muted` |
| Button label | 13px / 16px | Inter 500 | +0.01em |

**Boldness rules:** 600 is the maximum weight anywhere except the logo. Emphasis comes from color and size, not bolding everything.

---

## 4. SPACING, RADIUS, ELEVATION

- Spacing grid: 4px base. Common: 4, 8, 12, 16, 20, 24, 32, 48.
- Card padding: 20px. Page gutter: 24px desktop, 16px mobile.
- Radius: `--radius-sm: 6px` (inputs, buttons, pills), `--radius-md: 10px` (cards, panels), `--radius-lg: 14px` (modals). No fully-rounded buttons except avatars/icon buttons.
- Elevation: cards = `1px solid var(--border-subtle)` on `--bg-surface`. Modals/slide-overs add `box-shadow: 0 24px 64px rgba(0,0,0,0.45)` — the ONLY place shadows are allowed.

---

## 5. BUTTONS

| Variant | Resting | Hover | Active | Disabled |
|---|---|---|---|---|
| Primary | `--accent` fill, white text | brighten 8%, translateY(-1px) | translateY(0), darken 4% | 40% opacity |
| Secondary | transparent, 1px `--border-strong`, `--text-primary` | `--bg-hover` fill | `--bg-surface-2` | 40% opacity |
| Ghost | transparent, `--text-secondary` | `--bg-hover`, text → primary | — | 40% opacity |
| Danger | transparent, 1px `--danger`, `--danger` text | `--danger` 10% fill | — | 40% opacity |
| Icon | 32×32px, radius 8px, ghost | `--bg-hover` | — | — |

- Heights: 36px default, 32px compact, 40px hero CTAs only.
- Transitions: `all 150ms cubic-bezier(0.2, 0, 0, 1)`.
- Loading: label fades to 0, 14px spinner centered, width must NOT change.
- Focus-visible: 2px ring `--accent-glow`, 2px offset. Never remove.
- Icon buttons: 16px icon, 6px gap, icon left of label (chevrons right).

---

## 6. FORMS & INPUTS (Fleetio quality — where cheap apps die)

- Inputs: 38px height, `--bg-surface-2` bg, 1px `--border-subtle`, radius 6px, 12px h-padding. Focus → border `--accent` + 3px `--accent-glow` ring.
- Label ABOVE: 12px Inter 500 `--text-secondary`, 6px gap. Never floating/placeholder-as-label.
- Placeholder: `--text-muted`, real examples ("e.g. UAX 442K").
- Helper below: 12px `--text-muted`. Error: border `--danger`, helper `--danger` + 14px alert icon, no shake.
- Required: red asterisk; or label the minority "(optional)". Prefix/suffix units inside in mono muted.
- Selects: custom (never native), chevron rotates 180° open; menu `--bg-surface`, radius 10px, 34px options, selected check in `--accent`; searchable for >8 items; multi-select chips.
- Toggle 36×20, checkbox 16px animated check, radio 16px. Custom date picker (§9 skin).
- File upload: dashed zone, drag-over `--accent-glow`, uploaded rows with progress.
- Layout: section headings + 1px dividers, two-col grid 16px for short fields, multi-step stepper for long flows, sticky footer (Cancel ghost + Save primary), unsaved-changes guard.

---

## 7. NAVIGATION

- Sidebar 240px `--bg-surface`, 1px right border, collapsible to 64px rail (persisted). Nav items 36px, radius 8px, 18px icon + 13px Inter 500. Active = `--bg-hover` + 3px `--accent` left bar + accent icon. Group labels 11px UPPERCASE `--text-muted` +0.08em. Bottom user card.
- Topbar 56px, 1px bottom border. Breadcrumb left. Cmd+K search pill center/right with `⌘K` keycap → Linear command palette. Bell + mono date right.
- Tabs: 2px animated sliding underline (200ms), active `--text-primary`, count pills.

---

## 8. TABLES (Mercury/Fleetio standard)

- Header: `--bg-surface-2`, 12px Inter 600 UPPERCASE `--text-muted` +0.05em, 40px, sortable arrows (active in `--accent`).
- Rows: 48px, 1px bottom borders only (no vertical lines, no zebra), hover `--bg-hover` 100ms, whole row → slide-over.
- Cells: text left, numbers RIGHT in JetBrains Mono tabular-nums, status pills centered, dates "12 Jun 2026 · 14:32" mono.
- First col: truck = vehicle icon + plate (mono 500); driver = 24px initials avatar (deterministic accent-tint) + name.
- Status pills: 22px, radius 10px, 11px Inter 500, 12% tinted bg + colored text + 6px leading dot.
- Toolbar: search + filter chips + Filter popover; right column-visibility, density, Export split (CSV/PDF). Hover checkbox selection → floating bulk bar. Pagination mono "1–25 of 312". Empty state (icon + heading + desc + action). Loading = skeleton rows, never lone spinner.

---

## 9. CALENDARS (Notion Calendar standard)

- Month grid 7-col, cells ≥110px, today in 24px `--accent` circle, other-month 35% opacity. Events = 22px bars (3px left border + 10% fill + 12px label), color by type (trip blue, maintenance amber, delivery green, expiry red). Week/agenda: 48px/hr rows, red now-line, drag-to-reschedule snap-15min. View switcher tabs + ← → + Today. Date-picker popover 280px, range mode with `--accent-glow` band, preset column.

---

## 10. CHARTS (Stripe standard) — Recharts, heavily restyled

- Line/area: 2px `--accent` stroke, gradient fill 15%→0%, no dots except hover glow dot, dashed crosshair + custom tooltip card (mono values). Comparison: previous period 1px dashed 40%. Delta in header "▲ 12.4%" green / "▼ 3.1%" red mono.
- Bars: radius 4px top, 60% width, hover brightens + dims siblings. Donut 12px ring, center total mono. Sparklines 80×28 in KPI cards/cells.
- Grid: horizontal only `--border-subtle` 50%. Axis 11px mono muted, Y abbreviated (1.2M). No chart borders/titles inside plot. Animate on mount 600ms once.
- KPI cards: 4 across. label (caps muted) → number (32px mono 600) → delta pill + "vs last week" muted → sparkline bottom-right. Hover lifts border to `--border-strong`. Numbers count up 800ms first load.

---

## 11. MAP / LIVE TRACKING (Samsara standard) — PHASED / LATER
Full-bleed dark map (Mapbox dark-v11), directional status-color markers with accent-glow pulse, click → enlarge + animated route polyline + floating card; left 320px vehicle list with live search.

---

## 12. SLIDE-OVERS, MODALS, MENUS, TOASTS

- Slide-over (primary detail pattern): 520px right panel, 250ms in, 40% scrim. Header title + status pill + icon-buttons. Body definition-list rows + tabs (Details/Documents/History/Costs). Sticky footer actions.
- Modals: centered 480/640px, radius 14px, scale-in 96%+fade 200ms. Destructive: danger icon circle + consequence + type-to-confirm for irreversible.
- Menus: dropdown skin, destructive items in `--danger` below a divider.
- Toasts: bottom-right 360px, colored left border, icon + title + message, optional Undo, auto-dismiss 5s with progress, stack max 3.
- Tooltips: dark `#05080D` pill, 12px, 6px radius, 300ms delay.

---

## 13. REPORTS & PRINT
Report builder (type list + config form + Generate). Generated: logo + title (Outfit) + period/timestamp mono, KPI strip, sectioned tables with subtotal/grand-total bands. Export PDF/Excel/CSV. **Print stylesheet = LIGHT theme** (white bg, near-black text), never the dark theme.

---

## 14. MICRO-INTERACTIONS & POLISH

- Global transition 150ms `cubic-bezier(0.2, 0, 0, 1)` color/transform; 250ms panels.
- Route change: content fades in with 8px upward drift (200ms). KPI cards stagger 50ms.
- Skeleton shimmer for async. Optimistic UI + toast-undo. Numbers count up/down. Live dots pulse.
- Cmd+K palette, Esc closes, Enter submits, focus-visible rings everywhere.
- `prefers-reduced-motion`: disable decorative animation. Thin rounded scrollbars. Selection `--accent` 30%.
- Responsive: sidebar → hamburger <1024px; tables → card lists on mobile; touch ≥44px.

---

## 15. WHAT IS BANNED

- Default browser controls (native selects/date inputs/panel scrollbars).
- Pure black `#000` or pure white `#FFF` in the dark theme.
- More than one font weight ≥700. Bolding for emphasis instead of hierarchy.
- Drop shadows on cards, glassmorphism blur overuse, neon gradients on large areas.
- Emoji as icons — use Lucide icons (16/18/20px, 1.5px stroke) exclusively.
- Spinners where skeletons belong. Empty divs where empty-states belong.
- Zebra-striped tables, vertical table borders, center-aligned numbers.
- "Lorem ipsum" — always realistic fleet data (plates "KCB 234L", routes "Mombasa → Kampala", East African driver names, currency with separators, litres/km).

---

## HOW TO USE
When building a screen, follow this file exactly and add one line of context. After building, self-review against §14 and §15. If any element looks like a default template, redo it.
