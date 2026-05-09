/**
 * Job-Description-driven RBAC — Phase 6F.
 *
 * Per Nile Valley spec: each employee's screens are activated by their
 * Job Description (JD), stricter than standard role-based access.
 * A JD has a list of (resource, actions) permissions; the assigned
 * employee can only see/do what's in that list.
 */

export type RbacAction = "view" | "create" | "edit" | "approve" | "export" | "delete";

/** All resources the system protects. Aligned to the route map. */
export type RbacResource =
  | "dashboard"
  | "bookings"
  | "trips"
  | "trucks"
  | "trailers"
  | "drivers"
  | "workshop"
  | "compliance"
  | "rates"
  | "customers"
  | "suppliers"
  | "subcontractors"
  | "expenses"
  | "fuel"
  | "mpesa"
  | "accounts"
  | "ledger"
  | "invoices"
  | "bills"
  | "bank"
  | "reports"
  | "hr_employees"
  | "hr_leave"
  | "hr_payroll"
  | "hr_loans"
  | "hr_appraisals"
  | "hr_compliance"
  | "hr_permissions"
  | "admin_settings"
  | "admin_users"
  | "audit_log";

export interface RbacPermission {
  resource: RbacResource;
  actions: RbacAction[];
}

export type JdLevel = "executive" | "manager" | "supervisor" | "officer" | "operator";

export interface JobDescription {
  id: string;
  /** Short code, e.g. MD, FM, OM, HRM, DSP, DRV, FRM, MEC. */
  code: string;
  title: string;
  level: JdLevel;
  /** Plain-English summary of the role. */
  summary: string;
  /** Headline accountabilities (bullet list). */
  responsibilities: string[];
  /** Permissions matrix. */
  permissions: RbacPermission[];
  /** Number of employees currently assigned this JD (computed). */
  assignedCount?: number;
  createdAt: string;
}

export const RESOURCE_LABELS: Record<RbacResource, string> = {
  dashboard: "Dashboard",
  bookings: "Bookings",
  trips: "Trips",
  trucks: "Trucks",
  trailers: "Trailers",
  drivers: "Drivers",
  workshop: "Workshop",
  compliance: "Compliance",
  rates: "Rates",
  customers: "Customers",
  suppliers: "Suppliers",
  subcontractors: "Subcontractors",
  expenses: "Expenses",
  fuel: "Fuel",
  mpesa: "M-Pesa",
  accounts: "Chart of Accounts",
  ledger: "General Ledger",
  invoices: "Invoices (AR)",
  bills: "Bills (AP)",
  bank: "Bank Reconciliation",
  reports: "Reports",
  hr_employees: "HR · Employees",
  hr_leave: "HR · Leave",
  hr_payroll: "HR · Payroll",
  hr_loans: "HR · Loans",
  hr_appraisals: "HR · Appraisals",
  hr_compliance: "HR · Compliance",
  hr_permissions: "HR · Permissions",
  admin_settings: "Admin · Settings",
  admin_users: "Admin · Users",
  audit_log: "Audit log",
};

export const RESOURCE_GROUPS: Array<{ label: string; resources: RbacResource[] }> = [
  { label: "Operations", resources: ["dashboard", "bookings", "trips", "trucks", "trailers", "drivers", "workshop", "compliance", "rates"] },
  { label: "Partners",   resources: ["customers", "suppliers", "subcontractors"] },
  { label: "Finance",    resources: ["expenses", "fuel", "mpesa", "accounts", "ledger", "invoices", "bills", "bank", "reports"] },
  { label: "People",     resources: ["hr_employees", "hr_leave", "hr_payroll", "hr_loans", "hr_appraisals", "hr_compliance", "hr_permissions"] },
  { label: "Admin",      resources: ["admin_settings", "admin_users", "audit_log"] },
];

export const ALL_ACTIONS: RbacAction[] = ["view", "create", "edit", "approve", "export", "delete"];

/** Returns true if the JD allows the given action on the resource. */
export function canDo(
  jd: JobDescription | undefined,
  resource: RbacResource,
  action: RbacAction,
): boolean {
  if (!jd) return false;
  const p = jd.permissions.find((x) => x.resource === resource);
  return p ? p.actions.includes(action) : false;
}
