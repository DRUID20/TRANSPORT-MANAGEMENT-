import Link from "next/link";
import { listAccounts } from "@/server/actions/accounts";
import { PageHeader } from "@/components/layout/page-header";
import { JournalEntryForm } from "./journal-entry-form";

export default async function NewJournalEntryPage() {
  const accs = (await listAccounts({ status: "Active" })).map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    currency: a.currency,
  }));
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "General Ledger", href: "/ledger" }, { label: "Post Journal" }]}
        eyebrow="Finance"
        title="Post Journal Entry"
        description="Double-entry posting with multi-currency. Total debits must equal total credits in KES."
      />
      <JournalEntryForm accounts={accs} />
      <div className="text-center">
        <Link href="/ledger" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to General Ledger
        </Link>
      </div>
    </div>
  );
}
