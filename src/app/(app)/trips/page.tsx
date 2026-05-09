import Link from "next/link";
import { ArrowRight, Truck as TruckIcon } from "lucide-react";
import { listTrips } from "@/server/actions/trips";
import { listTrucks } from "@/server/actions/trucks";
import { listDrivers } from "@/server/actions/drivers";
import { listCustomers } from "@/server/actions/customers";
import { listBookings } from "@/server/actions/bookings";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { TripStatusPill } from "@/components/trips/trip-status-pill";

export default async function TripsPage() {
  const trips = await listTrips();
  const trucks = await listTrucks();
  const drivers = await listDrivers();
  const customers = await listCustomers();
  const bookings = await listBookings();
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
        description="Active and historical trips. Plan a trip from a confirmed booking."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Planned" value={counts.planned} tone="info" />
        <Stat label="In Transit" value={counts.in_transit} tone="info" />
        <Stat label="At Border" value={counts.at_border} tone="warning" />
        <Stat label="Delivered" value={counts.delivered} tone="success" />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Trip</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Truck</th>
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trips.map((t) => {
                  const truck = truckById.get(t.truckId);
                  const driver = driverById.get(t.driverId);
                  const booking = bookingById.get(t.bookingId);
                  const customer = booking ? customerById.get(booking.customerId) : undefined;
                  return (
                    <tr key={t.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-3">
                        <Link href={`/trips/${t.id}`} className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                          {t.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-xs text-fg-secondary">{customer?.name ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-fg-primary">
                          {t.origin}
                          <ArrowRight className="size-3 text-fg-tertiary" />
                          {t.destination}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {truck && (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-fg-secondary">
                            <TruckIcon className="size-3 text-fg-tertiary" />
                            {truck.registration}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-fg-secondary">{driver?.fullName ?? "—"}</td>
                      <td className="px-5 py-3">
                        <TripStatusPill status={t.status} />
                      </td>
                      <td className="px-5 py-3 text-right font-mono tnum text-fg-primary">
                        {t.revenueAmount.toLocaleString()} {t.revenueCurrency}
                      </td>
                    </tr>
                  );
                })}
                {trips.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No trips yet. Plan one from a confirmed booking.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "info" | "warning" | "success" }) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "warning" ? "text-status-warning" :
    tone === "success" ? "text-status-success" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono text-2xl tnum font-medium ${colour}`}>{value}</div>
    </div>
  );
}
