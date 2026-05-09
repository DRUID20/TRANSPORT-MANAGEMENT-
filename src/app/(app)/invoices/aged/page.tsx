import Link from "next/link";
import { listInvoices } from "@/server/actions/ar";
import { listCustomers } from "@/server/actions/customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ageBucket, type AgeBucket } from "@/lib/types/ar";

export default async function AgedARPage() {
  const invoices = await listInvoices();
  const customers = await listCustomers();
  const customerById = new Map(customers.map((c) => [c.id, c]));

  // Only outstanding invoices
  const outstanding = invoices.filter(
    (i) =>
      i.status === "sent" ||
      i.status === "partially_paid" ||
      i.status === "overdue",
  );

  // Group by customer × age bucket
  type Row = {
    customerId: string;
    customerName: string;
    currency: string;
    buckets: Record<AgeBucket, number>;
    total: number;
    invoices: typeof outstanding;
  };
  const rowsByCustomer = new Map<string, Row>();
  for (const inv of outstanding) {
    const c = customerById.get(inv.customerId);
    const key = inv.customerId + "|" + inv.currency;
    let row = rowsByCustomer.get(key);
    if (!row) {
      row = {
        customerId: inv.customerId,
        customerName: c?.name ?? "Unknown",
        currency: inv.currency,
        buckets: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
        total: 0,
        invoices: [],
      };
      rowsByCustomer.set(key, row);
    }
    const bucket = ageBucket(inv.dueDate);
    row.buckets[bucket] += inv.balance;
    row.total += inv.balance;
    row.invoices.push(inv);
  }
  const rows = [...rowsByCustomer.values()].sort((a, b) => b.total - a.total);

  // Totals
  const totals: Record<AgeBucket, number> = {
    current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  let grandTotal = 0;
  for (const r of rows) {
    for (const k of Object.keys(totals) as AgeBucket[]) totals[k] += r.buckets[k];
    grandTotal += r.total;
  }

  const buckets: AgeBucket[] = ["current", "1-30", "31-60", "61-90", "90+"];
  const labels: Record<AgeBucket, string> = {
    current: "Current",
    "1-30": "1-30 days",
    "31-60": "31-60 days",
    "61-90": "61-90 days",
    "90+": "90+ days",
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Invoices", href: "/invoices" }, { label: "Aged AR" }]}
        eyebrow="Finance · AR"
        title="Aged Receivables"
        description="Outstanding balances by customer and age bucket. Currency-segregated."
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {buckets.map((b) => (
          <Stat
            key={b}
            label={labels[b]}
            value={`${totals[b].toLocaleString()}`}
            tone={b === "90+" ? "danger" : b === "61-90" || b === "31-60" ? "warning" : "default"}
            mono
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By customer</CardTitle>
        </CardHeader>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Customer</th>
                  <th className="px-5 py-2 font-medium">Ccy</th>
                  {buckets.map((b) => (
                    <th key={b} className="px-5 py-2 text-right font-medium">{labels[b]}</th>
                  ))}
                  <th className="px-5 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.customerId + r.currency} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/customers/${r.customerId}`}
                        className="text-fg-primary hover:text-brand-blue"
                      >
                        {r.customerName}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-fg-secondary">
                      {r.currency}
                    </td>
                    {buckets.map((b) => (
                      <td
                        key={b}
                        className={
                          "px-5 py-2.5 text-right font-mono tnum " +
                          (r.buckets[b] > 0 && b === "90+"
                            ? "text-status-danger"
                            : r.buckets[b] > 0 && (b === "61-90" || b === "31-60")
                              ? "text-status-warning"
                              : "text-fg-secondary")
                        }
                      >
                        {r.buckets[b] > 0 ? r.buckets[b].toLocaleString() : "—"}
                      </td>
                    ))}
                    <td className="px-5 py-2.5 text-right font-mono tnum font-semibold text-fg-primary">
                      {r.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={buckets.length + 3} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No outstanding invoices. Everything is settled.
                    </td>
                  </tr>
                )}
                {rows.length > 0 && (
                  <tr className="bg-bg-base/40">
                    <td className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
                      Total
                    </td>
                    <td className="px-5 py-2"></td>
                    {buckets.map((b) => (
                      <td key={b} className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                        {totals[b].toLocaleString()}
                      </td>
                    ))}
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                      {grandTotal.toLocaleString()}
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
  value: string;
  tone?: "default" | "warning" | "danger";
  mono?: boolean;
}) {
  const colour =
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono tnum" : ""} text-xl font-medium ${colour}`}>
        {value}
      </div>
    </div>
  );
}
