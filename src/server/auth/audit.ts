/**
 * Audit log helper — writes a single row to `audit_log` capturing who did
 * what to which entity, with an optional before/after diff. Called from
 * high-trust mutations (invoice send/cancel, bill send/cancel, payments,
 * journal post/reverse, loan create/cancel, role changes).
 *
 * Best-effort: never throws to the caller. A failure to write the audit row
 * must not block the actual business operation (we'd rather lose one log
 * line than reject a payment), but we surface it on the server log.
 */
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db/client";
import { auditLog } from "@/server/db/schema";

export interface AuditDiff {
  [field: string]: { from: unknown; to: unknown };
}

export interface AuditInput {
  entityType: string;
  entityId?: string | null;
  action: string; // 'create' | 'update' | 'delete' | 'send' | 'cancel' | 'pay' | 'post' | 'reverse' | ...
  diff?: AuditDiff;
}

export async function logAudit(input: AuditInput): Promise<void> {
  if (IS_DEMO_MODE) return;
  try {
    const user = await getCurrentUser();
    if (!user) return; // shouldn't happen in normal flow; cron/system writes can be added later
    const db = getDb();
    await db.insert(auditLog).values({
      organizationId: user.organizationId ?? null,
      actorUserId: user.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      diff: input.diff ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.name + ": " + err.message : "unknown";
    console.error("[audit] write failed:", msg);
  }
}
