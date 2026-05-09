# TX System — Design Tokens

Status: **Locked.** Apple × SpaceX fusion.
Last updated: 2026-05-09

---

## 1. The pairing

- **SpaceX** brings deep technical authority: pure black, high contrast, monospace numerals, no decoration. Reads like a control room.
- **Apple** brings smoothness and polish: refined greys, soft shadows, semantic status colours, the iconic blue accent. Feels premium.

Together: an aerospace-grade command centre that's nonetheless soft and pleasant to live in for 8 hours a day.

## 2. Surface & text — Dark mode (default)

| Token | Hex | Use |
|---|---|---|
| `--bg-base` | `#000000` | Page background (pure SpaceX black) |
| `--bg-surface` | `#0A0A0A` | Panels, the main app shell |
| `--bg-elevated` | `#161616` | Cards, modals, sheets sitting on a panel |
| `--bg-elevated-2` | `#1F1F22` | Highest surface (popovers, tooltips) |
| `--border` | `#1F1F22` | 1px hairline dividers |
| `--border-strong` | `#2A2A2D` | Stronger dividers (table headers) |
| `--text-primary` | `#FFFFFF` | Headlines, KPI numbers |
| `--text-secondary` | `#A1A1AA` | Body text, labels |
| `--text-tertiary` | `#6B7280` | Captions, metadata, placeholders |
| `--text-disabled` | `#3F3F46` | Disabled states |

## 3. Surface & text — Light mode

| Token | Hex | Use |
|---|---|---|
| `--bg-base` | `#FFFFFF` | Page background |
| `--bg-surface` | `#F5F5F7` | Apple soft grey — panels |
| `--bg-elevated` | `#FAFAFA` | Cards |
| `--bg-elevated-2` | `#FFFFFF` | Popovers (with shadow) |
| `--border` | `#E5E5EA` | Dividers |
| `--border-strong` | `#D1D1D6` | Stronger dividers |
| `--text-primary` | `#1D1D1F` | Apple deep grey (not pure black) |
| `--text-secondary` | `#6E6E73` | Body text |
| `--text-tertiary` | `#86868B` | Captions |
| `--text-disabled` | `#C7C7CC` | Disabled states |

## 4. Accents (both modes)

| Token | Light hex | Dark hex | Use |
|---|---|---|---|
| `--accent-primary` | `#007AFF` | `#0A84FF` | Primary buttons, active links, focus ring (Apple Blue) |
| `--accent-primary-hover` | `#0066D6` | `#1A8FFF` | Hover state |
| `--accent-secondary` | `#5856D6` | `#5E5CE6` | Secondary actions, complementary accents (Apple Indigo) |

## 5. Status semantics (Apple)

| Token | Light hex | Dark hex | Use |
|---|---|---|---|
| `--status-success` | `#34C759` | `#30D158` | Trip delivered, payment received, on-time, healthy KPI |
| `--status-warning` | `#FF9500` | `#FF9F0A` | License expiring, idle truck, KPI off-target |
| `--status-danger` | `#FF3B30` | `#FF453A` | Overdue, breakdown, failed payment |
| `--status-info` | `#007AFF` | `#0A84FF` | Informational pills, neutral notifications |
| `--status-neutral` | `#8E8E93` | `#98989D` | Inactive / archived / closed |

## 6. Typography

| Token | Family | Weights | Use |
|---|---|---|---|
| `--font-sans` | **Inter** | 400, 500, 600, 700 | All UI text — labels, body, headings |
| `--font-mono` | **JetBrains Mono** | 400, 500 | Numerals, money columns, truck registrations, trip IDs, timestamps, codes |

Type scale (4px grid, 1.25 ratio): 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40 / 48.

Numerals use **tabular figures** (`font-feature-settings: 'tnum'`) so columns of money align perfectly.

## 7. Spacing, radius, motion

- **Spacing**: 4px base grid. Tailwind scale: 1, 2, 3, 4, 6, 8, 12, 16, 24.
- **Radius**: `--radius-sm` 6px (inputs), `--radius-md` 10px (cards, buttons), `--radius-lg` 16px (modals), `--radius-pill` 9999px (status pills).
- **Shadow (light mode)**: `0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.06)` for cards; `0 24px 64px rgba(0,0,0,.18)` for modals.
- **Elevation (dark mode)**: tonal — `--bg-surface` < `--bg-elevated` < `--bg-elevated-2`, plus 1px `--border` hairlines. No fake shadows.
- **Glass / blur**: modals and sheets use `backdrop-blur-xl` over a 70% opacity surface — Apple-style frosted overlay.
- **Motion**: 150–250ms ease-out for everything. Spring (Framer Motion) for KPI count-up and status pill morph.

## 8. Where each colour shows up

- **Black backgrounds + JetBrains Mono numerals** — dispatch board, trip list, journey log, fuel log, GPS map (later)
- **Apple Blue CTAs** — Save, Approve, Send, Submit
- **Apple Green tags** — "Delivered", "Paid", "Active"
- **Apple Orange tags** — "At border", "Expiring in 14 days"
- **Apple Red tags** — "Overdue", "Breakdown", "Failed"
- **Glass overlays** — confirmation modals, command palette (Cmd-K), driver POD-scan preview

## 9. Decisions log

- 2026-05-09: Apple × SpaceX fusion locked. No further palette options to be proposed; logo just needs to be sent so we can verify the accent doesn't clash, and so we can derive the favicon.
