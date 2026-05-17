import Link from "next/link";
import { BookOpen, ListChecks, Plus } from "lucide-react";
import { listJournalEntries } from "@/server/actions/ledger";
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
import { JournalStatusPill } from "@/components/finance/journal-status-pill";
import { cn } from "@/lib/utils";

const refLabels: Record<string, string> = {
  manual: "Manual",
  opening_balance: "Opening balance",
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
        title="General ledger"
        description="Every journal entry. Double-entry, multi-currency. The trial balance rebuilds from this."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/ledger/trial-balance">
                <ListChecks className="size-3.5" />
                Trial balance
              </Link>
            </Button>
            <Button asChild>
              <Link href="/ledger/new">
                <Plus className="size-4" />
                Post journal
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Entries" value={entries.length} />
        <Stat label="Posted" value={posted.length} tone="success" />
        <Stat label="Reversed" value={reversed.length} tone="danger" />
        <Stat
          label="Posted value"
          value={`KSh ${totalPosted.toLocaleString()}`}
          mono
          tone="success"
        />
      </div>

      {entries.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={BookOpen}
            title="No journal entries yet"
            description="Post your first journal — manual or auto-derived from trip / invoice / fuel / payment flows."
            action={
              <Button asChild>
                <Link href="/ledger/new">
                  <Plus className="size-3.5" />
                  Post journal
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {entries.length} entr{entries.length === 1 ? "y" : "ies"} · most recent first
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Number</DataTableHeaderCell>
              <DataTableHeaderCell>Date</DataTableHeaderCell>
              <DataTableHeaderCell>Memo</DataTableHeaderCell>
              <DataTableHeaderCell>Source</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Dr (KES)</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Cr (KES)</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {entries.map((e) => (
              <DataTableRow key={e.id} linkHref={`/ledger/${e.id}`}>
                <DataTableCell>
                  <Link
                    href={`/ledger/${e.id}`}
                    className="flex items-center gap-2.5"
                  >
                    <span className="flex size-7 items-center justify-center rounded-md border border-border bg-bg-surface">
                      <BookOpen className="size-3.5 text-fg-tertiary" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue">
                      {e.number}
                    </span>
                  </Link>
                </DataTableCell>
                <DataTableCell mono className="text-xs text-fg-secondary">
                  {e.date}
                </DataTableCell>
                <DataTableCell className="text-fg-primary">{e.memo}</DataTableCell>
                <DataTableCell className="text-xs text-fg-secondary">
                  {refLabels[e.referenceType] ?? e.referenceType}
                </DataTableCell>
                <DataTableCell>
                  <JournalStatusPill status={e.status} />
                </DataTableCell>
                <DataTableCell mono align="right">
                  {e.totalDebitKes.toLocaleString()}
                </DataTableCell>
                <DataTableCell mono align="right">
                  {e.totalCreditKes.toLocaleString()}
                </DataTableCell>
              </DataTableRow>
            ))}
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
  tone?: "default" | "success" | "danger";
  mono?: boolean;
}) {
  const colour =
    tone === "success"
      ? "text-status-success"
      : tone === "danger"
        ? "text-status-danger"
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
