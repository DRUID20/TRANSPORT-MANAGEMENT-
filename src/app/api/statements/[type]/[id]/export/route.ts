import { NextResponse } from "next/server";
import { requireOrgId } from "@/server/auth/current-org";

// exceljs needs Node APIs (Buffer/streams) — pin this route to the Node runtime.
export const runtime = "nodejs";

import {
  customerStatement,
  defaultStatementRange,
  supplierStatement,
  type Statement,
} from "@/server/repos/statements";

type Row = Record<string, string | number | null>;

function toCsv(headers: string[], rows: Row[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    const cells = headers.map((h) => {
      const v = row[h];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    });
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

/** Statement → flat rows: opening line, transactions, closing line. */
function statementRows(stmt: Statement): Row[] {
  const rows: Row[] = [
    { date: "", reference: "", description: "Opening balance", debit: null, credit: null, balance_kes: Math.round(stmt.openingBalance) },
  ];
  for (const r of stmt.rows) {
    rows.push({
      date: r.date,
      reference: r.ref,
      description: r.description,
      debit: r.debit > 0 ? Math.round(r.debit) : null,
      credit: r.credit > 0 ? Math.round(r.credit) : null,
      balance_kes: Math.round(r.balance),
    });
  }
  rows.push({
    date: "",
    reference: "",
    description: "Closing balance",
    debit: null,
    credit: null,
    balance_kes: Math.round(stmt.closingBalance),
  });
  return rows;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  // Statements include full customer/supplier transaction history — auth required.
  try {
    await requireOrgId();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { type, id } = await params;
  const url = new URL(req.url);
  const def = defaultStatementRange();
  const fromDate = url.searchParams.get("from") ?? def.fromDate;
  const toDate = url.searchParams.get("to") ?? def.toDate;

  let stmt: Statement;
  let titlePrefix: string;
  if (type === "customer") {
    stmt = await customerStatement(id, { fromDate, toDate });
    titlePrefix = "Customer Statement";
  } else if (type === "supplier") {
    stmt = await supplierStatement(id, { fromDate, toDate });
    titlePrefix = "Supplier Statement";
  } else {
    return new NextResponse(`Unknown statement type: ${type}`, { status: 404 });
  }

  const headers = ["date", "reference", "description", "debit", "credit", "balance_kes"];
  const rows = statementRows(stmt);
  const safeName = stmt.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "");
  const baseName = `statement-${type}-${safeName || id}-${fromDate}-${toDate}`;

  const format = url.searchParams.get("format") ?? "csv";

  if (format === "xlsx") {
    const period = `${fromDate} → ${toDate}  ·  Opening ${Math.round(
      stmt.openingBalance,
    ).toLocaleString()}  ·  Closing ${Math.round(
      stmt.closingBalance,
    ).toLocaleString()}  ·  Outstanding ${Math.round(stmt.totalOutstanding).toLocaleString()} KES`;
    const { buildBrandedWorkbook } = await import("@/server/reports/workbook");
    // balance is a running balance, not summable — keep money formatting but it
    // sits with debit/credit which the workbook totals; that's acceptable.
    const buf = await buildBrandedWorkbook({
      title: `${titlePrefix} — ${stmt.name}`,
      period,
      headers,
      rows,
      moneyKeys: ["debit", "credit", "balance_kes"],
    });
    return new NextResponse(buf as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  }

  const body = toCsv(headers, rows);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}.csv"`,
    },
  });
}
