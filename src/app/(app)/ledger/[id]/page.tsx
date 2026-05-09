import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, Calendar, FileText, User } from "lucide-react";
import { getJournalEntryById } from "@/server/actions/ledger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { JournalStatusPill } from "@/components/finance/journal-status-pill";
import { ReverseEntryButton } from "./reverse-entry-button";

export default async function JournalEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getJournalEntryById(id);
  if (!entry) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "General Ledger", href: "/ledger" }, { label: entry.number }]}
        eyebrow="Journal Entry"
        title={entry.number}
        description={entry.memo}
        actions={
          <>
            <JournalStatusPill status={entry.status} />
            {entry.status === "posted" && <ReverseEntryButton entryId={entry.id} />}
          </>
        }
      />

      <Card>
        <CardContent className="!p-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat icon={Calendar} label="Date" value={entry.date} mono />
            <Stat icon={FileText} label="Source" value={entry.referenceType} />
            <Stat icon={User} label="Posted by" value={entry.postedBy} />
            <Stat
              icon={ArrowLeftRight}
              label="Total"
              value={`KSh ${entry.totalDebitKes.toLocaleString()}`}
              mono
            />
          </div>
          {entry.reversalOf && (
            <div className="mt-3 inline-flex items-center gap-1 rounded-md bg-bg-base px-2 py-1 text-[11px] text-fg-tertiary ring-1 ring-border">
              Reversal of{" "}
              <Link
                href={`/ledger/${entry.reversalOf}`}
                className="font-mono text-brand-blue hover:underline"
              >
                #{entry.reversalOf.slice(0, 8)}
              </Link>
            </div>
          )}
          {entry.reversedById && (
            <div className="mt-3 inline-flex items-center gap-1 rounded-md bg-bg-base px-2 py-1 text-[11px] text-fg-tertiary ring-1 ring-border">
              Reversed by{" "}
              <Link
                href={`/ledger/${entry.reversedById}`}
                className="font-mono text-brand-blue hover:underline"
              >
                #{entry.reversedById.slice(0, 8)}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
          <CardDescription>{entry.lines.length} line{entry.lines.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Account</th>
                  <th className="px-5 py-2 font-medium">Description</th>
                  <th className="px-5 py-2 text-right font-medium">Debit</th>
                  <th className="px-5 py-2 text-right font-medium">Credit</th>
                  <th className="px-5 py-2 font-medium">Ccy</th>
                  <th className="px-5 py-2 text-right font-medium">FX</th>
                  <th className="px-5 py-2 text-right font-medium">Dr (KES)</th>
                  <th className="px-5 py-2 text-right font-medium">Cr (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entry.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/accounts/${l.accountId}`}
                        className="hover:text-brand-blue"
                      >
                        <div className="font-mono text-xs font-medium text-fg-primary">
                          {l.accountCode}
                        </div>
                        <div className="text-[11px] text-fg-tertiary">{l.accountName}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-fg-secondary">
                      {l.description ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {l.originalDebit ? l.originalDebit.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {l.originalCredit ? l.originalCredit.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-fg-secondary">
                      {l.currency}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-[11px] tnum text-fg-tertiary">
                      {l.fxRate.toFixed(4)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                      {l.debitKes ? l.debitKes.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                      {l.creditKes ? l.creditKes.toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-bg-base/40">
                  <td colSpan={6} className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
                    Totals (KES)
                  </td>
                  <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                    {entry.totalDebitKes.toLocaleString()}
                  </td>
                  <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                    {entry.totalCreditKes.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        <Icon className="size-3" /> {label}
      </div>
      <div className={"mt-1 text-base font-medium text-fg-primary " + (mono ? "font-mono tnum" : "")}>
        {value}
      </div>
    </div>
  );
}
