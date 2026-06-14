"use server";

import {
  apAgingBySupplier as repoApAging,
  arAgingByCustomer as repoArAging,
  expenseBreakdown as repoExpenseBreakdown,
  fleetProfitAndLoss as repoFleetPnL,
  fleetUtilisation as repoFleetUtil,
  fuelEfficiencyByTruck as repoFuelEff,
  profitAndLoss as repoPnL,
  statementOfFinancialPosition as repoSfp,
  tripProfitability as repoTripProfit,
  truckProfitAndLoss as repoTruckPnL,
  revenueByCustomer as repoRevenueByCustomer,
  driverPerformance as repoDriverPerformance,
  monthlyPerformance as repoMonthlyPerformance,
  vatSummary as repoVatSummary,
} from "@/server/repos/reports";
import { listTrips } from "@/server/repos/trips";
import { listBookings } from "@/server/repos/bookings";
import { listTrucks } from "@/server/repos/trucks";
import { listDrivers } from "@/server/repos/drivers";
import { listCustomers } from "@/server/repos/customers";
import { ULLAGE_ALERT_THRESHOLD_PCT } from "@/lib/types/trips";

export async function profitAndLoss(range?: { fromDate?: string; toDate?: string }) {
  return repoPnL(range);
}

export async function statementOfFinancialPosition(asOfDate?: string) {
  return repoSfp(asOfDate);
}

export async function tripProfitability() {
  return repoTripProfit();
}

export async function arAgingByCustomer(asOf?: string) {
  return repoArAging(asOf ? new Date(asOf) : undefined);
}

export async function apAgingBySupplier(asOf?: string) {
  return repoApAging(asOf ? new Date(asOf) : undefined);
}

export async function fleetUtilisation(range?: { fromDate?: string; toDate?: string }) {
  return repoFleetUtil(range);
}

export async function fuelEfficiencyByTruck(range?: { fromDate?: string; toDate?: string }) {
  return repoFuelEff(range);
}

export async function expenseBreakdown(opts: {
  dimension: "category" | "truck" | "currency";
  fromDate?: string;
  toDate?: string;
}) {
  return repoExpenseBreakdown(opts);
}

export async function fleetProfitAndLoss(range?: { fromDate?: string; toDate?: string }) {
  return repoFleetPnL(range);
}

export async function truckProfitAndLoss(
  truckId: string,
  range?: { fromDate?: string; toDate?: string },
) {
  return repoTruckPnL(truckId, range);
}

export async function revenueByCustomer(range?: { fromDate?: string; toDate?: string }) {
  return repoRevenueByCustomer(range);
}

export async function driverPerformance(range?: { fromDate?: string; toDate?: string }) {
  return repoDriverPerformance(range);
}

export async function monthlyPerformance(months?: number) {
  return repoMonthlyPerformance(months);
}

export async function vatSummary(range?: { fromDate?: string; toDate?: string }) {
  return repoVatSummary(range);
}

/**
 * Ullage report (F-6). Returns every trip with captured loading + discharge
 * observations, sorted worst-variance-first. The 'alert' flag tells the UI
 * which rows breach the 0.5% threshold; rows below it are still listed so
 * the volumetric accountant can spot patterns over time (consistent +0.3%
 * across one driver, for instance, is interesting even though it doesn't
 * fire the live alert).
 */
export interface UllageRow {
  tripId: string;
  tripNumber: string;
  product?: "PMS" | "AGO";
  origin: string;
  destination: string;
  truckRegistration?: string;
  driverName?: string;
  customerName?: string;
  loadedLitres20C?: number;
  dischargedLitres20C?: number;
  netLitres: number;            // discharged - loaded @ 20 °C (negative = loss)
  ullagePct: number;            // positive = loss, negative = gain
  alert: boolean;
  dueDate?: string;             // actual delivery date if available
}

export async function ullageReport(range?: {
  fromDate?: string;
  toDate?: string;
}): Promise<UllageRow[]> {
  const from = range?.fromDate ? new Date(range.fromDate) : new Date(0);
  const to = range?.toDate ? new Date(range.toDate) : new Date(8_640_000_000_000_000);

  const [trips, trucks, drivers, customers, bookings] = await Promise.all([
    listTrips(),
    listTrucks(),
    listDrivers(),
    listCustomers(),
    listBookings(),
  ]);
  const truckMap = new Map(trucks.map((x) => [x.id, x]));
  const driverMap = new Map(drivers.map((x) => [x.id, x]));
  const customerMap = new Map(customers.map((x) => [x.id, x]));
  const bookingMap = new Map(bookings.map((x) => [x.id, x]));

  const rows: UllageRow[] = [];
  for (const trip of trips) {
    if (trip.loadedLitres20C === undefined || trip.dischargedLitres20C === undefined) {
      continue;
    }
    const ref = trip.actualDeliveryAt ?? trip.actualDepartureAt ?? trip.plannedDepartureDate ?? trip.createdAt;
    const d = new Date(ref);
    if (d < from || d > to) continue;

    const truck = trip.truckId ? truckMap.get(trip.truckId) : undefined;
    const driver = trip.driverId ? driverMap.get(trip.driverId) : undefined;
    const booking = trip.bookingId ? bookingMap.get(trip.bookingId) : undefined;
    const customer = booking?.customerId ? customerMap.get(booking.customerId) : undefined;

    rows.push({
      tripId: trip.id,
      tripNumber: trip.number,
      product: trip.product,
      origin: trip.origin,
      destination: trip.destination ?? "TBC",
      truckRegistration: truck?.registration,
      driverName: driver?.fullName,
      customerName: customer?.name,
      loadedLitres20C: trip.loadedLitres20C,
      dischargedLitres20C: trip.dischargedLitres20C,
      netLitres: trip.dischargedLitres20C - trip.loadedLitres20C,
      ullagePct: trip.ullagePct ?? 0,
      alert: Math.abs(trip.ullagePct ?? 0) > ULLAGE_ALERT_THRESHOLD_PCT,
      dueDate: ref,
    });
  }

  // Worst loss (largest positive ullagePct) first, then worst gain.
  return rows.sort((a, b) => b.ullagePct - a.ullagePct);
}

export interface UllageSummary {
  tripCount: number;
  tripsAboveThreshold: number;
  totalLoadedLitres: number;
  totalDischargedLitres: number;
  totalNetLitres: number;       // negative = net loss across the fleet
  fleetUllagePct: number;       // weighted by loaded litres
}

export async function ullageSummary(range?: {
  fromDate?: string;
  toDate?: string;
}): Promise<UllageSummary> {
  const rows = await ullageReport(range);
  const totalLoaded = rows.reduce((s, r) => s + (r.loadedLitres20C ?? 0), 0);
  const totalDischarged = rows.reduce((s, r) => s + (r.dischargedLitres20C ?? 0), 0);
  const totalNet = totalDischarged - totalLoaded;
  const fleetUllagePct = totalLoaded > 0 ? -(totalNet / totalLoaded) * 100 : 0;
  return {
    tripCount: rows.length,
    tripsAboveThreshold: rows.filter((r) => r.alert).length,
    totalLoadedLitres: totalLoaded,
    totalDischargedLitres: totalDischarged,
    totalNetLitres: totalNet,
    fleetUllagePct,
  };
}
