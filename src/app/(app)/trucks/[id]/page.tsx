import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Container, FileText, Fuel, Gauge, Layers, Phone, Truck as TruckIcon } from "lucide-react";
import { getTruck } from "@/server/actions/trucks";
import { getSubcontractorById } from "@/server/actions/subcontractors";
import {
  driverForTruck,
  trailerForTruck,
} from "@/server/store/mock-store";
import { jobCardsForTruck } from "@/server/actions/job-cards";
import { JobCardStatusPill } from "@/components/workshop/job-card-status-pill";
import { TruckFuelCard } from "@/components/fleet/truck-fuel-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { OwnerPill } from "@/components/fleet/owner-pill";
import { TruckStatusPill } from "@/components/fleet/truck-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";
import { Avatar } from "@/components/fleet/avatar";
import {
  TrailerStatusPill,
  trailerTypeLabel,
} from "@/components/fleet/trailer-status-pill";
import { DriverStatusPill } from "@/components/fleet/driver-status-pill";

export default async function TruckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const truck = await getTruck(id);
  if (!truck) notFound();

  const sub = truck.subcontractorId
    ? await getSubcontractorById(truck.subcontractorId)
    : undefined;
  const driver = driverForTruck(truck.id);
  const trailer = trailerForTruck(truck.id);
  const jobCards = await jobCardsForTruck(truck.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Trucks", href: "/trucks" },
          { label: truck.registration },
        ]}
        eyebrow="Asset Register"
        title={truck.registration}
        description={`${truck.make} ${truck.model} · ${truck.year} · ${truck.capacityTonnes}t`}
        actions={
          <>
            <OwnerPill ownerType={truck.ownerType} />
            <TruckStatusPill status={truck.status} />
          </>
        }
      />

      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[260px_1fr]">
          <div className="flex items-center justify-center bg-gradient-to-br from-brand-navy to-bg-base p-8">
            <div className="text-center">
              <TruckIcon className="mx-auto size-16 text-white/80" />
              <div className="mt-3 font-mono text-lg font-semibold tracking-wider text-white">
                {truck.registration}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
                {truck.make} · {truck.year}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
            <Stat
              icon={Layers}
              label={truck.tankCapacityLitres ? "Tank capacity" : "Capacity"}
              value={
                truck.tankCapacityLitres
                  ? `${truck.tankCapacityLitres.toLocaleString()} L`
                  : `${truck.capacityTonnes}t`
              }
            />
            <Stat
              icon={Gauge}
              label={truck.compartmentCount ? "Compartments" : "Axles"}
              value={
                truck.compartmentCount
                  ? String(truck.compartmentCount)
                  : String(truck.axles)
              }
            />
            <Stat icon={Fuel} label="Engine fuel" value={truck.fuelType === "diesel" ? "Diesel" : "Petrol"} />
            <Stat
              icon={Calendar}
              label={
                truck.permittedProducts && truck.permittedProducts.length > 0
                  ? "Carries"
                  : "Year"
              }
              value={
                truck.permittedProducts && truck.permittedProducts.length > 0
                  ? truck.permittedProducts.join(" · ")
                  : String(truck.year)
              }
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Compliance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Compliance & expiries</CardTitle>
            <CardDescription>Surfaced on the dashboard 'Needs Attention' panel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <ExpiryRow label="Insurance" date={truck.insuranceExpiry} />
              <ExpiryRow
                label="Petroleum carriers' liability"
                date={truck.petroleumLiabilityExpiry}
              />
              <ExpiryRow label="NTSA Inspection" date={truck.ntsaInspectionExpiry} />
              <ExpiryRow
                label="EPRA transit licence"
                date={truck.epraTransitLicenceExpiry}
              />
              <ExpiryRow
                label="Tank calibration"
                date={truck.calibrationDueDate}
              />
              <ExpiryRow label="COMESA Permit" date={truck.comesaPermitExpiry} />
              <ExpiryRow label="Transit Permit" date={truck.transitPermitExpiry} />
            </div>
          </CardContent>
        </Card>

        {/* Owner */}
        <Card>
          <CardHeader>
            <CardTitle>Ownership</CardTitle>
          </CardHeader>
          <CardContent>
            {truck.ownerType === "company_owned" ? (
              <div className="text-sm text-fg-primary">
                Company-Owned by{" "}
                <span className="font-semibold">Nile Valley Logistics</span>.
              </div>
            ) : sub ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={`/subcontractors/${sub.id}`}
                  className="text-base font-semibold text-fg-primary hover:text-brand-blue"
                >
                  {sub.name}
                </Link>
                <div className="text-xs text-fg-tertiary">{sub.contactPerson}</div>
                <div className="font-mono text-xs text-fg-secondary">{sub.phone}</div>
                <Separator className="my-2" />
                <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">
                  Other trucks from this subcontractor
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sub.trucks
                    .filter((t) => t.id !== truck.id)
                    .map((t) => (
                      <Link
                        key={t.id}
                        href={`/trucks/${t.id}`}
                        className="rounded-md border border-border bg-bg-base px-2 py-1 font-mono text-[11px] text-fg-secondary hover:border-border-strong hover:text-fg-primary"
                      >
                        {t.registration}
                      </Link>
                    ))}
                  {sub.trucks.filter((t) => t.id !== truck.id).length === 0 && (
                    <span className="text-xs text-fg-tertiary">None</span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-sm text-fg-tertiary">Subcontractor not found.</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Driver + Trailer */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Default driver</CardTitle>
          </CardHeader>
          <CardContent>
            {driver ? (
              <Link
                href={`/drivers/${driver.id}`}
                className="group flex items-center gap-4"
              >
                <Avatar name={driver.fullName} size="md" />
                <div className="flex-1">
                  <div className="text-base font-semibold text-fg-primary group-hover:text-brand-blue">
                    {driver.fullName}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-fg-tertiary">
                    <Phone className="size-3" />
                    {driver.phone}
                  </div>
                </div>
                <DriverStatusPill status={driver.status} />
              </Link>
            ) : (
              <span className="text-sm text-fg-tertiary">No default driver assigned.</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attached trailer</CardTitle>
          </CardHeader>
          <CardContent>
            {trailer ? (
              <Link
                href={`/trailers/${trailer.id}`}
                className="group flex items-center gap-4"
              >
                <div className="flex size-10 items-center justify-center rounded-md bg-bg-base text-fg-tertiary ring-1 ring-border group-hover:text-brand-blue">
                  <Container className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-base font-semibold text-fg-primary group-hover:text-brand-blue">
                    {trailer.registration}
                  </div>
                  <div className="text-xs text-fg-tertiary">
                    {trailerTypeLabel[trailer.type]} · {trailer.capacityTonnes}t
                  </div>
                </div>
                <TrailerStatusPill status={trailer.status} />
              </Link>
            ) : (
              <span className="text-sm text-fg-tertiary">No trailer attached.</span>
            )}
          </CardContent>
        </Card>
      </div>

      {truck.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{truck.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Fuel & efficiency */}
      <TruckFuelCard truckId={truck.id} />

      {/* Service & Job Cards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service &amp; Job Cards</CardTitle>
              <CardDescription>
                {jobCards.length === 0
                  ? "No job cards yet for this truck."
                  : `${jobCards.length} job card${jobCards.length === 1 ? "" : "s"} on file.`}
              </CardDescription>
            </div>
            <Link
              href={{ pathname: "/workshop/new", query: { truck: truck.id } }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-base px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              + New Job Card
            </Link>
          </div>
        </CardHeader>
        <CardContent className="!p-0">
          {jobCards.length === 0 ? (
            <EmptyHint icon={Gauge} text="Open the first Job Card from Workshop." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {jobCards.map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/workshop/${j.id}`}
                    className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg-base/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-sm font-medium text-fg-primary group-hover:text-brand-blue">
                          {j.number}
                        </span>
                        <span className="text-xs text-fg-tertiary">
                          {new Date(j.openedAt).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                      {j.mechanicAnalysis && (
                        <div className="line-clamp-1 text-xs text-fg-secondary">
                          {j.mechanicAnalysis}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tnum text-xs text-fg-secondary">
                        KSh {j.totalKes.toLocaleString()}
                      </span>
                      <JobCardStatusPill status={j.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Phase 2+ placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent trips</CardTitle>
          <CardDescription>Phase 2 — Trips module</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyHint icon={FileText} text="Trip history will appear here once Trips ship." />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-bg-elevated p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-fg-tertiary">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-1 font-mono text-xl font-medium text-fg-primary">{value}</div>
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

function EmptyHint({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-fg-tertiary">
      <Icon className="size-6" />
      <span className="text-xs">{text}</span>
    </div>
  );
}
