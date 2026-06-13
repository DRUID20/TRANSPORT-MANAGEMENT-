/**
 * General Ledger repo — dual-mode (Postgres / mock store). Org-scoped.
 *
 * Posting is transactional: the entry, all of its lines, and the totals are
 * written in one transaction; if any line fails the entry is rolled back so
 * the GL is never half-posted. Reversal posts a swapped entry referencing
 * the original and flips its status to 'reversed'. Trial-balance + per-account
 * balance read the persisted lines and walk them in JS (read-mostly view).
 */
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import {
  chartOfAccounts as accountsTable,
  journalEntries as entriesTable,
  journalLines as linesTable,
} from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import {
  accountBalance as storeBalance,
  getJournalEntry as storeGet,
  ledgerLinesForAccount as storeLines,
  listJournalEntries as storeList,
  postJournalEntry as storePost,
  reverseJournalEntry as storeReverse,
  trialBalance as storeTB,
} from "@/server/store/mock-store";
import { increasesByDebit, type AccountClass } from "@/lib/types/accounts";
import type {
  Currency,
  JournalEntry,
  JournalEntryDetail,
  JournalLine,
  JournalReferenceType,
  JournalStatus,
  TrialBalanceRow,
} from "@/lib/types/ledger";

type EntryRow = typeof entriesTable.$inferSelect;
type LineRow = typeof linesTable.$inferSelect;

function toEntry(r: EntryRow): JournalEntry {
  return {
    id: r.id,
    number: r.number,
    date: r.date,
    memo: r.memo,
    referenceType: r.referenceType as JournalReferenceType,
    referenceId: r.referenceId ?? undefined,
    status: r.status as JournalStatus,
    postedBy: r.postedBy,
    postedAt: r.postedAt.toISOString(),
    reversalOf: r.reversalOf ?? undefined,
    reversedById: r.reversedById ?? undefined,
    totalDebitKes: Number(r.totalDebitKes),
    totalCreditKes: Number(r.totalCreditKes),
  };
}

function toLine(r: LineRow): JournalLine {
  return {
    id: r.id,
    journalEntryId: r.journalEntryId,
    accountId: r.accountId,
    accountCode: r.accountCode,
    accountName: r.accountName,
    originalDebit: Number(r.originalDebit),
    originalCredit: Number(r.originalCredit),
    currency: r.currency as Currency,
    fxRate: Number(r.fxRate),
    debitKes: Number(r.debitKes),
    creditKes: Number(r.creditKes),
    description: r.description ?? undefined,
  };
}

type PostInput = {
  date: string;
  memo: string;
  referenceType: JournalReferenceType;
  referenceId?: string;
  postedBy: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    currency: Currency;
    fxRate: number;
    description?: string;
  }>;
};

export async function listJournalEntries(filter?: {
  status?: JournalStatus;
  referenceType?: JournalReferenceType;
  fromDate?: string;
  toDate?: string;
}): Promise<JournalEntry[]> {
  if (IS_DEMO_MODE) return storeList(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(entriesTable.organizationId, orgId)];
  if (filter?.status) where.push(eq(entriesTable.status, filter.status));
  if (filter?.referenceType) where.push(eq(entriesTable.referenceType, filter.referenceType));
  if (filter?.fromDate) where.push(gte(entriesTable.date, filter.fromDate));
  if (filter?.toDate) where.push(lte(entriesTable.date, filter.toDate));
  const rows = await db.select().from(entriesTable).where(and(...where)).orderBy(desc(entriesTable.date));
  return rows.map(toEntry);
}

