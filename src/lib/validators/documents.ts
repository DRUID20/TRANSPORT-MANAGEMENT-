import { z } from "zod";

export const documentKindEnum = z.enum([
  "manifest",
  "bill_of_lading",
  "road_user_charge",
  "commercial_invoice",
  "packing_list",
  "waybill",
  "t1_transit",
  "comesa_yellow_card",
  "certificate_of_origin",
  "gate_out_slip",
  "weighbridge_slip",
  "proof_of_delivery",
  "damage_report",
  "photo",
  "other",
]);

export const documentUploadSchema = z.object({
  tripId: z.string().min(1),
  kind: documentKindEnum,
  name: z.string().min(2, "Name is required"),
  fileName: z.string().min(1),
  fileSize: z.coerce.number().nonnegative(),
  mimeType: z.string().min(1),
  /** Storage path returned by POST /api/files/upload — required for real uploads. */
  storageKey: z.string().min(1, "Upload the file before saving."),
  uploadedBy: z.string().default("Dispatcher"),
  notes: z.string().optional(),
});
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

export const documentReviewSchema = z.object({
  documentId: z.string().min(1),
  approve: z.boolean(),
  reason: z.string().optional(),
  reviewedBy: z.string().default("Manager"),
});
export type DocumentReviewInput = z.infer<typeof documentReviewSchema>;
