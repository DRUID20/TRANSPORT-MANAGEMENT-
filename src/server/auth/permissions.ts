/**
 * Lightweight role gate keyed on `users.role_key`. The richer per-resource
 * Job Description permission matrix in `src/lib/types/rbac.ts` is for the UI
 * catalogue; this is the server-side enforcement that any sensitive action
 * can call to refuse a request from a viewer/operator.
 *
 * Roles (today):
 *   admin   — everything
 *   manager — operate + post financials + approvals (cannot manage users/settings)
 *   officer — capture data, send for approval (cannot post/approve)
 *   viewer  — read-only
 *
 * Add more granular checks later; keep this file the single source of truth.
 */
import { getCurrentUser } from "@/server/auth/current-user";

export type Capability =
  | "finance.post" // post/reverse journals, send/cancel invoices+bills, payments
  | "finance.read"
  | "hr.write"
  | "hr.read"
  | "workshop.complete" // complete + raise bills on a job card
  | "workshop.write"
  | "fleet.write"
  | "fleet.read"
  | "admin"; // settings, user mgmt

const MATRIX: Record<string, Capability[]> = {
  admin: [
    "finance.post",
    "finance.read",
    "hr.write",
    "hr.read",
    "workshop.complete",
    "workshop.write",
    "fleet.write",
    "fleet.read",
    "admin",
  ],
  manager: [
    "finance.post",
    "finance.read",
    "hr.write",
    "hr.read",
    "workshop.complete",
    "workshop.write",
    "fleet.write",
    "fleet.read",
  ],
  officer: ["finance.read", "hr.read", "workshop.write", "fleet.write", "fleet.read"],
  viewer: ["finance.read", "hr.read", "fleet.read"],
};

export class PermissionError extends Error {
  constructor(message = "You don't have permission for this action.") {
    super(message);
    this.name = "PermissionError";
  }
}

export async function hasCapability(cap: Capability): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const roleKey = user.roleKey ?? "viewer";
  const allowed = MATRIX[roleKey] ?? MATRIX.viewer ?? [];
  return allowed.includes(cap);
}

/** Throws PermissionError on failure. Callers should let it bubble or
 *  catch and return `{ ok: false, error: e.message }`. */
export async function requireCapability(cap: Capability): Promise<void> {
  if (!(await hasCapability(cap))) {
    throw new PermissionError(`Missing capability: ${cap}`);
  }
}
