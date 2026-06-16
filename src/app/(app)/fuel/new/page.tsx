import Link from "next/link";
import { listTrips } from "@/server/actions/trips";
import { listTrucks } from "@/server/actions/trucks";
import { listDrivers } from "@/server/actions/drivers";
import { getRatesToKesMap } from "@/server/actions/fx";
import { PageHeader } from "@/components/layout/page-header";
import { FuelLogCreateForm } from "./fuel-log-create-form";

export default async function NewFuelLogPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string; truck?: string }>;
}) {
  const { trip, truck } = await searchParams;
  const trips = (await listTrips()).map((t) => ({
    id: t.id,
    label: `${t.number} · ${t.origin} → ${t.destination}`,
    truckId: t.truckId,
    driverId: t.driverId,
  }));
  const trucks = (await listTrucks()).map((t) => ({ id: t.id, registration: t.registration }));
  const drivers = (await listDrivers()).map((d) => ({ id: d.id, fullName: d.fullName }));
  const ratesToKes = await getRatesToKesMap();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Fuel", href: "/fuel" }, { label: "Log Fuel" }]}
        eyebrow="Operations"
        title="Log Fuel"
        description="Captures litres + odometer per truck so we can compute km/L."
      />
      <FuelLogCreateForm
        trips={trips}
        trucks={trucks}
        drivers={drivers}
        preselectTripId={trip}
        preselectTruckId={truck}
        ratesToKes={ratesToKes}
      />
      <div className="text-center">
        <Link href="/fuel" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Fuel
        </Link>
      </div>
    </div>
  );
}
