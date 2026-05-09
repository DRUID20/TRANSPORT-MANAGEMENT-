import Link from "next/link";
import { listSubcontractorsForSelect, listTrucks } from "@/server/actions/trucks";
import { PageHeader } from "@/components/layout/page-header";
import { TrailerCreateForm } from "./trailer-create-form";

export default async function NewTrailerPage() {
  const subs = await listSubcontractorsForSelect();
  const trucks = (await listTrucks()).map((t) => ({ id: t.id, registration: t.registration }));
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Trailers", href: "/trailers" },
          { label: "Add Trailer" },
        ]}
        eyebrow="Asset Register"
        title="Add Trailer"
      />
      <TrailerCreateForm subcontractors={subs} trucks={trucks} />
      <div className="text-center">
        <Link href="/trailers" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Trailers
        </Link>
      </div>
    </div>
  );
}
