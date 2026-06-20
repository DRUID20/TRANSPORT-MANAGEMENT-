"use server";

import { revalidatePath } from "next/cache";
import {
  bankReconSummary as repoSummary,
  createBankStatementTx as repoCreate,
  deleteBankStatementTx as repoDelete,
  listBankAccounts as repoBankAccounts,
  listBankStatementTxs as repoList,
  matchBankStatementTx as repoMatch,
  unmatchBankStatementTx as repoUnmatch,
  unmatchedGlLinesForAccount as repoUnmatchedGl,
} from "@/server/repos/bank";
import { logAudit } from "@/server/auth/audit";
import {
  bankMatchSchema,
  bankTxCreateSchema,
  type BankMatchInput,
  type BankTxCreateInput,
} from "@/lib/validators/bank";

export async function listBankAccounts() {
  return repoBankAccounts();
}

export async function listBankStatementTxs(accountCode: string) {
  return repoList(accountCode);
}

export async function unmatchedGlLines(accountCode: string) {
  return repoUnmatchedGl(accountCode);
}

export async function bankReconSummary(accountCode: string) {
  return repoSummary(accountCode);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createBankStatementTx(input: BankTxCreateInput): Promise<ActionResult> {
  const parsed = bankTxCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = await repoCreate(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  await logAudit({ entityType: "bank_statement_tx", entityId: result.id, action: "create" });
  revalidatePath(`/bank/${parsed.data.accountCode}`);
  return { ok: true, id: result.id };
}

export async function matchBankTx(input: BankMatchInput): Promise<ActionResult> {
  const parsed = bankMatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = await repoMatch(parsed.data.bankTxId, parsed.data.journalLineId);
  if ("error" in result) return { ok: false, error: result.error };
  await logAudit({ entityType: "bank_statement_tx", entityId: result.id, action: "match" });
  revalidatePath(`/bank/${result.accountCode}`);
  return { ok: true, id: result.id };
}

export async function unmatchBankTx(bankTxId: string): Promise<ActionResult> {
  const result = await repoUnmatch(bankTxId);
  if ("error" in result) return { ok: false, error: result.error };
  await logAudit({ entityType: "bank_statement_tx", entityId: result.id, action: "unmatch" });
  revalidatePath(`/bank/${result.accountCode}`);
  return { ok: true, id: result.id };
}

export async function deleteBankStatementTx(bankTxId: string): Promise<ActionResult> {
  const ok = await repoDelete(bankTxId);
  if (!ok) return { ok: false, error: "Not found" };
  await logAudit({ entityType: "bank_statement_tx", entityId: bankTxId, action: "delete" });
  revalidatePath("/bank");
  return { ok: true, id: bankTxId };
}
