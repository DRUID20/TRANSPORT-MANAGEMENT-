"use server";

import { revalidatePath } from "next/cache";
import {
  accountBalance as repoBalance,
  getJournalEntry,
  ledgerLinesForAccount as repoLines,
  listJournalEntries as repoList,
  postJournalEntry,
  reverseJournalEntry as repoReverse,
  trialBalance as repoTrialBalance,
} from "@/server/repos/ledger";
import { logAudit } from "@/server/auth/audit";
import { PermissionError, requireCapability } from "@/server/auth/permissions";
import type { JournalReferenceType, JournalStatus } from "@/lib/types/ledger";
import {
  journalEntryCreateSchema,
  type JournalEntryCreateInput,
} from "@/lib/validators/ledger";

export async function listJournalEntries(filter?: {
  status?: JournalStatus;
  referenceType?: JournalReferenceType;
  fromDate?: string;
  toDate?: string;
}) {
  return repoList(filter);
}

export async function getJournalEntryById(id: string) {
  return getJournalEntry(id);
}

export async function ledgerLinesForAccount(
  accountId: string,
  range?: { fromDate?: string; toDate?: string },
) {
  return repoLines(accountId, range);
}

export async function accountBalance(
  accountId: string,
  range?: { fromDate?: string; toDate?: string },
) {
  return repoBalance(accountId, range);
}

export async function trialBalance(range?: { fromDate?: string; toDate?: string }) {
  return repoTrialBalance(range);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function postJournal(input: JournalEntryCreateInput): Promise<ActionResult> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const parsed = journalEntryCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = await postJournalEntry(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  await logAudit({
    entityType: "journal_entry",
    entityId: result.id,
    action: "post",
    diff: { memo: { from: null, to: parsed.data.memo } },
  });
  revalidatePath("/ledger");
  revalidatePath("/ledger/trial-balance");
  for (const line of parsed.data.lines) {
    revalidatePath(`/accounts/${line.accountId}`);
  }
  return { ok: true, id: result.id };
}

export async function reverseJournal(entryId: string): Promise<ActionResult> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const result = await repoReverse({ entryId, postedBy: "Finance" });
  if ("error" in result) return { ok: false, error: result.error };
  await logAudit({ entityType: "journal_entry", entityId: entryId, action: "reverse" });
  revalidatePath("/ledger");
  revalidatePath(`/ledger/${entryId}`);
  revalidatePath("/ledger/trial-balance");
  return { ok: true, id: result.id };
}
