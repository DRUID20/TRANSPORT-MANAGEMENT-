import ExcelJS from "exceljs";

/**
 * Branded report workbook (industry-standard, not a raw CSV dump).
 *
 * Layout: a navy brand band with the wordmark + report title + period, a
 * generated-at line, a frozen styled header row, formatted data rows
 * (thousands separators, currency, right-aligned numbers), and a bold totals
 * band that sums the numeric columns. Reusable across every report.
 */

const NAVY = "FF0F4C81"; // brand navy
const BLUE = "FF2563EB"; // brand blue
const HEADER_BG = "FF1E293B"; // slate-800
const ZEBRA = "FFF1F5F9"; // slate-100
const BORDER = "FFE2E8F0"; // slate-200

const MONEY_RE = /kes|usd|ugx|total|amount|current|balance|debit|credit|gross|net|pay|paye|nssf|sha|nita|ahl|bonus|advance|revenue|cost|profit|\b\d+_\d+\b|90_plus/i;

export interface WorkbookOptions {
  title: string;
  period?: string;
  headers: string[];
  rows: Array<Record<string, string | number | null>>;
  /** Force these column keys to currency formatting. */
  moneyKeys?: string[];
  /** Optional currency code shown in the totals/format (default KES). */
  currency?: string;
  sheetName?: string;
}

function prettyHeader(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bKes\b/i, "KES")
    .replace(/\bUsd\b/i, "USD");
}

export async function buildBrandedWorkbook(opts: WorkbookOptions): Promise<Buffer> {
  const { title, period, headers, rows } = opts;
  const currency = opts.currency ?? "KES";
  const wb = new ExcelJS.Workbook();
  wb.creator = "Nile Valley Logistics";
  wb.created = new Date();
  const ws = wb.addWorksheet(opts.sheetName ?? "Report", {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
  });

  const colCount = headers.length;
  const lastCol = String.fromCharCode(64 + Math.min(colCount, 26));

  // Which columns are numeric / money.
  const isNumeric = headers.map((h) =>
    rows.length > 0 && rows.every((r) => r[h] === null || r[h] === undefined || typeof r[h] === "number"),
  );
  const isMoney = headers.map(
    (h, i) => isNumeric[i] && (opts.moneyKeys?.includes(h) || MONEY_RE.test(h)),
  );

  // ---- Brand band (rows 1-3) ----
  ws.mergeCells(`A1:${lastCol}1`);
  const brand = ws.getCell("A1");
  brand.value = "NILE VALLEY LOGISTICS";
  brand.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  brand.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 30;
  ["1"].forEach((r) => {
    for (let c = 1; c <= colCount; c++) {
      ws.getCell(`${String.fromCharCode(64 + c)}${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: NAVY },
      };
    }
  });

  ws.mergeCells(`A2:${lastCol}2`);
  const titleCell = ws.getCell("A2");
  titleCell.value = title;
  titleCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F172A" } };
  titleCell.alignment = { horizontal: "left", indent: 1 };
  ws.getRow(2).height = 20;

  ws.mergeCells(`A3:${lastCol}3`);
  const sub = ws.getCell("A3");
  sub.value = `${period ? period + "  ·  " : ""}Generated ${new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })} EAT  ·  Cross-border fuel haulage, East Africa`;
  sub.font = { name: "Arial", size: 9, color: { argb: "FF64748B" } };
  sub.alignment = { horizontal: "left", indent: 1 };
  ws.getRow(4).height = 6; // spacer

  // ---- Header row (row 5) ----
  const headerRow = ws.getRow(5);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = prettyHeader(h);
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: isNumeric[i] ? "right" : "left", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: HEADER_BG } } };
  });
  headerRow.height = 18;

  // ---- Data rows ----
  const numFmt = (money: boolean) => (money ? `#,##0;[Red](#,##0)` : `#,##0`);
  rows.forEach((r, ri) => {
    const row = ws.getRow(6 + ri);
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      const v = r[h];
      cell.value = v ?? (isNumeric[i] ? 0 : "");
      if (isNumeric[i]) {
        cell.numFmt = numFmt(Boolean(isMoney[i]));
        cell.alignment = { horizontal: "right" };
        cell.font = { name: "Consolas", size: 10 };
      } else {
        cell.font = { name: "Arial", size: 10, color: { argb: "FF0F172A" } };
      }
      if (ri % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      cell.border = { bottom: { style: "hair", color: { argb: BORDER } } };
    });
  });

  // ---- Totals band ----
  const hasMoney = isMoney.some(Boolean);
  if (hasMoney && rows.length > 0) {
    const totalRow = ws.getRow(6 + rows.length);
    headers.forEach((h, i) => {
      const cell = totalRow.getCell(i + 1);
      if (i === 0) {
        cell.value = "TOTAL";
        cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "left" };
      } else if (isMoney[i]) {
        cell.value = rows.reduce((s, r) => s + (typeof r[h] === "number" ? (r[h] as number) : 0), 0);
        cell.numFmt = numFmt(true);
        cell.font = { name: "Consolas", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "right" };
      }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    });
    totalRow.height = 18;
  }

  // ---- Column widths ----
  headers.forEach((h, i) => {
    const maxLen = Math.max(
      prettyHeader(h).length,
      ...rows.slice(0, 200).map((r) => String(r[h] ?? "").length),
    );
    ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 3, 12), isNumeric[i] ? 18 : 40);
  });

  void currency;
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}
