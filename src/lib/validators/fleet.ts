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
