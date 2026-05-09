# Monthly Management Pack — Reference

Source: `MARCH_FLK_2025_MGT_REPORT_Final_8.xlsx` (Fleet Logistics Limited / HASS Petroleum Group, March 2025).
Status: **Reference only.** Structure to be replicated in TX System with adaptations for general cross-border freight.

---

## 1. Why this matters

The FLK pack is a **complete, mature** monthly close. We will not invent the management-reporting suite from scratch — we'll match the structure (which any seasoned auditor / FM will recognize) and extend it for cross-border freight specifics.

## 2. The 18 sheets (and what TX System should produce)

| FLK sheet | Purpose | TX System equivalent |
|---|---|---|
| NARRATIVE | Cover commentary: indicators, volume drivers, margin drivers, expense lines, challenges, schedule status, sign-off | **Auto-generated narrative** with AI-assisted bullets from the period data; finance manager edits & signs off |
| IS / IS Template | Income statement with **volume KPI at top**, monthly actuals, quarterly + monthly budget, variance | Monthly P&L, KES base + USD equivalent column, with budget + variance |
| SFP / SFP Template | Balance sheet, multi-month comparatives | Monthly SFP, KES + USD |
| SCF | Statement of Cash Flow | Monthly SCF, indirect method |
| TB EXTRACT | Trial balance with **mapping columns** (SFP/IS / OPEX / Detailed IS) — the engine that rebuilds the IS and SFP from GL | TB report with categorisation tags (so every account knows where it appears in IS/SFP); ensures IS/SFP tie back exactly to GL |
| OPEX ANALYSIS | Opex by group (Staff / Depreciation / Bank / Admin) with Actual / Budget / %Met / Comments | Same — driven by GL group + budget table; comments captured per line |
| AGED AR | Aged receivables 0-30 / 31-60 / 61-90 / 90+, KES + USD totals, per customer | AR aging report, multi-currency, drill-down to invoice |
| AGED AP | Aged payables, same buckets, per supplier | AP aging report |
| BANK REC | Per-account bank rec: bank balance − unpresented cheques + uncleared lodgements = book balance | Auto-bank-rec per account (statement vs book), unmatched items flagged |
| KEY RATIOS | **Per-truck performance**: volume per customer/route Actual vs Budget vs Projection, **Fleet vs Subcontractor split**, **idle truck list** | Truck Performance Tracker (Module 13 in PLAN.md) — extended to match this pack's KPIs |
| Physical vs System Rec | Stock count vs system, item × location, variance qty + value | Inventory variance report (spares + tyres) |
| FAR | Fixed Asset Register: asset code, tag, name, category, dates, vendor, depreciation method, rate, cost, NBV, monthly depreciation, YTD | FAR module with auto-monthly depreciation run; PPE additions/disposals integrated to GL |
| DISPOSAL OF ASSET | Disposals: cost, accum dep, NBV, disposal value, gain/loss | Auto-generated from FAR disposal entries |
| INTERCOM GRID | Intercompany rec per affiliate: our balance vs theirs, variance, status, comments | Intercompany reconciliation module (only if Nile Valley has affiliates — see Q below) |
| EX RATE | Daily FX rates per currency, with average and closing | FX rate feed (CBK or fx provider), used to price every transaction and revalue at month-end |
| LAST MONTH | Comparative (last month's balances) | Built-in: every report has a comparative-period column |

## 3. Patterns to copy into TX System

### 3.1 Volume KPI at the top of the Income Statement

FLK puts **litres** at the top of the IS (AGO, PMS, IK, JET-A1, FO, LPG, Lubes, OTS) before the financial lines. For cross-border freight, the equivalent volume KPIs are:

- **Trips completed** (count)
- **Tonnes hauled**
- **TEUs / containers moved**
- **Total km driven** (laden + empty)
- **Laden km** (revenue-earning) and **deadhead km %**
- **Active truck-days** (sum of days at least one truck was on a trip)

These appear above Turnover so the reader sees *what was done* before *what it earned*.

### 3.2 Budget structure

- Annual budget split into 4 quarters and 12 months, by GL line and by cost centre.
- Variance computed automatically: `Actual − Budget` and `Actual / Budget %`.
- Comments column on each line for explanations (manager fills, becomes part of the audit trail).

### 3.3 Customer × route × volume matrix

KEY RATIOS sheet pivots **volume by customer × by route**, with Actual vs Budget vs Projection. We need this for:

- Per-customer volume targets (e.g. tonnes/month for a contract customer).
- Per-route projections (Mombasa → Kampala, Nairobi → Juba, etc.).
- Highlight under-achievement so commercial team can act.

### 3.4 Fleet vs Subcontractor split

Per customer / route, volume is split into:
- **Own fleet**
- **Subcontractor**
- **Sister-company fleet** (e.g. "FLEET TZ" in FLK)

We need a dimension on every trip: `executor_type ∈ {own_fleet, subcontractor, sister_company}` and `executor_id` (truck or subbie reference). Reports roll up by executor_type.

### 3.5 Idle truck list

A schedule of trucks not currently assigned to a trip:
- Truck registration
- Last trip / last loading
- Date last loaded
- Days idle
- Expected next-trip date / status

Drives commercial action and answers "why is this truck not earning?"

### 3.6 TB → IS/SFP categorisation columns

Every GL account carries categorisation tags so the IS and SFP rebuild from the TB without manual mapping each month:
- `category_sfp_is` (which SFP or IS line)
- `category_opex` (which OPEX bucket)
- `category_detailed_is` (which detailed-IS line)

We bake these into the Chart of Accounts (already partly done via the Class/Group/Type columns in `coa-proposed.csv`).

### 3.7 USD-equivalent column on every monetary report

FLK's pack reports the IS and SFP in USD (their consolidation currency). Nile Valley's primary reporting is **KES**, but reports must show **USD equivalent** alongside, computed at:

- Period-average rate for IS lines
- Period-end rate for SFP lines
- Posting-date rate for transactions

The EX RATE sheet pattern (daily rates + month-end average + closing rate) gives us exactly the data structure to support this.

### 3.8 Narrative cover with structured prompts

The NARRATIVE sheet uses fixed prompts:
- Key indicators for the month
- What contributed to volumes
- What contributed to margins
- Major expense lines
- Other highlights
- Challenges encountered
- Status of bank recs / intercompany / stock recs / clearing accounts
- Sign-off by CM and FM

We replicate these prompts in TX System as a **structured monthly close checklist**, so nothing closes without:
1. Each schedule prepared & ticked
2. Each prompt answered (AI assists drafting from data; FM signs off)
3. CM and FM signatures captured (digital).

## 4. Adaptations for Nile Valley (general freight, not fuel haulage)

| FLK assumption | Nile Valley adaptation |
|---|---|
| Volume in litres (AGO/PMS/IK/JET/FO/LPG/Lubes/OTS) | Volume in trips / tonnes / TEUs / km |
| Customers are fuel-trade entities (HASS KE/UG/SD/RW) | Customers are export shippers (named per contract) |
| Routes are fuel depots (Nakuru, Konza, Western, etc.) | Routes are border lanes (Mombasa→Kampala, Nairobi→Juba, etc.) |
| OTS / Hospitality / Agency income lines | Demurrage / Detention / Loading / Container handling income lines (already in proposed CoA) |
| FX is single (USD ↔ KES) | FX is multi (USD, UGX, TZS, RWF ↔ KES) |
| Intercompany schedule is heavy (group of 6+ entities) | TBD — depends on whether Nile Valley has affiliates |

## 5. Open questions raised by this study

1. **Affiliates / sister companies?** FLK has a heavy intercompany schedule (HASS KE / UG / SUDAN / RWANDA / TZ + EZ JET). Does Nile Valley have any? Decides whether the Intercompany module is in MVP or deferred.
2. **Budget granularity?** Annual budget by line + by cost centre + by month is the right pattern. Is Nile Valley already running an annual budget in Excel? (If so, we'll model after it.)
3. **Cost centres?** FLK appears to be one entity with multiple country operations. Nile Valley needs at least: Operations, Workshop, Admin, Sales — possibly per-branch (Nairobi / Mombasa / cross-border).
4. **Subcontractor share?** FLK runs ~20% of volume on subbies. What's Nile Valley's split? Tells us how heavy the subcontractor module needs to be.
5. **Stock-take frequency?** FLK does monthly physical-vs-system. Same for Nile Valley spares & tyres? Or quarterly?
6. **Monthly close cut-off & sign-off path?** Who signs (FM, CM, MD)? When is the deadline (e.g. day 5 / day 10 of next month)?
