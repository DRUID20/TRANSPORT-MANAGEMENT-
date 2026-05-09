import Link from "next/link";
import { listCustomers } from "@/server/actions/customers";
import { PageHeader } from "@/components/layout/page-header";
import { BookingCreateForm } from "./booking-create-form";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { customer } = await searchParams;
  const customers = (await listCustomers()).map((c) => ({
    id: c.id,
    name: c.name,
    billingCurrency: c.billingCurrency,
  }));
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Bookings", href: "/bookings" }, { label: "New Booking" }]}
        eyebrow="Operations"
        title="New Booking"
        description="Capture a customer order. Rate auto-fills from the rate table; you can override per booking."
      />
      <BookingCreateForm customers={customers} preselectCustomerId={customer} />
      <div className="text-center">
        <Link href="/bookings" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Bookings
        </Link>
      </div>
    </div>
  );
}
