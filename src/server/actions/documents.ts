"use server";

import { revalidatePath } from "next/cache";
import {
  createTripDocument as storeCreate,
  deleteTripDocument as storeDelete,
  getTripDocument,
  listTripDocuments as storeList,
  reviewTripDocument as storeReview,
} from "@/server/store/mock-store";
import {
  documentReviewSchema,
  documentUploadSchema,
  type DocumentReviewInput,
  type DocumentUploadInput,
} from "@/lib/validators/documents";

export async function listTripDocuments(tripId: string) {
  return storeList(tripId);
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
  const doc = storeCreate({
    tripId: parsed.data.tripId,
    kind: parsed.data.kind,
    name: parsed.data.name,
    fileName: parsed.data.fileName,
    fileSize: parsed.data.fileSize,
    mimeType: parsed.data.mimeType,
    uploadedBy: parsed.data.uploadedBy,
    notes: parsed.data.notes,
  });
  if (!doc) return { ok: false, error: "Trip not found" };
  revalidatePath(`/trips/${parsed.data.tripId}`);
  return { ok: true, id: doc.id };
}

export async function reviewDocument(input: DocumentReviewInput): Promise<ActionResult> {
  const parsed = documentReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const doc = storeReview({
    documentId: parsed.data.documentId,
    approve: parsed.data.approve,
    reason: parsed.data.reason,
    reviewedBy: parsed.data.reviewedBy,
  });
  if (!doc) return { ok: false, error: "Document not found" };
  revalidatePath(`/trips/${doc.tripId}`);
  return { ok: true, id: doc.id };
}

export async function removeDocument(id: string): Promise<ActionResult> {
  const doc = getTripDocument(id);
  if (!doc) return { ok: false, error: "Document not found" };
  storeDelete(id);
  revalidatePath(`/trips/${doc.tripId}`);
  return { ok: true, id };
}
