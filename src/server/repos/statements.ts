/**
 * Account statements (AR / AP) — chronological transaction ledger with a
 * running balance, opening balance (net of everything strictly before the
 * from-date) and a closing balance. All amounts are normalised to KES base
 * (invoice/bill total × fxRate; each payment amount × its own fxRate).
 *
 * Customer statement (AR): invoices are DEBITS (increase what they owe),
 * receipts are CREDITS. Supplier statement (AP) mirrors it: bills are CREDITS
 * (increase what we owe), payments are DEBITS.
 *
 * Built on the existing AR/AP repos: list the party's non-draft/non-cancelled
 * documents, then gather each document's payments via getInvoice/getBill
 * (Promise.all) and merge into a single date-sorted list.
 */
import { getInvoice, listInvoices } from "@/server/repos/ar";
import { getBill, listBills } from "@/server/repos/ap";
import { getCustomer } from "@/server/repos/customers";
import { getSupplier } from "@/server/repos/suppliers";

export interface StatementRow {
  date: string;
  ref: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface Statement {
  name: string;
  openingBalance: number;
  rows: StatementRow[];
  closingBalance: number;
  totalOutstanding: number;
}

export interface StatementRange {
  fromDate?: string;
  toDate?: string;
}

/** A debit/credit movement before running-balance + window filtering. */
interface Movement {
  date: string;
  ref: string;
  description: string;
  debit: number;
  credit: number;
}

/** Default range: year-to-date (1 Jan of the current year → today). */
export function defaultStatementRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  return {
    fromDate: `${now.getFullYear()}-01-01`,
    toDate: now.toISOString().slice(0, 10),
  };
}

/**
 * Fold a list of dated movements into a statement: net everything strictly
 * before `fromDate` into the opening balance, attach a running balance to rows
 * inside the window, and close out. `sign` is +1 when a debit raises the
 * balance (AR) and -1 when a credit raises it (AP) — but to keep the running
 * balance intuitive we always show the balance from the party's perspective:
 * AR = receivable owed to us, AP = payable owed by us, both growing positive.
 */
function buildStatement(
  name: string,
  movements: Movement[],
  range: StatementRange,
  totalOutstanding: number,
): Statement {
  const sorted = [...movements].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0;
  });

  const { fromDate, toDate } = range;

  let openingBalance = 0;
  const rows: StatementRow[] = [];
  let running = 0;

  for (const m of sorted) {
    const net = m.debit - m.credit;
    if (fromDate && m.date < fromDate) {
      openingBalance += net;
      continue;
    }
    if (toDate && m.date > toDate) continue;
    running += net;
    rows.push({
      date: m.date,
      ref: m.ref,
      description: m.description,
      debit: m.debit,
      credit: m.credit,
      balance: openingBalance + running,
    });
  }

  const closingBalance = openingBalance + running;
  return {
    name,
    openingBalance: round2(openingBalance),
    rows: rows.map((r) => ({ ...r, balance: round2(r.balance) })),
    closingBalance: round2(closingBalance),
    totalOutstanding: round2(totalOutstanding),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Customer (AR) statement. Invoices debit; receipts credit. Balances in KES.
 * For balance correctness, opening balance nets *all* document movements
 * before the from-date, so the running balance is always the true receivable.
 */
export async function customerStatement(
  customerId: string,
  range: StatementRange = defaultStatementRange(),
): Promise<Statement> {
  const [customer, invoices] = await Promise.all([
    getCustomer(customerId),
    listInvoices({ customerId }),
  ]);
  const name = customer?.name ?? "Customer";

  // Only documents that actually post to AR (exclude drafts + cancelled).
  const relevant = invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled");

  const detailed = await Promise.all(relevant.map((i) => getInvoice(i.id)));

  const movements: Movement[] = [];
  let totalOutstanding = 0;
  for (const inv of detailed) {
    if (!inv) continue;
    const invoiceKes = inv.total * inv.fxRate;
    movements.push({
      date: inv.issueDate,
      ref: inv.number,
      description: `Invoice ${inv.number}`,
      debit: invoiceKes,
      credit: 0,
    });
    for (const p of inv.payments) {
      movements.push({
        date: p.date,
        ref: p.number,
        description: `Receipt ${p.number} · ${inv.number}`,
        debit: 0,
        credit: p.amount * p.fxRate,
      });
    }
    totalOutstanding += inv.balance * inv.fxRate;
  }

  return buildStatement(name, movements, range, totalOutstanding);
}

/**
 * Supplier (AP) statement. Bills credit (increase what we owe); payments debit.
 * Balance is shown as the payable owed by us, growing positive.
 */
export async function supplierStatement(
  supplierId: string,
  range: StatementRange = defaultStatementRange(),
): Promise<Statement> {
  const [supplier, bills] = await Promise.all([
    getSupplier(supplierId),
    listBills({ supplierId }),
  ]);
  const name = supplier?.name ?? "Supplier";

  const relevant = bills.filter((b) => b.status !== "draft" && b.status !== "cancelled");

  const detailed = await Promise.all(relevant.map((b) => getBill(b.id)));

  const movements: Movement[] = [];
  let totalOutstanding = 0;
  for (const bill of detailed) {
    if (!bill) continue;
    const billKes = bill.total * bill.fxRate;
    // AP: a bill is a CREDIT (grows the payable), a payment is a DEBIT. The
    // payable owed by us is shown positive, so the balances are negated after
    // buildStatement (which accumulates debit - credit).
    movements.push({
      date: bill.issueDate,
      ref: bill.number,
      description: `Bill ${bill.number}${bill.supplierRef ? ` · ${bill.supplierRef}` : ""}`,
      debit: 0,
      credit: billKes,
    });
    for (const p of bill.payments) {
      movements.push({
        date: p.date,
        ref: p.number,
        description: `Payment ${p.number} · ${bill.number}`,
        debit: p.amount * p.fxRate,
        credit: 0,
      });
    }
    totalOutstanding += bill.balance * bill.fxRate;
  }

  // For AP the payable grows on credits; buildStatement accumulates
  // (debit - credit), so negate to make the payable-owed balance positive.
  const stmt = buildStatement(name, movements, range, totalOutstanding);
  return {
    ...stmt,
    openingBalance: -stmt.openingBalance,
    closingBalance: -stmt.closingBalance,
    rows: stmt.rows.map((r) => ({ ...r, balance: -r.balance })),
  };
}
