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

/**
 * Turn a partial-update patch into an audit diff. We record the "to" values
 * (the change being applied); "from" is null because light update paths don't
 * re-load the prior row for every field. Undefined keys are skipped.
 */
export function toDiff(patch: Record<string, unknown>): AuditDiff {
  const d: AuditDiff = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) d[k] = { from: null, to: v as unknown };
  }
  return d;
}

export interface AuditInput {
  entityType: string;
  entityId?: string | null;
  action: string; // 'create' | 'update' | 'delete' | 'send' | 'cancel' | 'pay' | 'post' | 'reverse' | ...
  diff?: AuditDiff;
  /** Explicit actor — used by auth events (login / failed login / logout)
   *  where the session isn't yet established or is being destroyed. When
   *  omitted, the actor is taken from the current session. */
  actorUserId?: string | null;
  organizationId?: string | null;
  /** Write the row even when there's no resolvable actor (e.g. a failed
   *  login attempt for an unknown email). Defaults to false. */
  allowAnonymous?: boolean;
}

export async function logAudit(input: AuditInput): Promise<void> {
  if (IS_DEMO_MODE) return;
  try {
    let actorUserId = input.actorUserId ?? null;
    let organizationId = input.organizationId ?? null;
    if (actorUserId === null || organizationId === null) {
      const user = await getCurrentUser();
      if (user) {
        actorUserId = actorUserId ?? user.userId ?? null;
        organizationId = organizationId ?? user.organizationId ?? null;
      }
    }
    // No actor and not explicitly anonymous → skip (cron/system writes opt in
    // via allowAnonymous).
    if (!actorUserId && !input.allowAnonymous) return;
    const db = getDb();
    await db.insert(auditLog).values({
      organizationId,
      actorUserId,
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
