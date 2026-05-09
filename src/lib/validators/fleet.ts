import { z } from "zod";

// Loose-but-enforced Kenyan plate format. Examples: "KCB 421R", "KAA 100A".
// We normalise on the server (uppercase + collapse spaces).
const platePattern = /^[A-Z]{1,3}\s?\d{1,4}\s?[A-Z]?$/i;

export const truckCreateSchema = z
  .object({
    registration: z
      .string()
      .min(4)
      .max(16)
      .regex(platePattern, "Use the format KCB 421R"),
    ownerType: z.enum(["company_owned", "subcontractor"]),
    subcontractorId: z.string().optional(),
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
    fuelType: z.enum(["diesel", "petrol"]),
    capacityTonnes: z.coerce.number().positive(),
    axles: z.coerce.number().int().min(2).max(7),
    status: z.enum(["active", "in_service", "in_workshop", "idle", "retired"]).default("active"),
    insuranceExpiry: z.string().optional(),
    ntsaInspectionExpiry: z.string().optional(),
    comesaPermitExpiry: z.string().optional(),
    transitPermitExpiry: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (v) => v.ownerType !== "subcontractor" || !!v.subcontractorId,
    { message: "Subcontractor is required when owner type is Subcontractor", path: ["subcontractorId"] },
  );

export type TruckCreateInput = z.infer<typeof truckCreateSchema>;

export const subcontractorCreateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  phone: z.string().min(7, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  kraPin: z.string().optional(),
  mpesaNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().optional(),
});

export type SubcontractorCreateInput = z.infer<typeof subcontractorCreateSchema>;

// Reuse plate pattern from above
const platePatternForTrailer = /^[A-Z]{1,3}\s?\d{1,4}\s?[A-Z]?$/i;

export const trailerCreateSchema = z
  .object({
    registration: z
      .string()
      .min(4)
      .max(16)
      .regex(platePatternForTrailer, "Use the format ZA 0123T or similar"),
    ownerType: z.enum(["company_owned", "subcontractor"]),
    subcontractorId: z.string().optional(),
    type: z.enum([
      "flatbed",
      "tanker",
      "curtain_side",
      "reefer",
      "tipper",
      "low_loader",
      "container_skeleton",
    ]),
    capacityTonnes: z.coerce.number().positive(),
    axles: z.coerce.number().int().min(1).max(7),
    year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
    status: z.enum(["active", "in_workshop", "idle", "retired"]).default("active"),
    attachedTruckId: z.string().optional(),
    insuranceExpiry: z.string().optional(),
    ntsaInspectionExpiry: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (v) => v.ownerType !== "subcontractor" || !!v.subcontractorId,
    { message: "Subcontractor is required when owner type is Subcontractor", path: ["subcontractorId"] },
  );
export type TrailerCreateInput = z.infer<typeof trailerCreateSchema>;

export const driverCreateSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(7, "Phone is required"),
  nationalId: z.string().min(4, "National ID is required"),
  status: z.enum(["active", "on_leave", "on_trip", "suspended", "terminated"]).default("active"),
  licenceClass: z.enum(["BCE", "CD", "CE", "DE"]),
  licenceNumber: z.string().min(2, "Licence number is required"),
  licenceExpiry: z.string().optional(),
  medicalExpiry: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  comesaDriverPermitExpiry: z.string().optional(),
  defaultTruckId: z.string().optional(),
  hireDate: z.string().optional(),
  notes: z.string().optional(),
});
export type DriverCreateInput = z.infer<typeof driverCreateSchema>;

export const supplierCreateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().min(7, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  kraPin: z.string().optional(),
  paymentTerms: z.enum(["cash_on_delivery", "net_7", "net_14", "net_30", "net_60"]).default("net_30"),
  defaultPaymentMethod: z.enum(["mpesa", "bank", "cash"]).default("mpesa"),
  mpesaNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  defaultExpenseCategory: z.string().optional(),
  notes: z.string().optional(),
});
export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
