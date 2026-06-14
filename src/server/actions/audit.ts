"use server";

import { desc, eq, and } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { auditLog, users } from "@/server/db/schema";
import { requireCapability } from "@/server/auth/permissions";

export interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorName?: string;
  actorEmail?: string;
  createdAt: string;
  diff?: Record<string, { from: unknown; to: unknown }>;
}

export async function listAuditLog(filter?: {
  entityType?: string;
  limit?: number;
}): Promise<AuditRow[]> {
  await requireCapability("admin");
  if (IS_DEMO_MODE) return [];
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(auditLog.organizationId, orgId)];
  if (filter?.entityType) where.push(eq(auditLog.entityType, filter.entityType));
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      actorUserId: auditLog.actorUserId,
      diff: auditLog.diff,
      createdAt: auditLog.createdAt,
      actorName: users.fullName,
      actorEmail: users.email,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorUserId))
    .where(and(...where))
    .orderBy(desc(auditLog.createdAt))
    .limit(filter?.limit ?? 200);

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId ?? undefined,
    actorName: r.actorName ?? undefined,
    actorEmail: r.actorEmail ?? undefined,
    diff: (r.diff as AuditRow["diff"]) ?? undefined,
    createdAt: r.createdAt.toISOString(),
  }));
}
