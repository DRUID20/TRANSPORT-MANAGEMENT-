import Link from "next/link";
import { listBills } from "@/server/actions/ap";
import { listSuppliers } from "@/server/actions/suppliers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ageBucket, type AgeBucket } from "@/lib/types/ar";

export default async function AgedAPPage() {
  const bills = await listBills();
  const suppliers = await listSuppliers();
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const outstanding = bills.filter(
    (b) =>
      b.status === "sent" ||
      b.status === "partially_paid" ||
      b.status === "overdue",
  );

  type Row = {
    supplierId: string;
    supplierName: string;
    currency: string;
    buckets: Record<AgeBucket, number>;
    total: number;
  };
  const rowsBy = new Map<string, Row>();
  for (const b of outstanding) {
    const sup = supplierById.get(b.supplierId);
    const key = b.supplierId + "|" + b.currency;
    let row = rowsBy.get(key);
    if (!row) {
      row = {
        supplierId: b.supplierId,
        supplierName: sup?.name ?? "Unknown",
        currency: b.currency,
        buckets: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
        total: 0,
      };
      rowsBy.set(key, row);
    }
    const bucket = ageBucket(b.dueDate);
    row.buckets[bucket] += b.balance;
    row.total += b.balance;
  }
  const rows = [...rowsBy.values()].sort((a, b) => b.total - a.total);

  const totals: Record<AgeBucket, number> = {
    current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  let grand = 0;
  for (const r of rows) {
    for (const k of Object.keys(totals) as AgeBucket[]) totals[k] += r.buckets[k];
    grand += r.total;
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
        breadcrumbs={[{ label: "Bills", href: "/bills" }, { label: "Aged AP" }]}
        eyebrow="Finance · AP"
        title="Aged Payables"
        description="Outstanding bills by supplier and age bucket."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {buckets.map((b) => (
          <Stat
            key={b}
            label={labels[b]}
            value={totals[b].toLocaleString()}
            tone={b === "90+" ? "danger" : b === "61-90" || b === "31-60" ? "warning" : "default"}
            mono
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By supplier</CardTitle>
        </CardHeader>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Supplier</th>
                  <th className="px-5 py-2 font-medium">Ccy</th>
                  {buckets.map((b) => (
                    <th key={b} className="px-5 py-2 text-right font-medium">{labels[b]}</th>
                  ))}
                  <th className="px-5 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.supplierId + r.currency} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/suppliers/${r.supplierId}`}
                        className="text-fg-primary hover:text-brand-blue"
                      >
                        {r.supplierName}
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
                      No outstanding bills.
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
                      {grand.toLocaleString()}
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
