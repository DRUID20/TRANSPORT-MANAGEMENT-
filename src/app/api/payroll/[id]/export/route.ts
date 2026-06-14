import { NextResponse } from "next/server";
import { requireOrgId } from "@/server/auth/current-org";
import {
  getEmployee,
} from "@/server/repos/hr";
import {
  getPayrollPeriod,
  listPayrollInputs,
} from "@/server/repos/payroll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Payroll period CSV export. Contains employee PII (national ID, KRA PIN,
 * NSSF/SHA, bank, M-Pesa) + statutory math, so it MUST be auth-gated.
 * `requireOrgId()` throws on missing session and every repo call is org-scoped.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth + org gate. requireOrgId throws on no session.
  try {
    await requireOrgId();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const period = await getPayrollPeriod(id);
  if (!period) {
    return new NextResponse("Period not found", { status: 404 });
  }
  const inputs = await listPayrollInputs(id);

  const headers = [
    "employee_number",
    "full_name",
    "national_id",
    "kra_pin",
    "nssf_no",
    "sha_no",
    "mpesa_phone",
    "bank_name",
    "bank_branch",
    "bank_account_no",
    "currency",
    "basic_salary",
    "allowances_taxable",
    "allowances_nontaxable",
    "overtime_hours",
    "overtime_rate",
    "bonus",
    "gross_pay",
    "paye",
    "nssf_employee",
    "sha_employee",
    "ahl_employee",
    "loan_recovery",
    "other_deductions",
    "total_deductions",
    "net_pay",
    "nssf_employer",
    "ahl_employer",
    "nita_employer",
    "employer_cost",
  ];

  const rows: string[] = [headers.join(",")];
  for (const p of inputs) {
    const e = await getEmployee(p.employeeId);
    if (!e) continue;
    const taxable = p.allowances.filter((a) => a.taxable).reduce((s, a) => s + a.amount, 0);
    const nontax = p.allowances.filter((a) => !a.taxable).reduce((s, a) => s + a.amount, 0);
    const cells = [
      e.employeeNumber,
      csvEscape(e.fullName),
      e.nationalId,
      e.kraPin ?? "",
      e.nssfNo ?? "",
      e.shaNo ?? "",
      e.mpesaPhone,
      csvEscape(e.bankName ?? ""),
      csvEscape(e.bankBranch ?? ""),
      e.bankAccountNo ?? "",
      p.currency,
      p.basicSalary,
      taxable,
      nontax,
      p.overtimeHours,
      p.overtimeRate,
      p.bonus,
      p.grossPay,
      p.paye,
      p.nssfEmployee,
      p.shaEmployee,
      p.ahlEmployee,
      p.loanRecovery,
      p.otherDeductions,
      p.totalDeductions,
      p.netPay,
      p.nssfEmployer,
      p.ahlEmployer,
      p.nitaEmployer,
      p.employerCost,
    ];
    rows.push(cells.join(","));
  }
  const body = rows.join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${period.yearMonth}.csv"`,
    },
  });
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
