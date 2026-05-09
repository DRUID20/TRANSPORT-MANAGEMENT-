import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAccountByCodeAction } from "@/server/actions/accounts";
import {
  bankReconSummary,
  listBankStatementTxs,
  unmatchedGlLines,
} from "@/server/actions/bank";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ReconWorkspace } from "./recon-workspace";

export default async function BankReconPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const account = await getAccountByCodeAction(code);
  if (!account) notFound();

  const stmt = await listBankStatementTxs(code);
  const gl = await unmatchedGlLines(code);
  const summary = await bankReconSummary(code);

  // Convert GL lines to a serializable shape for the client component
  const glLines = gl.map((l) => ({
    id: l.id,
    journalEntryId: l.journalEntryId,
    accountCode: l.accountCode,
    accountName: l.accountName,
    debit: l.originalDebit,
    credit: l.originalCredit,
    description: l.description ?? "",
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Bank", href: "/bank" }, { label: `${account.code} · ${account.name}` }]}
        eyebrow="Bank Reconciliation"
        title={`${account.code} · ${account.name}`}
        description={`${account.currency} · ${stmt.length} statement entr${stmt.length === 1 ? "y" : "ies"}`}
      />

      {summary && (
        <Card>
          <CardContent className="!p-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="GL balance" value={summary.glBalance.toLocaleString()} mono />
              <Stat label="Statement balance" value={summary.statementBalance.toLocaleString()} mono />
              <Stat
                label="Difference"
                value={
                  Math.abs(summary.difference) < 0.01
                    ? "✓ Reconciled"
                    : summary.difference.toLocaleString()
                }
                tone={Math.abs(summary.difference) < 0.01 ? "success" : "warning"}
                mono={Math.abs(summary.difference) >= 0.01}
              />
              <Stat
                label="Unmatched"
                value={`${summary.unmatchedStatementCount} stmt · ${summary.unmatchedGlCount} GL`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <ReconWorkspace
        accountCode={account.code}
        accountCurrency={account.currency}
        statementTxs={stmt}
        glLines={glLines}
      />

      <div className="text-center">
        <Link
          href="/bank"
          className="inline-flex items-center gap-1.5 text-sm text-fg-tertiary hover:text-fg-secondary"
        >
          <ArrowLeft className="size-3.5" />
          Back to bank accounts
        </Link>
      </div>
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
  tone?: "default" | "success" | "warning";
  mono?: boolean;
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono tnum" : ""} text-base font-semibold ${colour}`}>
        {value}
      </div>
    </div>
  );
}
