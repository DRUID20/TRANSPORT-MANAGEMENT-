# Chart of Accounts — Design (TX System / Nile Valley Logistics)

Status: **Draft for review. No code yet.**
Last updated: 2026-05-09

---

## 1. Background

The original CoA (175 accounts) was inherited from another company and exported via Crystal Reports — see [`coa-imported.csv`](./coa-imported.csv). It had:

- No account-code column (only descriptions).
- 8 rows where the description was lost and only an internal numeric code (`121110`, `122180`, `122186`, `222515`, `223118`, `223119`, `580010`, `731610`) leaked through.
- Duplicates (`INTERCOMPANY` x2, `PAYROLL LIABILITIES` x2, `OTHER PAYABLES` vs `OTHER PAYABLES -`).
- Capitalization inconsistencies (`Cost of sales` vs `Cost of Sales`, `debtors` vs `Debtors`).
- Misclassifications (`LONG-TERM INVESTMENTS` typed as Long-term Liability; `LOSS ON DISPOSAL OF ASSETS` typed as Other Income; `FREEHOLD BUILDINGS — ACCUM DEP` typed under *Leasehold* properties; `DISCOUNTS ALLOWED — COS` typed as Expenses).
- No FX accounts (essential for our multi-currency cross-border operations).
- No trucking-specific cost lines (border, tolls, tyres, driver per-diem, weighbridge, demurrage, tracking subscription, vehicle licences).
- Every account flagged KES — no foreign-currency bank accounts despite USD-denominated export receivables.

The cleaned and renumbered CoA is in [`coa-proposed.csv`](./coa-proposed.csv).

---

## 2. New numbering scheme (6-digit)

Top-level by class, then group, then account:

| Range | Class |
|---|---|
| `1xxxxx` | Assets |
| `2xxxxx` | Liabilities |
| `3xxxxx` | Equity |
| `4xxxxx` | Operating Income |
| `5xxxxx` | Direct Costs / Cost of Sales |
| `6xxxxx` | Operating Expenses (indirect) |
| `7xxxxx` | Other Income / Other Expenses (below the line) |
| `8xxxxx` | Tax |

Sub-grouping within each class:

```
10xxxx Non-current assets       20xxxx Non-current liabilities
11xxxx Current assets           21xxxx Current liabilities
12xxxx Cash & bank              22xxxx Statutory / payroll liabilities

30xxxx Equity

40xxxx Operating revenue        41xxxx Other operating income (passthrough, etc.)

50xxxx Direct costs             60xxxx Personnel (non-driver)
                                61xxxx Admin
                                62xxxx Selling & marketing
                                63xxxx Depreciation, amortisation, bad debts

70xxxx Other expenses           71xxxx FX & finance income/expense
                                
80xxxx Tax
```

A trailing 100-step (`xxxx00`, `xxxx10`, …) leaves room to insert sibling accounts without renumbering.

---

## 3. Key design decisions

### 3.1 Use **dimensions**, not new accounts, for cross-border splits

The imported CoA has only one `FUEL` account, and your operations span Kenya → Uganda / Tanzania / Rwanda / DRC / South Sudan. **We won't create one fuel account per country.** Instead every journal line carries:

- `country` (KE, UG, TZ, RW, CD, SS, …)
- `truck_id`
- `trip_id`
- `cost_centre` (optional)

This keeps the CoA short and lets reports slice fuel cost per country / truck / trip without bloating the GL. Same for tolls and border charges.

### 3.2 Multi-currency at the **transaction** level, not the account level

Every monetary GL line stores `(amount, currency, fx_rate_at_posting, posted_amount_in_KES)`. Account definitions don't carry a currency restriction except for **bank accounts**, which are explicitly typed `KES bank` / `USD bank` / `UGX bank` / etc. — because a bank account *is* denominated in one currency physically.

### 3.3 KES is the **base / reporting** currency

All reports default to KES, with a USD-equivalent column alongside. AR/AP sub-ledgers and bank accounts can be in foreign currency; period-end revaluation generates unrealised FX gains/losses to dedicated 71xxxx accounts.

### 3.4 Statutory accounts split out (Kenya-specific)

