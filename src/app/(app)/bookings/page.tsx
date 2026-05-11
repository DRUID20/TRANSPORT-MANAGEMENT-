import Link from "next/link";
import { ArrowRight, Building2, Plus } from "lucide-react";
import { listBookings } from "@/server/actions/bookings";
import { listCustomers } from "@/server/actions/customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { BookingStatusPill } from "@/components/trips/booking-status-pill";

const basisShort = {
  per_trip: "trip",
  per_litre: "L",
  per_litre_per_km: "L·km",
  per_km: "km",
  per_tonne: "t",
  per_container: "TEU",
} as const;

export default async function BookingsPage() {
  const bookings = await listBookings();
  const customers = await listCustomers();
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const draft = bookings.filter((b) => b.status === "draft").length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const planned = bookings.filter((b) => b.status === "planned").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Bookings"
        description="Customer orders. Confirm a booking, then plan a trip from it."
        actions={
          <Button asChild>
            <Link href="/bookings/new">
              <Plus className="size-4" />
              New Booking
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total" value={bookings.length} />
        <Stat label="Draft" value={draft} tone="neutral" />
        <Stat label="Confirmed" value={confirmed} tone="info" />
        <Stat label="Planned" value={planned} tone="success" />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Booking</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Cargo</th>
                  <th className="px-5 py-3 font-medium">Requested</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((b) => {
                  const c = customerById.get(b.customerId);
                  return (
                    <tr key={b.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-3">
                        <Link href={`/bookings/${b.id}`} className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                          {b.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        {c ? (
                          <Link href={`/customers/${c.id}`} className="inline-flex items-center gap-1.5 text-xs text-fg-secondary hover:text-brand-blue">
                            <Building2 className="size-3 text-fg-tertiary" />
                            {c.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 text-fg-primary">
                          <span>{b.origin}</span>
                          <ArrowRight className="size-3 text-fg-tertiary" />
                          <span>{b.destination}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-fg-secondary">
                        <span className="font-mono tnum">{b.cargoQuantity}</span> {b.cargoUnit}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs tnum text-fg-secondary">
                        {new Date(b.requestedDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-5 py-3">
                        <BookingStatusPill status={b.status} />
                      </td>
                      <td className="px-5 py-3 text-right font-mono tnum text-fg-secondary">
                        {b.agreedAmount} {b.agreedCurrency}/{basisShort[b.agreedBasis]}
                      </td>
                    </tr>
                  );
                })}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No bookings yet.{" "}
                      <Link href="/bookings/new" className="text-brand-blue hover:underline">
                        Create the first one →
                      </Link>
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

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "neutral" | "info" | "success" }) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "neutral" ? "text-fg-secondary" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono text-2xl tnum font-medium ${colour}`}>{value}</div>
    </div>
  );
}
