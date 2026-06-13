/**
 * Atomic, org-scoped sequence numbers (BK-2026-0042, TRP-2026-0142, …).
 *
 * Uses the `counters` table with a single INSERT … ON CONFLICT DO UPDATE so
 * concurrent requests can never collide on a number. `next_value` always holds
 * the NEXT value to hand out; the value we return is the one just consumed.
 */
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { counters } from "@/server/db/schema";

/** Reserve and return the next integer for (org, key). */
export async function nextCounter(orgId: string, key: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .insert(counters)
    .values({ organizationId: orgId, key, nextValue: 2 })
    .onConflictDoUpdate({
      target: [counters.organizationId, counters.key],
      set: { nextValue: sql`${counters.nextValue} + 1` },
    })
    .returning({ nextValue: counters.nextValue });
  // On first insert next_value=2 → consumed 1; on update returns old+1 → consumed = returned-1.
  return (rows[0]?.nextValue ?? 2) - 1;
}

/** Format a document number like "BK-2026-0042" (4-digit zero-padded). */
export async function nextDocumentNumber(
  orgId: string,
  prefix: string,
  key: string,
  pad = 4,
): Promise<string> {
  const year = new Date().getFullYear();
  const n = await nextCounter(orgId, key);
  return `${prefix}-${year}-${String(n).padStart(pad, "0")}`;
}
