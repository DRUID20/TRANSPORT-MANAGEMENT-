import Link from "next/link";
import { Scale } from "lucide-react";
import { trialBalance } from "@/server/actions/ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { AccountClassPill } from "@/components/finance/account-class-pill";
import type { AccountClass } from "@/lib/types/accounts";
import { cn } from "@/lib/utils";

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

  const grouped: Record<string, typeof rows> = {};
  for (const r of rows) {
    (grouped[r.class] ??= []).push(r);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "General Ledger", href: "/ledger" },
          { label: "Trial Balance" },
        ]}
        eyebrow="Finance"
        title="Trial balance"
        description={
          from || to
            ? `Period ${from ?? "…"} → ${to ?? "…"}`
            : "All postings to date."
        }
      />

      <div className="surface-card p-3">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-center" method="get">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              From
            </label>
            <Input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="h-9 font-mono tnum sm:max-w-[180px]"
            />
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              To
            </label>
            <Input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="h-9 font-mono tnum sm:max-w-[180px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="secondary" size="sm">
              Apply
            </Button>
            {(from || to) && (
              <Link
                href="/ledger/trial-balance"
                className="text-[11px] text-fg-tertiary hover:text-fg-secondary"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={Scale}
            title="No postings to summarise"
            description="Post a journal entry — manual or auto-derived from trip / invoice / fuel — to populate the trial balance."
            action={
              <Button asChild>
                <Link href="/ledger/new">Post journal</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([cls, rs]) => (
            <section key={cls} className="surface-card overflow-hidden">
              <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <AccountClassPill klass={cls as AccountClass} />
                  <span className="text-xs text-fg-tertiary">
                    {rs.length} account{rs.length === 1 ? "" : "s"}
                  </span>
                </div>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-bg-surface/60 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
                    <tr>
                      <th className="px-5 py-2.5 font-semibold">Code</th>
                      <th className="px-5 py-2.5 font-semibold">Account</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Dr</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Cr</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Balance</th>
                      <th className="px-5 py-2.5 font-semibold">Side</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rs.map((r) => (
                      <tr key={r.accountId} className="transition-colors hover:bg-bg-surface/40">
                        <td className="px-5 py-2">
                          <Link
                            href={`/accounts/${r.accountId}`}
                            className="font-mono text-xs font-semibold text-fg-primary hover:text-brand-blue"
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
              </div>
            </section>
          ))}

          <section
            className={cn(
              "surface-card p-5",
              inBalance
                ? "border-status-success/30 bg-status-success/[0.03]"
                : "border-status-danger/30 bg-status-danger/[0.03]",
            )}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TotalsStat
                label="Total Dr (KES)"
                value={`KSh ${totalDr.toLocaleString()}`}
              />
              <TotalsStat
                label="Total Cr (KES)"
                value={`KSh ${totalCr.toLocaleString()}`}
              />
              <TotalsStat
                label="Difference"
                value={
                  inBalance
                    ? "Balanced ✓"
                    : `KSh ${(totalDr - totalCr).toLocaleString()}`
                }
                tone={inBalance ? "success" : "danger"}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function TotalsStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const colour =
    tone === "success"
      ? "text-status-success"
      : tone === "danger"
        ? "text-status-danger"
        : "text-fg-primary";
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div className={cn("mt-1 font-mono tnum text-base font-semibold", colour)}>
        {value}
      </div>
    </div>
  );
}
