import { z } from "zod";

const currencyEnum = z.enum(["KES", "USD", "UGX", "TZS", "RWF", "EUR", "GBP", "ZAR"]);

export const bankTxCreateSchema = z
  .object({
    accountCode: z.string().min(1),
    date: z.string().min(1),
    description: z.string().min(1, "Description required"),
    reference: z.string().optional(),
    debit: z.coerce.number().nonnegative().default(0),
    credit: z.coerce.number().nonnegative().default(0),
    currency: currencyEnum.default("KES"),
    notes: z.string().optional(),
  })
  .refine((v) => v.debit > 0 || v.credit > 0, {
    message: "Either debit or credit must be > 0",
  })
  .refine((v) => !(v.debit > 0 && v.credit > 0), {
    message: "Cannot have both debit and credit",
  });
export type BankTxCreateInput = z.infer<typeof bankTxCreateSchema>;

export const bankMatchSchema = z.object({
  bankTxId: z.string().min(1),
  journalLineId: z.string().min(1),
});
export type BankMatchInput = z.infer<typeof bankMatchSchema>;
