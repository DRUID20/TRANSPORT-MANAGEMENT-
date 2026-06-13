import { getCurrentUser } from "@/server/auth/current-user";

/**
 * The signed-in user's organization id, for scoping DB queries.
 *
 * Only called on the Postgres path (real auth), where the session always
 * carries the real organization uuid set at login. Throws if missing —
 * no caller should reach the database without a session.
 */
export async function requireOrgId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.organizationId) {
    throw new Error("No organization in session — sign in required.");
  }
  return user.organizationId;
}
