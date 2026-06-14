import Link from "next/link";
import { ArrowRightLeft, Plus, ScrollText } from "lucide-react";
import { listInvoices } from "@/server/actions/ar";
import { listCustomers } from "@/server/actions/customers";
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
import { Paginator } from "@/components/ui/paginator";
import { PageHeader } from "@/components/layout/page-header";
import { InvoiceStatusPill } from "@/components/finance/invoice-status-pill";
import { InvoicesFilters } from "./invoices-filters";
import type { InvoiceStatus } from "@/lib/types/ar";
import { cn } from "@/lib/utils";

const VALID_STATUS: InvoiceStatus[] = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
];

const PAGE_SIZE = 50;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: rawStatus, page: rawPage } = await searchParams;
  const status = (VALID_STATUS as string[]).includes(rawStatus ?? "")
    ? (rawStatus as InvoiceStatus)
    : undefined;
  const page = Math.max(1, Number(rawPage) || 1);

  const [all, customers] = await Promise.all([listInvoices(), listCustomers()]);
  const filtered = status ? all.filter((i) => i.status === status) : all;
  const filteredCount = filtered.length;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const hrefForPage = (p: number) =>
    `/invoices?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) }).toString()}`;

  const counts = {
    draft: all.filter((i) => i.status === "draft").length,
    sent: all.filter((i) => i.status === "sent").length,
    overdue: all.filter((i) => i.status === "overdue").length,
    paid: all.filter((i) => i.status === "paid").length,
  };
  const outstanding = all
    .filter(
      (i) =>
        i.status === "sent" ||
        i.status === "partially_paid" ||
        i.status === "overdue",
    )
    .reduce((s, i) => s + i.balance * i.fxRate, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance · AR"
        title="Customer invoices"
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/invoices/aged">
                <ArrowRightLeft className="size-3.5" />
                Aged AR
              </Link>
            </Button>
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="size-4" />
                New invoice
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Sent" value={counts.sent} tone="info" />
        <Stat label="Overdue" value={counts.overdue} tone="danger" />
        <Stat label="Paid" value={counts.paid} tone="success" />
        <Stat
          label="Outstanding (KES eqv.)"
          value={`KSh ${outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          tone="warning"
          mono
        />
      </div>

      <InvoicesFilters active={status ?? "all"} />

      {filtered.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={ScrollText}
            title={all.length === 0 ? "No invoices yet" : "No invoices match this filter"}
            description={
              all.length === 0
                ? "Generate your first invoice from a closed, reconciled trip."
                : "Try clearing the status filter to see all invoices."
            }
            action={
              all.length === 0 ? (
                <Button asChild>
                  <Link href="/invoices/new">
                    <Plus className="size-3.5" />
                    New invoice
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
              {filtered.length} invoice{filtered.length === 1 ? "" : "s"}
              {status ? ` · ${status}` : ""}
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Number</DataTableHeaderCell>
              <DataTableHeaderCell>Customer</DataTableHeaderCell>
              <DataTableHeaderCell>Issue / Due</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Total</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Balance</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {paged.map((inv) => {
              const c = customerById.get(inv.customerId);
              return (
                <DataTableRow key={inv.id} linkHref={`/invoices/${inv.id}`}>
                  <DataTableCell>
                    <Link href={`/invoices/${inv.id}`} className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-md border border-border bg-bg-surface">
                        <ScrollText className="size-3.5 text-fg-tertiary" />
                      </span>
                      <span className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue">
                        {inv.number}
                      </span>
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    {c ? (
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-xs text-fg-secondary hover:text-brand-blue"
                      >
                        {c.name}
                      </Link>
                    ) : (
                      <span className="text-fg-tertiary">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell mono className="text-[11px] text-fg-tertiary">
                    <div className="leading-tight">{inv.issueDate}</div>
                    <div className="leading-tight">due {inv.dueDate}</div>
                  </DataTableCell>
                  <DataTableCell>
                    <InvoiceStatusPill status={inv.status} />
                  </DataTableCell>
                  <DataTableCell mono align="right">
                    {inv.total.toLocaleString()} {inv.currency}
                  </DataTableCell>
                  <DataTableCell
                    mono
                    align="right"
                    className={cn(
                      inv.balance === 0
                        ? "text-status-success"
                        : inv.status === "overdue"
                          ? "text-status-danger"
                          : "text-fg-primary",
                    )}
                  >
                    {inv.balance.toLocaleString()} {inv.currency}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
      <Paginator page={page} pageSize={PAGE_SIZE} total={filteredCount} hrefFor={hrefForPage} />
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
