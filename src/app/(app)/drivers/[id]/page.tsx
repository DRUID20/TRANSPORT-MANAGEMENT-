import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  IdCard,
  Phone,
  Plane,
  Stethoscope,
  Truck as TruckIcon,
} from "lucide-react";
import { getDriverById } from "@/server/actions/drivers";
import { getTruck } from "@/server/actions/trucks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Drivers", href: "/drivers" },
          { label: driver.fullName },
        ]}
        eyebrow="Driver"
        title={driver.fullName}
        actions={<DriverStatusPill status={driver.status} />}
      />

      {/* Hero */}
      <Card>
        <CardContent className="!p-6">
          <div className="flex flex-wrap items-center gap-6">
            <Avatar name={driver.fullName} size="lg" />
            <div className="flex-1">
              <div className="text-xl font-semibold text-fg-primary">{driver.fullName}</div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-fg-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 text-fg-tertiary" />
                  <span className="font-mono tnum">{driver.phone}</span>
                </span>
                <span className="text-fg-tertiary">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <IdCard className="size-3.5 text-fg-tertiary" />
                  <span className="font-mono tnum">ID {driver.nationalId}</span>
                </span>
                {driver.hireDate && (
                  <>
                    <span className="text-fg-tertiary">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-fg-tertiary" />
                      Hired {new Date(driver.hireDate).toLocaleDateString("en-GB")}
                    </span>
                  </>
                )}
              </div>
            </div>
            {truck && (
              <Link
                href={`/trucks/${truck.id}`}
                className="group flex items-center gap-3 rounded-lg border border-border bg-bg-base p-3 transition-colors hover:border-border-strong"
              >
                <TruckIcon className="size-5 text-fg-tertiary group-hover:text-brand-blue" />
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">
                    Default truck
                  </div>
                  <div className="font-mono text-sm font-medium text-fg-primary group-hover:text-brand-blue">
                    {truck.registration}
                  </div>
                </div>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Licence & Medical</CardTitle>
            <CardDescription>Class {driver.licenceClass}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Stat icon={BadgeCheck} label="Licence number" value={driver.licenceNumber} mono />
            <ExpiryStat label="Licence expiry" date={driver.licenceExpiry} />
            <Stat icon={Stethoscope} label="Medical" value={driver.medicalExpiry ? "On file" : "—"} />
            <ExpiryStat label="Medical expiry" date={driver.medicalExpiry} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cross-border documents</CardTitle>
            <CardDescription>Passport · COMESA driver permit</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Stat
              icon={Plane}
              label="Passport"
              value={driver.passportNumber ?? "—"}
              mono
            />
            <ExpiryStat label="Passport expiry" date={driver.passportExpiry} />
            <ExpiryStat
              label="COMESA permit expiry"
              date={driver.comesaDriverPermitExpiry}
            />
          </CardContent>
        </Card>
      </div>

      {driver.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{driver.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-base p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        <Icon className="size-3" /> {label}
      </div>
      <div className={"mt-1 text-sm text-fg-primary " + (mono ? "font-mono tnum tracking-wider" : "")}>
        {value}
      </div>
    </div>
  );
}

function ExpiryStat({ label, date }: { label: string; date?: string }) {
  return (
    <div className="rounded-md border border-border bg-bg-base p-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className="mt-1.5">
        <ExpiryChip date={date} />
      </div>
    </div>
  );
}
