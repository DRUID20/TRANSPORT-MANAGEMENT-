import { z } from "zod";

export const borderCreateSchema = z.object({
  tripId: z.string().min(1),
  postName: z.string().min(2),
  countryFrom: z.string().length(2),
  countryTo: z.string().length(2),
  status: z.enum(["approaching", "queued", "cleared", "rejected"]).default("approaching"),
  arrivedAt: z.string().optional(),
  axleLoadKg: z.coerce.number().nonnegative().optional(),
  transitPermitNumber: z.string().optional(),
  chargesKes: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export type BorderCreateInput = z.infer<typeof borderCreateSchema>;

export const borderClearSchema = z.object({
  borderId: z.string().min(1),
  axleLoadKg: z.coerce.number().nonnegative().optional(),
  transitPermitNumber: z.string().optional(),
  chargesKes: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export type BorderClearInput = z.infer<typeof borderClearSchema>;
