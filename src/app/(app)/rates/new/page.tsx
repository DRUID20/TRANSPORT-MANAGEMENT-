import Link from "next/link";
import { listCustomers } from "@/server/actions/customers";
import { PageHeader } from "@/components/layout/page-header";
import { RateCreateForm } from "./rate-create-form";

export default async function NewRatePage() {
  const customers = (await listCustomers()).map((c) => ({ id: c.id, name: c.name }));
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Rates", href: "/rates" }, { label: "Add Rate" }]}
        eyebrow="Operations"
        title="Add Rate"
        description="Per-route rate. Customer-specific overrides take priority over defaults."
      />
      <RateCreateForm customers={customers} />
      <div className="text-center">
        <Link href="/rates" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Rates
        </Link>
      </div>
    </div>
  );
}
