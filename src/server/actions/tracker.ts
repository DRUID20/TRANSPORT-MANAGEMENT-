"use server";

import {
  customerRouteMatrix as storeMatrix,
  idleTrucks as storeIdle,
  truckLeaderboard as storeLeaderboard,
  truckScorecard as storeScorecard,
} from "@/server/store/mock-store";

export async function truckLeaderboard(range?: { fromDate?: string; toDate?: string }) {
  return storeLeaderboard(range);
}

export async function truckScorecard(
  truckId: string,
  range?: { fromDate?: string; toDate?: string },
) {
  return storeScorecard(truckId, range);
}

export async function idleTrucks(withinDays = 14) {
  return storeIdle(withinDays);
}

export async function customerRouteMatrix(range?: { fromDate?: string; toDate?: string }) {
  return storeMatrix(range);
}
