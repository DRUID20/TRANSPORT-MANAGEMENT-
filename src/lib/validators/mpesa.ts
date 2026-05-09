import { z } from "zod";

/** Loose Kenyan phone number: +2547xxxxxxxx, 07xxxxxxxx, 2547xxxxxxxx. */
const phonePattern = /^(\+?254|0)?7\d{8}$/;

export const mpesaSendSchema = z.object({
  type: z.enum(["driver_advance", "reimbursement", "supplier_payment"]),
  recipient: z.string().regex(phonePattern, "Use a valid Kenyan phone (+2547xxxxxxxx)"),
  recipientName: z.string().optional(),
  amountKes: z.coerce.number().positive().max(150_000, "Daraja per-tx cap is KSh 150,000"),
  tripId: z.string().optional(),
  expenseId: z.string().optional(),
  driverId: z.string().optional(),
  supplierId: z.string().optional(),
  initiatedBy: z.string().default("Dispatcher"),
  notes: z.string().optional(),
});
export type MpesaSendInput = z.infer<typeof mpesaSendSchema>;

/** Normalise to canonical +2547xxxxxxxx. */
export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "+254" + digits.slice(1);
  if (digits.startsWith("254") && digits.length === 12) return "+" + digits;
  if (digits.length === 9) return "+254" + digits;
  return input.startsWith("+") ? input : "+" + digits;
}
