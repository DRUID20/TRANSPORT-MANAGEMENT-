import Link from "next/link";
import { listSuppliers } from "@/server/actions/suppliers";
import { listAccounts } from "@/server/actions/accounts";
import { PageHeader } from "@/components/layout/page-header";
import { BillCreateForm } from "./bill-create-form";

export default async function NewBillPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string }>;
}) {
  const { supplier } = await searchParams;
  const suppliers = (await listSuppliers()).map((s) => ({ id: s.id, name: s.name }));

  // Only show expense-class accounts for bill lines
  const allAccounts = await listAccounts({ status: "Active" });
  const expenseAccounts = allAccounts
    .filter(
      (a) =>
        a.class === "Expense" ||
        a.class === "Direct Cost" ||
        a.class === "Other Expense" ||
        a.class === "Asset", // for capex bills
    )
    .map((a) => ({ id: a.id, code: a.code, name: a.name }));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Bills", href: "/bills" }, { label: "New Bill" }]}
        eyebrow="Finance · AP"
        title="Create Bill"
        description="Capture a supplier bill. Each line allocates to an expense account; AP is credited on post."
      />
      <BillCreateForm
        suppliers={suppliers}
        expenseAccounts={expenseAccounts}
        preselectSupplierId={supplier}
      />
      <div className="text-center">
        <Link href="/bills" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Bills
        </Link>
      </div>
    </div>
  );
}
