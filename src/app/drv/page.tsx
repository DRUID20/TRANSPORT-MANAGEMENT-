import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Calendar,
  IdCard as IdCardIcon,
  MapPin,
  Truck as TruckIcon,
  Wallet,
} from "lucide-react";
import { currentDriverId } from "@/server/actions/driver-session";
import { getDriverById } from "@/server/actions/drivers";
import { getTripById, tripsForDriver } from "@/server/actions/trips";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TripStatusPill } from "@/components/trips/trip-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";
import { Avatar } from "@/components/fleet/avatar";

export default async function DriverHomePage() {
  const driverId = await currentDriverId();
  if (!driverId) redirect("/drv/login");
  const driver = await getDriverById(driverId);
  if (!driver) redirect("/drv/login");

  const allTrips = await tripsForDriver(driverId);
  const activeTrip = allTrips.find(
    (t) => t.status !== "closed" && t.status !== "cancelled",
  );
  const fullTrip = activeTrip ? await getTripById(activeTrip.id) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <Link href="/drv/profile" className="block">
        <Card className="transition-colors hover:border-border-strong">
          <CardContent className="!p-4">
            <div className="flex items-center gap-3">
              <Avatar name={driver.fullName} size="md" />
              <div className="flex-1">
                <div className="text-base font-semibold text-fg-primary">
                  Hello, {driver.fullName.split(" ")[0]}
                </div>
                <div className="font-mono text-[11px] tnum text-fg-tertiary">
                  {driver.phone}
                </div>
              </div>
              <ArrowRight className="size-4 text-fg-tertiary" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Active trip */}
      {fullTrip ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current trip</CardTitle>
              <TripStatusPill status={fullTrip.status} />
            </div>
            <CardDescription>
              <span className="font-mono">{fullTrip.number}</span>
              {fullTrip.customer && ` · ${fullTrip.customer.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="rounded-md bg-bg-base/60 p-3 ring-1 ring-border">
              <div className="flex items-center gap-2 text-sm text-fg-primary">
                <MapPin className="size-3.5 text-status-success" />
                <span className="font-medium">{fullTrip.origin}</span>
              </div>
              <div className="ml-1 my-0.5 h-3 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm text-fg-primary">
                <MapPin className="size-3.5 text-status-danger" />
                <span className="font-medium">{fullTrip.destination}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Stat
                icon={TruckIcon}
                label="Truck"
                value={fullTrip.truck?.registration ?? "—"}
                mono
              />
              <Stat
                icon={Wallet}
                label="Advance"
                value={
                  fullTrip.driverAdvanceKes
                    ? `KSh ${fullTrip.driverAdvanceKes.toLocaleString()}`
                    : "—"
                }
                mono
              />
              <Stat
                icon={Calendar}
                label="Departure"
                value={
                  fullTrip.plannedDepartureDate
                    ? new Date(fullTrip.plannedDepartureDate).toLocaleDateString("en-GB")
                    : "—"
                }
              />
              <Stat
                icon={Building2}
                label="Customer"
                value={fullTrip.customer?.name ?? "—"}
              />
            </div>

            <Link
              href={`/drv/trip/${fullTrip.id}`}
              className="group flex items-center justify-center gap-2 rounded-md bg-brand-blue p-3 text-sm font-medium text-white transition-colors hover:bg-brand-blue-hover"
            >
              Open trip
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No active trip</CardTitle>
            <CardDescription>You'll see your next trip here when dispatched.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Quick documents check */}
      <Card>
        <CardHeader>
          <CardTitle>Your documents</CardTitle>
          <CardDescription>Check ahead of cross-border trips.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DocRow label="Driving licence" date={driver.licenceExpiry} />
          <DocRow label="Medical" date={driver.medicalExpiry} />
          <DocRow label="Passport" date={driver.passportExpiry} />
          <DocRow label="COMESA driver permit" date={driver.comesaDriverPermitExpiry} />
        </CardContent>
      </Card>

      {/* Recent trips */}
      <Card>
        <CardHeader>
          <CardTitle>Recent trips</CardTitle>
        </CardHeader>
        <CardContent className="!p-0">
          <ul className="flex flex-col divide-y divide-border">
            {allTrips.slice(0, 5).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/drv/trip/${t.id}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-bg-base/40"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-medium text-fg-primary">{t.number}</div>
                    <div className="text-xs text-fg-tertiary">
                      {t.origin} → {t.destination}
                    </div>
                  </div>
                  <TripStatusPill status={t.status} />
                </Link>
              </li>
            ))}
            {allTrips.length === 0 && (
              <li className="px-4 py-8 text-center text-xs text-fg-tertiary">
                No trips yet for this driver.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
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
    <div className="rounded-md bg-bg-base/60 p-3 ring-1 ring-border">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        <Icon className="size-3" />
        {label}
      </div>
      <div className={"mt-1 text-sm font-medium text-fg-primary " + (mono ? "font-mono tnum tracking-wider" : "")}>
        {value}
      </div>
    </div>
  );
}

function DocRow({ label, date }: { label: string; date?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-bg-base/40 px-3 py-2 ring-1 ring-border">
      <div className="flex items-center gap-2 text-sm text-fg-primary">
        <IdCardIcon className="size-3.5 text-fg-tertiary" />
        {label}
      </div>
      <ExpiryChip date={date} />
    </div>
  );
}
