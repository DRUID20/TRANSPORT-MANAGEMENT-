import { z } from "zod";

const currencyEnum = z.enum(["KES", "USD", "UGX"]);

export const payrollPeriodCreateSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/, "Format YYYY-MM"),
  notes: z.string().optional(),
});
export type PayrollPeriodCreateInput = z.infer<typeof payrollPeriodCreateSchema>;

export const payrollInputUpdateSchema = z.object({
  periodId: z.string().min(1),
  employeeId: z.string().min(1),
  basicSalary: z.coerce.number().nonnegative(),
  overtimeHours: z.coerce.number().nonnegative().default(0),
  overtimeRate: z.coerce.number().nonnegative().default(0),
  bonus: z.coerce.number().nonnegative().default(0),
  otherDeductions: z.coerce.number().nonnegative().default(0),
  loanRecovery: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
});
export type PayrollInputUpdateInput = z.infer<typeof payrollInputUpdateSchema>;

export const loanCreateSchema = z.object({
  employeeId: z.string().min(1),
  principal: z.coerce.number().positive(),
  currency: currencyEnum.default("KES"),
  disbursedDate: z.string().min(1),
  termMonths: z.coerce.number().int().positive(),
  monthlyRecovery: z.coerce.number().positive(),
  interestRate: z.coerce.number().nonnegative().default(0),
  reason: z.string().optional(),
  notes: z.string().optional(),
});
export type LoanCreateInput = z.infer<typeof loanCreateSchema>;
