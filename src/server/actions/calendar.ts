"use server";

import { listTrips } from "@/server/repos/trips";
import { listBookings } from "@/server/repos/bookings";
import { listTrucks } from "@/server/repos/trucks";
import { listDrivers } from "@/server/repos/drivers";
import { listCustomers } from "@/server/repos/customers";
import { listComplianceRecords } from "@/server/repos/hr-compliance";
import { listEmployees } from "@/server/repos/hr";
import { KIND_LABELS, type ComplianceKind } from "@/lib/types/hr-compliance";

/**
 * Dispatch calendar event — one record per visible chip on the board.
 *
 * Trip events come from each trip's planned dates; we synthesise two
 * events per trip when both departure and delivery dates are set, so a
 * Mombasa→Nairobi load shows up on both the loading day and the
 * expected-delivery day. Compliance events surface key petroleum-carrier
 * paperwork (HazMat / EPRA-DG / PUC) so the dispatcher can see expiry
 * dates alongside upcoming trips on the same canvas.
 */
export type CalendarEventKind =
  | "trip_loading"
  | "trip_delivery"
  | "compliance_expiry"
  | "maintenance"
  | "leave";

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  /** Short secondary line — usually the route or owner. */
  subtitle?: string;
  href?: string;
  truckRegistration?: string;
  driverName?: string;
  customerName?: string;
  status?: string;
  /** Fuel product carried on this trip, when relevant. */
  product?: "PMS" | "AGO";
  /** Tone hint for the UI — maps to chip colour. */
  tone: "info" | "success" | "warning" | "danger" | "purple";
}

function toIsoDate(d: string): string {
  // Accept full ISO datetime or YYYY-MM-DD; normalise to YYYY-MM-DD.
  return d.slice(0, 10);
}

/**
 * Build all calendar events that fall inside the requested window.
 *
 * Window defaults to a 60-day band around today (the operator typically
 * looks at this month + next month at most).
 */
export async function listCalendarEvents(window?: {
  fromDate?: string;
  toDate?: string;
}): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  const today = new Date();
  const from = window?.fromDate
    ? new Date(window.fromDate)
    : new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const to = window?.toDate
    ? new Date(window.toDate)
    : new Date(today.getFullYear(), today.getMonth() + 2, 0);

  const inWindow = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  const [trips, trucks, drivers, customers, bookings, complianceRecords, employees] = await Promise.all([
    listTrips(),
    listTrucks(),
    listDrivers(),
    listCustomers(),
    listBookings(),
    listComplianceRecords(),
    listEmployees(),
  ]);
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const truckMap = new Map(trucks.map((x) => [x.id, x]));
  const driverMap = new Map(drivers.map((x) => [x.id, x]));
  const customerMap = new Map(customers.map((x) => [x.id, x]));
  const bookingMap = new Map(bookings.map((x) => [x.id, x]));

  for (const t of trips) {
    const truck = t.truckId ? truckMap.get(t.truckId) : undefined;
    const driver = t.driverId ? driverMap.get(t.driverId) : undefined;
    const booking = t.bookingId ? bookingMap.get(t.bookingId) : undefined;
    const customer = booking?.customerId ? customerMap.get(booking.customerId) : undefined;
    const route = `${t.origin} → ${t.destination}`;

    const isDelivered = t.status === "delivered" || t.status === "closed";
    const isDelayed = t.status === "delayed";

    // Loading day — when the truck departs the depot.
    const loadingDate = t.actualDepartureAt ?? t.plannedDepartureDate;
    if (loadingDate && inWindow(loadingDate)) {
      events.push({
        id: `${t.id}:loading`,
        kind: "trip_loading",
        date: toIsoDate(loadingDate),
        title: t.number,
        subtitle: route,
        href: `/trips/${t.id}`,
        truckRegistration: truck?.registration,
        driverName: driver?.fullName,
        customerName: customer?.name,
        status: t.status,
        product: t.product,
        tone: isDelayed ? "danger" : "info",
      });
    }

    // Delivery day — when the customer receives the load.
    const deliveryDate = t.actualDeliveryAt ?? t.plannedDeliveryDate;
    if (deliveryDate && inWindow(deliveryDate) && deliveryDate !== loadingDate) {
      events.push({
        id: `${t.id}:delivery`,
        kind: "trip_delivery",
        date: toIsoDate(deliveryDate),
        title: `${t.number} · arrival`,
        subtitle: route,
        href: `/trips/${t.id}`,
        truckRegistration: truck?.registration,
        driverName: driver?.fullName,
        customerName: customer?.name,
        status: t.status,
        product: t.product,
        tone: isDelivered ? "success" : isDelayed ? "danger" : "info",
      });
    }
  }

  // Surface fuel-carrier paperwork expiries so the dispatcher sees them on
  // the same canvas as trips.
  const FUEL_HR_KINDS: ReadonlySet<ComplianceKind> = new Set([
    "hazmat_endorsement",
    "epra_dangerous_goods",
    "puc_certificate",
  ]);
  for (const r of complianceRecords) {
    if (!r.expiryDate || !FUEL_HR_KINDS.has(r.kind)) continue;
    if (!inWindow(r.expiryDate)) continue;
    const emp = employeeById.get(r.employeeId);
    if (!emp) continue;
    events.push({
      id: `hr:${r.id}`,
      kind: "compliance_expiry",
      date: toIsoDate(r.expiryDate),
      title: KIND_LABELS[r.kind],
      subtitle: emp.fullName,
      href: `/hr/employees/${emp.id}`,
      driverName: emp.fullName,
      tone: "warning",
    });
  }

  // Sort within a single day so loading events appear before deliveries
  // before compliance ticks, matching dispatcher mental model.
  const kindWeight: Record<CalendarEventKind, number> = {
    trip_loading: 1,
    trip_delivery: 2,
    compliance_expiry: 3,
    maintenance: 4,
    leave: 5,
  };
  return events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || kindWeight[a.kind] - kindWeight[b.kind],
  );
}
