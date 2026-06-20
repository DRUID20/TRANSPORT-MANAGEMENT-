"use server";

import { revalidatePath } from "next/cache";
import {
  createTripDocument as repoCreate,
  deleteTripDocument as repoDelete,
  getTripDocument,
  listTripDocuments as repoList,
  reviewTripDocument as repoReview,
} from "@/server/repos/documents";
import { logAudit } from "@/server/auth/audit";
import {
  documentReviewSchema,
  documentUploadSchema,
  type DocumentReviewInput,
  type DocumentUploadInput,
} from "@/lib/validators/documents";

export async function listTripDocuments(tripId: string) {
  return repoList(tripId);
}

export async function getDocument(id: string) {
  return getTripDocument(id);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function uploadDocument(input: DocumentUploadInput): Promise<ActionResult> {
  const parsed = documentUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const doc = await repoCreate({
    tripId: parsed.data.tripId,
    kind: parsed.data.kind,
    name: parsed.data.name,
    fileName: parsed.data.fileName,
    fileSize: parsed.data.fileSize,
    mimeType: parsed.data.mimeType,
    storageKey: parsed.data.storageKey,
    uploadedBy: parsed.data.uploadedBy,
    notes: parsed.data.notes,
  });
  if (!doc) return { ok: false, error: "Trip not found" };
  await logAudit({ entityType: "trip_document", entityId: doc.id, action: "upload", diff: { kind: { from: null, to: parsed.data.kind }, name: { from: null, to: parsed.data.name } } });
  revalidatePath(`/trips/${parsed.data.tripId}`);
  return { ok: true, id: doc.id };
}

export async function reviewDocument(input: DocumentReviewInput): Promise<ActionResult> {
  const parsed = documentReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const doc = await repoReview({
    documentId: parsed.data.documentId,
    approve: parsed.data.approve,
    reason: parsed.data.reason,
    reviewedBy: parsed.data.reviewedBy,
  });
  if (!doc) return { ok: false, error: "Document not found" };
  await logAudit({ entityType: "trip_document", entityId: doc.id, action: parsed.data.approve ? "approve" : "reject" });
  revalidatePath(`/trips/${doc.tripId}`);
  return { ok: true, id: doc.id };
}

export async function removeDocument(id: string): Promise<ActionResult> {
  const doc = await getTripDocument(id);
  if (!doc) return { ok: false, error: "Document not found" };
  await repoDelete(id);
  await logAudit({ entityType: "trip_document", entityId: id, action: "delete" });
  // Best-effort delete the underlying bytes too — never block the action on this.
  if (doc.storageKey) {
    try {
      const { deleteFile } = await import("@/server/storage/files");
      await deleteFile(doc.storageKey);
    } catch (err) {
      console.error("[documents] failed to delete storage object:", err);
    }
  }
  revalidatePath(`/trips/${doc.tripId}`);
  return { ok: true, id };
}
