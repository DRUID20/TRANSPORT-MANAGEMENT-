import Link from "next/link";
import { listCustomers } from "@/server/actions/customers";
import { getTripById, listTrips } from "@/server/actions/trips";
import { PageHeader } from "@/components/layout/page-header";
import { InvoiceCreateForm } from "./invoice-create-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string; customer?: string }>;
}) {
  const { trip, customer } = await searchParams;
  const customers = (await listCustomers()).map((c) => ({
    id: c.id,
    name: c.name,
    billingCurrency: c.billingCurrency,
    paymentTermsDays: c.paymentTermsDays,
  }));
  const trips = (await listTrips()).map((t) => ({
    id: t.id,
    number: t.number,
    label: `${t.number} · ${t.origin} → ${t.destination}`,
    customerIdFromBooking: undefined as string | undefined,
    revenueAmount: t.revenueAmount,
    revenueCurrency: t.revenueCurrency,
    cargoQuantity: t.cargoQuantity,
    cargoUnit: t.cargoUnit,
    cargoType: t.cargoType,
  }));

  let preTripData:
    | {
        id: string;
        number: string;
        customerId?: string;
        currency: string;
        cargoQty: number;
        cargoUnit: string;
        cargoType: string;
        revenueAmount: number;
      }
    | undefined;
  if (trip) {
    const t = await getTripById(trip);
    if (t) {
      preTripData = {
        id: t.id,
        number: t.number,
        customerId: t.booking?.customerId,
        currency: t.revenueCurrency,
        cargoQty: t.cargoQuantity,
        cargoUnit: t.cargoUnit,
        cargoType: t.cargoType,
        revenueAmount: t.revenueAmount,
      };
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Invoices", href: "/invoices" }, { label: "New Invoice" }]}
        eyebrow="Finance · AR"
        title="Create Invoice"
        description={
          preTripData
            ? `Pre-filled from trip ${preTripData.number}. Adjust the line items if needed.`
            : "Create a customer invoice. If from a closed trip, link it to flow into reports."
        }
      />
      <InvoiceCreateForm
        customers={customers}
        trips={trips}
        preselectCustomerId={customer ?? preTripData?.customerId}
        preselectTrip={preTripData}
      />
      <div className="text-center">
        <Link href="/invoices" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Invoices
        </Link>
      </div>
    </div>
  );
}
