import { z } from "zod";

const currencyEnum = z.enum(["KES", "USD", "UGX"]);

export const billLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative(),
  expenseAccountCode: z.string().min(1, "Expense account required"),
});
export type BillLineInput = z.infer<typeof billLineSchema>;

export const billCreateSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  supplierRef: z.string().optional(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  currency: currencyEnum.default("KES"),
  fxRate: z.coerce.number().positive().default(1),
  taxRate: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
  lines: z.array(billLineSchema).min(1, "At least one line required"),
});
export type BillCreateInput = z.infer<typeof billCreateSchema>;

export const billPaymentSchema = z.object({
  billId: z.string().min(1),
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: currencyEnum.default("KES"),
  fxRate: z.coerce.number().positive().default(1),
  paymentMethod: z.enum(["bank", "mpesa", "mobile_money_ugx", "cash", "cheque"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
export type BillPaymentInput = z.infer<typeof billPaymentSchema>;
