/** Trip-documents repo — dual-mode. Org-scoped. */
import { and, desc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { tripDocuments as table, trips as tripsTable } from "@/server/db/schema";
import {
  createTripDocument as storeCreate,
  deleteTripDocument as storeDelete,
  getTripDocument as storeGet,
  listTripDocuments as storeList,
  reviewTripDocument as storeReview,
} from "@/server/store/mock-store";
import type {
  TripDocument,
  TripDocumentKind,
  TripDocumentStatus,
} from "@/lib/types/documents";

type Row = typeof table.$inferSelect;

function toDoc(r: Row): TripDocument {
  return {
    id: r.id,
    tripId: r.tripId,
    kind: r.kind as TripDocumentKind,
    name: r.name,
    fileName: r.fileName,
    fileSize: r.fileSize,
    mimeType: r.mimeType,
    status: r.status as TripDocumentStatus,
    storageKey: r.storageKey ?? undefined,
    uploadedBy: r.uploadedBy,
    uploadedAt: r.uploadedAt.toISOString(),
    reviewedBy: r.reviewedBy ?? undefined,
    reviewedAt: r.reviewedAt?.toISOString(),
    rejectionReason: r.rejectionReason ?? undefined,
    notes: r.notes ?? undefined,
  };
}

export async function listTripDocuments(tripId: string): Promise<TripDocument[]> {
  if (IS_DEMO_MODE) return storeList(tripId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.tripId, tripId), eq(table.organizationId, orgId)))
    .orderBy(desc(table.uploadedAt));
  return rows.map(toDoc);
}

export async function getTripDocument(id: string): Promise<TripDocument | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toDoc(rows[0]) : undefined;
}

export async function createTripDocument(input: {
  tripId: string;
  kind: TripDocumentKind;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  notes?: string;
  storageKey?: string;
}): Promise<TripDocument | undefined> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const trip = (
    await db
      .select({ id: tripsTable.id })
      .from(tripsTable)
      .where(and(eq(tripsTable.id, input.tripId), eq(tripsTable.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!trip) return undefined;
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      tripId: input.tripId,
      kind: input.kind,
      name: input.name,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      status: "pending",
      storageKey: input.storageKey ?? null,
      uploadedBy: input.uploadedBy,
      notes: input.notes ?? null,
    })
    .returning();
  return toDoc(rows[0]!);
}

export async function reviewTripDocument(input: {
  documentId: string;
  approve: boolean;
  reason?: string;
  reviewedBy: string;
}): Promise<TripDocument | undefined> {
  if (IS_DEMO_MODE) return storeReview(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(table)
    .set({
      status: input.approve ? "approved" : "rejected",
      reviewedBy: input.reviewedBy,
      reviewedAt: new Date(),
      rejectionReason: input.approve ? null : input.reason ?? null,
    })
    .where(and(eq(table.id, input.documentId), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toDoc(rows[0]) : undefined;
}

export async function deleteTripDocument(id: string): Promise<boolean> {
  if (IS_DEMO_MODE) return storeDelete(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning({ id: table.id });
  return rows.length > 0;
}
