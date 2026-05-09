import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Globe, Hash, Layers, Tag } from "lucide-react";
import { getAccountById } from "@/server/actions/accounts";
import {
  accountBalance,
  ledgerLinesForAccount,
} from "@/server/actions/ledger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { AccountClassPill } from "@/components/finance/account-class-pill";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccountById(id);
  if (!account) notFound();
  const balance = await accountBalance(id);
  const lines = await ledgerLinesForAccount(id);

  // Compute running balance per line for display
  let running = 0;
  const debitNormal = balance.balanceSide === "Debit";
  const linesWithRunning = lines.map((l) => {
    const delta = debitNormal ? l.debitKes - l.creditKes : l.creditKes - l.debitKes;
    running += delta;
    return { ...l, running };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Accounts", href: "/accounts" }, { label: account.code }]}
        eyebrow="Chart of Accounts"
        title={`${account.code} · ${account.name}`}
        description={`${account.group} · ${account.type}`}
        actions={
          <>
            <AccountClassPill klass={account.class} />
            {account.status === "Closed" ? (
              <Badge variant="neutral">Closed</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="!p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Hash} label="Code" value={account.code} mono />
            <Stat icon={Layers} label="Group" value={account.group} />
            <Stat icon={Tag} label="Type" value={account.type} />
            <Stat icon={Globe} label="Currency" value={account.currency} mono />
            <Stat icon={FileText} label="Normal balance" value={account.normalBalance} />
            <Stat
              label="Total Dr (KES)"
              value={`KSh ${balance.debitKes.toLocaleString()}`}
              mono
            />
            <Stat
              label="Total Cr (KES)"
              value={`KSh ${balance.creditKes.toLocaleString()}`}
              mono
            />
            <Stat
              label={`Balance (${balance.balanceSide})`}
              value={`KSh ${balance.balanceKes.toLocaleString()}`}
              mono
              tone={balance.balanceKes >= 0 ? "success" : "danger"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movements</CardTitle>
          <CardDescription>
            {linesWithRunning.length} line{linesWithRunning.length === 1 ? "" : "s"} posted
          </CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          {linesWithRunning.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-tertiary">
              No postings on this account yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-5 py-2 font-medium">Entry</th>
                    <th className="px-5 py-2 font-medium">Memo / Description</th>
                    <th className="px-5 py-2 text-right font-medium">Dr (KES)</th>
                    <th className="px-5 py-2 text-right font-medium">Cr (KES)</th>
                    <th className="px-5 py-2 text-right font-medium">Running</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {linesWithRunning.map((l) => (
                    <tr key={l.id} className="transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2 font-mono tnum text-xs text-fg-secondary">
                        {l.entry.date}
                      </td>
                      <td className="px-5 py-2">
                        <Link
                          href={`/ledger/${l.entry.id}`}
                          className="font-mono text-xs text-fg-primary hover:text-brand-blue"
                        >
                          {l.entry.number}
                        </Link>
                      </td>
                      <td className="px-5 py-2 text-xs text-fg-primary">
                        <div>{l.entry.memo}</div>
                        {l.description && (
                          <div className="text-[11px] text-fg-tertiary">{l.description}</div>
                        )}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                        {l.debitKes ? l.debitKes.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                        {l.creditKes ? l.creditKes.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                        {l.running.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {account.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{account.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Link href="/accounts" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Chart of Accounts
        </Link>
      </div>
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
  tone?: "default" | "success" | "danger";
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        {Icon ? <Icon className="size-3" /> : null} {label}
      </div>
      <div className={`mt-1 text-base font-medium ${colour} ${mono ? "font-mono tnum tracking-wider" : ""}`}>
        {value}
      </div>
    </div>
  );
}
