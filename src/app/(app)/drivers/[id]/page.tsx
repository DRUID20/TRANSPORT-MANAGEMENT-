import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  FileText,
  IdCard,
  Phone,
  Plane,
  ShieldCheck,
  Stethoscope,
  Truck as TruckIcon,
} from "lucide-react";
import { getDriverById } from "@/server/actions/drivers";
import { getTruck } from "@/server/actions/trucks";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/fleet/avatar";
import { DriverStatusPill } from "@/components/fleet/driver-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const driver = await getDriverById(id);
  if (!driver) notFound();

  const truck = driver.defaultTruckId ? await getTruck(driver.defaultTruckId) : undefined;

  const hireYears = driver.hireDate
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(driver.hireDate).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        ),
      )
    : null;

  return (
    <div className="stagger-children flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[
          { label: "Drivers", href: "/drivers" },
          { label: driver.fullName },
        ]}
        eyebrow="Driver"
        title={driver.fullName}
        actions={<DriverStatusPill status={driver.status} />}
      />

      {/* HERO — avatar + identity + default truck */}
      <section className="surface-card flex flex-wrap items-center gap-5 px-5 py-4">
        <Avatar name={driver.fullName} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="text-[19px] font-semibold tracking-tight text-fg-primary">
            {driver.fullName}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-fg-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3 text-fg-tertiary" />
              <span className="font-mono tnum">{driver.phone}</span>
            </span>
            <span className="text-fg-tertiary">·</span>
            <span className="inline-flex items-center gap-1.5">
              <IdCard className="size-3 text-fg-tertiary" />
              <span className="font-mono tnum">ID {driver.nationalId}</span>
            </span>
            {driver.hireDate && (
              <>
                <span className="text-fg-tertiary">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3 text-fg-tertiary" />
                  Hired{" "}
                  {new Date(driver.hireDate).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })}
                  {hireYears !== null && hireYears > 0 && (
                    <span className="text-fg-tertiary">
                      ({hireYears} yr{hireYears === 1 ? "" : "s"})
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
        {truck && (
          <Link
            href={`/trucks/${truck.id}`}
            className="group flex items-center gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2.5 transition-colors hover:border-border-strong"
          >
            <TruckIcon className="size-4 text-fg-tertiary group-hover:text-brand-blue" />
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-tertiary">
                Default truck
              </div>
              <div className="font-mono text-[13px] font-semibold text-fg-primary group-hover:text-brand-blue">
                {truck.registration}
              </div>
            </div>
          </Link>
        )}
      </section>

      {/* FACTS */}
      <section className="surface-card grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 sm:divide-y-0">
        <FactCell label="Licence class" value={driver.licenceClass} mono />
        <FactCell
          label="Licence no."
          value={driver.licenceNumber}
          mono
          sub="NTSA-issued"
        />
        <FactCell
          label="Cross-border"
          value={driver.passportNumber ? "Yes" : "No"}
          sub={driver.passportNumber ? `Passport ${driver.passportNumber}` : "Domestic only"}
        />
      </section>

      {/* COMPLIANCE GRID */}
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-fg-primary">
            <ShieldCheck className="size-3.5 text-fg-tertiary" />
            Compliance
          </h2>
        </header>
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <ExpirySlot label="Licence" date={driver.licenceExpiry} icon={BadgeCheck} />
          <ExpirySlot label="Medical" date={driver.medicalExpiry} icon={Stethoscope} />
          <ExpirySlot label="Passport" date={driver.passportExpiry} icon={Plane} />
          <ExpirySlot
            label="COMESA permit"
            date={driver.comesaDriverPermitExpiry}
            icon={ShieldCheck}
          />
        </div>
      </section>

      {driver.notes && (
        <section className="surface-card overflow-hidden">
          <header className="border-b border-border px-5 py-3">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              <FileText className="size-3" />
              Notes
            </h2>
          </header>
          <p className="px-5 py-4 text-sm text-fg-secondary">{driver.notes}</p>
        </section>
      )}
    </div>
  );
}

function FactCell({
  label,
  value,
  mono = false,
  sub,
}: {
  label: string;
  value: string;
  mono?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-tertiary">
        {label}
      </span>
      <span
        className={
          "text-2xl font-semibold text-fg-primary " +
          (mono ? "font-mono tnum tracking-wide" : "tracking-tight")
        }
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-fg-tertiary">{sub}</span>}
    </div>
  );
}

function ExpirySlot({
  label,
  date,
  icon: Icon,
}: {
  label: string;
  date?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-2 bg-bg-elevated px-5 py-4">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-tertiary">
        <Icon className="size-3" />
        {label}
      </span>
      <ExpiryChip date={date} />
    </div>
  );
}
