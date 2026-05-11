import { z } from "zod";

const kindEnum = z.enum([
  "driving_licence",
  "medical_certificate",
  "passport",
  "comesa_permit",
  "kra_pin",
  "national_id",
  "work_permit",
  "contract",
  "training_certificate",
  // Fuel-only TMS
  "hazmat_endorsement",
  "epra_dangerous_goods",
  "puc_certificate",
  "other",
]);

export const complianceCreateSchema = z.object({
  employeeId: z.string().min(1),
  kind: kindEnum,
  label: z.string().optional(),
  number: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  issuingAuthority: z.string().optional(),
  notes: z.string().optional(),
});
export type ComplianceCreateInput = z.infer<typeof complianceCreateSchema>;
