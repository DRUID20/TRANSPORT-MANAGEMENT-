import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Container,
  Droplet,
  FileText,
  Gauge,
  Phone,
  Plus,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { getTruck } from "@/server/actions/trucks";
import { getSubcontractorById } from "@/server/actions/subcontractors";
import { driverForTruck, trailerForTruck } from "@/server/store/mock-store";
import { jobCardsForTruck } from "@/server/actions/job-cards";
import { JobCardStatusPill } from "@/components/workshop/job-card-status-pill";
import { TruckFuelCard } from "@/components/fleet/truck-fuel-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { OwnerPill } from "@/components/fleet/owner-pill";
import { TruckStatusPill } from "@/components/fleet/truck-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";
import { Avatar } from "@/components/fleet/avatar";
import {
  TrailerStatusPill,
  trailerTypeLabel,
} from "@/components/fleet/trailer-status-pill";
import { DriverStatusPill } from "@/components/fleet/driver-status-pill";

export default async function TruckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const truck = await getTruck(id);
  if (!truck) notFound();

  const sub = truck.subcontractorId
    ? await getSubcontractorById(truck.subcontractorId)
    : undefined;
  const driver = driverForTruck(truck.id);
  const trailer = trailerForTruck(truck.id);
  const jobCards = await jobCardsForTruck(truck.id);

  const tankLabel = truck.tankCapacityLitres
    ? `${truck.tankCapacityLitres.toLocaleString()}`
    : String(truck.capacityTonnes);
  const tankUnit = truck.tankCapacityLitres ? "L" : "t";
  const compartmentLabel = truck.compartmentCount
    ? String(truck.compartmentCount)
    : String(truck.axles);
  const compartmentSub = truck.compartmentCount ? "compartments" : "axles";

  return (
    <div className="stagger-children flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[
          { label: "Trucks", href: "/trucks" },
          { label: truck.registration },
        ]}
        eyebrow="Truck"
        title={truck.registration}
        description={`${truck.make} ${truck.model} · ${truck.year}`}
        actions={
          <>
            <OwnerPill ownerType={truck.ownerType} />
            <TruckStatusPill status={truck.status} />
          </>
        }
      />

      {/* FACTS */}
      <section className="surface-card grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        <FactCell
          label={truck.tankCapacityLitres ? "Tank capacity" : "Capacity"}
          value={tankLabel}
          unit={tankUnit}
          sub={
            truck.permittedProducts && truck.permittedProducts.length > 0
              ? `carries ${truck.permittedProducts.join(", ")}`
              : undefined
          }
        />
        <FactCell label={compartmentSub} value={compartmentLabel} />
        <FactCell label="Engine" value={truck.fuelType === "diesel" ? "Diesel" : "Petrol"} />
        <FactCell label="Year" value={String(truck.year)} />
      </section>

      {/* RELATED RAIL — driver / trailer / owner */}
      <section className="surface-card grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
        <RelatedSlot
          label="Default driver"
          href={driver ? `/drivers/${driver.id}` : undefined}
        >
          {driver ? (
            <div className="flex items-center gap-3">
              <Avatar name={driver.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-fg-primary">
                  {driver.fullName}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] tnum text-fg-tertiary">
                  <Phone className="size-3" />
                  {driver.phone}
                </div>
              </div>
              <DriverStatusPill status={driver.status} />
            </div>
          ) : (
            <span className="text-xs text-fg-tertiary">No default driver</span>
          )}
        </RelatedSlot>

        <RelatedSlot
          label="Attached trailer"
          href={trailer ? `/trailers/${trailer.id}` : undefined}
        >
          {trailer ? (
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg border border-border bg-bg-surface text-fg-tertiary">
                <Container className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[13px] font-semibold text-fg-primary">
                  {trailer.registration}
                </div>
                <div className="text-[11px] text-fg-tertiary">
                  {trailerTypeLabel[trailer.type]} · {trailer.capacityTonnes}t
                </div>
              </div>
              <TrailerStatusPill status={trailer.status} />
            </div>
          ) : (
            <span className="text-xs text-fg-tertiary">No trailer attached</span>
          )}
        </RelatedSlot>

        <RelatedSlot
          label={truck.ownerType === "company_owned" ? "Ownership" : "Subcontractor"}
          href={sub ? `/subcontractors/${sub.id}` : undefined}
        >
          {truck.ownerType === "company_owned" ? (
            <div className="text-[13px] font-semibold text-fg-primary">
              Nile Valley Logistics
            </div>
          ) : sub ? (
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-fg-primary">
                {sub.name}
              </div>
              <div className="truncate text-[11px] text-fg-tertiary">
                {sub.contactPerson}
              </div>
            </div>
          ) : (
            <span className="text-xs text-fg-tertiary">Subcontractor missing</span>
          )}
        </RelatedSlot>
      </section>

      {/* COMPLIANCE */}
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-fg-primary">
            <ShieldCheck className="size-3.5 text-fg-tertiary" />
            Compliance and expiries
          </h2>
        </header>
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          <ExpirySlot label="Insurance" date={truck.insuranceExpiry} />
          <ExpirySlot label="Petroleum liability" date={truck.petroleumLiabilityExpiry} />
          <ExpirySlot label="NTSA inspection" date={truck.ntsaInspectionExpiry} />
          <ExpirySlot label="EPRA transit" date={truck.epraTransitLicenceExpiry} />
          <ExpirySlot label="Tank calibration" date={truck.calibrationDueDate} />
          <ExpirySlot label="COMESA permit" date={truck.comesaPermitExpiry} />
          <ExpirySlot label="Transit permit" date={truck.transitPermitExpiry} />
          {truck.permittedProducts && truck.permittedProducts.length > 0 && (
            <div className="flex flex-col gap-1.5 bg-bg-elevated px-5 py-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-tertiary">
                Carries
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {truck.permittedProducts.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 rounded-md border border-brand-blue/20 bg-brand-blue/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-blue"
                  >
                    <Droplet className="size-2.5" />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FUEL & EFFICIENCY (existing component) */}
      <TruckFuelCard truckId={truck.id} />

      {/* JOB CARDS */}
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-fg-primary">
            <Wrench className="size-3.5 text-fg-tertiary" />
            Service history
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href={{ pathname: "/workshop/new", query: { truck: truck.id } }}>
              <Plus className="size-3" />
              New job card
            </Link>
          </Button>
        </header>
        {jobCards.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-fg-tertiary">
            <Gauge className="size-5" />
            <span className="text-xs">No job cards on file</span>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {jobCards.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/workshop/${j.id}`}
                  className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-brand-blue/[0.04]"
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[12px] font-semibold text-fg-primary group-hover:text-brand-blue">
                        {j.number}
                      </span>
                      <span className="font-mono text-[11px] tnum text-fg-tertiary">
                        {new Date(j.openedAt).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    {j.mechanicAnalysis && (
                      <div className="line-clamp-1 text-[11px] text-fg-secondary">
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
      </section>

      {truck.notes && (
        <section className="surface-card overflow-hidden">
          <header className="border-b border-border px-5 py-3">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              <FileText className="size-3" />
              Notes
            </h2>
          </header>
          <p className="px-5 py-4 text-sm text-fg-secondary">{truck.notes}</p>
        </section>
      )}
    </div>
  );
}

function FactCell({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-tertiary">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono tnum text-2xl font-semibold text-fg-primary">
          {value}
        </span>
        {unit && (
          <span className="text-[11px] font-medium uppercase tracking-wider text-fg-tertiary">
            {unit}
          </span>
        )}
      </div>
      {sub && <span className="text-[11px] text-fg-tertiary">{sub}</span>}
    </div>
  );
}

function RelatedSlot({
  label,
  href,
  children,
}: {
  label: string;
  href?: string;
  children: React.ReactNode;
}) {
  const body = (
    <div className="flex flex-col gap-2 px-5 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-tertiary">
        {label}
      </span>
      {children}
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="group block transition-colors hover:bg-bg-surface/60"
    >
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}

function ExpirySlot({ label, date }: { label: string; date?: string }) {
  return (
    <div className="flex flex-col gap-1.5 bg-bg-elevated px-5 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </span>
      <ExpiryChip date={date} />
    </div>
  );
}
