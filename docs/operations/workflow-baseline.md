# Operational Workflow — Baseline

Status: **Baseline adopted.** Nile Valley to layer specific deviations on top.
Last updated: 2026-05-09

---

## 1. Trip lifecycle (the spine)

```
Lead/Order → Plan → Dispatch → Load → Transit → Border → Deliver → POD → Close → Invoice → Collect
```

Every arrow is a status change with a timestamp, a responsible user, and (usually) one or two documents. Status changes are immutable in the audit log; the current status is denormalized for fast reads.

### 1.1 Lead / Order
- Captured as a **Booking**: customer, origin, destination, cargo (type / weight / volume / units / hazardous flag), required date, agreed rate (per tonne / per trip / per km / per container).
- Source channels: phone, email, WhatsApp, customer portal.

### 1.2 Plan & Dispatch
- Operations selects truck + trailer + driver based on availability, last known location, and licence/insurance/COMESA validity.
- System generates **Trip ID** and prints/sends **trip instruction** (loading point + contact, cargo, route, ETA).
- **Driver advance** issued (M-Pesa or cash) for fuel, tolls, border, food.

### 1.3 Load
- Driver receives manifest / waybill / commercial invoice / packing list (cross-border: COMESA Yellow Card check, T1 transit, certificate of origin).
- Driver scans/photographs documents on the PWA → AI extracts fields → office captures.
- **Gate-out slip** with axle weights captured.

### 1.4 Transit
- GPS pings (deferred until Teltonika integration) + driver check-ins.
- Route stops logged: weighbridges, fuel, rest.
- Issues (breakdown, accident, delay) logged with timestamp + photos.

### 1.5 Border
- Driver presents transit docs at exit and entry posts.
- **Border-crossing time** captured (a primary KPI).
- Border charges (axle-load fines, transit permits, demurrage) captured against the trip.

### 1.6 Deliver
- Cargo offloaded at consignee.
- **POD** signed and stamped: driver photographs original; physical copy returns with truck.

### 1.7 POD return & Close
- Original POD reaches office.
- Trip closed: actual km, actual fuel litres, all expenses reconciled against driver advance, balance refunded or recovered.

### 1.8 Invoice & Collect
- AR raises invoice (one-per-trip *or* monthly batch — Nile Valley to confirm).
- Exports: zero-rated VAT, commercial invoice + POD copy attached.
- Customer pays (typical 30–90 days). Receipt allocated to invoice. Aged AR ticks down.

---

## 2. Around the lifecycle

### 2.1 Asset & driver setup (set up once, monitored forever)
- **Asset register**: trucks, trailers, generators, equipment with cost, NBV, depreciation, insurance, COMESA, NTSA inspection, transit permit dates.
- **Drivers**: licence class, expiry, medical, passport, COMESA driver permit, training, leave.
- **Expiry alerts**: dashboard surfaces 30 / 60 / 90 day warnings.

### 2.2 Maintenance
- Service intervals (every X km or Y months) per truck.
- Service records with parts (linked to inventory), labour hours, vendor, cost.
- **Tyres tracked per position** on each truck (LF / RF / LR1 / …) with km per tyre.

### 2.3 Cost capture
- Driver advances issued and reconciled at trip close.
- Receipts scanned by driver on the road → AI extracts vendor/amount/date → manager approves → posts to GL against the trip.
- Supplier invoices (workshop, fuel cards, insurance, tyres) entered into AP.

### 2.4 Customer side
- Customer portal / shareable tracking link → status, ETA, POD download.
- Statements sent monthly.
- Demurrage / detention auto-billed when threshold hours exceeded.

### 2.5 Cycles
- **Daily**: bank rec, CBK FX update, dispatch board, idle-truck list.
- **Weekly**: driver scorecard, trip variance report, AR follow-up.
- **Monthly**: Management Pack (the FLK-style 18 schedules), payroll, depreciation run, statutory returns.

---

## 3. Variation points — Nile Valley to specify

These are the points where most TMSes differ. Nile Valley will tell us its choices and any other deviations.

| # | Variation point | Default assumption | Nile Valley to confirm / override |
|---|---|---|---|
| 1 | Rate basis | Per tonne + per trip hybrid | TBD |
| 2 | Driver advances | M-Pesa primary, cash fallback | TBD |
| 3 | Subcontractor share | Tracked but not material in MVP | TBD (% of trips) |
| 4 | Invoicing cadence | One invoice per trip | TBD (per-trip / weekly batch / monthly) |
| 5 | POD requirement before invoicing | Scanned POD enough; original returned within X days | TBD |
| 6 | Fuel sourcing | Mix: driver buys + fuel card | TBD (cards used, if any) |
| 7 | Border / clearing | Own clearing agent | TBD (own / third-party) |
| 8 | Cost allocation | Every cost tagged to trip at capture | TBD |
| 9 | Approval thresholds | Driver advance < X auto-approved; expense < Y manager; > Y FM | TBD (the X and Y) |
| 10 | Monthly close sign-off chain | FM → CM → MD by day 10 of next month | TBD (chain + deadline) |

---

## 4. Open additions

