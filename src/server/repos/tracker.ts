/**
 * Truck Performance Tracker data layer — async aggregators computed from the
 * dual-mode repos.
 *
 * Every function reads exclusively through `@/server/repos/*`, which branch on
 * IS_DEMO_MODE internally. So these aggregators return real Postgres data in
 * production and demo-seed data in demo mode automatically — no branching here.
 *
 * The aggregation logic mirrors the in-memory implementations that previously
 * lived in `@/server/store/mock-store` (truckScorecard, truckLeaderboard,
 * idleTrucks, customerRouteMatrix), so the RETURN SHAPES are identical and the
 * existing tracker pages keep compiling and rendering unchanged.
 */
import { listInvoices } from "@/server/repos/ar";
import { listTrips } from "@/server/repos/trips";
import { listFuelLogs } from "@/server/repos/fuel";
import { listExpenses } from "@/server/repos/expenses";
import { jobCardsForTruck, getJobCard } from "@/server/repos/workshop";
import { listTrucks, getTruck } from "@/server/repos/trucks";
import { listCustomers } from "@/server/repos/customers";
import { listBookings } from "@/server/repos/bookings";
import { listDrivers } from "@/server/repos/drivers";
import { listEmployees } from "@/server/repos/hr";
import { listComplianceRecords } from "@/server/repos/hr-compliance";

type Range = { fromDate?: string; toDate?: string };

// ============================================================
// Interfaces (return shapes mirror the previous mock-store exports)
// ============================================================
export interface TruckScorecard {
  truckId: string;
  registration: string;
  status: string;
  tripCount: number;
  /** Total km driven (from fuel odometers in range). */
  kmDriven: number;
  revenueKes: number;
  fuelKes: number;
  expensesKes: number;
  workshopKes: number;
  tyreKes: number;
  totalCostsKes: number;
  grossProfitKes: number;
  marginPct: number | null;
  /** L/100km (tank-to-tank). */
  litresPer100km: number | null;
  kesPerKm: number | null;
  /** Days in the range the truck was on a job card (computed from open/close). */
  downtimeDays: number;
  downtimePct: number;
  /** Compliance documents valid / total. */
  complianceTotal: number;
  complianceValid: number;
  complianceExpiring: number;
  complianceExpired: number;
  /** Days since last trip end (or planned departure if no trips). null = no trips on record. */
  daysSinceLastTrip: number | null;
  /** Composite 0-100 score. */
  score: number;
  /**
   * Fuel-haul KPIs (F-6). Sourced from the captured loading observations
   * on the truck's trips in range. `loadedLitres` is the sum of 20 °C-
   * corrected litres (falling back to observed litres for trips that
   * weren't captured), so per-trip thermal contraction doesn't muddy the
   * KES-per-loaded-litre figure. `avgUllagePct` averages the persisted
   * `ullagePct` across trips that have a discharge captured (others are
   * excluded; partial trips don't drag the figure to zero).
   */
  loadedLitres: number;
  kesPerLoadedLitre: number | null;
  avgUllagePct: number | null;
  tripsWithUllage: number;
}

export interface IdleTruckRow {
  truckId: string;
  registration: string;
  status: string;
  daysIdle: number | null;
  lastTripNumber: string | null;
  lastTripDate: string | null;
  defaultDriverName: string | null;
}

export interface CustomerRouteCell {
  customerId: string;
  customerName: string;
  route: string; // "Mombasa → Kampala"
  origin: string;
  destination: string;
  tripCount: number;
  revenueKes: number;
}

function rangeBounds(range?: Range) {
  const from = range?.fromDate ? new Date(range.fromDate) : new Date(0);
  const to = range?.toDate ? new Date(range.toDate) : new Date(8640000000000000);
  return { from, to };
}