Each Kenyan statutory deduction has its own liability account *and* its own employer-contribution expense account:

| Statutory item | Liability acct | Employer expense acct |
|---|---|---|
| PAYE | 220100 | n/a (employee deduction only) |
| NSSF | 220200 | 600400 |
| NHIF / SHIF | 220300 | 600500 |
| NITA | 220400 | 600600 |
| Affordable Housing Levy | 220500 | 600700 |
| Pension | 220600 | 600800 |

### 3.5 Insurance split into 3 categories

The imported CoA has only "Insurance — General / Liability". For trucking we need:

- **Vehicle insurance — Comprehensive** (`503100`)
- **Vehicle insurance — Third-party** (`503200`)
- **Goods-in-Transit / GIT cover** (`503300`) — critical for cross-border
- **Insurance — General (office/property)** stays in admin (`611300`)
- **Insurance — Liability** stays in admin (`611400`)

### 3.6 Bad debt: provision vs. write-off

- **Allowance / Provision for Bad Debts** is a contra-asset (`111300`).
- **Bad Debt Provision Charge** (P&L) is `631000` — adjusts the contra-asset.
- **Bad Debts Written Off** (P&L) is `630900` — for actual write-offs.

The imported CoA conflated these. We separate them so reporting and tax treatment are clean.

### 3.7 Fines & penalties tracked separately

Kenyan tax law disallows fines as deductible — so we keep `612000 Fines & Penalties` separate from general admin so the tax computation is straightforward.

---

## 4. Resolutions to imported-CoA issues

| # | Issue | Resolution in proposed CoA |
|---|---|---|
| 1 | 8 orphan rows (numeric-only descriptions) | **Dropped from proposed CoA.** They had no description and zero balance won't migrate. If they actually carry balances in the source system, please re-export with the original descriptions and we'll add them. |
| 2 | No account codes | New 6-digit scheme (above). |
| 3 | `INTERCOMPANY` duplicated | Merged into `111500 Intercompany Receivables` and `211400 Intercompany Payables`. |
| 4 | `PAYROLL LIABILITIES` duplicated | Merged into individual statutory liability accounts (220100–220600). |
| 5 | `OTHER PAYABLES` vs `OTHER PAYABLES -` | Merged into `210300 Other Payables`. |
| 6 | `LONG-TERM INVESTMENTS` typed as Long-term Liability | Reclassified to `102300 Long-term Investments` (Non-current Asset). |
| 7 | `LOSS ON DISPOSAL OF ASSETS` typed as Other Income | Reclassified to `700100 Loss on Disposal of Assets` (Other Expense). |
| 8 | `FREEHOLD BUILDINGS — ACCUM DEP` typed under Leasehold | Renamed and retyped to `101200 Acc. Dep. — Buildings (Freehold)`. |
| 9 | `DISCOUNTS ALLOWED — COS` typed as Expense | Reclassified to `506100 Discounts Allowed` (contra-revenue / direct cost). |
| 10 | Closed garbage rows (`OTHER PAYABLES NSSF/NHIF/PAYE` under Expenses) | Dropped. |
| 11 | Capitalization inconsistencies | Normalized to Title Case throughout. |
| 12 | All KES — no FX accounts | Added `710100`–`710400` (Realised/Unrealised FX gain/loss). |
| 13 | No USD bank account | Added `122100 Bank — USD`. UGX/TZS/RWF placeholders included for when those accounts open. |
| 14 | No trucking-specific cost lines | See §5 below. |

---

## 5. New trucking-specific accounts added

