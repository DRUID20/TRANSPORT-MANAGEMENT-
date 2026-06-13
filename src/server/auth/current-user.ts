/**
 * Current-user helpers. Reads from the signed session cookie when
 * available; falls back to the seed employee (`emp-004` Faith Njeri) so
 * the in-memory mock pages keep rendering before login is fully wired to
 * the database.
 *
 * Once Postgres is the source of truth this will look up the user
 * record by `session.userId` and join to the employee row.
 */

import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { getEmployee } from "@/server/store/mock-store";
import { getSession, type SessionData } from "@/server/auth/session";

export const CURRENT_USER_EMPLOYEE_ID = "emp-004";

export function getCurrentEmployee() {
  return getEmployee(CURRENT_USER_EMPLOYEE_ID);
}

/**
 * Resolved current user — null when not signed in. Cached per-request
 * via React `cache()` so calling it multiple times in a server render
 * is cheap.
 */
export const getCurrentUser = cache(async (): Promise<SessionData | null> => {
  try {
    const session = await getSession();
    if (!session.userId) return null;
    return {
      userId: session.userId,
      email: session.email,
      fullName: session.fullName,
      roleKey: session.roleKey,
      organizationId: session.organizationId,
    };
  } catch (err) {
    // Re-throw Next's control-flow signals (e.g. the dynamic-rendering
    // bailout from cookies() during static generation) so routes that read
    // the session are correctly marked dynamic instead of erroring.
    unstable_rethrow(err);
    // Otherwise: cookie present but SESSION_SECRET rotated / undecryptable.
    return null;
  }
});
