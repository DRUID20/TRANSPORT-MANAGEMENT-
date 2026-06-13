/**
 * Bank reconciliation repo — dual-mode (Postgres / mock store). Org-scoped.
 *
 * Bank statement transactions are independent rows; matching them to a posted
 * journal line on the same account flips status to 'matched' and stamps the
 * matchedJournalLineId. Sanity checks (same account, same amount, no double
 * matching) are enforced before the update.
 */
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import {
  bankStatementTransactions as table,
  chartOfAccounts as accountsTable,
  journalEntries as entriesTable,
  journalLines as linesTable,
} from "@/server/db/schema";
import { getAccountByCode } from "@/server/repos/accounts";
import {
  bankReconSummary as storeSummary,
  createBankStatementTx as storeCreate,
  deleteBankStatementTx as storeDelete,
  listBankAccounts as storeAccs,
  listBankStatementTxs as storeList,
  matchBankStatementTx as storeMatch,
  unmatchBankStatementTx as storeUnmatch,
  unmatchedGlLinesForAccount as storeUnmatchedGl,
} from "@/server/store/mock-store";
import type { Account } from "@/lib/types/accounts";
import type { BankReconStatus, BankStatementTransaction } from "@/lib/types/bank";
import type { Currency, JournalLine } from "@/lib/types/ledger";

type Row = typeof table.$inferSelect;

function toTx(r: Row): BankStatementTransaction {
  return {
    id: r.id,
    accountCode: r.accountCode,
    date: r.date,
    description: r.description,
    reference: r.reference ?? undefined,
    debit: Number(r.debit),
    credit: Number(r.credit),
    currency: r.currency as Currency,
    status: r.status as BankReconStatus,
    matchedJournalLineId: r.matchedJournalLineId ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listBankAccounts(): Promise<Account[]> {
  if (IS_DEMO_MODE) return storeAccs();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db.select().from(accountsTable).where(eq(accountsTable.organizationId, orgId));
  return rows
    .filter((a) => a.type === "Bank" || a.type === "Cash" || a.type === "Mobile Money")
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      class: a.class as Account["class"],
      group: a.group,
      type: a.type,
      normalBalance: a.normalBalance as Account["normalBalance"],
      currency: a.currency,
      status: a.status as Account["status"],
      notes: a.notes ?? undefined,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function listBankStatementTxs(accountCode: string): Promise<BankStatementTransaction[]> {
  if (IS_DEMO_MODE) return storeList(accountCode);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.organizationId, orgId), eq(table.accountCode, accountCode)))
    .orderBy(desc(table.date));
  return rows.map(toTx);
}

export async function getBankStatementTx(id: string): Promise<BankStatementTransaction | undefined> {
  if (IS_DEMO_MODE) return undefined;
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toTx(rows[0]) : undefined;
}

export async function createBankStatementTx(input: {
  accountCode: string;
  date: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  currency: Currency;
  notes?: string;
}): Promise<BankStatementTransaction | { error: string }> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const acc = await getAccountByCode(input.accountCode);
  if (!acc) return { error: "Account not in CoA" };
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      accountCode: input.accountCode,
      date: input.date,
      description: input.description,
      reference: input.reference ?? null,
      debit: String(input.debit),
      credit: String(input.credit),
      currency: input.currency,
      status: "unmatched",
      notes: input.notes ?? null,
    })
    .returning();
  return toTx(rows[0]!);
}

