import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, FileText, Package } from "lucide-react";
import { getBookingById } from "@/server/actions/bookings";
import { getTripById } from "@/server/actions/trips";
import { listDrivers } from "@/server/actions/drivers";
import { listTrucks } from "@/server/actions/trucks";
import { listTrailers } from "@/server/actions/trailers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { BookingStatusPill } from "@/components/trips/booking-status-pill";
import { BookingActions } from "./booking-actions";
import { TripPlanForm } from "./trip-plan-form";

const basisLabel = {
  per_trip: "per trip",
  per_tonne: "per tonne",
  per_km: "per km",
  per_container: "per container",
} as const;

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) notFound();
  const trip = booking.tripId ? await getTripById(booking.tripId) : undefined;

  // Compute total revenue snapshot
  const totalRevenue =
    booking.agreedBasis === "per_tonne" || booking.agreedBasis === "per_container"
      ? booking.agreedAmount * booking.cargoQuantity
      : booking.agreedAmount;

  const trucks = (await listTrucks())
    .filter((t) => t.status === "active" || t.status === "idle")
    .map((t) => ({ id: t.id, registration: t.registration }));
  const trailers = (await listTrailers())
    .filter((t) => t.status === "active" || t.status === "idle")
    .map((t) => ({ id: t.id, registration: t.registration }));
  const drivers = (await listDrivers())
    .filter((d) => d.status === "active")
    .map((d) => ({ id: d.id, fullName: d.fullName }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Bookings", href: "/bookings" }, { label: booking.number }]}
        eyebrow="Booking"
        title={booking.number}
        description={booking.customer ? booking.customer.name : `Customer ${booking.customerId}`}
        actions={<BookingStatusPill status={booking.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {booking.customer ? (
              <Link
                href={`/customers/${booking.customer.id}`}
                className="group flex items-start gap-3"
              >
                <div className="flex size-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                  <Building2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
                    {booking.customer.name}
                  </div>
                  <div className="text-xs text-fg-tertiary">{booking.customer.contactPerson}</div>
                  <div className="font-mono text-xs tnum text-fg-secondary">{booking.customer.phone}</div>
                </div>
              </Link>
            ) : (
              <span className="text-sm text-fg-tertiary">Customer not found.</span>
            )}
          </CardContent>
        </Card>

        {/* Route + cargo */}
        <Card>
          <CardHeader>
            <CardTitle>Route & cargo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 text-base text-fg-primary">
              <span className="font-medium">{booking.origin}</span>
              <ArrowRight className="size-4 text-fg-tertiary" />
              <span className="font-medium">{booking.destination}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-fg-secondary">
              <Package className="size-3.5 text-fg-tertiary" />
              <span className="font-mono tnum">{booking.cargoQuantity}</span> {booking.cargoUnit}
              <span className="text-fg-tertiary">·</span>
              {booking.cargoType}
            </div>
            <div className="text-xs text-fg-tertiary">
              Requested{" "}
              <span className="font-mono tnum text-fg-secondary">
                {new Date(booking.requestedDate).toLocaleDateString("en-GB")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>{basisLabel[booking.agreedBasis]}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-fg-tertiary">Rate</div>
            <div className="font-mono tnum text-base text-fg-primary">
              {booking.agreedAmount.toLocaleString()} {booking.agreedCurrency}
            </div>
            <div className="mt-3 text-xs text-fg-tertiary">Total (snapshot)</div>
            <div className="font-mono tnum text-2xl font-semibold text-fg-primary">
              {totalRevenue.toLocaleString()} {booking.agreedCurrency}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status workflow */}
      {booking.status === "draft" && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm booking</CardTitle>
            <CardDescription>
              Once the customer agrees the rate and pickup date, confirm here. You can then plan a trip.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookingActions bookingId={booking.id} action="confirm" />
          </CardContent>
        </Card>
      )}

      {booking.status === "confirmed" && (
        <Card>
          <CardHeader>
            <CardTitle>Plan trip</CardTitle>
            <CardDescription>
              Assign a truck, trailer, driver and (optionally) issue a driver advance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TripPlanForm
              bookingId={booking.id}
              trucks={trucks}
              trailers={trailers}
              drivers={drivers}
              defaultDepartureDate={booking.requestedDate}
            />
          </CardContent>
        </Card>
      )}

      {booking.status === "planned" && trip && (
        <Card className="border-status-success/30 bg-status-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-status-success">
              <CheckCircle2 className="size-5" />
              Trip planned
            </CardTitle>
            <CardDescription>
              Trip{" "}
              <Link href={`/trips/${trip.id}`} className="font-mono text-brand-blue hover:underline">
                {trip.number}
              </Link>{" "}
              created on this booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
            <Stat label="Truck" value={trip.truck?.registration ?? "—"} mono />
            <Stat label="Trailer" value={trip.trailer?.registration ?? "—"} mono />
            <Stat label="Driver" value={trip.driver?.fullName ?? "—"} />
          </CardContent>
        </Card>
      )}

      {booking.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-fg-tertiary" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{booking.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={"mt-0.5 text-sm text-fg-primary " + (mono ? "font-mono tnum tracking-wider" : "")}>{value}</div>
    </div>
  );
}
