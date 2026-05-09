import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SupplierCreateForm } from "./supplier-create-form";

export default function NewSupplierPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Suppliers", href: "/suppliers" },
          { label: "Add Supplier" },
        ]}
        eyebrow="Finance"
        title="Add Supplier"
      />
      <SupplierCreateForm />
      <div className="text-center">
        <Link href="/suppliers" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Suppliers
        </Link>
      </div>
    </div>
  );
}
