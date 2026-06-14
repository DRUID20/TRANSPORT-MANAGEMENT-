import Link from "next/link";
import { listTrips } from "@/server/actions/trips";
import { listTrucks } from "@/server/actions/trucks";
import { listDrivers } from "@/server/actions/drivers";
import { listSuppliers } from "@/server/actions/suppliers";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseCreateForm } from "./expense-create-form";

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string; truck?: string }>;
}) {
  const { trip, truck } = await searchParams;
  // A closed/cancelled trip is finalised — it can't take new expenses.
  const trips = (await listTrips())
    .filter((t) => t.status !== "closed" && t.status !== "cancelled")
    .map((t) => ({
      id: t.id,
      number: t.number,
      label: `${t.number} · ${t.origin} → ${t.destination}`,
      truckId: t.truckId,
      driverId: t.driverId,
    }));
  const trucks = (await listTrucks()).map((t) => ({ id: t.id, registration: t.registration }));
  const drivers = (await listDrivers()).map((d) => ({ id: d.id, fullName: d.fullName }));
  const suppliers = (await listSuppliers()).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Expenses", href: "/expenses" }, { label: "New Expense" }]}
        eyebrow="Operations"
        title="New Expense"
        description="Capture a cost incurred on a trip. Submit for manager approval."
      />
      <ExpenseCreateForm
        trips={trips}
        trucks={trucks}
        drivers={drivers}
        suppliers={suppliers}
        preselectTripId={trip}
        preselectTruckId={truck}
      />
      <div className="text-center">
        <Link href="/expenses" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Expenses
        </Link>
      </div>
    </div>
  );
}
