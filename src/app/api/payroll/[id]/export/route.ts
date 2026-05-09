import { NextResponse } from "next/server";
import {
  getPayrollPeriod,
  getEmployee,
  listPayrollInputs,
} from "@/server/store/mock-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const period = getPayrollPeriod(id);
  if (!period) {
    return new NextResponse("Period not found", { status: 404 });
  }
  const inputs = listPayrollInputs(id);

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
    const e = getEmployee(p.employeeId);
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