export async function deleteBankStatementTx(id: string): Promise<boolean> {
  if (IS_DEMO_MODE) return storeDelete(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning({ id: table.id });
  return rows.length > 0;
}

export async function matchBankStatementTx(
  bankTxId: string,
  journalLineId: string,
): Promise<BankStatementTransaction | { error: string }> {
  if (IS_DEMO_MODE) return storeMatch(bankTxId, journalLineId);
  const db = getDb();
  const orgId = await requireOrgId();
  const tx = (
    await db
      .select()
      .from(table)
      .where(and(eq(table.id, bankTxId), eq(table.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!tx) return { error: "Bank tx not found" };
  if (tx.status === "matched") return { error: "Already matched" };
  const line = (
    await db.select().from(linesTable).where(eq(linesTable.id, journalLineId)).limit(1)
  )[0];
  if (!line) return { error: "Journal line not found" };
  // sanity: same account
  const acc = (
    await db.select().from(accountsTable).where(eq(accountsTable.id, line.accountId)).limit(1)
  )[0];
  if (!acc || acc.code !== tx.accountCode) return { error: "Journal line is not on this bank account" };
  // sanity: amounts match
  const txNet = Number(tx.debit) - Number(tx.credit);
  const lineNet = Number(line.originalDebit) - Number(line.originalCredit);
  if (Math.abs(txNet - lineNet) > 0.01) return { error: `Amounts don't match: bank ${txNet} vs GL ${lineNet}` };
  // sanity: line not already matched to another tx
  const existing = await db
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.organizationId, orgId),
        eq(table.matchedJournalLineId, journalLineId),
        ne(table.id, bankTxId),
      ),
    );
  if (existing.length > 0) return { error: "Journal line already matched to another bank tx" };
  const updated = (
    await db
      .update(table)
      .set({ status: "matched", matchedJournalLineId: journalLineId })
      .where(eq(table.id, bankTxId))
      .returning()
  )[0]!;
  return toTx(updated);
}

export async function unmatchBankStatementTx(
  bankTxId: string,
): Promise<BankStatementTransaction | { error: string }> {
  if (IS_DEMO_MODE) return storeUnmatch(bankTxId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(table)
    .set({ status: "unmatched", matchedJournalLineId: null })
    .where(and(eq(table.id, bankTxId), eq(table.organizationId, orgId)))
    .returning();
  if (!rows[0]) return { error: "Bank tx not found" };
  return toTx(rows[0]);
}

export async function unmatchedGlLinesForAccount(accountCode: string): Promise<JournalLine[]> {
  if (IS_DEMO_MODE) return storeUnmatchedGl(accountCode);
  const db = getDb();
  const orgId = await requireOrgId();
  const acc = await getAccountByCode(accountCode);
  if (!acc) return [];
  // Posted entries in this org
  const posted = await db
    .select({ id: entriesTable.id })
    .from(entriesTable)
    .where(and(eq(entriesTable.organizationId, orgId), eq(entriesTable.status, "posted")));
  if (posted.length === 0) return [];
  const allLines = await db
    .select()
    .from(linesTable)
    .where(
      and(eq(linesTable.accountId, acc.id), inArray(linesTable.journalEntryId, posted.map((p) => p.id))),
    );
  // Subtract matched ones
  const matched = new Set(
    (
      await db
        .select({ id: table.matchedJournalLineId })
        .from(table)
        .where(and(eq(table.organizationId, orgId), eq(table.accountCode, accountCode)))
    )
      .map((r) => r.id)
      .filter((x): x is string => !!x),
  );
  return allLines
    .filter((l) => !matched.has(l.id))
    .map((l) => ({
      id: l.id,
      journalEntryId: l.journalEntryId,
      accountId: l.accountId,
      accountCode: l.accountCode,
      accountName: l.accountName,
      originalDebit: Number(l.originalDebit),
      originalCredit: Number(l.originalCredit),
      currency: l.currency as Currency,
      fxRate: Number(l.fxRate),
      debitKes: Number(l.debitKes),
      creditKes: Number(l.creditKes),
      description: l.description ?? undefined,
    }));
}

export async function bankReconSummary(accountCode: string): Promise<{
  accountCode: string;
  accountName: string;
  currency: Currency;
  statementBalance: number;
  glBalance: number;
  difference: number;
  unmatchedStatementCount: number;
  unmatchedGlCount: number;
} | null> {
  if (IS_DEMO_MODE) return storeSummary(accountCode);
  const acc = await getAccountByCode(accountCode);
  if (!acc) return null;
  const [txs, unmatchedGl] = await Promise.all([
    listBankStatementTxs(accountCode),
    unmatchedGlLinesForAccount(accountCode),
  ]);
  const statementBalance = txs.reduce((s, t) => s + (t.debit - t.credit), 0);
  const db = getDb();
  const orgId = await requireOrgId();
  const posted = await db
    .select({ id: entriesTable.id })
    .from(entriesTable)
    .where(and(eq(entriesTable.organizationId, orgId), eq(entriesTable.status, "posted")));
  const glPosted = posted.length
    ? await db
        .select()
        .from(linesTable)
        .where(and(eq(linesTable.accountId, acc.id), inArray(linesTable.journalEntryId, posted.map((p) => p.id))))
    : [];
  const glBalance = glPosted.reduce(
    (s, l) => s + (Number(l.originalDebit) - Number(l.originalCredit)),
    0,
  );
  return {
    accountCode,
    accountName: acc.name,
    currency: acc.currency as Currency,
    statementBalance,
    glBalance,
    difference: statementBalance - glBalance,
    unmatchedStatementCount: txs.filter((t) => t.status === "unmatched").length,
    unmatchedGlCount: unmatchedGl.length,
  };
}
