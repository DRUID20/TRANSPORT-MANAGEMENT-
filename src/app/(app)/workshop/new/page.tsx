import Link from "next/link";
import { listTrucks } from "@/server/actions/trucks";
import { listTrips } from "@/server/actions/trips";
import { PageHeader } from "@/components/layout/page-header";
import { JobCardCreateForm } from "./job-card-create-form";

export default async function NewJobCardPage({
  searchParams,
}: {
  searchParams: Promise<{ truck?: string }>;
}) {
  const { truck } = await searchParams;
  const trucks = (await listTrucks()).map((t) => ({ id: t.id, registration: t.registration }));
  // Only offer in-flight trips for the optional en-route-breakdown link.
  const trips = (await listTrips())
    .filter((t) => t.status !== "closed" && t.status !== "cancelled")
    .map((t) => ({
      id: t.id,
      label: `${t.number} · ${t.origin} → ${t.destination}`,
    }));
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
      <JobCardCreateForm trucks={trucks} trips={trips} preselectTruckId={truck} />
      <div className="text-center">
        <Link href="/workshop" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Workshop
        </Link>
      </div>
    </div>
  );
}
