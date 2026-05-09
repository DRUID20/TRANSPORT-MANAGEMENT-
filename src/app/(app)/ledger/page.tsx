import Link from "next/link";
import { BookOpen, ListChecks, Plus } from "lucide-react";
import { listJournalEntries } from "@/server/actions/ledger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { JournalStatusPill } from "@/components/finance/journal-status-pill";

const refLabels: Record<string, string> = {
  manual: "Manual",
  opening_balance: "Opening Balance",
  trip: "Trip",
  expense: "Expense",
  fuel: "Fuel",
  mpesa: "M-Pesa",
  invoice: "Invoice",
  bill: "Bill",
  payment: "Payment",
  fx_revaluation: "FX revaluation",
  depreciation: "Depreciation",
  reversal: "Reversal",
};

export default async function LedgerPage() {
  const entries = await listJournalEntries();
  const posted = entries.filter((e) => e.status === "posted");
  const reversed = entries.filter((e) => e.status === "reversed");
  const totalPosted = posted.reduce((s, e) => s + e.totalDebitKes, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="General Ledger"
        description="Every journal entry. Double-entry, multi-currency. Trial Balance rebuilds from this."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/ledger/trial-balance">
                <ListChecks className="size-4" />
                Trial Balance
              </Link>
            </Button>
            <Button asChild>
              <Link href="/ledger/new">
                <Plus className="size-4" />
                Post Journal
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Entries" value={entries.length} />
        <Stat label="Posted" value={posted.length} tone="success" />
        <Stat label="Reversed" value={reversed.length} tone="danger" />
        <Stat label="Posted value (KES)" value={`KSh ${totalPosted.toLocaleString()}`} mono tone="success" />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Memo</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Dr (KES)</th>
                  <th className="px-5 py-3 text-right font-medium">Cr (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id} className="group transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/ledger/${e.id}`}
                        className="flex items-center gap-2"
                      >
                        <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                          <BookOpen className="size-3.5 text-fg-tertiary" />
                        </span>
                        <span className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                          {e.number}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 font-mono tnum text-xs text-fg-secondary">
                      {e.date}
                    </td>
                    <td className="px-5 py-2.5 text-fg-primary">{e.memo}</td>
                    <td className="px-5 py-2.5 text-xs text-fg-secondary">
                      {refLabels[e.referenceType] ?? e.referenceType}
                    </td>
                    <td className="px-5 py-2.5">
                      <JournalStatusPill status={e.status} />
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                      {e.totalDebitKes.toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                      {e.totalCreditKes.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No journal entries yet.{" "}
                      <Link href="/ledger/new" className="text-brand-blue hover:underline">
                        Post the first one →
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
  tone?: "default" | "success" | "danger";
  mono?: boolean;
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono tnum" : ""} text-2xl font-medium ${colour}`}>
        {value}
      </div>
    </div>
  );
}
