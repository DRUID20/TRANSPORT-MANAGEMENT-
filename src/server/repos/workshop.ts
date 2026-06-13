/**
 * Workshop repo — dual-mode (Postgres / mock store). Org-scoped.
 *
 * Job-card multi-table model: card + N services + M spares. JC-YYYY-NNN
 * issued atomically (3-digit pad per the store convention). Totals (labor /
 * spares / grand total) recompute on every line mutation. Opening a card flips
 * the truck to `in_workshop`; closing the last open card on a truck flips it
 * back to `active`.
 */
import { and, asc, desc, eq, ne, inArray, sql } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import {
  jobCardServices as servicesTable,
  jobCardSpares as sparesTable,
  jobCards as cardsTable,
  trucks as trucksTable,
} from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import {
  addJobCardService as storeAddSvc,
  addJobCardSpare as storeAddSpare,
  closeJobCard as storeClose,
  createJobCard as storeCreate,
  getJobCard as storeGet,
  jobCardsForTruck as storeForTruck,
  listJobCards as storeList,
  removeJobCardService as storeRemoveSvc,
  removeJobCardSpare as storeRemoveSpare,
  setJobCardStatus as storeSetStatus,
  updateJobCardAnalysis as storeUpdateAnalysis,
} from "@/server/store/mock-store";
import type {
  JobCard,
  JobCardDetail,
  JobCardService,
  JobCardSpare,
  JobCardStatus,
} from "@/lib/types/workshop";

type CRow = typeof cardsTable.$inferSelect;
type SvcRow = typeof servicesTable.$inferSelect;
type SpRow = typeof sparesTable.$inferSelect;

function toCard(r: CRow): JobCard {
  return {
    id: r.id,
    number: r.number,
    truckId: r.truckId,
    status: r.status as JobCardStatus,
    mechanicName: r.mechanicName,
    openingOdometer: r.openingOdometer ?? undefined,
    closingOdometer: r.closingOdometer ?? undefined,
    mechanicAnalysis: r.mechanicAnalysis,
    notes: r.notes ?? undefined,
    openedAt: r.openedAt.toISOString(),
    closedAt: r.closedAt?.toISOString(),
    laborTotalKes: Number(r.laborTotalKes),
    sparesTotalKes: Number(r.sparesTotalKes),
    totalKes: Number(r.totalKes),
  };
}

function toService(r: SvcRow): JobCardService {
  return {
    id: r.id,
    jobCardId: r.jobCardId,
    description: r.description,
    hours: Number(r.hours),
    costKes: Number(r.costKes),
    performedAt: r.performedAt.toISOString(),
  };
}

function toSpare(r: SpRow): JobCardSpare {
  return {
    id: r.id,
    jobCardId: r.jobCardId,
    description: r.description,
    quantity: Number(r.quantity),
    unitCostKes: Number(r.unitCostKes),
    totalCostKes: Number(r.totalCostKes),
    supplierId: r.supplierId ?? undefined,
    posted: r.posted,
    postedAt: r.postedAt?.toISOString(),
    consumedAt: r.consumedAt.toISOString(),
  };
}

async function recomputeTotals(jobCardId: string) {
  const db = getDb();
  const [svcAgg] = await db
    .select({ total: sql<string>`coalesce(sum(${servicesTable.costKes}), 0)` })
    .from(servicesTable)
    .where(eq(servicesTable.jobCardId, jobCardId));
  const [spareAgg] = await db
    .select({ total: sql<string>`coalesce(sum(${sparesTable.totalCostKes}), 0)` })
    .from(sparesTable)
    .where(eq(sparesTable.jobCardId, jobCardId));
  const labor = Number(svcAgg?.total ?? 0);
  const spares = Number(spareAgg?.total ?? 0);
  await db
    .update(cardsTable)
    .set({ laborTotalKes: String(labor), sparesTotalKes: String(spares), totalKes: String(labor + spares) })
    .where(eq(cardsTable.id, jobCardId));
}

async function autoProgress(jobCardId: string) {
  const db = getDb();
  await db
    .update(cardsTable)
    .set({ status: "in_progress" })
    .where(and(eq(cardsTable.id, jobCardId), eq(cardsTable.status, "open")));
}

export async function listJobCards(filterStatus?: JobCardStatus): Promise<JobCard[]> {
  if (IS_DEMO_MODE) return storeList(filterStatus);
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(cardsTable.organizationId, orgId)];
  if (filterStatus) where.push(eq(cardsTable.status, filterStatus));
  const rows = await db.select().from(cardsTable).where(and(...where)).orderBy(desc(cardsTable.openedAt));
  return rows.map(toCard);
}

