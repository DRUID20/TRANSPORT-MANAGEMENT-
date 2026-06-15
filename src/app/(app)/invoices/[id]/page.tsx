import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Calendar,
  FileText,
  ScrollText,
} from "lucide-react";
import { getInvoiceById } from "@/server/actions/ar";
import { PAYMENT_METHOD_LABEL } from "@/lib/types/ar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { InvoiceStatusPill } from "@/components/finance/invoice-status-pill";
import { InvoiceActions } from "./invoice-actions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inv = await getInvoiceById(id);
  if (!inv) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Invoices", href: "/invoices" }, { label: inv.number }]}
        eyebrow="Customer Invoice"
        title={inv.number}
        description={
          inv.customer
            ? `${inv.customer.name} · ${inv.currency}`
            : "—"
        }
        actions={
          <>
            <InvoiceStatusPill status={inv.status} />
            {inv.taxRate === 0 && <Badge variant="info">VAT 0%</Badge>}
          </>
        }
      />

      <Card>
        <CardContent className="!p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Building2} label="Customer" value={inv.customer?.name ?? "—"} />
            <Stat icon={Calendar} label="Issue date" value={inv.issueDate} mono />
            <Stat icon={Calendar} label="Due date" value={inv.dueDate} mono />
            <Stat
              icon={ScrollText}
              label="Trip"
              value={inv.trip?.number ?? "—"}
              href={inv.trip ? `/trips/${inv.trip.id}` : undefined}
              mono
            />
            <Stat
              label="Subtotal"
              value={`${inv.subtotal.toLocaleString()} ${inv.currency}`}
              mono
            />
            <Stat
              label={`VAT (${(inv.taxRate * 100).toFixed(0)}%)`}
              value={`${inv.taxAmount.toLocaleString()} ${inv.currency}`}
              mono
            />
            <Stat
              label="Total"
              value={`${inv.total.toLocaleString()} ${inv.currency}`}
              mono
              tone="info"
            />
            <Stat
              label="Balance"
              value={`${inv.balance.toLocaleString()} ${inv.currency}`}
              mono
              tone={inv.balance === 0 ? "success" : "warning"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Description</th>
                  <th className="px-5 py-2 text-right font-medium">Qty</th>
                  <th className="px-5 py-2 font-medium">Unit</th>
                  <th className="px-5 py-2 text-right font-medium">Price</th>
                  <th className="px-5 py-2 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inv.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-2.5 text-fg-primary">{l.description}</td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {l.quantity.toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-fg-tertiary">{l.unit ?? ""}</td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {l.unitPrice.toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                      {l.lineTotal.toLocaleString()} {inv.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <InvoiceActions
        invoiceId={inv.id}
        status={inv.status}
        balance={inv.balance}
        currency={inv.currency}
        fxRate={inv.fxRate}
      />

      {/* Payments history */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            {inv.payments.length === 0
              ? "No payments recorded yet."
              : `${inv.payments.length} payment${inv.payments.length === 1 ? "" : "s"} totalling ${inv.paidAmount.toLocaleString()} ${inv.currency}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          {inv.payments.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-fg-tertiary">
              Use the actions above to record a payment.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Receipt</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Method</th>
                  <th className="px-5 py-2 font-medium">Reference</th>
                  <th className="px-5 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inv.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-2 font-mono text-xs text-fg-primary">{p.number}</td>
                    <td className="px-5 py-2 font-mono tnum text-xs text-fg-secondary">{p.date}</td>
                    <td className="px-5 py-2 text-xs text-fg-secondary">{PAYMENT_METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}</td>
                    <td className="px-5 py-2 text-xs text-fg-secondary">{p.reference ?? "—"}</td>
                    <td className="px-5 py-2 text-right font-mono tnum text-fg-primary">
                      {p.amount.toLocaleString()} {p.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Linked GL entry */}
      {inv.journalEntryId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-fg-tertiary" />
              Posted to General Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/ledger/${inv.journalEntryId}`}
              className="inline-flex items-center gap-2 text-sm text-brand-blue hover:underline"
            >
              View journal entry
              <ArrowRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}

      {inv.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{inv.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  href,
  mono = false,
  tone = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
  tone?: "default" | "success" | "warning" | "info";
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" :
    tone === "info" ? "text-brand-blue" : "text-fg-primary";
  const inner = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        {Icon ? <Icon className="size-3" /> : null} {label}
      </div>
      <div className={`mt-1 text-base font-medium ${colour} ${mono ? "font-mono tnum" : ""}`}>
        {value}
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="hover:text-brand-blue">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}
