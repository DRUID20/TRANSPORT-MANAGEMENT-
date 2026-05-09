import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "lucide-react";
import { getTrailerById } from "@/server/actions/trailers";
import { getTruck } from "@/server/actions/trucks";
import { getSubcontractorById } from "@/server/actions/subcontractors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { OwnerPill } from "@/components/fleet/owner-pill";
import {
  TrailerStatusPill,
  trailerTypeLabel,
} from "@/components/fleet/trailer-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";

export default async function TrailerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trailer = await getTrailerById(id);
  if (!trailer) notFound();

  const truck = trailer.attachedTruckId ? await getTruck(trailer.attachedTruckId) : undefined;
  const sub = trailer.subcontractorId ? await getSubcontractorById(trailer.subcontractorId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Trailers", href: "/trailers" },
          { label: trailer.registration },
        ]}
        eyebrow="Asset Register"
        title={trailer.registration}
        description={`${trailerTypeLabel[trailer.type]} · ${trailer.year} · ${trailer.capacityTonnes}t`}
        actions={
          <>
            <OwnerPill ownerType={trailer.ownerType} />
            <TrailerStatusPill status={trailer.status} />
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[260px_1fr]">
          <div className="flex items-center justify-center bg-gradient-to-br from-brand-navy to-bg-base p-8">
            <div className="text-center">
              <Container className="mx-auto size-16 text-white/80" />
              <div className="mt-3 font-mono text-lg font-semibold tracking-wider text-white">
                {trailer.registration}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
                {trailerTypeLabel[trailer.type]}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
            <Stat label="Capacity" value={`${trailer.capacityTonnes}t`} />
            <Stat label="Axles" value={String(trailer.axles)} />
            <Stat label="Year" value={String(trailer.year)} />
            <Stat
              label="Attached to"
              value={truck ? truck.registration : "—"}
              valueClassName="font-mono"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ExpiryRow label="Insurance" date={trailer.insuranceExpiry} />
            <ExpiryRow label="NTSA Inspection" date={trailer.ntsaInspectionExpiry} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ownership</CardTitle>
          </CardHeader>
          <CardContent>
            {trailer.ownerType === "company_owned" ? (
              <div className="text-sm text-fg-primary">
                Company-Owned by{" "}
                <span className="font-semibold">Nile Valley Logistics</span>.
              </div>
            ) : sub ? (
              <Link
                href={`/subcontractors/${sub.id}`}
                className="text-base font-semibold text-fg-primary hover:text-brand-blue"
              >
                {sub.name}
              </Link>
            ) : (
              <span className="text-sm text-fg-tertiary">Subcontractor not found.</span>
            )}
          </CardContent>
        </Card>
      </div>

      {trailer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{trailer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, valueClassName = "" }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={"mt-1 text-xl font-medium text-fg-primary " + valueClassName}>{value}</div>
    </div>
  );
}

function ExpiryRow({ label, date }: { label: string; date?: string }) {
  return (
    <div className="rounded-md border border-border bg-bg-base p-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className="mt-1.5">
        <ExpiryChip date={date} />
      </div>
    </div>
  );
}
