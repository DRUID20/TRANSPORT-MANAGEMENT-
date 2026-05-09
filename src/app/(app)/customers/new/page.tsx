import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerCreateForm } from "./customer-create-form";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Customers", href: "/customers" }, { label: "Add Customer" }]}
        eyebrow="Partners"
        title="Add Customer"
      />
      <CustomerCreateForm />
      <div className="text-center">
        <Link href="/customers" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Customers
        </Link>
      </div>
    </div>
  );
}
