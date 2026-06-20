/**
 * How-to knowledge base for the AI Assistant.
 *
 * Each entry answers ONE operational question — "how do I do X in the
 * system". Content is lifted from USER_MANUAL.md so the two stay aligned.
 * Matching is keyword + heading similarity (see scoreHowto in executor.ts);
 * no LLM required, no API cost, deterministic. When a real LLM planner is
 * swapped in, this KB still serves as the system's source of grounded facts.
 */

export interface HowToEntry {
  id: string;
  /** Short module name for the badge. */
  module: string;
  /** The canonical question this entry answers. */
  question: string;
  /** Extra keywords / synonyms that should match the user's phrasing. */
  keywords: string[];
  /** Markdown-ish answer (preserved as plain text by the chat bubble). */
  answer: string;
  /** Deep-link the user can click to jump to the relevant page. */
  href?: string;
  hrefLabel?: string;
}

export const HOWTO_KB: HowToEntry[] = [
  // ─── Sign-in & account ──────────────────────────────────────────────
  {
    id: "signin",
    module: "Account",
    question: "How do I sign in?",
    keywords: ["sign in", "login", "log in", "access", "enter system"],
    answer:
      "Go to /login, type your email and password. " +
      "If five wrong attempts lock you out, wait 15 minutes or ask an admin to reset your password.",
    href: "/login",
    hrefLabel: "Open sign-in",
  },
  {
    id: "forgot-password",
    module: "Account",
    question: "I forgot my password — how do I reset it?",
    keywords: ["forgot password", "reset password", "lost password", "otp", "recover", "cant sign in", "can't sign in"],
    answer:
      "From /login click 'Forgot password'. Enter your email; we send a 6-digit code (valid 15 minutes). " +
      "Paste it on the next screen and set a new password.",
    href: "/login",
    hrefLabel: "Open sign-in",
  },
  {
    id: "change-password",
    module: "Account",
    question: "How do I change my password?",
    keywords: ["change password", "update password", "new password"],
    answer:
      "Top-right user menu → Settings → Change password. You'll need to type your CURRENT password first " +
      "(server re-verifies it), then your new one (min 8 chars).",
    href: "/settings",
    hrefLabel: "Open Settings",
  },
  {
    id: "profile-photo",
    module: "Account",
    question: "How do I upload a profile photo?",
    keywords: ["profile photo", "avatar", "picture", "selfie", "upload photo"],
    answer:
      "Settings → Profile photo → Upload. JPG/PNG/WebP, up to 5 MB. Shows in the sidebar everywhere. " +
      "Use 'Remove' to fall back to your initials.",
    href: "/settings",
    hrefLabel: "Open Settings",
  },

  // ─── Bookings ──────────────────────────────────────────────────────
  {
    id: "create-booking",
    module: "Bookings",
    question: "How do I create a booking?",
    keywords: ["create booking", "new booking", "add booking", "customer order"],
    answer:
      "Sidebar → Bookings → New booking. Pick the customer, product (PMS or AGO), volume in litres, " +
      "requested date, and (optional) pre-agreed rate. Save it as Draft, then Confirm it before it can be planned.",
    href: "/bookings/new",
    hrefLabel: "New booking",
  },
  {
    id: "plan-trip",
    module: "Bookings",
    question: "How do I turn a booking into a trip?",
    keywords: ["plan trip", "dispatch booking", "create trip", "booking to trip", "plan a trip"],
    answer:
      "Open a confirmed booking → Dispatch. Pick the truck, driver and driver advance. " +
      "The booking flips to Planned, a new trip appears in /trips, and the truck/driver are locked until you close or cancel.",
    href: "/trips",
    hrefLabel: "Open Trips",
  },
  {
    id: "delete-booking",
    module: "Bookings",
    question: "How do I delete a booking?",
    keywords: ["delete booking", "remove booking", "cancel booking"],
    answer:
      "Admin only. /bookings → row trash icon. Only available while the booking is NOT planned. " +
      "If it's already planned onto a trip, cancel the trip first.",
    href: "/bookings",
    hrefLabel: "Open Bookings",
  },

  // ─── Trips ─────────────────────────────────────────────────────────
  {
    id: "trip-overview",
    module: "Trips",
    question: "How does the trip wizard work?",
    keywords: ["trip wizard", "trip stages", "trip flow", "how does a trip work", "5 stages"],
    answer:
      "Every trip walks through five stages and you can't skip ahead: " +
      "1) Loading (BOL approved + volume + seals), 2) In Transit (passive), " +
      "3) Border (destination + RUC + border crossing), 4) Delivery (discharged volume + seals), " +
      "5) Invoice & close (generate invoice → send → close). " +
      "Click any completed stage in the top bar to edit it until the trip is closed.",
    href: "/trips",
    hrefLabel: "Open Trips",
  },
  {
    id: "approve-bol",
    module: "Trips",
    question: "How do I approve the Bill of Lading?",
    keywords: ["bol", "bill of lading", "approve bol", "approve document", "approve manifest"],
    answer:
      "On the trip's Loading stage, scroll to Documents. Upload the BOL PDF (if not already there), then click Approve. " +
      "Until the BOL is approved, you can't capture loading or advance to In Transit.",
  },
  {
    id: "capture-loading",
    module: "Trips",
    question: "How do I capture the loaded volume on a trip?",
    keywords: ["capture loading", "loaded litres", "loaded volume", "loading volume", "seal numbers"],
    answer:
      "Loading stage → Fuel cargo card → Capture loading. The volume is pre-filled from the BOL (already @20°C — no temp/density needed). " +
      "Enter seal numbers fitted at the depot. Save.",
  },
  {
    id: "advance-trip",
    module: "Trips",
    question: "How do I advance a trip to the next stage?",
    keywords: ["advance trip", "next stage", "move trip", "progress trip", "loading complete", "reached border", "cleared border"],
    answer:
      "Each stage has a big blue button at the bottom: 'Mark loading complete' → 'At the border' → 'Move to Delivery' → 'Move to Invoice'. " +
      "Each click is gated server-side — e.g. you can't advance from Loading until BOL is approved + volume + seals are captured.",
  },
  {
    id: "capture-discharge",
    module: "Trips",
    question: "How do I capture the discharged (delivered) volume?",
    keywords: ["discharged volume", "delivered volume", "customer discharge", "offload", "discharge"],
    answer:
      "Trip → Delivery stage → Customer discharge card → Capture discharge. Enter the delivered litres @20°C and the customer-side seal numbers. " +
      "If discharged is less than loaded beyond the 0.5% tolerance, a shortage deduction posts automatically on the driver's payroll when you invoice.",
  },
  {
    id: "generate-invoice-trip",
    module: "Trips",
    question: "How do I generate a customer invoice from a trip?",
    keywords: ["generate invoice", "create invoice", "freight invoice", "invoice customer", "bill customer"],
    answer:
      "Trip → Invoice & close stage → Generate Invoice. The form is pre-filled with the loaded L20 × rate/L (the BOL figure — NOT the booked or delivered volume). " +
      "Save draft, then open it and click Send to post the GL entries.",
  },
  {
    id: "close-trip",
    module: "Trips",
    question: "How do I close a trip?",
    keywords: ["close trip", "reconcile trip", "finish trip", "complete trip"],
    answer:
      "Trip → Invoice & close → confirm the derived km / litres / km-L shown in the green panel, " +
      "type the driver advance used, and click 'Close and Reconcile'. From then on the trip is read-only.",
  },
  {
    id: "reopen-trip",
    module: "Trips",
    question: "How do I reopen a closed trip?",
    keywords: ["reopen trip", "unlock trip", "edit closed trip", "amend trip", "amend volumes"],
    answer:
      "Admin only. Open the closed trip → Invoice stage → Reopen trip. " +
      "Only works if the invoice is still a DRAFT (it's cancelled and the shortage loan is reversed). " +
      "If the invoice is already SENT, you must issue a credit note first — reopen will refuse.",
  },

  // ─── Fuel ──────────────────────────────────────────────────────────
  {
    id: "log-fuel",
    module: "Fuel",
    question: "How do I log a fuelling?",
    keywords: ["log fuel", "fuel log", "record fuel", "new fuel log", "fuel entry"],
    answer:
      "Sidebar → Fuel → New fuel log. Pick the country (auto-selects currency), trip (optional, fills truck+driver), " +
      "datetime, station, odometer reading, station-manager name (audit), litres, currency and cost. " +
      "If you paid in UGX/USD the system converts to KES using the live FX rate.",
    href: "/fuel/new",
    hrefLabel: "New fuel log",
  },
  {
    id: "fuel-foreign-currency",
    module: "Fuel",
    question: "How do I log fuel I paid for in UGX or USD?",
    keywords: ["foreign currency fuel", "ugx fuel", "usd fuel", "uganda fuel", "fuel in dollars"],
    answer:
      "On the fuel-log form, pick the country (Uganda → UGX, Tanzania → USD, etc.) — the currency dropdown switches automatically. " +
      "Enter the cost in that currency; the system converts it to KES on the live FX rate (or fallback table) " +
      "and only the KES amount is persisted. Both figures show in the preview.",
    href: "/fuel/new",
    hrefLabel: "New fuel log",
  },
  {
    id: "delete-fuel-log",
    module: "Fuel",
    question: "How do I delete a fuel log?",
    keywords: ["delete fuel log", "remove fuel log", "wrong fuel log", "duplicate fuel"],
    answer:
      "Admin only. /fuel → row trash icon. Use sparingly — fuel logs are the source of truth for trip km and km/L, " +
      "so deleting one will change trip metrics.",
    href: "/fuel",
    hrefLabel: "Open Fuel",
  },

  // ─── Expenses ──────────────────────────────────────────────────────
  {
    id: "create-expense",
    module: "Expenses",
    question: "How do I capture an expense?",
    keywords: ["create expense", "new expense", "submit expense", "log expense", "record expense"],
    answer:
      "Sidebar → Expenses → New expense. Pick category, amount, date, optional trip/truck/driver link, attach the receipt. " +
      "No reimbursement step — the cashier issues cash on request when the driver/manager needs it.",
    href: "/expenses/new",
    hrefLabel: "New expense",
  },
  {
    id: "approve-expense",
    module: "Expenses",
    question: "How do I approve or reject an expense?",
    keywords: ["approve expense", "reject expense", "review expense", "expense approval"],
    answer:
      "Open the expense (/expenses → click the row) → Approve or Reject. " +
      "Rejecting requires a reason. Once approved, the expense is a committed cost and can't be deleted.",
    href: "/expenses",
    hrefLabel: "Open Expenses",
  },
  {
    id: "delete-expense",
    module: "Expenses",
    question: "How do I delete an expense?",
    keywords: ["delete expense", "remove expense"],
    answer:
      "Admin only. /expenses → row trash icon. Only works while the expense is NOT approved. " +
      "Approved expenses are committed costs; reverse them via a journal entry instead.",
    href: "/expenses",
    hrefLabel: "Open Expenses",
  },

  // ─── Trucks & Trailers ─────────────────────────────────────────────
  {
    id: "add-truck",
    module: "Trucks",
    question: "How do I add a truck?",
    keywords: ["add truck", "new truck", "register truck", "create truck"],
    answer:
      "Sidebar → Trucks → New truck. Plate (KE format e.g. KCB 421R), make/model, year, tanker spec " +
      "(capacity, compartments, calibration dates), permitted products, compliance expiries. " +
      "Truck status is auto-managed by trips (Active ↔ In Service).",
    href: "/trucks/new",
    hrefLabel: "New truck",
  },
  {
    id: "add-trailer",
    module: "Trailers",
    question: "How do I add a trailer?",
    keywords: ["add trailer", "new trailer", "register trailer", "create trailer", "trailer id format"],
    answer:
      "Sidebar → Trailers → New trailer. The Trailer ID is free-text — accept any format: KE plate, foreign plate, " +
      "chassis number, VIN, or your internal yard tag (e.g. TRL-014).",
    href: "/trailers/new",
    hrefLabel: "New trailer",
  },
  {
    id: "add-driver",
    module: "Drivers",
    question: "How do I add a driver?",
    keywords: ["add driver", "new driver", "register driver", "create driver"],
    answer:
      "Sidebar → Drivers → New driver. National ID, licence + expiry, M-Pesa phone, address. " +
      "Also create an HR employee record (HR → Employees) so payroll deductions (advances, shortage loans) can post.",
    href: "/drivers/new",
    hrefLabel: "New driver",
  },

  // ─── Customers & rates ─────────────────────────────────────────────
  {
    id: "add-customer",
    module: "Customers",
    question: "How do I add a customer?",
    keywords: ["add customer", "new customer", "register customer", "create customer"],
    answer:
      "Sidebar → Customers → New customer. Their billing currency drives the default invoice currency. " +
      "KRA PIN and payment terms drive the invoice due-date calculations.",
    href: "/customers/new",
    hrefLabel: "New customer",
  },
  {
    id: "set-rate",
    module: "Rates",
    question: "How do I set a rate for a route?",
    keywords: ["set rate", "new rate", "rate card", "freight rate", "add rate", "price per litre"],
    answer:
      "Sidebar → Rates → New rate. Origin, destination, basis (per_litre / per_m3 / per_trip), amount, currency. " +
      "Add an optional customer or cargo class for overrides. " +
      "When the dispatcher confirms a destination on a trip, the most-specific match wins automatically.",
    href: "/rates/new",
    hrefLabel: "New rate",
  },

  // ─── Suppliers & Bills (AP) ────────────────────────────────────────
  {
    id: "add-supplier",
    module: "Suppliers",
    question: "How do I add a supplier?",
    keywords: ["add supplier", "new supplier", "register supplier", "create supplier"],
    answer:
      "Sidebar → Suppliers → New supplier. Bank details and M-Pesa number drive supplier-payment defaults.",
    href: "/suppliers/new",
    hrefLabel: "New supplier",
  },
  {
    id: "create-bill",
    module: "Bills",
    question: "How do I capture a supplier bill?",
    keywords: ["create bill", "new bill", "supplier bill", "supplier invoice", "fuel supplier bill", "kpc bill"],
    answer:
      "Sidebar → Bills → New bill. Pick the supplier, enter line items, due date, optional trip/truck link, attach the PDF. " +
      "Save as draft → open it → click Send to post Dr Expense / Cr AP.",
    href: "/bills/new",
    hrefLabel: "New bill",
  },
  {
    id: "pay-supplier",
    module: "Bills",
    question: "How do I record a supplier payment?",
    keywords: ["pay supplier", "supplier payment", "record bill payment", "pay bill", "settle bill"],
    answer:
      "Open the bill → Record payment. Pick method (bank / M-Pesa / Mobile Money UGX / cash / cheque), date, " +
      "amount, reference. The GL posts Dr AP / Cr Bank automatically.",
    href: "/bills",
    hrefLabel: "Open Bills",
  },

  // ─── Invoices (AR) ─────────────────────────────────────────────────
  {
    id: "send-invoice",
    module: "Invoices",
    question: "How do I send an invoice?",
    keywords: ["send invoice", "post invoice", "issue invoice", "finalize invoice", "finalise invoice"],
    answer:
      "Open the draft invoice (/invoices) → Send. Posts Dr AR / Cr Revenue / Cr VAT to the ledger and " +
      "stamps the invoice as Sent. After Send, the only way to change it is to cancel + re-issue (or pay it).",
    href: "/invoices",
    hrefLabel: "Open Invoices",
  },
  {
    id: "record-customer-payment",
    module: "Invoices",
    question: "How do I record a customer payment?",
    keywords: ["record payment", "customer payment", "receive payment", "settle invoice", "mark paid"],
    answer:
      "Open the invoice → Record payment. Pick method (bank / M-Pesa / Mobile Money UGX / cash / cheque), date, " +
      "amount, reference. Status flips to Partially paid or Paid automatically.",
    href: "/invoices",
    hrefLabel: "Open Invoices",
  },
  {
    id: "cancel-invoice",
    module: "Invoices",
    question: "How do I cancel an invoice?",
    keywords: ["cancel invoice", "void invoice", "delete invoice"],
    answer:
      "Open the invoice → Cancel. Reverses the GL entry (if posted). Can't cancel a paid invoice — refund the payment first.",
    href: "/invoices",
    hrefLabel: "Open Invoices",
  },
  {
    id: "aged-ar",
    module: "Invoices",
    question: "How do I see which customers owe us money?",
    keywords: ["aged ar", "aging report", "who owes us", "outstanding receivables", "customer debt"],
    answer:
      "Sidebar → Aged AR. Buckets by age (current / 1-30 / 31-60 / 61-90 / 90+ days). Click a row to drill into the customer.",
    href: "/invoices/aged",
    hrefLabel: "Open Aged AR",
  },

  // ─── Asset Register ────────────────────────────────────────────────
  {
    id: "register-asset",
    module: "Assets",
    question: "How do I register a fixed asset?",
    keywords: ["register asset", "add asset", "new asset", "fixed asset", "ppe", "create asset"],
    answer:
      "Sidebar → Asset Register → New asset. Pick a category (Buildings, Motor Vehicles, Plant & Machinery, " +
      "Furniture, Office Equipment, Computer Equipment, Computer Software, Land). " +
      "Set cost, method (Straight line or Reducing balance), useful life or annual rate, optional residual.",
    href: "/assets/new",
    hrefLabel: "Register asset",
  },
  {
    id: "run-depreciation",
    module: "Assets",
    question: "How do I run monthly depreciation?",
    keywords: ["run depreciation", "monthly depreciation", "post depreciation", "depreciate", "month-end depreciation"],
    answer:
      "Sidebar → Asset Register → 'Run monthly depreciation'. Pick the YYYY-MM period and click. " +
      "Posts Dr Depreciation Expense / Cr Accumulated Depreciation for every eligible asset. " +
      "Idempotent — re-running a month skips assets already charged.",
    href: "/assets",
    hrefLabel: "Open Asset Register",
  },
  {
    id: "dispose-asset",
    module: "Assets",
    question: "How do I dispose or write off an asset?",
    keywords: ["dispose asset", "write off asset", "sell asset", "scrap asset", "asset disposal"],
    answer:
      "Open the asset → Dispose / write off. Enter proceeds (or tick 'Write off' for none) and the receiving account. " +
      "Posts the full disposal entry — removes cost + accumulated depreciation, books proceeds, and the gain or loss.",
    href: "/assets",
    hrefLabel: "Open Asset Register",
  },

  // ─── GL / Reports ──────────────────────────────────────────────────
  {
    id: "manual-journal",
    module: "Ledger",
    question: "How do I post a manual journal entry?",
    keywords: ["journal entry", "manual journal", "post journal", "je", "general ledger entry"],
    answer:
      "Sidebar → General Ledger → New entry. Both sides required, must balance. Used for corrections only — " +
      "most postings (invoices, bills, payments, depreciation, disposals) happen automatically.",
    href: "/ledger/new",
    hrefLabel: "New journal entry",
  },
  {
    id: "trial-balance",
    module: "Ledger",
    question: "How do I see the trial balance?",
    keywords: ["trial balance", "tb", "tb snapshot"],
    answer:
      "Sidebar → Trial Balance. Snapshot at a chosen date — exports to PDF/Excel.",
    href: "/ledger/trial-balance",
    hrefLabel: "Open Trial Balance",
  },
  {
    id: "reports",
    module: "Reports",
    question: "How do I run a report?",
    keywords: ["run report", "p&l", "pnl", "balance sheet", "expense report", "fuel report", "reports"],
    answer:
      "Sidebar → Reports. Pick from P&L, Balance Sheet, Expense Breakdown, Fuel Efficiency, etc. " +
      "Each has filters (date range, dimension) and export to PDF / Excel / CSV.",
    href: "/reports",
    hrefLabel: "Open Reports",
  },

  // ─── HR / Payroll ──────────────────────────────────────────────────
  {
    id: "create-payroll",
    module: "Payroll",
    question: "How do I create a payroll period?",
    keywords: ["create payroll", "new payroll", "payroll period", "run payroll", "month payroll"],
    answer:
      "Sidebar → Payroll → New period. Pick YYYY-MM. Inputs are auto-seeded from each employee's active contract " +
      "plus any active loan recoveries. Adjust per-employee, then mark Processing → Paid.",
    href: "/hr/payroll",
    hrefLabel: "Open Payroll",
  },
  {
    id: "mark-payroll-paid",
    module: "Payroll",
    question: "How do I mark a payroll period as paid?",
    keywords: ["mark payroll paid", "close payroll", "pay payroll", "finalise payroll"],
    answer:
      "Payroll period → 'Mark Paid'. Posts the GL and applies each employee's loan recovery against their oldest active loans first. " +
      "Once Paid, the period is locked — inputs can't be edited.",
    href: "/hr/payroll",
    hrefLabel: "Open Payroll",
  },

  // ─── Admin ─────────────────────────────────────────────────────────
  {
    id: "create-user",
    module: "Admin",
    question: "How do I create a new user?",
    keywords: ["create user", "add user", "new user", "invite user", "onboard user"],
    answer:
      "Sidebar → Admin → Users & Roles → 'Create & send invite'. Type name, email and role. " +
      "We email them a sign-in link + temporary password (via Resend). " +
      "They change it via 'Forgot password' on first login.",
    href: "/admin/users",
    hrefLabel: "Open Users & Roles",
  },
  {
    id: "change-user-role",
    module: "Admin",
    question: "How do I change a user's role?",
    keywords: ["change role", "user role", "assign role", "update role", "permissions"],
    answer:
      "Admin only. /admin/users → row role dropdown → pick the new role. " +
      "Refuses to demote the last active admin.",
    href: "/admin/users",
    hrefLabel: "Open Users & Roles",
  },
  {
    id: "resend-password",
    module: "Admin",
    question: "How do I resend a user's password?",
    keywords: ["resend password", "reset user password", "forgot user password", "new temp password"],
    answer:
      "Admin only. /admin/users → row 'Resend password'. Generates a fresh temporary password and emails it. " +
      "Use when a user never received the original invite.",
    href: "/admin/users",
    hrefLabel: "Open Users & Roles",
  },
  {
    id: "deactivate-user",
    module: "Admin",
    question: "How do I deactivate a user?",
    keywords: ["deactivate user", "disable user", "remove user", "block user"],
    answer:
      "Admin only. /admin/users → row 'Deactivate'. Stops them from signing in. " +
      "Reactivate any time with the same button. Refuses to deactivate the last active admin.",
    href: "/admin/users",
    hrefLabel: "Open Users & Roles",
  },
  {
    id: "audit-log",
    module: "Admin",
    question: "How do I see what's been changed in the system?",
    keywords: ["audit log", "change history", "who changed", "audit trail", "activity log"],
    answer:
      "Admin only. /admin/audit-log. Latest 200 high-trust mutations (invoice send/cancel, journal post/reverse, " +
      "asset disposal, role changes, trip reopen) with actor + before/after diff.",
    href: "/admin/audit-log",
    hrefLabel: "Open Audit Log",
  },
];