export async function getJobCard(id: string): Promise<JobCardDetail | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const card = (
    await db
      .select()
      .from(cardsTable)
      .where(and(eq(cardsTable.id, id), eq(cardsTable.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!card) return undefined;
  const [services, spares] = await Promise.all([
    db.select().from(servicesTable).where(eq(servicesTable.jobCardId, id)).orderBy(asc(servicesTable.performedAt)),
    db.select().from(sparesTable).where(eq(sparesTable.jobCardId, id)).orderBy(asc(sparesTable.consumedAt)),
  ]);
  return { ...toCard(card), services: services.map(toService), spares: spares.map(toSpare) };
}

export async function jobCardsForTruck(truckId: string): Promise<JobCard[]> {
  if (IS_DEMO_MODE) return storeForTruck(truckId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(cardsTable)
    .where(and(eq(cardsTable.truckId, truckId), eq(cardsTable.organizationId, orgId)))
    .orderBy(desc(cardsTable.openedAt));
  return rows.map(toCard);
}

export async function createJobCard(input: {
  truckId: string;
  mechanicName: string;
  openingOdometer?: number;
  mechanicAnalysis?: string;
}): Promise<JobCard> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "JC", "jobcard", 3);
  const card = await db.transaction(async (tx) => {
    const c = (
      await tx
        .insert(cardsTable)
        .values({
          organizationId: orgId,
          number,
          truckId: input.truckId,
          status: "open",
          mechanicName: input.mechanicName,
          openingOdometer: input.openingOdometer ?? null,
          mechanicAnalysis: input.mechanicAnalysis ?? "",
        })
        .returning()
    )[0]!;
    await tx
      .update(trucksTable)
      .set({ status: "in_workshop" })
      .where(and(eq(trucksTable.id, input.truckId), eq(trucksTable.organizationId, orgId)));
    return c;
  });
  return toCard(card);
}

export async function updateJobCardAnalysis(
  id: string,
  analysis: string,
): Promise<JobCard | undefined> {
  if (IS_DEMO_MODE) return storeUpdateAnalysis(id, analysis);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(cardsTable)
    .set({ mechanicAnalysis: analysis })
    .where(and(eq(cardsTable.id, id), eq(cardsTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toCard(rows[0]) : undefined;
}

export async function setJobCardStatus(
  id: string,
  status: JobCardStatus,
): Promise<JobCard | undefined> {
  if (IS_DEMO_MODE) return storeSetStatus(id, status);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(cardsTable)
    .set({ status })
    .where(and(eq(cardsTable.id, id), eq(cardsTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toCard(rows[0]) : undefined;
}

export async function addJobCardService(input: {
  jobCardId: string;
  description: string;
  hours: number;
  costKes: number;
}): Promise<JobCardService> {
  if (IS_DEMO_MODE) return storeAddSvc(input);
  const db = getDb();
  const rows = await db
    .insert(servicesTable)
    .values({
      jobCardId: input.jobCardId,
      description: input.description,
      hours: String(input.hours),
      costKes: String(input.costKes),
    })
    .returning();
  await autoProgress(input.jobCardId);
  await recomputeTotals(input.jobCardId);
  return toService(rows[0]!);
}

export async function removeJobCardService(serviceId: string): Promise<boolean> {
  if (IS_DEMO_MODE) return storeRemoveSvc(serviceId);
  const db = getDb();
  const rows = await db
    .delete(servicesTable)
    .where(eq(servicesTable.id, serviceId))
    .returning({ jobCardId: servicesTable.jobCardId });
  if (rows.length === 0) return false;
  await recomputeTotals(rows[0]!.jobCardId);
  return true;
}

export async function addJobCardSpare(input: {
  jobCardId: string;
  description: string;
  quantity: number;
  unitCostKes: number;
  supplierId?: string;
}): Promise<JobCardSpare> {
  if (IS_DEMO_MODE) return storeAddSpare(input);
  const db = getDb();
  const now = new Date();
  const total = input.quantity * input.unitCostKes;
  const rows = await db
    .insert(sparesTable)
    .values({
      jobCardId: input.jobCardId,
      description: input.description,
      quantity: String(input.quantity),
      unitCostKes: String(input.unitCostKes),
      totalCostKes: String(total),
      supplierId: input.supplierId ?? null,
      posted: true,
      postedAt: now,
    })
    .returning();
  await autoProgress(input.jobCardId);
  await recomputeTotals(input.jobCardId);
  return toSpare(rows[0]!);
}

export async function removeJobCardSpare(spareId: string): Promise<boolean> {
  if (IS_DEMO_MODE) return storeRemoveSpare(spareId);
  const db = getDb();
  const rows = await db
    .delete(sparesTable)
    .where(eq(sparesTable.id, spareId))
    .returning({ jobCardId: sparesTable.jobCardId });
  if (rows.length === 0) return false;
  await recomputeTotals(rows[0]!.jobCardId);
  return true;
}

export async function closeJobCard(input: {
  jobCardId: string;
  closingOdometer?: number;
  notes?: string;
}): Promise<JobCard | undefined> {
  if (IS_DEMO_MODE) return storeClose(input);
  const db = getDb();
  const orgId = await requireOrgId();
  return db.transaction(async (tx) => {
    const updated = (
      await tx
        .update(cardsTable)
        .set({
          status: "completed",
          closedAt: new Date(),
          closingOdometer: input.closingOdometer ?? null,
          notes: input.notes ?? null,
        })
        .where(and(eq(cardsTable.id, input.jobCardId), eq(cardsTable.organizationId, orgId)))
        .returning()
    )[0];
    if (!updated) return undefined;
    // If no other open/in_progress/awaiting_parts cards on this truck, release it.
    const stillInShop = await tx
      .select({ id: cardsTable.id })
      .from(cardsTable)
      .where(
        and(
          eq(cardsTable.truckId, updated.truckId),
          eq(cardsTable.organizationId, orgId),
          ne(cardsTable.id, updated.id),
          inArray(cardsTable.status, ["open", "in_progress", "awaiting_parts"]),
        ),
      );
    if (stillInShop.length === 0) {
      await tx
        .update(trucksTable)
        .set({ status: "active" })
        .where(
          and(
            eq(trucksTable.id, updated.truckId),
            eq(trucksTable.organizationId, orgId),
            eq(trucksTable.status, "in_workshop"),
          ),
        );
    }
    return toCard(updated);
  });
}
