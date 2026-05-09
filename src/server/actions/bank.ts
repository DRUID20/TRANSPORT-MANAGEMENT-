"use server";

import { revalidatePath } from "next/cache";
import {
  bankReconSummary as storeSummary,
  createBankStatementTx as storeCreate,
  deleteBankStatementTx as storeDelete,
  listBankAccounts as storeBankAccounts,
  listBankStatementTxs as storeList,
  matchBankStatementTx as storeMatch,
  unmatchBankStatementTx as storeUnmatch,
  unmatchedGlLinesForAccount as storeUnmatchedGl,
} from "@/server/store/mock-store";
import {
  bankMatchSchema,
  bankTxCreateSchema,
  type BankMatchInput,
  type BankTxCreateInput,
} from "@/lib/validators/bank";

export async function listBankAccounts() {
  return storeBankAccounts();
}

export async function listBankStatementTxs(accountCode: string) {
  return storeList(accountCode);
}

export async function unmatchedGlLines(accountCode: string) {
  return storeUnmatchedGl(accountCode);
}

export async function bankReconSummary(accountCode: string) {
  return storeSummary(accountCode);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createBankStatementTx(input: BankTxCreateInput): Promise<ActionResult> {
  const parsed = bankTxCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = storeCreate(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath(`/bank/${parsed.data.accountCode}`);
  return { ok: true, id: result.id };
}

export async function matchBankTx(input: BankMatchInput): Promise<ActionResult> {
  const parsed = bankMatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = storeMatch(parsed.data.bankTxId, parsed.data.journalLineId);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath(`/bank/${result.accountCode}`);
  return { ok: true, id: result.id };
}

export async function unmatchBankTx(bankTxId: string): Promise<ActionResult> {
  const result = storeUnmatch(bankTxId);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath(`/bank/${result.accountCode}`);
  return { ok: true, id: result.id };
}

export async function deleteBankStatementTx(bankTxId: string): Promise<ActionResult> {
  const ok = storeDelete(bankTxId);
  if (!ok) return { ok: false, error: "Not found" };
  revalidatePath("/bank");
  return { ok: true, id: bankTxId };
}
