import { CalendarPlus, Plus } from "lucide-react";
import Link from "next/link";
import { listCalendarEvents } from "@/server/actions/calendar";
import { listTrucks } from "@/server/actions/trucks";
import { listDrivers } from "@/server/actions/drivers";
import { listCustomers } from "@/server/actions/customers";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { localIsoDate } from "@/lib/format";
import { CalendarBoard } from "./calendar-board";

/**
 * Dispatch calendar — a single board for scheduled trips, deliveries,
 * fuel-carrier paperwork expiries and (soon) maintenance.
 *
 * Server component: fetches events, trucks, drivers and customers in
 * parallel and hands them to the client board for interactive
 * filtering, view switching and event drill-down.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;

  const today = new Date();
  // Reference month: ?month=YYYY-MM. Defaults to current.
  const ref = month
    ? new Date(`${month}-01T00:00:00`)
    : new Date(today.getFullYear(), today.getMonth(), 1);
  const ymStart = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const ymEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);

  // Fetch a 3-month window so prev/next nav doesn't re-fetch immediately.
  // localIsoDate (not toISOString) — east-of-UTC timezones would otherwise
  // shift every boundary back one day and mislabel the whole month.
  const windowFrom = localIsoDate(
    new Date(ref.getFullYear(), ref.getMonth() - 1, 1),
  );
  const windowTo = localIsoDate(
    new Date(ref.getFullYear(), ref.getMonth() + 2, 0),
  );

  const [events, trucks, drivers, customers] = await Promise.all([
    listCalendarEvents({ fromDate: windowFrom, toDate: windowTo }),
    listTrucks(),
    listDrivers(),
    listCustomers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Schedule"
        description="Dispatch board for fuel hauls — loadings, deliveries, and petroleum-paperwork expiries on one canvas."
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href="/trips">
                <CalendarPlus className="size-3.5" />
                Trip list
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/bookings/new">
                <Plus className="size-3.5" />
                New booking
              </Link>
            </Button>
          </>
        }
      />

      <CalendarBoard
        referenceMonth={`${ymStart.getFullYear()}-${String(ymStart.getMonth() + 1).padStart(2, "0")}`}
        ymStartIso={localIsoDate(ymStart)}
        ymEndIso={localIsoDate(ymEnd)}
        events={events}
        trucks={trucks.map((t) => ({ id: t.id, registration: t.registration }))}
        drivers={drivers.map((d) => ({ id: d.id, fullName: d.fullName }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