// ============================================================
// Per-truck scorecard
// ============================================================
export async function truckScorecard(
  truckId: string,
  range?: Range,
): Promise<TruckScorecard | undefined> {
  const truck = await getTruck(truckId);
  if (!truck) return undefined;

  const today = new Date();
  const { from, to } = rangeBounds(range);
  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  const [trips, invoices, fuelLogs, expenses, jobCards, employees, complianceRecords] =
    await Promise.all([
      listTrips(),
      listInvoices(),
      listFuelLogs(),
      listExpenses(),
      jobCardsForTruck(truck.id),
      listEmployees(),
      listComplianceRecords(),
    ]);

  // Trips for this truck in range
  const truckTrips = trips.filter((t) => {
    const ref = t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt;
    return t.truckId === truck.id && inRange(ref);
  });
  const tripIds = new Set(truckTrips.map((t) => t.id));

  const revenueKes = invoices
    .filter(
      (inv) =>
        inv.tripId &&
        tripIds.has(inv.tripId) &&
        inv.status !== "draft" &&
        inv.status !== "cancelled",
    )
    .reduce((s, inv) => s + inv.total * inv.fxRate, 0);

  const fuelLogsForTruck = fuelLogs.filter(
    (f) => f.truckId === truck.id && inRange(f.datetime),
  );
  const fuelKes = fuelLogsForTruck.reduce((s, f) => s + f.costKes, 0);

  // KM driven (first vs last odometer)
  const odoSorted = [...fuelLogsForTruck].sort((a, b) => a.odometerKm - b.odometerKm);
  const kmDriven =
    odoSorted.length >= 2
      ? odoSorted[odoSorted.length - 1]!.odometerKm - odoSorted[0]!.odometerKm
      : 0;
  // L/100km using tank-to-tank (litres after first fill / km between first & last)
  const litresAfterFirst = odoSorted.slice(1).reduce((s, f) => s + f.litres, 0);
  const litresPer100km = kmDriven > 0 ? (litresAfterFirst / kmDriven) * 100 : null;
  const kesPerKm = kmDriven > 0 ? fuelKes / kmDriven : null;

  // Trip expenses
  const expensesKes = expenses
    .filter(
      (e) =>
        e.tripId &&
        tripIds.has(e.tripId) &&
        (e.status === "approved" || e.status === "reimbursed") &&
        e.paidBy !== "advance",
    )
    .reduce((s, e) => s + e.amountKes, 0);

  // Workshop cost: closed job cards for this truck in range, with tyre split
  let workshopKes = 0;
  let tyreKes = 0;
  let downtimeDays = 0;
  for (const jc of jobCards) {
    if (jc.truckId !== truck.id) continue;
    if (!inRange(jc.openedAt) && !inRange(jc.closedAt ?? jc.openedAt)) continue;
    workshopKes += jc.totalKes ?? 0;

    // Tyre spend by description match
    const detail = await getJobCard(jc.id);
    const spares = detail?.spares ?? [];
    for (const s of spares) {
      if (/tyre|tire|tread/i.test(s.description)) tyreKes += s.totalCostKes;
    }

    // Downtime: days between openedAt and closedAt (clamped to range)
    const opened = new Date(jc.openedAt);
    const closed = jc.closedAt ? new Date(jc.closedAt) : today;
    const start = opened < from ? from : opened;
    const end = closed > to ? to : closed;
    if (end > start) {
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
      downtimeDays += diffDays;
    }
  }
  const totalRangeDays = Math.max(
    1,
    Math.ceil((Math.min(to.getTime(), today.getTime()) - from.getTime()) / 86_400_000),
  );
  const downtimePct = Math.min(100, (downtimeDays / totalRangeDays) * 100);

  const totalCostsKes = fuelKes + expensesKes + workshopKes;
  const grossProfitKes = revenueKes - totalCostsKes;
  const marginPct = revenueKes > 0 ? grossProfitKes / revenueKes : null;

  // Fuel-haul KPIs (F-6): sum loaded litres (prefer 20 °C corrected),
  // average ullage % across trips that have a discharge captured.
  let loadedLitres = 0;
  let ullageSum = 0;
  let tripsWithUllage = 0;
  for (const t of truckTrips) {
    const l = t.loadedLitres20C ?? t.loadedLitres;
    if (l !== undefined) loadedLitres += l;
    if (t.ullagePct !== undefined && t.dischargedLitres !== undefined) {
      ullageSum += t.ullagePct;
      tripsWithUllage++;
    }
  }
  const kesPerLoadedLitre = loadedLitres > 0 ? revenueKes / loadedLitres : null;
  const avgUllagePct = tripsWithUllage > 0 ? ullageSum / tripsWithUllage : null;

  // Compliance per linked driver (truck's default driver) is the closest proxy
  // for "operational compliance attached to the truck".
  let complianceTotal = 0;
  let complianceValid = 0;
  let complianceExpiring = 0;
  let complianceExpired = 0;
  for (const e of employees) {
    if (e.driverId !== truck.currentDriverId) continue;
    for (const r of complianceRecords) {
      if (r.employeeId !== e.id) continue;
      complianceTotal++;
      const days = r.expiryDate
        ? Math.floor((new Date(r.expiryDate).getTime() - today.getTime()) / 86_400_000)
        : null;
      if (days === null) complianceExpired++;
      else if (days < 0) complianceExpired++;
      else if (days <= 30) complianceExpiring++;
      else complianceValid++;
    }
  }

  // Days since last trip
  const lastTripRef = truckTrips
    .map(
      (t) =>
        t.actualDeliveryAt ?? t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt,
    )
    .filter((x): x is string => Boolean(x))
    .sort()
    .pop();
  const daysSinceLastTrip = lastTripRef
    ? Math.floor((today.getTime() - new Date(lastTripRef).getTime()) / 86_400_000)
    : null;

  // Composite score (0-100). Weights:
  //  40 margin (mapped 0% -> 0, 30%+ -> 40)
  //  25 fuel  (35 L/100km -> 25, 50 -> 0)
  //  15 downtime (0% -> 15, 30%+ -> 0)
  //  10 compliance (valid/total)
  //  10 utilisation (3+ trips in range -> 10)
  const marginScore =
    marginPct === null ? 0 : Math.max(0, Math.min(40, (marginPct / 0.3) * 40));
  const fuelScore =
    litresPer100km === null
      ? 12 // partial credit when no fuel data
      : Math.max(0, Math.min(25, 25 - ((litresPer100km - 35) / 15) * 25));
  const downtimeScore = Math.max(0, 15 - (downtimePct / 30) * 15);
  const complianceScore =
    complianceTotal === 0 ? 6 : (complianceValid / complianceTotal) * 10;
  const utilScore = Math.min(10, (truckTrips.length / 3) * 10);
  const score = Math.round(
    marginScore + fuelScore + downtimeScore + complianceScore + utilScore,
  );

  return {
    truckId: truck.id,
    registration: truck.registration,
    status: truck.status,
    tripCount: truckTrips.length,
    kmDriven,
    revenueKes,
    fuelKes,
    expensesKes,
    workshopKes,
    tyreKes,
    totalCostsKes,
    grossProfitKes,
    marginPct,
    litresPer100km,
    kesPerKm,
    downtimeDays,
    downtimePct,
    complianceTotal,
    complianceValid,
    complianceExpiring,
    complianceExpired,
    daysSinceLastTrip,
    score,
    loadedLitres,
    kesPerLoadedLitre,
    avgUllagePct,
    tripsWithUllage,
  };
}

