import Link from "next/link";
import { trialBalance } from "@/server/actions/ledger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { AccountClassPill } from "@/components/finance/account-class-pill";
import type { AccountClass } from "@/lib/types/accounts";

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const rows = await trialBalance({ fromDate: from, toDate: to });

  const totalDr = rows.reduce((s, r) => s + r.debitKes, 0);
  const totalCr = rows.reduce((s, r) => s + r.creditKes, 0);
  const inBalance = Math.abs(totalDr - totalCr) < 0.01;

  // Group by class
  const grouped: Record<string, typeof rows> = {};
  for (const r of rows) {
    (grouped[r.class] ??= []).push(r);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "General Ledger", href: "/ledger" }, { label: "Trial Balance" }]}
        eyebrow="Finance"
        title="Trial Balance"
        description={
          from || to
            ? `Period ${from ?? "…"} → ${to ?? "…"}`
            : "All postings to date"
        }
      />

      {/* Period filter */}
      <Card>
        <CardContent className="!p-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-tertiary">From</label>
              <input
                type="date"
                name="from"
                defaultValue={from ?? ""}
                className="h-9 rounded-md border border-border bg-bg-base px-2 font-mono text-xs tnum text-fg-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-tertiary">To</label>
              <input
                type="date"
                name="to"
                defaultValue={to ?? ""}
                className="h-9 rounded-md border border-border bg-bg-base px-2 font-mono text-xs tnum text-fg-primary"
              />
            </div>
            <button
              type="submit"
              className="h-9 rounded-md border border-border bg-bg-elevated px-3 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              Apply
            </button>
            <Link
              href="/ledger/trial-balance"
              className="self-end text-[11px] text-fg-tertiary hover:text-fg-secondary"
            >
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      {/* Rows grouped by class */}
      {Object.entries(grouped).map(([cls, rs]) => (
        <Card key={cls}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AccountClassPill klass={cls as AccountClass} />
              <span className="text-fg-tertiary text-xs font-normal">
                {rs.length} account{rs.length === 1 ? "" : "s"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Code</th>
                  <th className="px-5 py-2 font-medium">Account</th>
                  <th className="px-5 py-2 text-right font-medium">Dr</th>
                  <th className="px-5 py-2 text-right font-medium">Cr</th>
                  <th className="px-5 py-2 text-right font-medium">Balance</th>
                  <th className="px-5 py-2 font-medium">Side</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rs.map((r) => (
                  <tr key={r.accountId} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2">
                      <Link
                        href={`/accounts/${r.accountId}`}
                        className="font-mono text-xs text-fg-primary hover:text-brand-blue"
                      >
                        {r.code}
                      </Link>
                    </td>
                    <td className="px-5 py-2 text-fg-primary">{r.name}</td>
                    <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.debitKes ? r.debitKes.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.creditKes ? r.creditKes.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                      {r.balanceKes.toLocaleString()}
                    </td>
                    <td className="px-5 py-2 font-mono text-[11px] text-fg-secondary">
                      {r.balanceSide}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {/* Totals */}
      <Card className={inBalance ? "border-status-success/30" : "border-status-danger/30"}>
        <CardContent className="!p-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total Dr (KES)" value={`KSh ${totalDr.toLocaleString()}`} />
            <Stat label="Total Cr (KES)" value={`KSh ${totalCr.toLocaleString()}`} />
            <Stat
              label="Difference"
              value={inBalance ? "Balanced ✓" : `KSh ${(totalDr - totalCr).toLocaleString()}`}
              tone={inBalance ? "success" : "danger"}
            />
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-fg-tertiary">
            No postings to summarise.{" "}
            <Link href="/ledger/new" className="text-brand-blue hover:underline">
              Post a journal →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-base font-semibold ${colour}`}>{value}</div>
    </div>
  );
}
