import { z } from "zod";

const currencyEnum = z.enum(["KES", "USD", "UGX", "TZS", "RWF", "EUR", "GBP", "ZAR"]);

export const invoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative(),
  revenueAccountCode: z.string().optional(),
});
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

export const invoiceCreateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  tripId: z.string().optional(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  currency: currencyEnum.default("KES"),
  fxRate: z.coerce.number().positive().default(1),
  taxRate: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1, "At least one line item required"),
});
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;

export const paymentRecordSchema = z.object({
  invoiceId: z.string().min(1),
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: currencyEnum.default("KES"),
  fxRate: z.coerce.number().positive().default(1),
  paymentMethod: z.enum(["bank", "mpesa", "cash", "cheque"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>;
