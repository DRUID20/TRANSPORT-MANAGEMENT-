import Link from "next/link";
import { ArrowRightLeft, FileText, Plus } from "lucide-react";
import { listBills } from "@/server/actions/ap";
import { listSuppliers } from "@/server/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { BillStatusPill } from "@/components/finance/bill-status-pill";
import { BillsFilters } from "./bills-filters";
import type { BillStatus } from "@/lib/types/ap";

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

  const all = await listBills();
  const filtered = status ? all.filter((b) => b.status === status) : all;
  const suppliers = await listSuppliers();
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const counts = {
    draft: all.filter((b) => b.status === "draft").length,
    posted: all.filter((b) => b.status === "sent" || b.status === "partially_paid" || b.status === "overdue").length,
    overdue: all.filter((b) => b.status === "overdue").length,
    paid: all.filter((b) => b.status === "paid").length,
  };
  const outstanding = all
    .filter((b) => b.status === "sent" || b.status === "partially_paid" || b.status === "overdue")
    .reduce((s, b) => s + b.balance * b.fxRate, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance · AP"
        title="Supplier Bills"
        description="Bills from suppliers (spares, fuel, repairs). Auto-posts to expense + AP on send."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/bills/aged">
                <ArrowRightLeft className="size-4" />
                Aged AP
              </Link>
            </Button>
            <Button asChild>
              <Link href="/bills/new">
                <Plus className="size-4" />
                New Bill
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Bill</th>
                  <th className="px-5 py-3 font-medium">Supplier</th>
                  <th className="px-5 py-3 font-medium">Issue / Due</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((b) => {
                  const sup = supplierById.get(b.supplierId);
                  return (
                    <tr key={b.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/bills/${b.id}`}
                          className="flex items-center gap-2"
                        >
                          <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                            <FileText className="size-3.5 text-fg-tertiary" />
                          </span>
                          <div className="flex flex-col leading-tight">
                            <span className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                              {b.number}
                            </span>
                            {b.supplierRef && (
                              <span className="font-mono text-[10px] text-fg-tertiary">
                                ref {b.supplierRef}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-2.5">
                        {sup ? (
                          <Link
                            href={`/suppliers/${sup.id}`}
                            className="text-xs text-fg-secondary hover:text-brand-blue"
                          >
                            {sup.name}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-[11px] tnum text-fg-tertiary">
                        <div>{b.issueDate}</div>
                        <div>due {b.dueDate}</div>
                      </td>
                      <td className="px-5 py-2.5">
                        <BillStatusPill status={b.status} />
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                        {b.total.toLocaleString()} {b.currency}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                        {b.balance.toLocaleString()} {b.currency}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No bills yet.{" "}
                      <Link href="/bills/new" className="text-brand-blue hover:underline">
                        Create the first one →
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono tnum" : ""} text-2xl font-medium ${colour}`}>
        {value}
      </div>
    </div>
  );
}