export async function getJournalEntry(id: string): Promise<JournalEntryDetail | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const entry = (
    await db
      .select()
      .from(entriesTable)
      .where(and(eq(entriesTable.id, id), eq(entriesTable.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!entry) return undefined;
  const lines = await db
    .select()
    .from(linesTable)
    .where(eq(linesTable.journalEntryId, id))
    .orderBy(linesTable.accountCode);
  return { ...toEntry(entry), lines: lines.map(toLine) };
}

export async function ledgerLinesForAccount(
  accountId: string,
  range?: { fromDate?: string; toDate?: string },
): Promise<Array<JournalLine & { entry: JournalEntry }>> {
  if (IS_DEMO_MODE) return storeLines(accountId, range);
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(entriesTable.organizationId, orgId), eq(entriesTable.status, "posted")];
  if (range?.fromDate) where.push(gte(entriesTable.date, range.fromDate));
  if (range?.toDate) where.push(lte(entriesTable.date, range.toDate));
  const entries = await db.select().from(entriesTable).where(and(...where));
  if (entries.length === 0) return [];
  const lines = await db
    .select()
    .from(linesTable)
    .where(and(eq(linesTable.accountId, accountId), inArray(linesTable.journalEntryId, entries.map((e) => e.id))));
  const byEntry = new Map(entries.map((e) => [e.id, toEntry(e)]));
  return lines
    .map((l) => ({ ...toLine(l), entry: byEntry.get(l.journalEntryId)! }))
    .filter((l) => !!l.entry)
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date));
}

export async function accountBalance(
  accountId: string,
  range?: { fromDate?: string; toDate?: string },
): Promise<{
  debitKes: number;
  creditKes: number;
  balanceKes: number;
  balanceSide: "Debit" | "Credit";
  count: number;
}> {
  if (IS_DEMO_MODE) return storeBalance(accountId, range);
  const db = getDb();
  const orgId = await requireOrgId();
  const acc = (
    await db
      .select()
      .from(accountsTable)
      .where(and(eq(accountsTable.id, accountId), eq(accountsTable.organizationId, orgId)))
      .limit(1)
  )[0];
  const lines = await ledgerLinesForAccount(accountId, range);
  const debitKes = lines.reduce((s, l) => s + l.debitKes, 0);
  const creditKes = lines.reduce((s, l) => s + l.creditKes, 0);
  const debitNormal = acc ? increasesByDebit(acc.class as AccountClass) : true;
  const balanceKes = debitNormal ? debitKes - creditKes : creditKes - debitKes;
  return { debitKes, creditKes, balanceKes, balanceSide: debitNormal ? "Debit" : "Credit", count: lines.length };
}

