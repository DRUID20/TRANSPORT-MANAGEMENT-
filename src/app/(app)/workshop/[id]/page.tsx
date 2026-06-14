import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobCardById } from "@/server/actions/job-cards";
import { getTruck } from "@/server/actions/trucks";
import { getTripById } from "@/server/actions/trips";
import { listSuppliers } from "@/server/actions/suppliers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { JobCardStatusPill } from "@/components/workshop/job-card-status-pill";
import { JobCardEditor } from "./job-card-editor";

export default async function JobCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jc = await getJobCardById(id);
  if (!jc) notFound();
  const truck = await getTruck(jc.truckId);
  const suppliers = await listSuppliers();
  const trip = jc.tripId ? await getTripById(jc.tripId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Workshop", href: "/workshop" },
          { label: jc.number },
        ]}
        eyebrow="Job Card"
        title={jc.number}
        description={
          truck
            ? `${truck.registration} · ${truck.make} ${truck.model}`
            : `Truck ${jc.truckId}`
        }
        actions={<JobCardStatusPill status={jc.status} />}
      />

      {/* Header summary */}
      <Card>
        <CardContent className="!p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Mechanic" value={jc.mechanicName} />
            <Stat
              label="Opened"
              value={new Date(jc.openedAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            <Stat
              label="Opening odo"
              value={
                jc.openingOdometer !== undefined
                  ? `${jc.openingOdometer.toLocaleString()} km`
                  : "—"
              }
              mono
            />
            {jc.closedAt ? (
              <Stat
                label="Closed"
                value={new Date(jc.closedAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            ) : (
              <Stat label="Total so far" value={`KSh ${jc.totalKes.toLocaleString()}`} mono large />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Linked truck mini-card */}
      {truck && (
        <Card>
          <CardHeader>
            <CardTitle>Truck</CardTitle>
            <CardDescription>Status auto-managed by Job Card workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/trucks/${truck.id}`}
              className="inline-flex items-center gap-3 rounded-md border border-border bg-bg-base px-3 py-2 transition-colors hover:border-border-strong"
            >
              <span className="font-mono text-sm font-semibold tracking-wider text-fg-primary">
                {truck.registration}
              </span>
              <span className="text-xs text-fg-secondary">
                {truck.make} {truck.model}
              </span>
            </Link>
          </CardContent>
        </Card>
      )}

      {trip && (
        <Card>
          <CardHeader>
            <CardTitle>Linked trip</CardTitle>
            <CardDescription>En-route breakdown — this repair flows into the trip&apos;s P&amp;L.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/trips/${trip.id}`}
              className="inline-flex items-center gap-3 rounded-md border border-border bg-bg-base px-3 py-2 transition-colors hover:border-border-strong"
            >
              <span className="font-mono text-sm font-semibold text-fg-primary">{trip.number}</span>
              <span className="text-xs text-fg-secondary">
                {trip.origin} → {trip.destination}
              </span>
            </Link>
          </CardContent>
        </Card>
      )}

      <JobCardEditor
        jobCard={jc}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  mono = false,
  large = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  large?: boolean;
}) {
  return (
    <div>
      <div className="text-[13px] font-semibold uppercase tracking-wider text-fg-secondary">{label}</div>
      <div
        className={
          "mt-1 font-medium text-fg-primary " +
          (mono ? "font-mono tnum " : "") +
          (large ? "text-2xl" : "text-sm")
        }
      >
        {value}
      </div>
    </div>
  );
}
