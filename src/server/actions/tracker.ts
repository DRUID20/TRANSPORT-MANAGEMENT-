"use server";

import {
  customerRouteMatrix as repoMatrix,
  idleTrucks as repoIdle,
  truckLeaderboard as repoLeaderboard,
  truckScorecard as repoScorecard,
} from "@/server/repos/tracker";

export async function truckLeaderboard(range?: { fromDate?: string; toDate?: string }) {
  return repoLeaderboard(range);
}

export async function truckScorecard(
  truckId: string,
  range?: { fromDate?: string; toDate?: string },
) {
  return repoScorecard(truckId, range);
}

export async function idleTrucks(withinDays = 14) {
  return repoIdle(withinDays);
}

export async function customerRouteMatrix(range?: { fromDate?: string; toDate?: string }) {
  return repoMatrix(range);
}
