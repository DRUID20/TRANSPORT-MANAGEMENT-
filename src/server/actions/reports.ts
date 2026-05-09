"use server";

import {
  profitAndLoss as storePnL,
  statementOfFinancialPosition as storeSfp,
  tripProfitability as storeTripProfit,
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
