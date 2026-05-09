import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SubcontractorCreateForm } from "./subcontractor-create-form";

export default function NewSubcontractorPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Subcontractors", href: "/subcontractors" },
          { label: "Add Subcontractor" },
        ]}
        eyebrow="Partners"
        title="Add Subcontractor"
        description="A third-party haulier whose trucks operate under Nile Valley."
      />
      <SubcontractorCreateForm />
      <div className="text-center">
        <Link href="/subcontractors" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Subcontractors
        </Link>
      </div>
    </div>
  );
}
