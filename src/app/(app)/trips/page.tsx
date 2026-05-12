import Link from "next/link";
import { ArrowRight, Plus, Route as RouteIcon, Truck as TruckIcon } from "lucide-react";
import { listTrips } from "@/server/actions/trips";
import { listTrucks } from "@/server/actions/trucks";
import { listDrivers } from "@/server/actions/drivers";
import { listCustomers } from "@/server/actions/customers";
import { listBookings } from "@/server/actions/bookings";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { TripStatusPill } from "@/components/trips/trip-status-pill";
import { cn } from "@/lib/utils";

export default async function TripsPage() {
  const [trips, trucks, drivers, customers, bookings] = await Promise.all([
    listTrips(),
    listTrucks(),
    listDrivers(),
    listCustomers(),
    listBookings(),
  ]);
  const truckById = new Map(trucks.map((t) => [t.id, t]));
  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const bookingById = new Map(bookings.map((b) => [b.id, b]));
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const counts = {
    planned: trips.filter((t) => t.status === "planned").length,
    in_transit: trips.filter((t) => t.status === "in_transit").length,
    at_border: trips.filter((t) => t.status === "at_border").length,
    delivered: trips.filter((t) => t.status === "delivered").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Trips"
        description="Active and historical fuel hauls. Plan a trip from a confirmed booking."
        actions={
          <Button asChild size="sm">
            <Link href="/bookings/new">
              <Plus className="size-3.5" />
              New booking
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Planned" value={counts.planned} tone="info" />
        <Stat label="In transit" value={counts.in_transit} tone="info" />
        <Stat label="At border" value={counts.at_border} tone="warning" />
        <Stat label="Delivered" value={counts.delivered} tone="success" />
      </div>

      {trips.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={RouteIcon}
            title="No trips yet"
            description="Confirm a booking and plan it onto dispatch to see your first trip here."
            action={
              <Button asChild>
                <Link href="/bookings/new">
                  <Plus className="size-3.5" />
                  Create booking
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {trips.length} trip{trips.length === 1 ? "" : "s"} · most recent first
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Trip</DataTableHeaderCell>
              <DataTableHeaderCell>Customer</DataTableHeaderCell>
              <DataTableHeaderCell>Route</DataTableHeaderCell>
              <DataTableHeaderCell>Truck</DataTableHeaderCell>
              <DataTableHeaderCell>Driver</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Revenue</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {trips.map((t) => {
              const truck = truckById.get(t.truckId);
              const driver = driverById.get(t.driverId);
              const booking = bookingById.get(t.bookingId);
              const customer = booking ? customerById.get(booking.customerId) : undefined;
              return (
                <DataTableRow key={t.id} linkHref={`/trips/${t.id}`}>
                  <DataTableCell>
                    <Link
                      href={`/trips/${t.id}`}
                      className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue"
                    >
                      {t.number}
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    {customer?.name ?? "—"}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-fg-primary">
                      {t.origin}
                      <ArrowRight className="size-3 text-fg-tertiary" />
                      {t.destination}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    {truck ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-fg-secondary">
                        <TruckIcon className="size-3 text-fg-tertiary" />
                        {truck.registration}
                      </span>
                    ) : (
                      <span className="text-xs text-fg-tertiary">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    {driver?.fullName ?? "—"}
                  </DataTableCell>
                  <DataTableCell>
                    <TripStatusPill status={t.status} />
                  </DataTableCell>
                  <DataTableCell mono align="right">
                    {t.revenueAmount.toLocaleString()} {t.revenueCurrency}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "info" | "warning" | "success";
}) {
  const colour =
    tone === "info"
      ? "text-brand-blue"
      : tone === "warning"
        ? "text-status-warning"
        : tone === "success"
          ? "text-status-success"
          : "text-fg-primary";
  return (
    <div className="surface-card lift-on-hover p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-2xl tnum font-semibold", colour)}>
        {value}
      </div>
    </div>
  );
}
