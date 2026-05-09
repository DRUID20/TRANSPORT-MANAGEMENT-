import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Calendar,
  FileText,
} from "lucide-react";
import { getBillById } from "@/server/actions/ap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { BillStatusPill } from "@/components/finance/bill-status-pill";
import { BillActions } from "./bill-actions";

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bill = await getBillById(id);
  if (!bill) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Bills", href: "/bills" }, { label: bill.number }]}
        eyebrow="Supplier Bill"
        title={bill.number}
        description={bill.supplier ? `${bill.supplier.name} · ${bill.currency}` : "—"}
        actions={<BillStatusPill status={bill.status} />}
      />

      <Card>
        <CardContent className="!p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Building2} label="Supplier" value={bill.supplier?.name ?? "—"} />
            <Stat icon={FileText} label="Their ref" value={bill.supplierRef ?? "—"} mono />
            <Stat icon={Calendar} label="Issue" value={bill.issueDate} mono />
            <Stat icon={Calendar} label="Due" value={bill.dueDate} mono />
            <Stat
              label="Subtotal"
              value={`${bill.subtotal.toLocaleString()} ${bill.currency}`}
              mono
            />
            <Stat
              label={`VAT (${(bill.taxRate * 100).toFixed(0)}%)`}
              value={`${bill.taxAmount.toLocaleString()} ${bill.currency}`}
              mono
            />
            <Stat
              label="Total"
              value={`${bill.total.toLocaleString()} ${bill.currency}`}
              mono
              tone="info"
            />
            <Stat
              label="Balance"
              value={`${bill.balance.toLocaleString()} ${bill.currency}`}
              mono
              tone={bill.balance === 0 ? "success" : "warning"}
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
                  <th className="px-5 py-2 font-medium">Account</th>
                  <th className="px-5 py-2 text-right font-medium">Qty</th>
                  <th className="px-5 py-2 text-right font-medium">Price</th>
                  <th className="px-5 py-2 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bill.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-2.5 text-fg-primary">{l.description}</td>
                    <td className="px-5 py-2.5 font-mono text-xs text-fg-secondary">
                      {l.expenseAccountCode}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {l.quantity}
                      {l.unit ? ` ${l.unit}` : ""}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {l.unitPrice.toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                      {l.lineTotal.toLocaleString()} {bill.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <BillActions
        billId={bill.id}
        status={bill.status}
        balance={bill.balance}
        currency={bill.currency}
        fxRate={bill.fxRate}
      />

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            {bill.payments.length === 0
              ? "Nothing paid yet."
              : `${bill.payments.length} payment${bill.payments.length === 1 ? "" : "s"} totalling ${bill.paidAmount.toLocaleString()} ${bill.currency}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          {bill.payments.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-fg-tertiary">
              Use the actions above to record a payment.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Payment</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Method</th>
                  <th className="px-5 py-2 font-medium">Reference</th>
                  <th className="px-5 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bill.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-2 font-mono text-xs text-fg-primary">{p.number}</td>
                    <td className="px-5 py-2 font-mono tnum text-xs text-fg-secondary">{p.date}</td>
                    <td className="px-5 py-2 text-xs text-fg-secondary capitalize">{p.paymentMethod}</td>
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

      {bill.journalEntryId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-fg-tertiary" />
              Posted to General Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/ledger/${bill.journalEntryId}`}
              className="inline-flex items-center gap-2 text-sm text-brand-blue hover:underline"
            >
              View journal entry
              <ArrowRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}

      {bill.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{bill.notes}</p>
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
  mono = false,
  tone = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
  tone?: "default" | "success" | "warning" | "info";
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" :
    tone === "info" ? "text-brand-blue" : "text-fg-primary";
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        {Icon ? <Icon className="size-3" /> : null} {label}
      </div>
      <div className={`mt-1 text-base font-medium ${colour} ${mono ? "font-mono tnum" : ""}`}>
        {value}
      </div>
    </div>
  );
}
