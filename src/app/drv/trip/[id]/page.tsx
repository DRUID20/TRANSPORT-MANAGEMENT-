import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Phone,
  Truck as TruckIcon,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { currentDriverId } from "@/server/actions/driver-session";
import { getTripById } from "@/server/actions/trips";
import { listBorderCrossingsForTrip } from "@/server/actions/borders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TripStatusPill } from "@/components/trips/trip-status-pill";
import { DriverStatusButtons } from "@/components/driver/driver-status-buttons";

export default async function DriverTripPage({ params }: { params: Promise<{ id: string }> }) {
  const driverId = await currentDriverId();
  if (!driverId) redirect("/drv/login");
  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) notFound();
  // Drivers can only see their own trips
  if (trip.driverId !== driverId) redirect("/drv");

  const borders = await listBorderCrossingsForTrip(trip.id);
  const lastBorder = [...borders].reverse().find((b) => b.status !== "cleared");

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/drv"
        className="inline-flex items-center gap-1.5 text-xs text-fg-tertiary hover:text-fg-secondary"
      >
        <ArrowLeft className="size-3" /> Back home
      </Link>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="font-mono">{trip.number}</CardTitle>
              <p className="mt-0.5 text-xs text-fg-tertiary">
                {trip.customer?.name ?? "—"}
              </p>
            </div>
            <TripStatusPill status={trip.status} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-md bg-bg-base/60 p-3 ring-1 ring-border">
            <div className="flex items-center gap-2 text-sm text-fg-primary">
              <MapPin className="size-3.5 text-status-success" />
              <span className="font-medium">{trip.origin}</span>
            </div>
            <div className="ml-1 my-1 h-4 w-px bg-border" />
            <div className="flex items-center gap-2 text-sm text-fg-primary">
              <MapPin className="size-3.5 text-status-danger" />
              <span className="font-medium">{trip.destination}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Stat
              icon={Package}
              label="Cargo"
              value={`${trip.cargoQuantity} ${trip.cargoUnit}`}
              mono
            />
            <Stat
              icon={Wallet}
              label="Advance"
              value={
                trip.driverAdvanceKes
                  ? `KSh ${trip.driverAdvanceKes.toLocaleString()}`
                  : "—"
              }
              mono
            />
            <Stat
              icon={TruckIcon}
              label="Truck"
              value={trip.truck?.registration ?? "—"}
              mono
            />
            <Stat
              icon={Calendar}
              label="Departure"
              value={
                trip.plannedDepartureDate
                  ? new Date(trip.plannedDepartureDate).toLocaleDateString("en-GB")
                  : "—"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Status buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Update status</CardTitle>
        </CardHeader>
        <CardContent>
          <DriverStatusButtons
            tripId={trip.id}
            currentStatus={trip.status}
            actorName={trip.driver?.fullName ?? "Driver"}
          />
        </CardContent>
      </Card>

      {/* Last border (if applicable) */}
      {lastBorder && (
        <Card>
          <CardHeader>
            <CardTitle>Border post</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-fg-primary">{lastBorder.postName}</div>
            <div className="font-mono text-[11px] tnum text-fg-tertiary">
              {lastBorder.status} ·{" "}
              {lastBorder.arrivedAt &&
                new Date(lastBorder.arrivedAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer contact */}
      {trip.customer?.phone && (
        <a
          href={`tel:${trip.customer.phone}`}
          className="flex items-center justify-center gap-2 rounded-md border border-border bg-bg-elevated p-3 text-sm font-medium text-fg-primary transition-colors hover:border-border-strong"
        >
          <Phone className="size-4 text-fg-tertiary" />
          Call {trip.customer.contactPerson}
        </a>
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
