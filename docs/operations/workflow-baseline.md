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
