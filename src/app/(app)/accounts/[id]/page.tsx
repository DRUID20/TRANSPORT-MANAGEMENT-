import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Globe, Hash, Layers, Tag } from "lucide-react";
import { getAccountById } from "@/server/actions/accounts";
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
          </div>
        </CardContent>
      </Card>

      {/* Phase 5B placeholder for movements + balance */}
      <Card>
        <CardHeader>
          <CardTitle>Movements &amp; balance</CardTitle>
          <CardDescription>
            Wired in Phase 5B — General Ledger ships journal entries and live balances per account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-xs text-fg-tertiary">
            Once the GL is live, this account will show running balance, monthly
            movements, and drill-down to journal lines.
          </p>
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
      <div className={"mt-1 text-base font-medium text-fg-primary " + (mono ? "font-mono tnum tracking-wider" : "")}>
        {value}
      </div>
    </div>
  );
}
