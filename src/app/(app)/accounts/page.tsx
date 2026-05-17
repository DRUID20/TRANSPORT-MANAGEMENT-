import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { accountClassCounts, listAccounts } from "@/server/actions/accounts";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { AccountClassPill } from "@/components/finance/account-class-pill";
import { AccountsFilters } from "./accounts-filters";
import type { AccountClass } from "@/lib/types/accounts";
import { cn } from "@/lib/utils";

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

  const [accounts, counts] = await Promise.all([
    listAccounts({ class: klass, search: q }),
    accountClassCounts(),
  ]);
  const total = counts.reduce((s, c) => s + c.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Chart of accounts"
        description={`${total} accounts · 6-digit numbering.`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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

      <div className="surface-card p-3">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            name="q"
            type="search"
            placeholder="Search by code, name or type…"
            leadingIcon={<Search />}
            defaultValue={q ?? ""}
            className="h-9 flex-1"
          />
          <input type="hidden" name="class" value={klass ?? ""} />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      <AccountsFilters active={klass ?? "all"} q={q} />

      {accounts.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={BookOpen}
            title="No accounts match these filters"
            description="Try clearing filters or broadening your search."
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {accounts.length} of {total} account{total === 1 ? "" : "s"} shown
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Code</DataTableHeaderCell>
              <DataTableHeaderCell>Name</DataTableHeaderCell>
              <DataTableHeaderCell>Class</DataTableHeaderCell>
              <DataTableHeaderCell>Group / Type</DataTableHeaderCell>
              <DataTableHeaderCell>Normal bal</DataTableHeaderCell>
              <DataTableHeaderCell>Currency</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {accounts.map((a) => (
              <DataTableRow key={a.id} linkHref={`/accounts/${a.id}`}>
                <DataTableCell>
                  <Link
                    href={`/accounts/${a.id}`}
                    className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue"
                  >
                    {a.code}
                  </Link>
                </DataTableCell>
                <DataTableCell className="text-fg-primary">{a.name}</DataTableCell>
                <DataTableCell>
                  <AccountClassPill klass={a.class} />
                </DataTableCell>
                <DataTableCell className="text-xs text-fg-secondary">
                  <div className="leading-tight">{a.group}</div>
                  <div className="text-[11px] text-fg-tertiary">{a.type}</div>
                </DataTableCell>
                <DataTableCell mono className="text-[11px] text-fg-secondary">
                  {a.normalBalance}
                </DataTableCell>
                <DataTableCell mono className="text-[11px] text-fg-secondary">
                  {a.currency}
                </DataTableCell>
                <DataTableCell>
                  {a.status === "Closed" ? (
                    <Badge variant="neutral">Closed</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
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
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "danger";
}) {
  const colour =
    tone === "info"
      ? "text-brand-blue"
      : tone === "success"
        ? "text-status-success"
        : tone === "danger"
          ? "text-status-danger"
          : "text-fg-primary";
  return (
    <div className="surface-card lift-on-hover p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-2xl tnum font-semibold", colour)}>
        {value}
      </div>
    </div>
  );
}
