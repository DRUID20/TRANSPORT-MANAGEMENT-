import Link from "next/link";
import { ArrowRightLeft, FileText, Plus } from "lucide-react";
import { listBills } from "@/server/actions/ap";
import { listSuppliers } from "@/server/actions/suppliers";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { BillStatusPill } from "@/components/finance/bill-status-pill";
import { BillsFilters } from "./bills-filters";
import type { BillStatus } from "@/lib/types/ap";
import { cn } from "@/lib/utils";

const VALID: BillStatus[] = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
];

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = (VALID as string[]).includes(rawStatus ?? "")
    ? (rawStatus as BillStatus)
    : undefined;

  const [all, suppliers] = await Promise.all([listBills(), listSuppliers()]);
  const filtered = status ? all.filter((b) => b.status === status) : all;
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const counts = {
    posted: all.filter(
      (b) =>
        b.status === "sent" ||
        b.status === "partially_paid" ||
        b.status === "overdue",
    ).length,
    overdue: all.filter((b) => b.status === "overdue").length,
    paid: all.filter((b) => b.status === "paid").length,
  };
  const outstanding = all
    .filter(
      (b) =>
        b.status === "sent" ||
        b.status === "partially_paid" ||
        b.status === "overdue",
    )
    .reduce((s, b) => s + b.balance * b.fxRate, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance · AP"
        title="Supplier bills"
        description="Bills from suppliers (spares, fuel, repairs). Auto-posts to expense + AP on send."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/bills/aged">
                <ArrowRightLeft className="size-3.5" />
                Aged AP
              </Link>
            </Button>
            <Button asChild>
              <Link href="/bills/new">
                <Plus className="size-4" />
                New bill
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Posted" value={counts.posted} tone="info" />
        <Stat label="Overdue" value={counts.overdue} tone="danger" />
        <Stat label="Paid" value={counts.paid} tone="success" />
        <Stat
          label="Outstanding (KES eqv.)"
          value={`KSh ${outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          tone="warning"
          mono
        />
      </div>

      <BillsFilters active={status ?? "all"} />

      {filtered.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={FileText}
            title={all.length === 0 ? "No bills yet" : "No bills match this filter"}
            description={
              all.length === 0
                ? "Record a supplier bill to start tracking payables."
                : "Try clearing the status filter to see all bills."
            }
            action={
              all.length === 0 ? (
                <Button asChild>
                  <Link href="/bills/new">
                    <Plus className="size-3.5" />
                    New bill
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {filtered.length} bill{filtered.length === 1 ? "" : "s"}
              {status ? ` · ${status}` : ""}
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Bill</DataTableHeaderCell>
              <DataTableHeaderCell>Supplier</DataTableHeaderCell>
              <DataTableHeaderCell>Issue / Due</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Total</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Balance</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {filtered.map((b) => {
              const sup = supplierById.get(b.supplierId);
              return (
                <DataTableRow key={b.id} linkHref={`/bills/${b.id}`}>
                  <DataTableCell>
                    <Link href={`/bills/${b.id}`} className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-md border border-border bg-bg-surface">
                        <FileText className="size-3.5 text-fg-tertiary" />
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue">
                          {b.number}
                        </span>
                        {b.supplierRef && (
                          <span className="font-mono text-[10px] text-fg-tertiary">
                            ref {b.supplierRef}
                          </span>
                        )}
                      </div>
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    {sup ? (
                      <Link
                        href={`/suppliers/${sup.id}`}
                        className="text-xs text-fg-secondary hover:text-brand-blue"
                      >
                        {sup.name}
                      </Link>
                    ) : (
                      <span className="text-fg-tertiary">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell mono className="text-[11px] text-fg-tertiary">
                    <div className="leading-tight">{b.issueDate}</div>
                    <div className="leading-tight">due {b.dueDate}</div>
                  </DataTableCell>
                  <DataTableCell>
                    <BillStatusPill status={b.status} />
                  </DataTableCell>
                  <DataTableCell mono align="right">
                    {b.total.toLocaleString()} {b.currency}
                  </DataTableCell>
                  <DataTableCell
                    mono
                    align="right"
                    className={cn(
                      b.balance === 0
                        ? "text-status-success"
                        : b.status === "overdue"
                          ? "text-status-danger"
                          : "text-fg-primary",
                    )}
                  >
                    {b.balance.toLocaleString()} {b.currency}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "info" | "success" | "danger" | "warning";
  mono?: boolean;
}) {
  const colour =
    tone === "info"
      ? "text-brand-blue"
      : tone === "success"
        ? "text-status-success"
        : tone === "danger"
          ? "text-status-danger"
          : tone === "warning"
            ? "text-status-warning"
            : "text-fg-primary";
  return (
    <div className="surface-card lift-on-hover p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold", mono && "font-mono tnum", colour)}>
        {value}
      </div>
    </div>
  );
}
