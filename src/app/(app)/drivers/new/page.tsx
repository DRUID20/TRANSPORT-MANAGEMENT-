import Link from "next/link";
import { listTrucks } from "@/server/actions/trucks";
import { PageHeader } from "@/components/layout/page-header";
import { DriverCreateForm } from "./driver-create-form";

export default async function NewDriverPage() {
  const trucks = (await listTrucks()).map((t) => ({ id: t.id, registration: t.registration }));
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Drivers", href: "/drivers" },
          { label: "Add Driver" },
        ]}
        eyebrow="HR & Staff"
        title="Add Driver"
      />
      <DriverCreateForm trucks={trucks} />
      <div className="text-center">
        <Link href="/drivers" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Drivers
        </Link>
      </div>
    </div>
  );
}