// ============================================================
// Leaderboard
// ============================================================
export async function truckLeaderboard(range?: Range): Promise<TruckScorecard[]> {
  const trucks = await listTrucks();
  const cards = await Promise.all(trucks.map((t) => truckScorecard(t.id, range)));
  const rows = cards.filter((c): c is TruckScorecard => c !== undefined);
  return rows.sort((a, b) => b.score - a.score);
}

// ============================================================
// Idle trucks
// ============================================================
/** Trucks with no trip activity in the last `withinDays` (or never seen). */
export async function idleTrucks(withinDays = 14): Promise<IdleTruckRow[]> {
  const today = new Date();
  const [trucks, trips, drivers] = await Promise.all([
    listTrucks(),
    listTrips(),
    listDrivers(),
  ]);
  const driverById = new Map(drivers.map((d) => [d.id, d]));

  const out: IdleTruckRow[] = [];
  for (const t of trucks) {
    const truckTrips = trips.filter((trip) => trip.truckId === t.id);
    let lastDate: string | null = null;
    let lastNumber: string | null = null;
    for (const trip of truckTrips) {
      const ref =
        trip.actualDeliveryAt ??
        trip.actualDepartureAt ??
        trip.plannedDepartureDate ??
        trip.createdAt;
      if (!lastDate || ref > lastDate) {
        lastDate = ref;
        lastNumber = trip.number;
      }
    }
    const daysIdle = lastDate
      ? Math.floor((today.getTime() - new Date(lastDate).getTime()) / 86_400_000)
      : null;
    if (daysIdle === null || daysIdle >= withinDays) {
      const driver = t.currentDriverId ? driverById.get(t.currentDriverId) : undefined;
      out.push({
        truckId: t.id,
        registration: t.registration,
        status: t.status,
        daysIdle,
        lastTripNumber: lastNumber,
        lastTripDate: lastDate ? lastDate.slice(0, 10) : null,
        defaultDriverName: driver?.fullName ?? null,
      });
    }
  }
  return out.sort((a, b) => {
    if (a.daysIdle === null) return -1;
    if (b.daysIdle === null) return 1;
    return b.daysIdle - a.daysIdle;
  });
}

