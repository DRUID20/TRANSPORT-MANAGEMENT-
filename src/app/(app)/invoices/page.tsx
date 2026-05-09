import Link from "next/link";
import { ArrowRightLeft, Plus, ScrollText } from "lucide-react";
import { listInvoices } from "@/server/actions/ar";
import { listCustomers } from "@/server/actions/customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { InvoiceStatusPill } from "@/components/finance/invoice-status-pill";
import { InvoicesFilters } from "./invoices-filters";
import type { InvoiceStatus } from "@/lib/types/ar";

const VALID_STATUS: InvoiceStatus[] = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = (VALID_STATUS as string[]).includes(rawStatus ?? "")
    ? (rawStatus as InvoiceStatus)
    : undefined;

  const all = await listInvoices();
  const filtered = status ? all.filter((i) => i.status === status) : all;
  const customers = await listCustomers();
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const counts = {
    draft: all.filter((i) => i.status === "draft").length,
    sent: all.filter((i) => i.status === "sent").length,
    overdue: all.filter((i) => i.status === "overdue").length,
    paid: all.filter((i) => i.status === "paid").length,
  };
  const outstanding = all
    .filter((i) => i.status === "sent" || i.status === "partially_paid" || i.status === "overdue")
    .reduce((s, i) => s + i.balance * i.fxRate, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance · AR"
        title="Customer Invoices"
        description="Generated from closed trips. Auto-posts to AR + Revenue on send."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/invoices/aged">
                <ArrowRightLeft className="size-4" />
                Aged AR
              </Link>
            </Button>
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="size-4" />
                New Invoice
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Issue / Due</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => {
                  const c = customerById.get(inv.customerId);
                  return (
                    <tr key={inv.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="flex items-center gap-2"
                        >
                          <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                            <ScrollText className="size-3.5 text-fg-tertiary" />
                          </span>
                          <span className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                            {inv.number}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-2.5">
                        {c ? (
                          <Link
                            href={`/customers/${c.id}`}
                            className="text-xs text-fg-secondary hover:text-brand-blue"
                          >
                            {c.name}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-[11px] tnum text-fg-tertiary">
                        <div>{inv.issueDate}</div>
                        <div>due {inv.dueDate}</div>
                      </td>
                      <td className="px-5 py-2.5">
                        <InvoiceStatusPill status={inv.status} />
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                        {inv.total.toLocaleString()} {inv.currency}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                        {inv.balance.toLocaleString()} {inv.currency}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No invoices yet.{" "}
                      <Link href="/invoices/new" className="text-brand-blue hover:underline">
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
