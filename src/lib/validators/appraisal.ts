import { z } from "zod";

export const cycleCreateSchema = z.object({
  label: z.string().min(1),
  year: z.coerce.number().int().min(2020).max(2100),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  notes: z.string().optional(),
});
export type CycleCreateInput = z.infer<typeof cycleCreateSchema>;

const goalSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(2),
  target: z.string().optional(),
  selfRating: z.coerce.number().min(0).max(100).optional(),
  managerRating: z.coerce.number().min(0).max(100).optional(),
});

const compSchema = z.object({
  competency: z.string().min(1),
  selfRating: z.coerce.number().int().min(1).max(5).optional(),
  managerRating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
});

export const reviewUpdateSchema = z.object({
  cycleId: z.string().min(1),
  employeeId: z.string().min(1),
  goals: z.array(goalSchema).default([]),
  competencies: z.array(compSchema).default([]),
  overallRating: z.coerce.number().int().min(1).max(5).optional(),
  employeeComment: z.string().optional(),
  managerComment: z.string().optional(),
  hrComment: z.string().optional(),
  recommendation: z.enum(["promote", "increment", "training", "pip", "none"]).optional(),
  proposedIncrementPct: z.coerce.number().min(0).max(100).optional(),
});
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;