This file is a living baseline. As Nile Valley walks through its own process, we **add a §X "Nile Valley deviations"** for each lifecycle stage that diverges, and an **§Y "Nile Valley extensions"** for activities not in the baseline.

---

## 5. Nile Valley extensions (from handwritten notes, 2026-05-09)

The current system in use at Nile Valley is called **Pumas**. TX System replaces it. The Pumas behaviours we must reproduce or improve:

### 5.1 Maintenance — Job Card workflow (now IN scope)

> *Previously marked out-of-scope. Pulled back in based on these notes.*

- A **Job Card** is generated **every time a truck is serviced at the yard**.
- Job Card contents:
  - **Mechanic analysis** (the diagnostic / what was wrong)
  - **Services done for the day** (the work performed)
  - **Spares** consumed (item, qty, cost)
- Posting behaviour:
  - **Spares are posted to the respective vehicle** (cost charged to the truck → drives per-truck P&L)
  - **Supplier AP statement** is generated automatically when spares are bought from a supplier
  - **Payment** is processed inside TX System (not in a separate accounting tool)
  - **Grouping**: maintenance expense routed into the respective expense groups (so the OPEX analysis stays clean)

### 5.2 Operations — Journey Log (per trip)

A trip is recorded as a **Journey Log** with these fields:

| Field | Notes |
|---|---|
| Quantity | Cargo quantity (units / tonnes / litres / TEUs) |
| Loading date | When loaded at origin |
| Offloading date | When delivered at destination |
| Distance covered | With destinations listed |
| **Mileage rate** | TBD — clarify with user (rate charged to customer per km? cost per km? both?) |
| Mileage | Actual km driven |
| Fuel consumed | Litres |
| **Road wear** | Per-km wear & tear accrual — see §5.5 |

Operational expenses (fuel, tolls, border, driver per-diem) are **posted against the Journey Log number** so every cost is tied to a trip.

### 5.3 HR module — extensions

- **Payroll** with Kenyan statutory deductions per employee (PAYE, NSSF, NHIF/SHIF, NITA, AHL, Pension)
- **Employee appraisal / performance** (cycle TBD — quarterly? annual?)
- **Salaries & loans to employees** (loans tracked, deducted from payroll over instalments)
- **Job-description-driven RBAC**: each employee's role is defined by their job description, and TX System activates **only the screens / accounts** relevant to that role. (This is stricter than standard role-based access — it's role + per-screen mapping driven from HR.)

### 5.4 Per-truck P&L (elevated to a core deliverable)

System generates a **P&L per truck**:
- Revenue: trip income allocated to the truck (rate × quantity / km × mileage rate / etc., per the rate basis)
- Costs: fuel, tolls, border, driver allowances, maintenance (via job cards), spares, tyres, road-wear accrual, insurance amortised, depreciation, tracker subscription
- Result: gross profit per truck, period-by-period, with drill-down to underlying trips and job cards

### 5.5 Road Wear accrual (NEW concept — needs design discussion)

- Recognises tyre + maintenance wear as a per-km cost on every trip, instead of waiting for the actual tyre replacement / service to hit P&L.
- Likely posting:
  - **Trip close**: Dr `5042xx Road Wear Expense` / Cr `21xxxx Provision for Maintenance & Tyres` (a current liability or contra-asset, TBD)
  - **Actual tyre purchase / service**: Dr `21xxxx Provision …` / Cr Cash/AP (consumes the provision; any difference goes to actual maintenance expense)
- Needs a **rate per km** — typically derived from historical (tyre cost + maintenance cost) ÷ km driven over the past 12 months. Question: how does Pumas currently calculate it?

### 5.6 Subcontractor vs Own — every entry tagged

- Every journey log, expense, and revenue entry carries an `executor_type ∈ {own_fleet, subcontractor, sister_company}` flag (already in plan §13).

### 5.7 Module mapping — Pumas → TX System

| Pumas function | TX System module |
|---|---|
| **Maintenance**: posts spares, charges vehicle, AP statement, payment, groups expenses, generates job cards | **New module: Workshop & Job Cards** (added to Phase 1 scope) |
| **Operations**: journey logs, mileage + fuel posted, operational expenses | **Trips & Cross-border** (Phase 2) — Journey Log is the trip record |
| **Finance**: reports, ledger/TB/IS/SOFP/CF/AR/AP aging, forex, asset register, tax, accruals, control accounts, revaluation reserves | **Finance / Accounting** (Phase 5) + **Monthly Management Pack** (Phase 9) |

---

## 6. Clarifications still needed

1. **Mileage rate** — what does this represent? Customer billing rate per km, internal cost per km, or both?
2. **Road wear** — how is the per-km rate currently computed in Pumas? And which account does the accrual sit on?
3. **Job descriptions for RBAC** — do you have the existing list of roles + screens-per-role, or do we design it together?
4. **Employee loans** — paid from petty cash? Bank? M-Pesa? And what's the typical repayment term (3 months, 6 months, longer)?
5. **Appraisal cycle** — quarterly, half-yearly, or annual? Any KPIs already used?
6. **Workshop scope** — just job cards on our own trucks, or do you also do third-party workshop work (revenue-generating)?
