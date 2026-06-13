import { z } from "zod";

const currencyEnum = z.enum(["KES", "USD", "UGX"]);

export const journalLineInputSchema = z
  .object({
    accountId: z.string().min(1, "Account is required"),
    debit: z.coerce.number().nonnegative().default(0),
    credit: z.coerce.number().nonnegative().default(0),
    currency: currencyEnum.default("KES"),
    /** FX rate to KES; 1 if KES. */
    fxRate: z.coerce.number().positive().default(1),
    description: z.string().optional(),
  })
  .refine((v) => v.debit > 0 || v.credit > 0, {
    message: "Each line must have a debit or credit amount > 0",
  })
  .refine((v) => !(v.debit > 0 && v.credit > 0), {
    message: "A line cannot have both debit and credit",
  });

export type JournalLineInput = z.infer<typeof journalLineInputSchema>;

export const journalEntryCreateSchema = z
  .object({
    date: z.string().min(1),
    memo: z.string().min(2, "Memo is required"),
    referenceType: z
      .enum([
        "manual",
        "opening_balance",
        "trip",
        "expense",
        "fuel",
        "mpesa",
        "invoice",
        "bill",
        "payment",
        "fx_revaluation",
        "depreciation",
        "reversal",
      ])
      .default("manual"),
    referenceId: z.string().optional(),
    postedBy: z.string().default("Finance"),
    lines: z.array(journalLineInputSchema).min(2, "At least two lines required"),
  })
  .refine(
    (v) => {
      // Sum of (debit*fxRate) must equal sum of (credit*fxRate) — KES balance.
      const dr = v.lines.reduce((s, l) => s + l.debit * l.fxRate, 0);
      const cr = v.lines.reduce((s, l) => s + l.credit * l.fxRate, 0);
      return Math.abs(dr - cr) < 0.01;
    },
    {
      message: "Total debits must equal total credits (in KES)",
      path: ["lines"],
    },
  );

export type JournalEntryCreateInput = z.infer<typeof journalEntryCreateSchema>;
