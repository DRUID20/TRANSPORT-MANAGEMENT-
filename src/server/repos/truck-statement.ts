/**
 * Per-truck cumulative statement ("retained earnings" — management memo, not GL).
 *
 * Month by month: opening balance carried forward, trip freight credited, trip
 * + workshop costs deducted, and a closing balance carried to the next month.
 * Works for a company-owned truck (full freight − costs = company profit) and a
 * subcontracted truck (the subcontractor's share = (1 − commission) × freight −
 * costs, i.e. their net on that truck). Freight is treated as KES.
 */
import { getTruck } from "@/server/repos/trucks";
import { listTrips } from "@/server/repos/trips";
import { listFuelLogs } from "@/server/repos/fuel";
import { listExpenses } from "@/server/repos/expenses";
import { listBorderCrossings } from "@/server/repos/borders";
import { jobCardsForTruck } from "@/server/repos/workshop";
import { getSubcontractor } from "@/server/repos/subcontractors";
import { getRatesToKesMap } from "@/server/repos/fx";
import type { OwnerType } from "@/lib/types/fleet";

export interface TruckStatementMonth {
  month: string; // YYYY-MM
  label: string;
  openingBalance: number;
  revenueKes: number;
  fuelKes: number;
  expensesKes: number;
  borderKes: number;
  advanceKes: number;
  workshopKes: number;
  costsKes: number;
  netKes: number;
  closingBalance: number;
  tripCount: number;
}

export interface TruckStatement {
  truckId: string;
  registration: string;
  ownerType: OwnerType;
  subcontractorName?: string;
  commissionRate?: number;
  /** Revenue factor applied to freight: 1 for owned, (1 − commission) for subcontracted. */
  revenueShare: number;
  months: TruckStatementMonth[];
  totalRevenue: number;
  totalCosts: number;
  closingBalance: number;
}

function monthMeta(iso: string): { key: string; label: string } {
  const d = new Date(iso);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { key, label: d.toLocaleString("en-GB", { month: "short", year: "numeric" }) };
}

const tripRef = (t: {
  actualDeliveryAt?: string;
  actualDepartureAt?: string;
  plannedDepartureDate?: string;
  createdAt: string;
}) => t.actualDeliveryAt ?? t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt;

export async function truckStatement(truckId: string): Promise<TruckStatement | undefined> {
  const truck = await getTruck(truckId);
  if (!truck) return undefined;

  let revenueShare = 1;
  let subcontractorName: string | undefined;
  let commissionRate: number | undefined;
  if (truck.ownerType === "subcontractor" && truck.subcontractorId) {
    const sub = await getSubcontractor(truck.subcontractorId);
    if (sub) {
      subcontractorName = sub.name;
      commissionRate = sub.commissionRate ?? 0.1;
      revenueShare = 1 - commissionRate;
    }
  }

  const [trips, fuelLogs, expenses, jobCards, fxToKes] = await Promise.all([
    listTrips(),
    listFuelLogs(),
    listExpenses(),
    jobCardsForTruck(truckId),
    getRatesToKesMap(),
  ]);

  const truckTrips = trips.filter((t) => t.truckId === truckId && t.status === "closed");
  const tripIds = new Set(truckTrips.map((t) => t.id));

  // Per-trip border charges.
  const borderByTrip = new Map<string, number>();
  await Promise.all(
    truckTrips.map(async (t) => {
      const xs = await listBorderCrossings(t.id);
      borderByTrip.set(t.id, xs.reduce((s, b) => s + (b.chargesKes ?? 0), 0));
    }),
  );

  const fuelByTrip = new Map<string, number>();
  for (const f of fuelLogs) {
    if (f.tripId && tripIds.has(f.tripId)) {
      fuelByTrip.set(f.tripId, (fuelByTrip.get(f.tripId) ?? 0) + f.costKes);
    }
  }
  const expenseByTrip = new Map<string, number>();
  for (const e of expenses) {
    if (!e.tripId || !tripIds.has(e.tripId)) continue;
    if (e.status !== "approved" && e.status !== "reimbursed") continue;
    if (e.paidBy === "advance") continue;
    expenseByTrip.set(e.tripId, (expenseByTrip.get(e.tripId) ?? 0) + e.amountKes);
  }

  const buckets = new Map<string, TruckStatementMonth>();
  const ensure = (key: string, label: string): TruckStatementMonth => {
    let b = buckets.get(key);
    if (!b) {
      b = {
        month: key,
        label,
        openingBalance: 0,
        revenueKes: 0,
        fuelKes: 0,
        expensesKes: 0,
        borderKes: 0,
        advanceKes: 0,
        workshopKes: 0,
        costsKes: 0,
        netKes: 0,
        closingBalance: 0,
        tripCount: 0,
      };
      buckets.set(key, b);
    }
    return b;
  };

  for (const t of truckTrips) {
    const { key, label } = monthMeta(tripRef(t));
    const b = ensure(key, label);
    // Convert non-KES freight to KES via the live rate so cross-border trips
    // aren't ~140× under-credited on the statement.
    const fx = fxToKes[t.revenueCurrency] ?? 1;
    b.revenueKes += t.revenueAmount * fx * revenueShare;
    b.fuelKes += fuelByTrip.get(t.id) ?? 0;
    b.expensesKes += expenseByTrip.get(t.id) ?? 0;
    b.borderKes += borderByTrip.get(t.id) ?? 0;
    b.advanceKes += t.driverAdvanceUsedKes ?? 0;
    b.tripCount += 1;
  }

  // Workshop: by job card close month (totalKes); tyres included.
  for (const jc of jobCards) {
    const when = jc.closedAt ?? jc.openedAt;
    const { key, label } = monthMeta(when);
    const b = ensure(key, label);
    b.workshopKes += jc.totalKes;
  }

  const months = [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
  let running = 0;
  for (const m of months) {
    m.openingBalance = running;
    m.costsKes = m.fuelKes + m.expensesKes + m.borderKes + m.advanceKes + m.workshopKes;
    m.netKes = m.revenueKes - m.costsKes;
    running += m.netKes;
    m.closingBalance = running;
  }

  return {
    truckId,
    registration: truck.registration,
    ownerType: truck.ownerType,
    subcontractorName,
    commissionRate,
    revenueShare,
    months,
    totalRevenue: months.reduce((s, m) => s + m.revenueKes, 0),
    totalCosts: months.reduce((s, m) => s + m.costsKes, 0),
    closingBalance: running,
  };
}
