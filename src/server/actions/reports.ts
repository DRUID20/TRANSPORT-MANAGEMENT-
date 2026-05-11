"use server";

import {
  apAgingBySupplier as storeApAging,
  arAgingByCustomer as storeArAging,
  expenseBreakdown as storeExpenseBreakdown,
  fleetProfitAndLoss as storeFleetPnL,
  fleetUtilisation as storeFleetUtil,
  fuelEfficiencyByTruck as storeFuelEff,
  profitAndLoss as storePnL,
  statementOfFinancialPosition as storeSfp,
  tripProfitability as storeTripProfit,
  truckProfitAndLoss as storeTruckPnL,
} from "@/server/store/mock-store";

export async function profitAndLoss(range?: { fromDate?: string; toDate?: string }) {
  return storePnL(range);
}

export async function statementOfFinancialPosition(asOfDate?: string) {
  return storeSfp(asOfDate);
}

export async function tripProfitability() {
  return storeTripProfit();
}

export async function arAgingByCustomer(asOf?: string) {
  return storeArAging(asOf ? new Date(asOf) : undefined);
}

export async function apAgingBySupplier(asOf?: string) {
  return storeApAging(asOf ? new Date(asOf) : undefined);
}

export async function fleetUtilisation(range?: { fromDate?: string; toDate?: string }) {
  return storeFleetUtil(range);
}

export async function fuelEfficiencyByTruck(range?: { fromDate?: string; toDate?: string }) {
  return storeFuelEff(range);
}

export async function expenseBreakdown(opts: {
  dimension: "category" | "truck" | "currency";
  fromDate?: string;
  toDate?: string;
}) {
  return storeExpenseBreakdown(opts);
}

export async function fleetProfitAndLoss(range?: { fromDate?: string; toDate?: string }) {
  return storeFleetPnL(range);
}

export async function truckProfitAndLoss(
  truckId: string,
  range?: { fromDate?: string; toDate?: string },
) {
  return storeTruckPnL(truckId, range);
}
