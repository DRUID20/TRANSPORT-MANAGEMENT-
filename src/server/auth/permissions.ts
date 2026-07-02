/**
 * Lightweight role gate keyed on `users.role_key`. The richer per-resource
 * Job Description permission matrix in `src/lib/types/rbac.ts` is for the UI
 * catalogue; this is the server-side enforcement that any sensitive action
 * can call to refuse a request from a viewer/operator.
 *
 * Roles (single taxonomy, shared with sidebar visibility in
 * `src/lib/auth/roles.ts`):
 *   admin      — everything, incl. user management + settings
 *   dispatcher — operations: fleet, workshop, expense approval (no GL posting)
 *   accountant — finance: invoices, bills, payments, GL posting + reports
 *   driver     — minimal read (uses the /drv app)
 *   viewer     — read-only
 *
 * Add more granular checks later; keep this file the single source of truth
 * for server-side capability enforcement.
 */
import { cookies } from "next/headers";
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
  | "commercial.write" // customers, rates, suppliers (touched by ops AND finance)
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
    "commercial.write",
    "admin",
  ],
  dispatcher: [
    "fleet.write",
    "fleet.read",
    "workshop.complete",
    "workshop.write",
    "finance.read",
    "hr.read",
    "commercial.write",
  ],
  accountant: [
    "finance.post",
    "finance.read",
    "fleet.read",
    "hr.read",
    "commercial.write",
  ],
  driver: ["fleet.read"],
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

/**
 * Result-returning gate for actions that return `{ ok: false; error }` on
 * failure. Returns `null` when allowed, or the denial result to return
 * directly:
 *
 *   const denied = await guard("fleet.write");
 *   if (denied) return denied;
 */
export async function guard(cap: Capability): Promise<{ ok: false; error: string } | null> {
  if (await hasCapability(cap)) return null;
  return { ok: false, error: `You don't have permission for this action (needs ${cap}).` };
}

/** True when an authenticated driver-kiosk session cookie is present. The
 *  cookie is httpOnly and only set after authenticateDriver() verifies the
 *  driver's phone + National ID, so presence is a sufficient authenticity
 *  signal for the shared driver/office actions. */
async function hasDriverSession(): Promise<boolean> {
  try {
    const c = await cookies();
    return !!c.get("tx_drv")?.value;
  } catch {
    return false;
  }
}

/**
 * Gate for actions used by BOTH the office app and the driver kiosk
 * (transitionTrip, createExpense, uploadDocument): allow if the office user
 * holds `fleet.write`, OR the request carries an authenticated driver session.
 * Blocks office viewers while keeping the driver app working.
 */
export async function guardFleetOrDriver(): Promise<{ ok: false; error: string } | null> {
  if (await hasCapability("fleet.write")) return null;
  if (await hasDriverSession()) return null;
  return { ok: false, error: "You don't have permission for this action." };
}