// ============================================================
// Customer x route matrix
// ============================================================
/** Customer x route pivot for the given range. */
export async function customerRouteMatrix(range?: Range): Promise<CustomerRouteCell[]> {
  const { from, to } = rangeBounds(range);
  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  const [trips, invoices, bookings, customers] = await Promise.all([
    listTrips(),
    listInvoices(),
    listBookings(),
    listCustomers(),
  ]);
  const bookingById = new Map(bookings.map((b) => [b.id, b]));
  const customerById = new Map(customers.map((c) => [c.id, c]));

  // Pre-aggregate non-draft/non-cancelled revenue by trip.
  const revenueByTrip = new Map<string, number>();
  for (const inv of invoices) {
    if (!inv.tripId) continue;
    if (inv.status === "draft" || inv.status === "cancelled") continue;
    revenueByTrip.set(
      inv.tripId,
      (revenueByTrip.get(inv.tripId) ?? 0) + inv.total * inv.fxRate,
    );
  }

  const cells = new Map<string, CustomerRouteCell>();
  for (const trip of trips) {
    const ref =
      trip.actualDeliveryAt ??
      trip.actualDepartureAt ??
      trip.plannedDepartureDate ??
      trip.createdAt;
    if (!inRange(ref)) continue;
    const booking = bookingById.get(trip.bookingId);
    if (!booking) continue;
    const cust = customerById.get(booking.customerId);
    if (!cust) continue;
    const route = `${trip.origin} → ${trip.destination}`;
    const key = `${cust.id}|${route}`;
    if (!cells.has(key)) {
      cells.set(key, {
        customerId: cust.id,
        customerName: cust.name,
        route,
        origin: trip.origin,
        destination: trip.destination ?? "TBC",
        tripCount: 0,
        revenueKes: 0,
      });
    }
    const cell = cells.get(key)!;
    cell.tripCount++;
    cell.revenueKes += revenueByTrip.get(trip.id) ?? 0;
  }
  return [...cells.values()].sort((a, b) => b.revenueKes - a.revenueKes);
}
