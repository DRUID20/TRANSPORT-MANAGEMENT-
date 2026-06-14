/**
 * Reports data layer — async aggregators computed from the dual-mode repos.
 *
 * Every function reads exclusively through `@/server/repos/*`, which branch on
 * IS_DEMO_MODE internally. So these aggregators return real Postgres data in
 * production and demo-seed data in demo mode automatically — no branching here.
 *
 * The aggregation logic mirrors the in-memory implementations that previously
 * lived in `@/server/store/mock-store` (P&L, SFP, trip profitability, AR/AP
 * aging, fleet utilisation, fuel efficiency, expense breakdown, truck P&L), so
 * the RETURN SHAPES are identical and existing report pages / export route keep
 * compiling and rendering unchanged.
 */
import { trialBalance } from "@/server/repos/ledger";
import { listAccounts } from "@/server/repos/accounts";
import { listInvoices } from "@/server/repos/ar";
import { listBills } from "@/server/repos/ap";
import { listTrips } from "@/server/repos/trips";
import { listFuelLogs } from "@/server/repos/fuel";
import { listExpenses } from "@/server/repos/expenses";
import { borderChargesByTrip } from "@/server/repos/borders";
import { jobCardsForTruck, getJobCard, listJobCards } from "@/server/repos/workshop";
import { listTrucks, getTruck } from "@/server/repos/trucks";
import { listCustomers } from "@/server/repos/customers";
import { listSuppliers } from "@/server/repos/suppliers";
import { listDrivers } from "@/server/repos/drivers";
import { ageBucket as computeAgeBucket } from "@/lib/types/ar";
import { ULLAGE_ALERT_THRESHOLD_PCT } from "@/lib/types/trips";

type Range = { fromDate?: string; toDate?: string };

/** Replicates mock-store's rangeBounds helper. */
function rangeBounds(range?: Range) {
  const from = range?.fromDate ? new Date(range.fromDate) : new Date(0);
  const to = range?.toDate ? new Date(range.toDate) : new Date(8640000000000000);
  return { from, to };
}

// ============================================================
// Profit & Loss / Statement of Financial Position
// ============================================================

/** Build the P&L sections for a date range (mirror of mock-store.profitAndLoss). */
export async function profitAndLoss(range?: Range) {
  const tb = await trialBalance(range);
  const incomeRows = tb
    .filter((r) => r.class === "Income")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));
  const otherIncomeRows = tb
    .filter((r) => r.class === "Other Income")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));
  const directCostRows = tb
    .filter((r) => r.class === "Direct Cost")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));
  const expenseRows = tb
    .filter((r) => r.class === "Expense")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));
  const otherExpenseRows = tb
    .filter((r) => r.class === "Other Expense")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));
  const taxRows = tb
    .filter((r) => r.class === "Tax")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));

  const incomeTotal = incomeRows.reduce((s, r) => s + r.balanceKes, 0);
  const otherIncomeTotal = otherIncomeRows.reduce((s, r) => s + r.balanceKes, 0);
  const directCostTotal = directCostRows.reduce((s, r) => s + r.balanceKes, 0);
  const expenseTotal = expenseRows.reduce((s, r) => s + r.balanceKes, 0);
  const otherExpenseTotal = otherExpenseRows.reduce((s, r) => s + r.balanceKes, 0);
  const taxTotal = taxRows.reduce((s, r) => s + r.balanceKes, 0);

  const grossProfit = incomeTotal - directCostTotal;
  const operatingProfit = grossProfit - expenseTotal;
  const profitBeforeTax = operatingProfit + otherIncomeTotal - otherExpenseTotal;
  const netProfit = profitBeforeTax - taxTotal;

  return {
    range,
    income: { rows: incomeRows, total: incomeTotal },
    directCost: { rows: directCostRows, total: directCostTotal },
    grossProfit,
    expenses: { rows: expenseRows, total: expenseTotal },
    operatingProfit,
    otherIncome: { rows: otherIncomeRows, total: otherIncomeTotal },
    otherExpense: { rows: otherExpenseRows, total: otherExpenseTotal },
    profitBeforeTax,
    tax: { rows: taxRows, total: taxTotal },
    netProfit,
  };
}

