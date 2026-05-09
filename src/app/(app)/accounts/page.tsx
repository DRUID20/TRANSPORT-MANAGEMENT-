import Link from "next/link";
import { Search } from "lucide-react";
import { accountClassCounts, listAccounts } from "@/server/actions/accounts";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { AccountClassPill } from "@/components/finance/account-class-pill";
import { AccountsFilters } from "./accounts-filters";
import type { AccountClass } from "@/lib/types/accounts";

const VALID_CLASSES: AccountClass[] = [
  "Asset",
  "Liability",
  "Equity",
  "Income",
  "Direct Cost",
  "Expense",
  "Other Income",
  "Other Expense",
  "Tax",
];

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; q?: string }>;
}) {
  const { class: rawClass, q } = await searchParams;
  const klass = (VALID_CLASSES as string[]).includes(rawClass ?? "")
    ? (rawClass as AccountClass)
    : undefined;

  const accounts = await listAccounts({ class: klass, search: q });
  const counts = await accountClassCounts();
  const total = counts.reduce((s, c) => s + c.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Chart of Accounts"
        description={`${total} accounts · 6-digit numbering · Apple × SpaceX × Nile Valley`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total" value={total} />
        <Stat
          label="Assets"
          value={counts.find((c) => c.class === "Asset")?.count ?? 0}
          tone="info"
        />
        <Stat
          label="Income"
          value={counts.find((c) => c.class === "Income")?.count ?? 0}
          tone="success"
        />
        <Stat
          label="Expenses"
          value={counts.find((c) => c.class === "Expense")?.count ?? 0}
          tone="danger"
        />
      </div>

      <Card>
        <CardContent className="!p-4">
          <form className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary" />
              <Input
                name="q"
                type="search"
                placeholder="Search by code, name or type…"
                className="pl-9"
                defaultValue={q ?? ""}
              />
            </div>
            <input type="hidden" name="class" value={klass ?? ""} />
            <button
              type="submit"
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      <AccountsFilters active={klass ?? "all"} q={q} />

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Group / Type</th>
                  <th className="px-5 py-3 font-medium">Normal Bal</th>
                  <th className="px-5 py-3 font-medium">Currency</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((a) => (
                  <tr key={a.id} className="group transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/accounts/${a.id}`}
                        className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue"
                      >
                        {a.code}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-fg-primary">{a.name}</td>
                    <td className="px-5 py-2.5">
                      <AccountClassPill klass={a.class} />
                    </td>
                    <td className="px-5 py-2.5 text-xs text-fg-secondary">
                      <div>{a.group}</div>
                      <div className="text-[11px] text-fg-tertiary">{a.type}</div>
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-fg-secondary">
                      {a.normalBalance}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-fg-secondary">
                      {a.currency}
                    </td>
                    <td className="px-5 py-2.5">
                      {a.status === "Closed" ? (
                        <Badge variant="neutral">Closed</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No accounts match the filters.
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
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "danger";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono text-2xl tnum font-medium ${colour}`}>{value}</div>
    </div>
  );
}
