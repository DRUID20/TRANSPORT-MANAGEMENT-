/**
 * HR Compliance — Phase 6B.
 * Per-employee tracking of expiring documents: driving licence, medical,
 * passport, COMESA permit, KRA PIN, work permit, contract, etc.
 */

export type ComplianceKind =
  | "driving_licence"
  | "medical_certificate"
  | "passport"
  | "comesa_permit"
  | "kra_pin"
  | "national_id"
  | "work_permit"
  | "contract"
  | "training_certificate"
  | "other";

export type ComplianceStatus = "valid" | "expiring_soon" | "expired" | "missing";

export interface ComplianceRecord {
  id: string;
  employeeId: string;
  kind: ComplianceKind;
  /** Human label for "other" or sub-types. */
  label?: string;
  /** Document number (licence #, passport #, …). */
  number?: string;
  issueDate?: string;        // ISO date
  expiryDate?: string;       // ISO date — undefined for non-expiring docs
  issuingAuthority?: string;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;
}

/** Days until expiry (negative = past). Returns null if no expiry date. */
export function daysUntilExpiry(expiryDate?: string, today = new Date()): number | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  return Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Status with a 30-day "expiring soon" window. */
export function complianceStatus(expiryDate?: string, today = new Date()): ComplianceStatus {
  if (!expiryDate) return "missing";
  const days = daysUntilExpiry(expiryDate, today)!;
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "valid";
}

export const KIND_LABELS: Record<ComplianceKind, string> = {
  driving_licence: "Driving licence",
  medical_certificate: "Medical certificate",
  passport: "Passport",
  comesa_permit: "COMESA driver permit",
  kra_pin: "KRA PIN",
  national_id: "National ID",
  work_permit: "Work permit",
  contract: "Contract",
  training_certificate: "Training certificate",
  other: "Other",
};
