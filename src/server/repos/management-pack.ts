/**
 * Monthly Management Pack repo — dual-mode, org-scoped.
 *
 * One pack per (org, yearMonth). Narrative/highlights/risks text is edited up
 * to status 'signed_off' (locked). Status follows STATUS_ORDER: draft →
 * in_review → signed_off → published.
 */
import { and, desc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { managementPacks as table } from "@/server/db/schema";
import {
  advanceManagementPack as storeAdvance,
  createManagementPack as storeCreate,
  getManagementPack as storeGet,
  listManagementPacks as storeList,
  updateManagementPackNarrative as storeUpdate,
} from "@/server/store/mock-store";
import {
  STATUS_ORDER,
  type ManagementPack,
  type ManagementPackStatus,
} from "@/lib/types/management-pack";

type Row = typeof table.$inferSelect;

function ymBounds(yearMonth: string): { startDate: string; endDate: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const startDate = `${yearMonth}-01`;
  const lastDay = new Date(y!, m!, 0).getDate();
  return { startDate, endDate: `${yearMonth}-${String(lastDay).padStart(2, "0")}` };
}

function toPack(r: Row): ManagementPack {
  return {
    id: r.id,
    yearMonth: r.yearMonth,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status as ManagementPackStatus,
    narrative: r.narrative,
    highlights: r.highlights,
    risks: r.risks,
    preparedById: r.preparedById ?? undefined,
    preparedAt: r.preparedAt?.toISOString(),
    reviewedById: r.reviewedById ?? undefined,
    reviewedAt: r.reviewedAt?.toISOString(),
    publishedAt: r.publishedAt?.toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listManagementPacks(): Promise<ManagementPack[]> {
  if (IS_DEMO_MODE) return storeList();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(eq(table.organizationId, orgId))
    .orderBy(desc(table.yearMonth));
  return rows.map(toPack);
}

export async function getManagementPack(id: string): Promise<ManagementPack | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toPack(rows[0]) : undefined;
}

export async function createManagementPack(yearMonth: string): Promise<ManagementPack | { error: string }> {
  if (IS_DEMO_MODE) return storeCreate(yearMonth);
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return { error: "yearMonth must be YYYY-MM" };
  const db = getDb();
  const orgId = await requireOrgId();
  const existing = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.organizationId, orgId), eq(table.yearMonth, yearMonth)))
    .limit(1);
  if (existing[0]) return { error: "Pack for that month already exists" };
  const { startDate, endDate } = ymBounds(yearMonth);
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      yearMonth,
      startDate,
      endDate,
      status: "draft",
      narrative: "",
      highlights: "",
      risks: "",
    })
    .returning();
  return toPack(rows[0]!);
}

export async function updateManagementPackNarrative(input: {
  id: string;
  narrative: string;
  highlights: string;
  risks: string;
}): Promise<ManagementPack | { error: string }> {
  if (IS_DEMO_MODE) return storeUpdate(input);
  const pack = await getManagementPack(input.id);
  if (!pack) return { error: "Pack not found" };
  if (pack.status === "signed_off" || pack.status === "published") {
    return { error: `Pack is ${pack.status} — locked` };
  }
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(table)
    .set({ narrative: input.narrative, highlights: input.highlights, risks: input.risks })
    .where(and(eq(table.id, input.id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toPack(rows[0]) : { error: "Update failed" };
}

export async function advanceManagementPack(
  id: string,
  to: ManagementPackStatus,
  actorId: string,
): Promise<ManagementPack | { error: string }> {
  if (IS_DEMO_MODE) return storeAdvance(id, to, actorId);
  const pack = await getManagementPack(id);
  if (!pack) return { error: "Pack not found" };
  if (STATUS_ORDER.indexOf(to) <= STATUS_ORDER.indexOf(pack.status)) {
    return { error: `Cannot move from ${pack.status} back to ${to}` };
  }
  const now = new Date();
  const set: Partial<typeof table.$inferInsert> = { status: to };
  if (to === "in_review" && !pack.preparedById) set.preparedById = actorId;
  if (to === "in_review" && !pack.preparedAt) set.preparedAt = now;
  if (to === "signed_off") {
    set.reviewedById = actorId;
    if (!pack.reviewedAt) set.reviewedAt = now;
  }
  if (to === "published") set.publishedAt = now;
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toPack(rows[0]) : { error: "Advance failed" };
}
