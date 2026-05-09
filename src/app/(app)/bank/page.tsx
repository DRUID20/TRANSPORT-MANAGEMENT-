import Link from "next/link";
import { Banknote, ArrowRight } from "lucide-react";
import { bankReconSummary, listBankAccounts } from "@/server/actions/bank";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

const flag: Record<string, string> = {
  KES: "🇰🇪",
  USD: "🇺🇸",
  UGX: "🇺🇬",
  TZS: "🇹🇿",
  RWF: "🇷🇼",
};

export default async function BankPage() {
  const accounts = await listBankAccounts();
  const summaries = await Promise.all(
    accounts.map(async (a) => ({ acc: a, sum: await bankReconSummary(a.code) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Bank Reconciliation"
        description="Match bank-statement entries to GL postings. Unmatched items flagged."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map(({ acc, sum }) => {
          if (!sum) return null;
          const reconciled = Math.abs(sum.difference) < 0.01;
          return (
            <Link
              key={acc.id}
              href={`/bank/${acc.code}`}
              className="group rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                    <Banknote className="size-5" />
                  </div>
                  <div>
                    <div className="font-mono text-xs text-fg-tertiary">{acc.code}</div>
                    <div className="text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
                      {acc.name}
                    </div>
                  </div>
                </div>
                <span className="text-base">{flag[acc.currency] ?? ""}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
                <div>
                  <div className="uppercase tracking-wider text-fg-tertiary">GL balance</div>
                  <div className="mt-0.5 font-mono tnum text-base font-semibold text-fg-primary">
                    {sum.glBalance.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-wider text-fg-tertiary">Statement</div>
                  <div className="mt-0.5 font-mono tnum text-base font-semibold text-fg-primary">
                    {sum.statementBalance.toLocaleString()}
                  </div>
                </div>
                <div className="col-span-2 mt-1 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">
                    Difference
                  </span>
                  <span
                    className={
                      "font-mono tnum text-sm font-semibold " +
                      (reconciled ? "text-status-success" : "text-status-warning")
                    }
                  >
                    {reconciled ? "✓ Reconciled" : sum.difference.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-fg-tertiary">
                <span>
                  {sum.unmatchedStatementCount} stmt · {sum.unmatchedGlCount} GL unmatched
                </span>
                <ArrowRight className="size-3.5 text-fg-tertiary group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}

        {summaries.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-sm text-fg-tertiary">
              No bank/cash accounts found in the Chart of Accounts.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
