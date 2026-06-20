# Nile Valley Logistics — User Manual

A practical, module-by-module guide. Each section tells you **what it's for**, the **key operations**, and the **watch-outs** that will save you a headache.

> Roles in shorthand: **Admin** = everything, **Dispatcher** = ops/fleet, **Accountant** = finance/posting, **Driver** = `/drv` app, **Viewer** = read-only.

---

## 0 · Sign in & your account

### Operations
1. **Sign in** at `/login` with your email and password.
2. **Forgot password** → click the link on `/login`, enter your email, paste the 6-digit code we email you (15-min expiry), set a new one.
3. **Change your password** → top-right user menu → **Settings → Change password**. You'll be asked for your **current password** first.
4. **Upload a profile photo** → **Settings → Profile photo** → JPG/PNG/WebP, up to 5 MB. Shows in the sidebar everywhere.

### Watch-outs
- Five wrong passwords in a row locks the account for 15 minutes.
- The temp password admins email you is **one-time** — change it on first login via "Forgot password".

---

## 1 · Bookings

### What it's for
A customer order: "ship X litres of AGO from KPC Mombasa to Kampala on date Y." Bookings turn into Trips when dispatched.

### Key operations
1. **Create a booking** → `/bookings → New booking`. Pick the customer, product (PMS/AGO), volume in litres, requested date, optional pre-agreed rate.
2. **Confirm a booking** (status: Draft → Confirmed) — required before it can be planned onto a trip.
3. **Plan onto a trip** — from `/trips/new` (or via the booking's "Dispatch" button). Pick truck + driver + driver advance. The booking auto-flips to `Planned` and a trip is created.
4. **Delete a booking** (admin) — only available while not yet planned. Once planned, you must cancel the trip instead.

### Watch-outs
- A booking can have **only one trip**. Cancel the trip if you need to re-plan.
- The booking's "destination" is **non-binding** — the actual delivery point is locked on the trip at the border or depot.

---

## 2 · Trips (the 5-stage wizard)

### What it's for
The operational heart of the system. Every trip walks through five stages; you can't skip ahead, but you can click back to edit any completed stage until the trip is closed.

### The five stages

#### Stage 1 — Loading (at the depot)
1. **Upload the Bill of Lading** (Documents card → Upload) and **Approve** it. The BOL prints the loaded volume **@20°C** — that's our source of truth.
2. **Capture loading** → loaded litres (prefilled from the BOL) + seal numbers.
3. **Mark loading complete** → advances to In Transit. Server re-checks: BOL approved + volume + seals captured.

#### Stage 2 — In Transit
1. Passive milestone. The truck is on the road; nothing to capture.
2. When the driver reports arrival at the border, click **At the border**.

#### Stage 3 — Border (Malaba / Busia)
1. **Assign the destination** → rate auto-looks-up from the rate card.
2. **Record the Road User Charge** (Border crossings card).
3. **Log border-related expenses** (anything you have receipts for).
4. **Move to Delivery** → server gate: destination set **and** at least one border crossing recorded.

#### Stage 4 — Delivery (at the customer)
1. **Capture the discharged volume @20°C** + customer-side seal numbers.
2. Any short delivery is automatically posted as a **driver loan** when you create the invoice on the next stage (idempotent — only ever posts once per trip).
3. **Move to Invoice**.

#### Stage 5 — Invoice & close
1. **Generate Invoice** — the line is pre-filled with **loaded L20 × rate/L** (the BOL volume, NOT the delivered volume, NOT the booked volume). This is the final invoice amount.
2. **Reconcile and close** — the panel shows km / litres / km-L **derived from the fuel-log timeline** automatically. Capture the **driver advance used** and any closing notes, then **Close and Reconcile**.
3. Open the draft invoice → **Send** → posts AR / Revenue / VAT to the ledger.
4. **Record customer payment** → bank / M-Pesa / **Mobile Money (UGX)** / cash / cheque → posts the cash entry.

### Going backwards
- Click any **completed** stage in the top bar to edit it.
- Once the trip is **Closed**, every stage goes read-only.

### Reopen a closed trip (admin)
Stage 5 → **Reopen trip (admin)** → only works if the invoice is still a **draft**. If it's already SENT, you must issue a credit note first (manual for now). Reopen cancels the draft invoice **and** reverses the shortage loan.

### Watch-outs
- **Volumes lock once an invoice exists.** Want to edit a load/discharge after invoicing? Reopen the trip first.
- The "Stage" column on `/trips` shows each trip's current step + a "Next:" hint so you can see at a glance who's stuck where.

---

## 3 · Fuel logs

### What it's for
The truck's continuous odometer + fuel timeline. Drives trip km, fleet km/L, per-country fuel splits — **the single source of truth for km**.

### Key operations
1. **Log a fuelling** → `/fuel → New fuel log`.
2. Pick the **country** → the system suggests the **currency** (UG → UGX, KE → KES, others → USD). You enter the cost in the currency paid; the system **auto-converts to KES** using live FX. The preview shows both.
3. **Odometer reading** is required. Numbers display with commas (`412,500`).
4. **Station manager name** is required — they verify the pump + reading.
5. Optionally link to the trip — if you do, this log is **automatically credited to that trip** for km / km-L computation.

### Watch-outs
- **The odometer is verified at the pump, not by the dispatcher.** Insist on the station-manager name — it's our only safeguard against bad data.
- **A fuel log within a trip's time window is automatically counted toward that trip's litres**, even without the trip link. Linking is preferred but optional.
- **Delete a fuel log** (admin) carefully — it's wired into trip km/L. Reasons to delete: duplicate entry or wrong truck.

---

## 4 · Expenses

### What it's for
Driver/dispatcher receipts that aren't fuel — border charges, tolls, accommodation, etc. **No reimbursement step** — the cashier issues cash on request when needed.

### Key operations
1. **Capture an expense** → `/expenses → New expense`. Pick category, amount in KES (or foreign + auto-conversion), date, optional trip/truck/driver link, attach the receipt.
2. **Approve / Reject** (manager) → opens the expense → Approve releases the spend; Reject takes a reason.
3. **Delete an expense** (admin) → only while NOT approved. Approved expenses are committed costs and protected.

### Watch-outs
- Categories matter — they drive the **Expense Breakdown** report.
- **An approved expense is part of the books.** Don't try to delete it. Reverse it via a journal entry instead.

---

## 5 · Trucks & Trailers

### What it's for
The fleet roster. Truck status is auto-managed by the trip lifecycle (Active → In Service while on a trip → Active again on close).

### Key operations
1. **Add a truck** → `/trucks → New truck`. Plate (KE format e.g. `KCB 421R`), make/model, year, tanker spec (capacity, compartments, calibration dates), permitted products (PMS/AGO), compliance expiries.
2. **Add a trailer** → `/trailers → New trailer`. The **Trailer ID is free-text** — plate (any country), chassis number, VIN, or internal yard tag.
3. **Update a truck's status** manually only when you need to override (e.g. send to workshop).

### Watch-outs
- **Calibration & compliance expiries surface in the Compliance dashboard** — keep them current.
- Trucks/trailers stay assignable across trips; the system blocks double-booking automatically.

---

## 6 · Drivers

### What it's for
Driver roster. Linked to the HR employee record so payroll deductions (shortage loans, advances) flow correctly.

### Key operations
1. **Add a driver** → `/drivers → New driver`. National ID, licence number + expiry, M-Pesa phone (for advances), home address.
2. **Per-driver trips & loans** — the driver detail page rolls up their trips and outstanding loans (incl. auto-raised shortages).

### Watch-outs
- **Driver = HR employee.** Create the employee record too (HR → Employees) if they're new — otherwise payroll deductions can't post.

---

## 7 · Customers & Rates

### What it's for
Who you bill (Customers) and at what price (Rates per origin → destination).

### Key operations
1. **Add a customer** → `/customers → New customer`. Billing currency drives the default invoice currency.
2. **Add a rate** → `/rates → New rate`. Origin, destination, basis (per_litre / per_m3 / per_trip), amount, currency, optional customer (for customer-specific overrides), optional cargo class.
3. **Rate lookup** is automatic when the dispatcher confirms a destination on a trip: most specific match wins (customer + class → customer → class → default).

### Watch-outs
- **Customer-specific rates override defaults.** Use them carefully — easy to forget when you've negotiated a one-off.

---

## 8 · Suppliers & Bills (AP)

### What it's for
Track who you owe and pay them.

### Key operations
1. **Add a supplier** → `/suppliers → New supplier`.
2. **Create a bill** → `/bills → New bill`. Line items, currency, due date, optional truck/trip link, attach the supplier's PDF.
3. **Send the bill** → posts the GL entry (Dr Expense / Cr AP).
4. **Record payment** → bank / M-Pesa / **Mobile Money UGX** / cash / cheque → posts Dr AP / Cr Bank.

### Watch-outs
- **Fuel from KPC/Shell/Total on credit?** Capture it as a bill (here) **and** a fuel log (for ops analytics). Don't *also* capture it as an expense — that would double-count.

---

## 9 · Invoices (AR) & customer payments

### What it's for
What customers owe you and what they've paid.

### Key operations
1. **Generate an invoice** — easiest from the trip's Invoice stage (auto-fills loaded L20 × rate/L). Or `/invoices → New invoice` for a custom invoice.
2. **Send the invoice** → posts Dr AR / Cr Revenue / Cr VAT.
3. **Record customer payment** → bank / M-Pesa / **Mobile Money UGX** / cash / cheque.
4. **Aged AR** → `/invoices/aged` shows the buckets (current / 1-30 / 31-60 / 61-90 / 90+).
5. **Cancel an invoice** — reverses the GL posting. Can't cancel a paid invoice.

### Watch-outs
- **One non-cancelled invoice per trip.** The system refuses a second.
- **Invoice amount = loaded L20 × rate/L** — the BOL figure, not the delivered volume. Any short between loaded and delivered is recovered from the driver via payroll (handled automatically).

---

## 10 · Asset Register

### What it's for
Fixed assets (vehicles, plant, equipment, software, buildings, land) + monthly depreciation + disposal — all GL-integrated.

### Key operations
1. **Register an asset** → `/assets → New asset`. Pick a category (maps to the right Chart-of-Accounts triplet automatically), cost, depreciation method (Straight line or Reducing balance), useful life or annual rate, optional residual.
2. **Run monthly depreciation** → `/assets → Run monthly depreciation`. Pick the period (YYYY-MM) → posts Dr Depreciation Expense / Cr Accumulated Depreciation for every eligible asset. Idempotent — re-running a month skips assets already charged.
3. **Dispose or write off** → asset detail → **Dispose / write off**. Enter proceeds + the receiving bank/cash/mobile-money account → posts the full disposal entry (remove cost, remove accum-dep, book proceeds, gain or loss on disposal).

### Watch-outs
- **Land doesn't depreciate** — by design.
- **Asset acquisition isn't auto-posted to the GL on registration** (the purchase is normally already booked via an AP bill). If you forget to book the purchase, the asset register still works for depreciation, but your Balance Sheet will be incomplete.
- **Fleet trucks/trailers stay in the Fleet module** — they're not in the asset register today. (If you want them depreciated through here, tell us.)

---

## 11 · Fuel + FX

### What it's for
Daily exchange rates for cross-border money — drives every conversion (invoices, bills, fuel costs).

### Key operations
1. **View today's rates** → `/fx`. Updated by a daily cron (17:30 EAT).
2. **Override a rate manually** if a contracted rate differs — leaves an audit trail.

### Watch-outs
- **If the cron hasn't run** (e.g. weekend, first run after deploy), the system falls back to a hardcoded table. The form always shows the rate used.

---

## 12 · Reports & General Ledger

### What it's for
The accountant's tools.

### Key operations
1. **Chart of Accounts** → `/accounts`. View / search the 199-line CoA.
2. **General Ledger** → `/ledger`. Every posting, filterable by type, date, reference. Each entry has its own page with both sides.
3. **Trial Balance** → `/ledger/trial-balance`. Snapshot at a date.
4. **Manual journal entry** → `/ledger/new`. Both sides required, must balance, supports multi-currency.
5. **Reports** → `/reports`. P&L, Balance Sheet, Expense Breakdown, Fuel Efficiency, etc. Export PDF / Excel / CSV.
6. **Management Pack** → monthly bundle for the board.

### Watch-outs
- **Every customer invoice, supplier bill, payment, depreciation run and asset disposal posts a real journal entry automatically.** You should rarely need to write a manual one.

---

## 13 · HR & Payroll (overview)

### What it's for
Employees, contracts, leave, attendance, payroll, loans, appraisals, compliance.

### Key operations (the ones you'll use most)
1. **New employee** → `/hr/employees/new`.
2. **Create payroll period** → `/hr/payroll → New period (YYYY-MM)`. Seeds inputs from each employee's active contract + auto-applies active loan recoveries.
3. **Edit a payroll input** before processing — basic, overtime, bonus, deductions.
4. **Mark period Paid** → posts the GL and **applies loan recoveries** (clears active loans oldest-first).
5. **Driver shortage loans** are auto-raised at invoice time when delivered L20 short of loaded L20 beyond the 0.5% tolerance.

### Watch-outs
- **A paid period is locked.** You can't edit inputs after paying.

---

## 14 · Admin

### Users & Roles (`/admin/users`)
1. **Create a user** → name, email, role → they get an email with a sign-in link + temporary password (Resend).
2. **Change role** → row dropdown → instant.
3. **Activate / deactivate** → row toggle. Refuses to deactivate the last active admin.
4. **Resend password** → emails a fresh temp password (admin override; doesn't need their current password).

### Audit Log (`/admin/audit-log`)
Last 200 high-trust mutations, latest first — invoice send/cancel, journal post/reverse, asset disposal, role changes, trip reopen.

### Settings (`/settings`)
Personal: profile photo, change password. Workspace: theme, dispatch defaults (per-device).

### Watch-outs
- **Email won't deliver if `RESEND_FROM` isn't set to a Resend-verified domain address.** Currently `Nilevalley@gascoenergy.co.ug` is configured — keep that domain verified in Resend or new-user invites will silently fail to non-self addresses.

---

## End-of-day quick checklist (dispatcher)

- [ ] All loaded trips moved to In Transit (BOL approved, volume + seals captured).
- [ ] All border arrivals advanced, destination + RUC recorded.
- [ ] All deliveries captured (discharged volume + seals).
- [ ] Invoices generated for delivered trips.
- [ ] Fuel logs entered for any fuellings (with station-manager name).
- [ ] Expenses captured + approved/rejected by the manager.

## Month-end quick checklist (accountant)

- [ ] All sent invoices reconciled or in aged-AR buckets.
- [ ] Supplier bills entered + paid where due.
- [ ] Bank reconciliation done (`/bank`).
- [ ] **Run monthly depreciation** (`/assets`).
- [ ] Payroll period processed + paid.
- [ ] FX rates checked (manual override for any contracted rates).
- [ ] Management Pack drafted + reviewed.

---

## Troubleshooting one-liners

| Symptom | Most likely cause | Fix |
|---|---|---|
| Invite email never arrives | `RESEND_FROM` wrong or domain not verified | Check `/admin/users` actions; verify the domain in Resend |
| "Volumes locked" when capturing discharge | An invoice already exists for the trip | Admin → Reopen trip (Stage 5) |
| Trip stuck on Border stage | No border crossing recorded OR destination not assigned | Both are required to advance |
| Wrong km / km-L on a trip | Missing fuel log around the trip's start or end | Capture the missing log → values auto-refresh |
| Driver loan posted twice | Shouldn't happen — `shortageTripId` is the idempotency key | Open `/hr/loans`; if a duplicate exists, cancel one and audit |
| Aged AR buckets wrong | Just need a refresh — they recompute on every list/get | Reload `/invoices/aged` |
| "This is the last active admin" error | You're trying to demote/deactivate the only admin | Promote another user to admin first |

---

*Last updated: as of the latest commit on `claude/plan-truck-system-Mfwm8`. When something here drifts from reality, file it as an issue and we'll fix the doc with the code.*
