/**
 * Trip Documents — Phase 2C.
 * Manifest, waybill, customs, weighbridge, POD, etc.
 */

export type TripDocumentKind =
  | "manifest"
  | "commercial_invoice"
  | "packing_list"
  | "waybill"
  | "t1_transit"
  | "comesa_yellow_card"
  | "certificate_of_origin"
  | "gate_out_slip"
  | "weighbridge_slip"
  | "proof_of_delivery"
  | "damage_report"
  | "photo"
  | "other";

export type TripDocumentStatus = "pending" | "approved" | "rejected";

export interface TripDocument {
  id: string;
  tripId: string;
  kind: TripDocumentKind;
  /** Human-readable label, e.g. "Manifest – Mombasa CFS" */
  name: string;
  /** Original file name as uploaded (e.g. "MANIFEST_TRP-2026-0001.pdf"). */
  fileName: string;
  /** Bytes. */
  fileSize: number;
  /** MIME type (image/jpeg, application/pdf, etc.) */
  mimeType: string;
  status: TripDocumentStatus;
  uploadedBy: string;
  uploadedAt: string;        // ISO datetime
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  notes?: string;
  /**
   * Mock-only. Phase 2G + Supabase Storage integration replace this with
   * a real path/URL. For now we hold a placeholder string so we can render
   * a "view" link.
   */
  storageKey?: string;
}

export const documentKindLabel: Record<TripDocumentKind, string> = {
  manifest: "Manifest",
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  waybill: "Waybill",
  t1_transit: "T1 Transit",
  comesa_yellow_card: "COMESA Yellow Card",
  certificate_of_origin: "Certificate of Origin",
  gate_out_slip: "Gate-Out Slip",
  weighbridge_slip: "Weighbridge Slip",
  proof_of_delivery: "Proof of Delivery",
  damage_report: "Damage Report",
  photo: "Photo",
  other: "Other",
};

/** Documents grouped by stage in the trip lifecycle, used by the UI. */
export const documentStages = [
  {
    label: "Loading & origin",
    kinds: ["manifest", "commercial_invoice", "packing_list", "waybill", "gate_out_slip", "weighbridge_slip"] as TripDocumentKind[],
  },
  {
    label: "Cross-border / transit",
    kinds: ["t1_transit", "comesa_yellow_card", "certificate_of_origin"] as TripDocumentKind[],
  },
  {
    label: "Delivery",
    kinds: ["proof_of_delivery", "damage_report"] as TripDocumentKind[],
  },
  {
    label: "Other",
    kinds: ["photo", "other"] as TripDocumentKind[],
  },
];
