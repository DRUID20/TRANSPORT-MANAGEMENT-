# Nile Valley Logistics — Operations Runbook

Hands-on guide for getting the system from "code on a branch" to "ready for real
data tomorrow." Aimed at the operator running the day-of-go-live setup — minimal
prerequisites assumed (you can run a command in a terminal, you have admin
access to the Vercel + Supabase + Resend projects).

> If anything below is out of date, the source of truth is the code in
> `src/server/db/` and the migrations in `drizzle/`.

---

## 0. What you need before starting

- A **Supabase project** (Postgres + RLS already configured by previous migrations).
- A **Vercel project** pointing at this repo's `main` branch.
- A **Resend account** with at least one verified sender domain.
- Locally: Node 22, `git`, the repo cloned, and a `.env.local` populated:

  ```ini
  DATABASE_URL=postgres://...    # Supabase pooler connection string (owner role)
  SESSION_SECRET=<at least 32 random chars>
  NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...    # only used for type generation, the app does NOT call PostgREST
  RESEND_API_KEY=re_...
  RESEND_FROM="Nile Valley Logistics <noreply@yourdomain.com>"
  ```

The same `RESEND_API_KEY` may be reused across apps in the same Resend account.
The `RESEND_FROM` address **must** be on a verified domain or mail will only
deliver to your own Resend-account login email.

---

## 1. First-time database setup (one-off, per environment)

The schema and constraints are already applied via Drizzle migrations
(`drizzle/0001_phase1_*`, `0002_phase2_full_domain`, `0003_otp_attempts`,
`unique_natural_keys`, `lock_public_api_grants`).

**To apply migrations manually on a fresh database:**

```bash
npm run db:migrate
```

Verify in Supabase → Database → Tables that you see ~50 tables in `public`.

---

## 2. Seed the first organisation + admin user

```bash
ADMIN_EMAIL=you@yourdomain.com \
ADMIN_PASSWORD='ChooseAStrongPassword123' \
ADMIN_NAME='Your Name' \
npm run db:seed-admin
```

This:
- Creates the "Nile Valley" organisation if it doesn't exist (slug `nile-valley`).
- Creates an admin user with `roleKey=admin`, password bcrypt-hashed.
- Idempotent — running it twice with the same email is a no-op.

Sign in at `https://<your-app>.vercel.app/login` to confirm.

---

## 3. Seed the Chart of Accounts (one-off, per org)

The CoA is **per-organisation** — every org needs one before AR / AP / payroll
can post to the ledger. The shipped CoA is a 199-line fuel-haulage chart
(`docs/finance/coa-proposed.csv`), with 6-digit codes and KES base currency.

```bash
npm run db:seed-coa
```

Defaults: seeds into the `nile-valley` org. To seed a different org, set
`ORG_SLUG`:

```bash
ORG_SLUG=acme npm run db:seed-coa
```

Idempotent — re-running skips any account whose `(orgId, code)` already exists.
Console output prints `seeded N · skipped M` so you can confirm.

---

## 4. Bring up the first set of master data

In the app UI, in this order so foreign-keys line up:

1. **Departments** (`/hr/departments`) — at least one (e.g. "Operations", "Finance", "HR").
2. **Customers** (`/customers`) — your billing entities.
3. **Suppliers** (`/suppliers`) — fuel vendors, workshops, garages.
4. **Subcontractors** (`/subcontractors`) — third-party transporters (optional).
5. **Drivers** (`/drivers`) — driving licence, passport, COMESA permit.
6. **Trailers** (`/trailers`).
7. **Trucks** (`/trucks`) — links to subcontractor (if applicable), permitted products (PMS/AGO).
8. **Employees** (`/hr/employees`) — link each driver to their employee record on creation.
9. **Contracts** (`/hr/employees/{id}`) — basic salary + allowances. Required before payroll periods.
10. **Rates** (`/rates`) — per-route freight rate cards (`per_litre` / `per_m3` / `per_trip`).

A typical first-week dataset is 1 customer · 1 supplier · 2 trucks · 2 drivers ·
1 rate card — enough to plan a full trip.

---

## 5. Smoke-test the dispatch flow end-to-end

This is the UAT script. If every step works on a clean test org, you are
go-live ready.

