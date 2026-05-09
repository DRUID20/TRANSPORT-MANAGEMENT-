"use server";

import { revalidatePath } from "next/cache";
import {
  accountBalance as storeBalance,
  getJournalEntry,
  ledgerLinesForAccount as storeLines,
  listJournalEntries as storeList,
  postJournalEntry,
  reverseJournalEntry as storeReverse,
  trialBalance as storeTrialBalance,
} from "@/server/store/mock-store";
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
  return storeList(filter);
}

export async function getJournalEntryById(id: string) {
  return getJournalEntry(id);
}

export async function ledgerLinesForAccount(
  accountId: string,
  range?: { fromDate?: string; toDate?: string },
) {
  return storeLines(accountId, range);
}

export async function accountBalance(
  accountId: string,
  range?: { fromDate?: string; toDate?: string },
) {
  return storeBalance(accountId, range);
}

export async function trialBalance(range?: { fromDate?: string; toDate?: string }) {
  return storeTrialBalance(range);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function postJournal(input: JournalEntryCreateInput): Promise<ActionResult> {
  const parsed = journalEntryCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = postJournalEntry(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/ledger");
  revalidatePath("/ledger/trial-balance");
  for (const line of parsed.data.lines) {
    revalidatePath(`/accounts/${line.accountId}`);
  }
  return { ok: true, id: result.id };
}

export async function reverseJournal(entryId: string): Promise<ActionResult> {
  const result = storeReverse({ entryId, postedBy: "Finance" });
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/ledger");
  revalidatePath(`/ledger/${entryId}`);
  revalidatePath("/ledger/trial-balance");
  return { ok: true, id: result.id };
}