| Code | Name | Why |
|---|---|---|
| 500200 | Toll Fees | Country-tagged via dimension. |
| 500300 | Border / Customs / Transit Charges | Cross-border cost line. |
| 500400 | Weighbridge Fees | Cost recovery + axle-load. |
| 500500 | Loading & Offloading Charges | Often billed separately by handlers. |
| 500600 | Demurrage Expense | When trucks are detained. |
| 500700 | Detention Expense | At customer/border yards. |
| 500800 | Container Handling Costs | If carrying containers. |
| 502100 | Driver Per-Diem & Allowances | Separate from gross salary for cost analysis. |
| 502200 | Driver Overnight Allowance | Long-haul allowance. |
| 502300 | Driver Welfare (meals/accommodation) | Per-trip incidentals. |
| 502500 | Subcontracted Haulage | Already existed as `SUBCONTRACTORS - COS`; renamed for clarity. |
| 503100/503200/503300 | Vehicle insurance split | See §3.5. |
| 504100 | Tyres — Purchases | Tyres are a major cost line and need to be tracked separately. |
| 504200 | Tyre Repairs & Vulcanising | Field repairs. |
| 504300 | Spare Parts & Consumables | Separate from full R&M jobs. |
| 504400 | Lubricants & Oils | Separated for cost analysis. |
| 504700 | Workshop Tools & Consumables | Garage running. |
| 504800 | Vehicle Tracking / GPS Subscription | Ongoing telematics fees. |
| 504900 | Vehicle Licences (NTSA, COMESA, Transit Permits) | Recurring statutory cost. |
| 505100 | Customs Bonds / Transit Guarantees | If you post bonds. |
| 400200 | Freight Revenue — Cross-border / Export | Separated from domestic for tax (zero-rated) and reporting. |
| 400300/400400 | Demurrage / Detention Income | When charged back to customers. |
| 400500 | Loading / Offloading Income | Ditto. |
| 400600 | Storage / Warehousing Income | If applicable. |
| 400700 | Container Handling Income | If applicable. |

---

## 6. Other expense groups added (per your "any other suitable")

| Code | Name | Rationale |
|---|---|---|
| 611700 | Software / SaaS Subscriptions | TX System itself, accounting software, etc. |
| 611800 | Membership & Subscriptions | KIFWA, KTA, industry bodies. |
| 611900 | Donations & CSR | Often segregated for tax. |
| 612000 | Fines & Penalties | Non-deductible — must be isolated. |
| 601100 | Staff Training & Development | Office staff training. |
| 601200 | Driver Training & Licensing | Medical, HGV/PSV cert renewals — separate from office training because it's operational. |
| 110200 | Inventory — Spares & Consumables | If you stock parts. |
| 110300 | Inventory — Tyres | If you stock tyres. |
| 111800 | Driver Trip Advances | Cash advances for fuel/tolls/border charges; reconciled at trip close. |
| 112300 | Prepaid Licences & Permits | Annual NTSA/COMESA/permits paid upfront. |
| 113100 | VAT Recoverable / Input | Counterpart to VAT Payable. |
| 113200 | Withholding VAT Asset | When customers withhold. |
| 129100 | Mobile Money — M-Pesa Paybill | M-Pesa transit float separate from bank. |
| 121200 | Bank — KES (Payroll) | Often kept separate from operations. |

---

## 7. Open questions for you

1. **Numbering granularity** — happy with 6 digits? Some firms use 4-segment (e.g. `1-1010-100-00`) for company / class / account / sub. We've gone simple (6 digits flat + dimensions) because that scales well in software.
2. **Branches / cost centres** — do you want to split P&L by Mombasa / Nairobi / Kampala etc.? If yes, we'll add a `branch` dimension.
3. **Subsidiaries** — is Nile Valley Logistics a single legal entity, or are there sister companies the system needs to consolidate? (Affects intercompany handling.)
4. **VAT treatment** — exports are zero-rated; domestic freight is standard-rated 16% in Kenya. We assume both apply. Confirm.
5. **The 8 orphan account codes** (`121110`, `122180`, `122186`, `222515`, `223118`, `223119`, `580010`, `731610`) — do you want them recovered from the original system or dropped? The proposed CoA currently drops them.
6. **Inventory** — do you actually stock spares/tyres in a store, or is everything purchased per-job? (Decides whether `110xxx` Inventory accounts are even used.)
7. **Driver advances** — paid via M-Pesa, cash, or both? (Decides which clearing account routes them.)

---

## 8. Next steps once approved

1. You sign off on the numbering scheme + cleaned CoA.
2. The CoA gets baked into Phase 0 / Phase 5 (Finance) seed migrations.
3. Migration mapping (old description → new code) becomes part of the data-loading scripts so opening balances import cleanly.
