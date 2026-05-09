import Link from "next/link";
import { listSubcontractorsForSelect } from "@/server/actions/trucks";
import { PageHeader } from "@/components/layout/page-header";
import { TruckCreateForm } from "./truck-create-form";

export default async function NewTruckPage() {
  const subs = await listSubcontractorsForSelect();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Trucks", href: "/trucks" },
          { label: "Add Truck" },
        ]}
        eyebrow="Asset Register"
        title="Add Truck"
        description="Register a new company-owned or subcontractor truck."
      />
      <TruckCreateForm subcontractors={subs} />
      <div className="text-center">
        <Link href="/trucks" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Trucks
        </Link>
      </div>
    </div>
  );
}
