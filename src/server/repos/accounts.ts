/** Chart of Accounts repo — dual-mode. Org-scoped, read-mostly (seed by ops). */
import { and, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { chartOfAccounts as table } from "@/server/db/schema";
import {
  accountClassCounts as storeCounts,
  getAccount as storeGet,
  getAccountByCode as storeGetByCode,
  listAccounts as storeList,
} from "@/server/store/mock-store";
import type {
  Account,
  AccountClass,
  AccountStatus,
  NormalBalance,
} from "@/lib/types/accounts";

type Row = typeof table.$inferSelect;

function toAccount(r: Row): Account {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    class: r.class as AccountClass,
    group: r.group,
    type: r.type,
    normalBalance: r.normalBalance as NormalBalance,
    currency: r.currency,
    status: r.status as AccountStatus,
    notes: r.notes ?? undefined,
  };
}

export async function listAccounts(filter?: {
  class?: AccountClass;
  status?: AccountStatus;
  search?: string;
}): Promise<Account[]> {
  if (IS_DEMO_MODE) return storeList(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db.select().from(table).where(eq(table.organizationId, orgId));
  let all = rows.map(toAccount).sort((a, b) => a.code.localeCompare(b.code));
  if (filter?.class) all = all.filter((a) => a.class === filter.class);
  if (filter?.status) all = all.filter((a) => a.status === filter.status);
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    all = all.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q),
    );
  }
  return all;
}

export async function getAccount(id: string): Promise<Account | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toAccount(rows[0]) : undefined;
}

export async function getAccountByCode(code: string): Promise<Account | undefined> {
  if (IS_DEMO_MODE) return storeGetByCode(code);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.code, code), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toAccount(rows[0]) : undefined;
}

export async function accountClassCounts(): Promise<
  Array<{ class: AccountClass; count: number }>
> {
  if (IS_DEMO_MODE) return storeCounts();
  const accounts = await listAccounts();
  const map = new Map<AccountClass, number>();
  for (const a of accounts) map.set(a.class, (map.get(a.class) ?? 0) + 1);
  return Array.from(map.entries()).map(([c, count]) => ({ class: c, count }));
}