/** Build the Statement of Financial Position at a given date (mirror of mock-store). */
export async function statementOfFinancialPosition(asOfDate?: string) {
  const [tb, accounts, pnl] = await Promise.all([
    trialBalance(asOfDate ? { toDate: asOfDate } : undefined),
    listAccounts(),
    profitAndLoss(asOfDate ? { toDate: asOfDate } : undefined),
  ]);

  const assets = tb
    .filter((r) => r.class === "Asset")
    .map((r) => ({ ...r }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const liabilities = tb
    .filter((r) => r.class === "Liability")
    .map((r) => ({ ...r }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const equity = tb
    .filter((r) => r.class === "Equity")
    .map((r) => ({ ...r }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const acctById = new Map(accounts.map((a) => [a.id, a]));

  // Group rows by their account 'group' (Non-current / Current / ...).
  const splitByGroup = (rows: typeof assets) => {
    const buckets = new Map<string, typeof rows>();
    for (const row of rows) {
      const acc = acctById.get(row.accountId);
      const group = acc?.group ?? "Other";
      if (!buckets.has(group)) buckets.set(group, []);
      buckets.get(group)!.push(row);
    }
    return [...buckets.entries()].map(([group, rs]) => ({
      group,
      rows: rs,
      total: rs.reduce((s, r) => s + r.balanceKes, 0),
    }));
  };

  const assetGroups = splitByGroup(assets);
  const liabilityGroups = splitByGroup(liabilities);

  const totalAssets = assets.reduce((s, r) => s + r.balanceKes, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balanceKes, 0);
  const totalEquity = equity.reduce((s, r) => s + r.balanceKes, 0);
  const totalEquityAndLiabilities = totalEquity + totalLiabilities + pnl.netProfit;
  const balancingDifference = totalAssets - totalEquityAndLiabilities;

  return {
    asOfDate,
    assets: { groups: assetGroups, total: totalAssets },
    liabilities: { groups: liabilityGroups, total: totalLiabilities },
    equity: { rows: equity, total: totalEquity },
    netProfit: pnl.netProfit,
    totalEquityAndLiabilities,
    balancingDifference,
  };
}

// ============================================================
// Trip profitability
// ============================================================

export interface TripProfitRow {
  tripId: string;
  number: string;
  origin: string;
  destination: string;
  status: string;
  revenueKes: number;
  borderChargesKes: number;
  driverAdvanceUsedKes: number;
  expensesKes: number;
  fuelKes: number;
  workshopKes: number;
  totalCostsKes: number;
  grossProfitKes: number;
  marginPct: number | null;
}

/** Profit per trip — revenue (from invoices) minus direct trip costs. */
export async function tripProfitability(): Promise<TripProfitRow[]> {
  const [trips, invoices, expenses, fuelLogs, jobCards] = await Promise.all([
    listTrips(),
    listInvoices(),
    listExpenses(),
    listFuelLogs(),
    listJobCards(),
  ]);

  // Workshop repairs explicitly linked to a trip (en-route breakdowns).
  const workshopByTrip = new Map<string, number>();
  for (const jc of jobCards) {
    if (!jc.tripId) continue;
    workshopByTrip.set(jc.tripId, (workshopByTrip.get(jc.tripId) ?? 0) + jc.totalKes);
  }

  // Border charges — batched: one round-trip for all trips instead of N.
  const borderByTrip = await borderChargesByTrip(trips.map((t) => t.id));

  const rows: TripProfitRow[] = [];
  for (const trip of trips) {
    const revenueKes = invoices
      .filter(
        (inv) => inv.tripId === trip.id && inv.status !== "draft" && inv.status !== "cancelled",
      )
      .reduce((s, inv) => s + inv.total * inv.fxRate, 0);

    const borderChargesKes = borderByTrip.get(trip.id) ?? 0;

    const driverAdvanceUsedKes = trip.driverAdvanceUsedKes ?? 0;

    const expensesKes = expenses
      .filter(
        (e) =>
          e.tripId === trip.id &&
          (e.status === "approved" || e.status === "reimbursed") &&
          e.paidBy !== "advance",
      )
      .reduce((s, e) => s + e.amountKes, 0);

    const fuelKes = fuelLogs
      .filter((f) => f.tripId === trip.id)
      .reduce((s, f) => s + f.costKes, 0);

    const workshopKes = workshopByTrip.get(trip.id) ?? 0;

    const totalCostsKes =
      borderChargesKes + driverAdvanceUsedKes + expensesKes + fuelKes + workshopKes;
    const grossProfitKes = revenueKes - totalCostsKes;
    const marginPct = revenueKes > 0 ? grossProfitKes / revenueKes : null;

    rows.push({
      tripId: trip.id,
      number: trip.number,
      origin: trip.origin,
      destination: trip.destination,
      status: trip.status,
      revenueKes,
      borderChargesKes,
      driverAdvanceUsedKes,
      expensesKes,
      fuelKes,
      workshopKes,
      totalCostsKes,
      grossProfitKes,
      marginPct,
    });
  }
  return rows.sort((a, b) => b.grossProfitKes - a.grossProfitKes);
}

// ============================================================
// AR / AP aging
// ============================================================

export interface ArAgingRow {
  customerId: string;
  customerName: string;
  current: number;
  d1to30: number;
  d31to60: number;
  d61to90: number;
  d90plus: number;
  total: number;
  /** Number of open invoices. */
  invoiceCount: number;
}

/** Aged AR per customer, in KES (using each invoice's captured FX rate). */
export async function arAgingByCustomer(asOf = new Date()): Promise<ArAgingRow[]> {
  const [invoices, customers] = await Promise.all([listInvoices(), listCustomers()]);
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const byCustomer = new Map<string, ArAgingRow>();
  for (const inv of invoices) {
    if (inv.status === "draft" || inv.status === "cancelled" || inv.status === "paid") continue;
    const balanceKes = inv.balance * inv.fxRate;
    if (balanceKes <= 0) continue;
    const bucket = computeAgeBucket(inv.dueDate, asOf);

    if (!byCustomer.has(inv.customerId)) {
      const cust = customerMap.get(inv.customerId);
      byCustomer.set(inv.customerId, {
        customerId: inv.customerId,
        customerName: cust?.name ?? "Unknown",
        current: 0,
        d1to30: 0,
        d31to60: 0,
        d61to90: 0,
        d90plus: 0,
        total: 0,
        invoiceCount: 0,
      });
    }
    const row = byCustomer.get(inv.customerId)!;
    if (bucket === "current") row.current += balanceKes;
    else if (bucket === "1-30") row.d1to30 += balanceKes;
    else if (bucket === "31-60") row.d31to60 += balanceKes;
    else if (bucket === "61-90") row.d61to90 += balanceKes;
    else row.d90plus += balanceKes;
    row.total += balanceKes;
    row.invoiceCount++;
  }
  return [...byCustomer.values()].sort((a, b) => b.total - a.total);
}

export interface ApAgingRow {
  supplierId: string;
  supplierName: string;
  current: number;
  d1to30: number;
  d31to60: number;
  d61to90: number;
  d90plus: number;
  total: number;
  billCount: number;
}

/** Aged AP per supplier, in KES. Mirror of arAgingByCustomer. */
export async function apAgingBySupplier(asOf = new Date()): Promise<ApAgingRow[]> {
  const [bills, suppliers] = await Promise.all([listBills(), listSuppliers()]);
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  const bySupplier = new Map<string, ApAgingRow>();
  for (const bill of bills) {
    if (bill.status === "draft" || bill.status === "cancelled" || bill.status === "paid") continue;
    const balanceKes = bill.balance * bill.fxRate;
    if (balanceKes <= 0) continue;
    const bucket = computeAgeBucket(bill.dueDate, asOf);

    if (!bySupplier.has(bill.supplierId)) {
      const sup = supplierMap.get(bill.supplierId);
      bySupplier.set(bill.supplierId, {
        supplierId: bill.supplierId,
        supplierName: sup?.name ?? "Unknown",
        current: 0,
        d1to30: 0,
        d31to60: 0,
        d61to90: 0,
        d90plus: 0,
        total: 0,
        billCount: 0,
      });
    }
    const row = bySupplier.get(bill.supplierId)!;
    if (bucket === "current") row.current += balanceKes;
    else if (bucket === "1-30") row.d1to30 += balanceKes;
    else if (bucket === "31-60") row.d31to60 += balanceKes;
    else if (bucket === "61-90") row.d61to90 += balanceKes;
    else row.d90plus += balanceKes;
    row.total += balanceKes;
    row.billCount++;
  }
  return [...bySupplier.values()].sort((a, b) => b.total - a.total);
}

// ============================================================
// Fleet utilisation
// ============================================================

export interface FleetUtilisationRow {
  truckId: string;
  registration: string;
  status: string;
  /** Distinct trips this truck appeared on in the range. */
  tripCount: number;
  /** Total km driven (last odometer - first odometer per truck/range). */
  kmDriven: number;
  /** Total revenue from invoices on this truck's trips (KES). */
  revenueKes: number;
  /** Total fuel cost (KES). */
  fuelKes: number;
  /** Total expenses (KES). */
  expensesKes: number;
  /** Gross profit. */
  grossProfitKes: number;
  /** Margin %. */
  marginPct: number | null;
}

export async function fleetUtilisation(range?: Range): Promise<FleetUtilisationRow[]> {
  const from = range?.fromDate ? new Date(range.fromDate) : new Date(0);
  const to = range?.toDate ? new Date(range.toDate) : new Date(8640000000000000);

  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  const [trucks, trips, invoices, fuelLogs, expenses] = await Promise.all([
    listTrucks(),
    listTrips(),
    listInvoices(),
    listFuelLogs(),
    listExpenses(),
  ]);

  const rows: FleetUtilisationRow[] = [];
  for (const truck of trucks) {
    const tripIds = new Set<string>();
    for (const t of trips) {
      const ref = t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt;
      if (t.truckId === truck.id && inRange(ref)) {
        tripIds.add(t.id);
      }
    }

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
    const odometers = fuelLogsForTruck.map((f) => f.odometerKm).sort((a, b) => a - b);
    const kmDriven = odometers.length >= 2 ? odometers[odometers.length - 1]! - odometers[0]! : 0;

    const expensesKes = expenses
      .filter(
        (e) =>
          e.tripId &&
          tripIds.has(e.tripId) &&
          (e.status === "approved" || e.status === "reimbursed") &&
          e.paidBy !== "advance",
      )
      .reduce((s, e) => s + e.amountKes, 0);

    const grossProfitKes = revenueKes - fuelKes - expensesKes;
    const marginPct = revenueKes > 0 ? grossProfitKes / revenueKes : null;

    rows.push({
      truckId: truck.id,
      registration: truck.registration,
      status: truck.status,
      tripCount: tripIds.size,
      kmDriven,
      revenueKes,
      fuelKes,
      expensesKes,
      grossProfitKes,
      marginPct,
    });
  }
  return rows.sort((a, b) => b.grossProfitKes - a.grossProfitKes);
}

// ============================================================
// Fuel efficiency
// ============================================================

export interface FuelEfficiencyRow {
  truckId: string;
  registration: string;
  fills: number;
  totalLitres: number;
  totalKes: number;
  /** First-to-last odometer span. */
  kmCovered: number;
  /** L/100km. */
  litresPer100km: number | null;
  /** KES per km. */
  kesPerKm: number | null;
  /** Average price per litre across this period. */
  avgPricePerLitre: number | null;
}

export async function fuelEfficiencyByTruck(range?: Range): Promise<FuelEfficiencyRow[]> {
  const from = range?.fromDate ? new Date(range.fromDate) : new Date(0);
  const to = range?.toDate ? new Date(range.toDate) : new Date(8640000000000000);

  const [trucks, fuelLogs] = await Promise.all([listTrucks(), listFuelLogs()]);

  const rows: FuelEfficiencyRow[] = [];
  for (const truck of trucks) {
    const fills = fuelLogs
      .filter((f) => f.truckId === truck.id)
      .filter((f) => {
        const d = new Date(f.datetime);
        return d >= from && d <= to;
      })
      .sort((a, b) => a.odometerKm - b.odometerKm);

    if (fills.length === 0) {
      rows.push({
        truckId: truck.id,
        registration: truck.registration,
        fills: 0,
        totalLitres: 0,
        totalKes: 0,
        kmCovered: 0,
        litresPer100km: null,
        kesPerKm: null,
        avgPricePerLitre: null,
      });
      continue;
    }

    const totalLitres = fills.reduce((s, f) => s + f.litres, 0);
    const totalKes = fills.reduce((s, f) => s + f.costKes, 0);
    const kmCovered =
      fills.length >= 2 ? fills[fills.length - 1]!.odometerKm - fills[0]!.odometerKm : 0;
    // L/100km uses all-but-first fill's litres against the km covered between
    // first and last odometers (tank-to-tank method)
    const litresAfterFirst = fills.slice(1).reduce((s, f) => s + f.litres, 0);
    const litresPer100km = kmCovered > 0 ? (litresAfterFirst / kmCovered) * 100 : null;
    const kesPerKm = kmCovered > 0 ? totalKes / kmCovered : null;
    const avgPricePerLitre = totalLitres > 0 ? totalKes / totalLitres : null;

    rows.push({
      truckId: truck.id,
      registration: truck.registration,
      fills: fills.length,
      totalLitres,
      totalKes,
      kmCovered,
      litresPer100km,
      kesPerKm,
      avgPricePerLitre,
    });
  }
  return rows.sort((a, b) => {
    if (a.litresPer100km === null) return 1;
    if (b.litresPer100km === null) return -1;
    return a.litresPer100km - b.litresPer100km;
  });
}

// ============================================================
// Expense breakdown
// ============================================================

export interface ExpenseBreakdownRow {
  key: string;
  label: string;
  amountKes: number;
  count: number;
}

/** Expense breakdown by category, truck or currency within an optional range. */
export async function expenseBreakdown(opts: {
  dimension: "category" | "truck" | "currency";
  fromDate?: string;
  toDate?: string;
}): Promise<ExpenseBreakdownRow[]> {
  const from = opts.fromDate ? new Date(opts.fromDate) : new Date(0);
  const to = opts.toDate ? new Date(opts.toDate) : new Date(8640000000000000);

  const [expenses, trips, trucks] = await Promise.all([
    listExpenses(),
    listTrips(),
    listTrucks(),
  ]);
  const tripMap = new Map(trips.map((t) => [t.id, t]));
  const truckMap = new Map(trucks.map((t) => [t.id, t]));

  const bucket = new Map<string, ExpenseBreakdownRow>();
  for (const e of expenses) {
    if (e.status !== "approved" && e.status !== "reimbursed") continue;
    const created = new Date(e.createdAt);
    if (created < from || created > to) continue;

    let key: string;
    let label: string;
    if (opts.dimension === "category") {
      key = e.category;
      label = e.category;
    } else if (opts.dimension === "truck") {
      const trip = e.tripId ? tripMap.get(e.tripId) : undefined;
      const truck = trip?.truckId ? truckMap.get(trip.truckId) : undefined;
      key = truck?.id ?? "__unallocated__";
      label = truck?.registration ?? "Unallocated";
    } else {
      const c = e.originalCurrency ?? "KES";
      key = c;
      label = c;
    }

    if (!bucket.has(key)) {
      bucket.set(key, { key, label, amountKes: 0, count: 0 });
    }
    const row = bucket.get(key)!;
    row.amountKes += e.amountKes;
    row.count++;
  }

  return [...bucket.values()].sort((a, b) => b.amountKes - a.amountKes);
}

// ============================================================
// Truck / Fleet P&L
// ============================================================

export interface TruckPnL {
  truckId: string;
  registration: string;
  status: string;
  // Activity
  tripCount: number;
  kmDriven: number;
  // Revenue
  revenueKes: number;
  invoiceCount: number;
  // Direct costs
  fuelKes: number;
  borderChargesKes: number;
  driverAdvanceUsedKes: number;
  tripExpensesKes: number;
  directCostTotal: number;
  // Gross
  grossProfit: number;
  grossMarginPct: number | null;
  // Indirect
  workshopKes: number;
  tyreKes: number;
  indirectCostTotal: number;
  // Operating
  operatingProfit: number;
  operatingMarginPct: number | null;
  // Unit economics
  revenuePerKm: number | null;
  costPerKm: number | null;
  profitPerKm: number | null;
}

export async function truckProfitAndLoss(
  truckId: string,
  range?: Range,
): Promise<TruckPnL | undefined> {
  const truck = await getTruck(truckId);
  if (!truck) return undefined;
  const { from, to } = rangeBounds(range);
  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  const [trips, invoices, fuelLogs, expenses, jobCards] = await Promise.all([
    listTrips(),
    listInvoices(),
    listFuelLogs(),
    listExpenses(),
    jobCardsForTruck(truck.id),
  ]);

  // Trips for this truck in range
  const truckTrips = trips.filter((t) => {
    const ref = t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt;
    return t.truckId === truck.id && inRange(ref);
  });
  const tripIds = new Set(truckTrips.map((t) => t.id));

  // Revenue
  const revenueInvoices = invoices.filter(
    (inv) =>
      inv.tripId &&
      tripIds.has(inv.tripId) &&
      inv.status !== "draft" &&
      inv.status !== "cancelled",
  );
  const revenueKes = revenueInvoices.reduce((s, inv) => s + inv.total * inv.fxRate, 0);

  // Direct: fuel
  const fuelLogsForTruck = fuelLogs.filter(
    (f) => f.truckId === truck.id && inRange(f.datetime),
  );
  const fuelKes = fuelLogsForTruck.reduce((s, f) => s + f.costKes, 0);
  const odoSorted = [...fuelLogsForTruck].sort((a, b) => a.odometerKm - b.odometerKm);
  const kmDriven =
    odoSorted.length >= 2
      ? odoSorted[odoSorted.length - 1]!.odometerKm - odoSorted[0]!.odometerKm
      : 0;

  // Direct: border charges (across this truck's trips in range) — batched.
  const borderByTrip = await borderChargesByTrip(truckTrips.map((t) => t.id));
  const borderChargesKes = [...borderByTrip.values()].reduce((s, v) => s + v, 0);

  // Direct: driver advance used (sum across trips)
  const driverAdvanceUsedKes = truckTrips.reduce(
    (s, t) => s + (t.driverAdvanceUsedKes ?? 0),
    0,
  );

  // Direct: approved/reimbursed expenses (excluding advance-paid to avoid double-count)
  const tripExpensesKes = expenses
    .filter(
      (e) =>
        e.tripId &&
        tripIds.has(e.tripId) &&
        (e.status === "approved" || e.status === "reimbursed") &&
        e.paidBy !== "advance",
    )
    .reduce((s, e) => s + e.amountKes, 0);

  const directCostTotal = fuelKes + borderChargesKes + driverAdvanceUsedKes + tripExpensesKes;
  const grossProfit = revenueKes - directCostTotal;
  const grossMarginPct = revenueKes > 0 ? grossProfit / revenueKes : null;

  // Indirect: workshop (job cards opened/closed in range; tyres split out from spares)
  let workshopKes = 0;
  let tyreKes = 0;
  for (const jc of jobCards) {
    if (jc.truckId !== truck.id) continue;
    if (!inRange(jc.openedAt) && !inRange(jc.closedAt ?? jc.openedAt)) continue;
    workshopKes += jc.totalKes ?? 0;
    const detail = await getJobCard(jc.id);
    const spares = detail?.spares ?? [];
    for (const s of spares) {
      if (/tyre|tire|tread/i.test(s.description)) tyreKes += s.totalCostKes;
    }
  }

  const indirectCostTotal = workshopKes;
  const operatingProfit = grossProfit - indirectCostTotal;
  const operatingMarginPct = revenueKes > 0 ? operatingProfit / revenueKes : null;

  const revenuePerKm = kmDriven > 0 ? revenueKes / kmDriven : null;
  const costPerKm = kmDriven > 0 ? (directCostTotal + indirectCostTotal) / kmDriven : null;
  const profitPerKm = kmDriven > 0 ? operatingProfit / kmDriven : null;

  return {
    truckId: truck.id,
    registration: truck.registration,
    status: truck.status,
    tripCount: truckTrips.length,
    kmDriven,
    revenueKes,
    invoiceCount: revenueInvoices.length,
    fuelKes,
    borderChargesKes,
    driverAdvanceUsedKes,
    tripExpensesKes,
    directCostTotal,
    grossProfit,
    grossMarginPct,
    workshopKes,
    tyreKes,
    indirectCostTotal,
    operatingProfit,
    operatingMarginPct,
    revenuePerKm,
    costPerKm,
    profitPerKm,
  };
}

export async function fleetProfitAndLoss(range?: Range): Promise<TruckPnL[]> {
  const trucks = await listTrucks();
  // Run per-truck P&Ls in parallel instead of sequentially — the bottleneck
  // was: for-each truck, await everything. Concurrency = trucks.length.
  const results = await Promise.all(trucks.map((t) => truckProfitAndLoss(t.id, range)));
  return results
    .filter((p): p is TruckPnL => !!p)
    .sort((a, b) => b.operatingProfit - a.operatingProfit);
}

// ============================================================
// Shared helpers for the insight reports below
// ============================================================

const tripRefDate = (t: {
  actualDeliveryAt?: string;
  actualDepartureAt?: string;
  plannedDepartureDate?: string;
  createdAt: string;
}) => t.actualDeliveryAt ?? t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt;

function monthKey(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastNMonths(n: number): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-GB", { month: "short", year: "numeric" }),
    });
  }
  return out;
}

// ============================================================
// Revenue by customer
// ============================================================

export interface RevenueByCustomerRow {
  customerId: string;
  customerName: string;
  invoiceCount: number;
  invoicedKes: number;
  receivedKes: number;
  outstandingKes: number;
  lastInvoiceDate?: string;
}

/** Customer revenue ranking from posted invoices, in KES base. */
export async function revenueByCustomer(range?: Range): Promise<RevenueByCustomerRow[]> {
  const { from, to } = rangeBounds(range);
  const [invoices, customers] = await Promise.all([listInvoices(), listCustomers()]);
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const byCustomer = new Map<string, RevenueByCustomerRow>();
  for (const inv of invoices) {
    if (inv.status === "draft" || inv.status === "cancelled") continue;
    const d = new Date(inv.issueDate);
    if (d < from || d > to) continue;

    if (!byCustomer.has(inv.customerId)) {
      byCustomer.set(inv.customerId, {
        customerId: inv.customerId,
        customerName: customerMap.get(inv.customerId)?.name ?? "Unknown",
        invoiceCount: 0,
        invoicedKes: 0,
        receivedKes: 0,
        outstandingKes: 0,
        lastInvoiceDate: undefined,
      });
    }
    const row = byCustomer.get(inv.customerId)!;
    row.invoiceCount++;
    row.invoicedKes += inv.total * inv.fxRate;
    row.receivedKes += inv.paidAmount * inv.fxRate;
    row.outstandingKes += inv.balance * inv.fxRate;
    if (!row.lastInvoiceDate || inv.issueDate > row.lastInvoiceDate) {
      row.lastInvoiceDate = inv.issueDate;
    }
  }
  return [...byCustomer.values()].sort((a, b) => b.invoicedKes - a.invoicedKes);
}

// ============================================================
// Driver performance
// ============================================================

export interface DriverPerformanceRow {
  driverId: string;
  driverName: string;
  status: string;
  tripCount: number;
  completedTrips: number;
  revenueKes: number;
  avgUllagePct: number | null;
  ullageBreaches: number;
}

/** Per-driver scorecard: trips, completion, revenue generated, ullage discipline. */
export async function driverPerformance(range?: Range): Promise<DriverPerformanceRow[]> {
  const { from, to } = rangeBounds(range);
  const [trips, drivers, invoices] = await Promise.all([
    listTrips(),
    listDrivers(),
    listInvoices(),
  ]);

  const revenueByTrip = new Map<string, number>();
  for (const inv of invoices) {
    if (!inv.tripId || inv.status === "draft" || inv.status === "cancelled") continue;
    revenueByTrip.set(inv.tripId, (revenueByTrip.get(inv.tripId) ?? 0) + inv.total * inv.fxRate);
  }

  const rows: DriverPerformanceRow[] = [];
  for (const driver of drivers) {
    const driverTrips = trips.filter((t) => {
      const d = new Date(tripRefDate(t));
      return t.driverId === driver.id && d >= from && d <= to;
    });
    if (driverTrips.length === 0) {
      rows.push({
        driverId: driver.id,
        driverName: driver.fullName,
        status: driver.status,
        tripCount: 0,
        completedTrips: 0,
        revenueKes: 0,
        avgUllagePct: null,
        ullageBreaches: 0,
      });
      continue;
    }
    const completedTrips = driverTrips.filter(
      (t) => t.status === "closed" || t.status === "delivered",
    ).length;
    const revenueKes = driverTrips.reduce((s, t) => s + (revenueByTrip.get(t.id) ?? 0), 0);
    const ullages = driverTrips
      .map((t) => t.ullagePct)
      .filter((u): u is number => u !== undefined);
    const avgUllagePct =
      ullages.length > 0 ? ullages.reduce((s, u) => s + u, 0) / ullages.length : null;
    const ullageBreaches = ullages.filter(
      (u) => Math.abs(u) > ULLAGE_ALERT_THRESHOLD_PCT,
    ).length;

    rows.push({
      driverId: driver.id,
      driverName: driver.fullName,
      status: driver.status,
      tripCount: driverTrips.length,
      completedTrips,
      revenueKes,
      avgUllagePct,
      ullageBreaches,
    });
  }
  return rows.sort((a, b) => b.revenueKes - a.revenueKes);
}

// ============================================================
// Monthly performance trend
// ============================================================

export interface MonthlyPerformanceRow {
  month: string; // YYYY-MM
  label: string; // e.g. "Jan 2026"
  tripCount: number;
  revenueKes: number;
  costKes: number;
  profitKes: number;
}

/**
 * Revenue / cost / gross profit bucketed by month (last `months` calendar
 * months), on the same trip-level basis as the Profit-per-Trip report so the
 * numbers reconcile. Empty months are included so the trend line is continuous.
 */
export async function monthlyPerformance(months = 12): Promise<MonthlyPerformanceRow[]> {
  const [trips, invoices, fuelLogs, expenses] = await Promise.all([
    listTrips(),
    listInvoices(),
    listFuelLogs(),
    listExpenses(),
  ]);

  // Border charges — batched across all trips in the window.
  const borderByTrip = await borderChargesByTrip(trips.map((t) => t.id));

  const revenueByTrip = new Map<string, number>();
  for (const inv of invoices) {
    if (!inv.tripId || inv.status === "draft" || inv.status === "cancelled") continue;
    revenueByTrip.set(inv.tripId, (revenueByTrip.get(inv.tripId) ?? 0) + inv.total * inv.fxRate);
  }
  const fuelByTrip = new Map<string, number>();
  for (const f of fuelLogs) {
    if (!f.tripId) continue;
    fuelByTrip.set(f.tripId, (fuelByTrip.get(f.tripId) ?? 0) + f.costKes);
  }
  const expenseByTrip = new Map<string, number>();
  for (const e of expenses) {
    if (!e.tripId) continue;
    if (e.status !== "approved" && e.status !== "reimbursed") continue;
    if (e.paidBy === "advance") continue;
    expenseByTrip.set(e.tripId, (expenseByTrip.get(e.tripId) ?? 0) + e.amountKes);
  }

  const buckets = new Map<string, MonthlyPerformanceRow>();
  for (const { key, label } of lastNMonths(months)) {
    buckets.set(key, { month: key, label, tripCount: 0, revenueKes: 0, costKes: 0, profitKes: 0 });
  }

  for (const trip of trips) {
    const key = monthKey(tripRefDate(trip));
    if (!key) continue;
    const row = buckets.get(key);
    if (!row) continue; // outside the window
    const revenue = revenueByTrip.get(trip.id) ?? 0;
    const cost =
      (fuelByTrip.get(trip.id) ?? 0) +
      (expenseByTrip.get(trip.id) ?? 0) +
      (borderByTrip.get(trip.id) ?? 0) +
      (trip.driverAdvanceUsedKes ?? 0);
    row.tripCount++;
    row.revenueKes += revenue;
    row.costKes += cost;
    row.profitKes += revenue - cost;
  }

  return [...buckets.values()];
}

// ============================================================
// VAT summary (output vs input)
// ============================================================

export interface VatMonthRow {
  month: string;
  label: string;
  outputKes: number; // VAT charged on sales (invoices)
  inputKes: number; // VAT paid on purchases (bills)
  netKes: number; // payable (positive) / reclaimable (negative)
}

export interface VatSummary {
  fromDate?: string;
  toDate?: string;
  outputVatKes: number;
  inputVatKes: number;
  netPayableKes: number;
  invoiceCount: number;
  billCount: number;
  byMonth: VatMonthRow[];
}

/** VAT control summary from posted invoices (output) and bills (input). */
export async function vatSummary(range?: Range): Promise<VatSummary> {
  const { from, to } = rangeBounds(range);
  const [invoices, bills] = await Promise.all([listInvoices(), listBills()]);

  const months = new Map<string, VatMonthRow>();
  const ensure = (key: string, label: string) => {
    if (!months.has(key)) months.set(key, { month: key, label, outputKes: 0, inputKes: 0, netKes: 0 });
    return months.get(key)!;
  };
  const labelFor = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { month: "short", year: "numeric" });

  let outputVatKes = 0;
  let inputVatKes = 0;
  let invoiceCount = 0;
  let billCount = 0;

  for (const inv of invoices) {
    if (inv.status === "draft" || inv.status === "cancelled") continue;
    const d = new Date(inv.issueDate);
    if (d < from || d > to) continue;
    const vat = inv.taxAmount * inv.fxRate;
    if (vat === 0) continue;
    outputVatKes += vat;
    invoiceCount++;
    const key = monthKey(inv.issueDate)!;
    ensure(key, labelFor(inv.issueDate)).outputKes += vat;
  }
  for (const bill of bills) {
    if (bill.status === "draft" || bill.status === "cancelled") continue;
    const d = new Date(bill.issueDate);
    if (d < from || d > to) continue;
    const vat = bill.taxAmount * bill.fxRate;
    if (vat === 0) continue;
    inputVatKes += vat;
    billCount++;
    const key = monthKey(bill.issueDate)!;
    ensure(key, labelFor(bill.issueDate)).inputKes += vat;
  }

  const byMonth = [...months.values()]
    .map((m) => ({ ...m, netKes: m.outputKes - m.inputKes }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    fromDate: range?.fromDate,
    toDate: range?.toDate,
    outputVatKes,
    inputVatKes,
    netPayableKes: outputVatKes - inputVatKes,
    invoiceCount,
    billCount,
    byMonth,
  };
}