export async function trialBalance(range?: {
  fromDate?: string;
  toDate?: string;
}): Promise<TrialBalanceRow[]> {
  if (IS_DEMO_MODE) return storeTB(range);
  const db = getDb();
  const orgId = await requireOrgId();
  // Fetch posted entries + their lines in the window, then aggregate per account.
  const entryWhere = [eq(entriesTable.organizationId, orgId), eq(entriesTable.status, "posted")];
  if (range?.fromDate) entryWhere.push(gte(entriesTable.date, range.fromDate));
  if (range?.toDate) entryWhere.push(lte(entriesTable.date, range.toDate));
  const entries = await db.select().from(entriesTable).where(and(...entryWhere));
  if (entries.length === 0) return [];
  const entryIds = entries.map((e) => e.id);
  const lines = await db.select().from(linesTable).where(inArray(linesTable.journalEntryId, entryIds));
  const accs = await db.select().from(accountsTable).where(eq(accountsTable.organizationId, orgId));
  const byId = new Map(accs.map((a) => [a.id, a]));
  const totals = new Map<string, { dr: number; cr: number }>();
  for (const l of lines) {
    const cur = totals.get(l.accountId) ?? { dr: 0, cr: 0 };
    cur.dr += Number(l.debitKes);
    cur.cr += Number(l.creditKes);
    totals.set(l.accountId, cur);
  }
  const rows: TrialBalanceRow[] = [];
  for (const [accountId, { dr, cr }] of totals) {
    if (dr === 0 && cr === 0) continue;
    const acc = byId.get(accountId);
    if (!acc) continue;
    const debitNormal = increasesByDebit(acc.class as AccountClass);
    const balanceKes = debitNormal ? dr - cr : cr - dr;
    rows.push({
      accountId,
      code: acc.code,
      name: acc.name,
      class: acc.class as AccountClass,
      debitKes: dr,
      creditKes: cr,
      balanceKes,
      balanceSide: debitNormal ? "Debit" : "Credit",
    });
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

/** Post a balanced journal entry transactionally; returns the created entry. */
export async function postJournalEntry(input: PostInput): Promise<JournalEntry | { error: string }> {
  if (IS_DEMO_MODE) return storePost(input);
  const dr = input.lines.reduce((s, l) => s + l.debit * l.fxRate, 0);
  const cr = input.lines.reduce((s, l) => s + l.credit * l.fxRate, 0);
  if (Math.abs(dr - cr) > 0.01) {
    return { error: `Out of balance: Dr KSh ${dr.toFixed(2)} vs Cr KSh ${cr.toFixed(2)}` };
  }
  if (input.lines.length < 2) return { error: "At least two lines required" };
  for (const l of input.lines) {
    if (l.debit > 0 && l.credit > 0) return { error: "Line cannot have both debit and credit" };
  }
  const db = getDb();
  const orgId = await requireOrgId();
  const accIds = Array.from(new Set(input.lines.map((l) => l.accountId)));
  const accs = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.organizationId, orgId), inArray(accountsTable.id, accIds)));
  const byId = new Map(accs.map((a) => [a.id, a]));
  for (const l of input.lines) if (!byId.has(l.accountId)) return { error: `Account ${l.accountId} not found` };

  const totalDebitKes = Math.round(input.lines.reduce((s, l) => s + l.debit * l.fxRate, 0) * 100) / 100;
  const totalCreditKes = Math.round(input.lines.reduce((s, l) => s + l.credit * l.fxRate, 0) * 100) / 100;
  const number = await nextDocumentNumber(orgId, "JE", "journal", 5);
  const entryRow = await db.transaction(async (tx) => {
    const e = (
      await tx
        .insert(entriesTable)
        .values({
          organizationId: orgId,
          number,
          date: input.date,
          memo: input.memo,
          referenceType: input.referenceType,
          referenceId: input.referenceId ?? null,
          status: "posted",
          postedBy: input.postedBy,
          totalDebitKes: String(totalDebitKes),
          totalCreditKes: String(totalCreditKes),
        })
        .returning()
    )[0]!;
    for (const l of input.lines) {
      const acc = byId.get(l.accountId)!;
      const debitKes = Math.round(l.debit * l.fxRate * 100) / 100;
      const creditKes = Math.round(l.credit * l.fxRate * 100) / 100;
      await tx.insert(linesTable).values({
        journalEntryId: e.id,
        accountId: l.accountId,
        accountCode: acc.code,
        accountName: acc.name,
        originalDebit: String(l.debit),
        originalCredit: String(l.credit),
        currency: l.currency,
        fxRate: String(l.fxRate),
        debitKes: String(debitKes),
        creditKes: String(creditKes),
        description: l.description ?? null,
      });
    }
    return e;
  });
  return toEntry(entryRow);
}

export async function reverseJournalEntry(input: {
  entryId: string;
  postedBy: string;
}): Promise<JournalEntry | { error: string }> {
  if (IS_DEMO_MODE) return storeReverse(input);
  const original = await getJournalEntry(input.entryId);
  if (!original) return { error: "Entry not found" };
  if (original.status !== "posted") return { error: "Only posted entries can be reversed" };
  const swappedLines = original.lines.map((l) => ({
    accountId: l.accountId,
    debit: l.originalCredit,
    credit: l.originalDebit,
    currency: l.currency,
    fxRate: l.fxRate,
    description: `Reversal of ${original.number}`,
  }));
  const reversal = await postJournalEntry({
    date: new Date().toISOString().slice(0, 10),
    memo: `Reversal of ${original.number}: ${original.memo}`,
    referenceType: "reversal",
    referenceId: original.id,
    postedBy: input.postedBy,
    lines: swappedLines,
  });
  if ("error" in reversal) return reversal;

  const db = getDb();
  const orgId = await requireOrgId();
  await db
    .update(entriesTable)
    .set({ status: "reversed", reversedById: reversal.id })
    .where(and(eq(entriesTable.id, original.id), eq(entriesTable.organizationId, orgId)));
  await db
    .update(entriesTable)
    .set({ reversalOf: original.id })
    .where(and(eq(entriesTable.id, reversal.id), eq(entriesTable.organizationId, orgId)));
  return { ...reversal, reversalOf: original.id };
}

// silence unused-import warning when this file is type-checked
void asc;
