import { z } from "zod";

export const packCreateSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/, "Format YYYY-MM"),
});
export type PackCreateInput = z.infer<typeof packCreateSchema>;

export const packNarrativeSchema = z.object({
  id: z.string().min(1),
  narrative: z.string().default(""),
  highlights: z.string().default(""),
  risks: z.string().default(""),
});
export type PackNarrativeInput = z.infer<typeof packNarrativeSchema>;
