import Link from "next/link";
import { listTrucks } from "@/server/actions/trucks";
import { PageHeader } from "@/components/layout/page-header";
import { JobCardCreateForm } from "./job-card-create-form";

export default async function NewJobCardPage({
  searchParams,
}: {
  searchParams: Promise<{ truck?: string }>;
}) {
  const { truck } = await searchParams;
  const trucks = (await listTrucks()).map((t) => ({ id: t.id, registration: t.registration }));
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Workshop", href: "/workshop" },
          { label: "New Job Card" },
        ]}
        eyebrow="Workshop"
        title="New Job Card"
        description="Open the card now; add services, spares, and the mechanic analysis as work progresses."
      />
      <JobCardCreateForm trucks={trucks} preselectTruckId={truck} />
      <div className="text-center">
        <Link href="/workshop" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Workshop
        </Link>
      </div>
    </div>
  );
}