| # | Action | Page | Expected |
|---|---|---|---|
| 1 | Create a booking (customer + origin + destination + product + litres + agreed rate) | `/bookings/new` | Booking saved with `BK-YYYY-NNNN`, status `draft` |
| 2 | Confirm the booking | `/bookings/{id}` | Status flips to `confirmed`, "Plan trip" appears |
| 3 | Plan the trip (pick truck + driver) | "Plan trip" form | `TRP-YYYY-NNNN` created, status `planned`; truck/driver stay `active`; timeline event written |
| 4 | Advance to "Loading" | `/trips/{id}` status button | Truck → `in_service`, driver → `on_trip`; event written |
| 5 | Capture depot loading (litres + temp + density + seals) | "Capture loading" panel | 20°C-corrected litres computed and persisted |
| 6 | Advance to In transit → At border (optional) → Delivered | status buttons | Timeline events per change |
| 7 | Capture discharge (litres + temp + seals) | "Capture discharge" panel | Ullage % auto-computed; flagged red if > 0.5% |
| 8 | Reconcile + Close (actual km, fuel, advance used) | "Reconcile" | Trip → `closed`, `readyToInvoice=true`, truck/driver freed |
| 9 | Create invoice from the trip | `/invoices/new?tripId=...` | `INV-YYYY-NNNNN` draft |
| 10 | Send invoice | `/invoices/{id}` | Status `sent`; **auto-posts** Dr AR (USD/KES) / Cr Revenue + VAT to the ledger |
| 11 | Record receipt | "Record payment" | `RCT-YYYY-NNNNN`; auto-posts Dr Bank / Cr AR; invoice → `paid` |
| 12 | Open the Trial Balance | `/ledger/trial-balance` | Both JEs visible; balanced |
| 13 | Export Fleet Utilisation | `/reports/fleet-utilisation` → Export → Excel | Branded `.xlsx` downloads |
| 14 | Same report → Print/PDF | Export → Print/PDF | Letterhead with NVL mark; chrome hidden |

If any step throws an error, capture the URL + the error reference shown at the
bottom of the error page — that's the digest you'll quote to engineering.

---

## 6. Production checklist before letting users in

| Item | Where | Status target |
|---|---|---|
| `RESEND_FROM` on verified domain | Resend → Domains | ✅ |
| `RESEND_FROM` env var in Vercel | Vercel → Project → Env vars | ✅ |
| Supabase PITR backups enabled | Supabase → Database → Backups | ✅ (paid tier) |
| Sentry (or equivalent) installed | Vercel → Integrations | ✅ |
| Uptime monitor | UptimeRobot / BetterStack | ✅ |
| Admin password ≥ 12 chars | seed-admin command | ✅ |
| Test forgot-password reaches inbox | UAT | ✅ |
| Invoice cancel reverses the GL entry | UAT step 10 reversed | ✅ |

When all are green, send the first set of invites.

---

## 7. Common operational tasks

### Add a new user / role
Currently there is no admin UI for inviting users — use `db:seed-admin` with a
different `ADMIN_EMAIL` per person. Each new user lands in the same org.
A dedicated invite flow is a future enhancement.

### Recover a forgotten password
The user clicks **Forgot password** on `/login` → enters their email → receives
a 6-digit code from Resend (15 min expiry, max 5 attempts, single live code at a
time) → enters code + new password on the same page.

### Re-seed the CoA after a schema change
The seeder is idempotent, so it's safe to re-run. To **replace** the CoA wholesale
you'd need to first archive any accounts in use (drizzle won't let you delete an
account with posted journal lines — the FK is `ON DELETE RESTRICT`).

### Disable a user
There is no UI yet. Run in Supabase SQL editor:

```sql
update users set is_active = false where email = '<their email>';
```

The next request from that user will return them to `/login`.

---

## 8. What's intentionally NOT in this build

So you don't go looking for these:

- **Live truck tracking** (`/tracker`) — UI shell exists; awaits a GPS provider.
- **Driver session** — in-memory; no persisted "currently logged-in driver" state.
- **RBAC permission catalogue** — Job Descriptions are static in `src/lib/types/rbac.ts`;
  role enforcement is at the route level, not per-record.
- **Reports — full template registry** — each report's columns are hand-coded in
  `src/app/api/reports/[report]/export/route.ts`.
- **Multi-org admin UI** — there's one org per deployment by convention.

Each of these is tracked in `REDESIGN_PROGRESS.md` and `GO-LIVE-AUDIT.md`.

---

## 9. Where things live (quick map)

| Concern | Path |
|---|---|
| DB schema | `src/server/db/schema.ts` |
| Migrations | `drizzle/*.sql` |
| Server actions (the API the UI calls) | `src/server/actions/*.ts` |
| Repositories (DB queries) | `src/server/repos/*.ts` |
| Design tokens | `src/app/globals.css` + `tailwind.config.ts` |
| Auth + session | `src/server/auth/*.ts` |
| Email templates | `src/server/email/*.ts` |
| Excel + print branding | `src/server/reports/workbook.ts` + `src/components/reports/*` |

Last updated: 2026-06-14.
