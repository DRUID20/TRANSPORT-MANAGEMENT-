"use server";

import { revalidatePath } from "next/cache";
import {
  getLatestFxRates as repoGetLatest,
  getRatesToKesMap as repoGetMap,
  listFxHistory as repoHistory,
  refreshFxRates as repoRefresh,
} from "@/server/repos/fx";
import { requireCapability } from "@/server/auth/permissions";

export async function getLatestFxRates() {
  return repoGetLatest();
}

export async function getRatesToKesMap() {
  return repoGetMap();
}

export async function listFxHistory(currency: string, limit?: number) {
  return repoHistory(currency, limit);
}

/** Manual "refresh now" — pulls live rates and re-renders the FX page + forms. */
export async function refreshFxRatesNow() {
  await requireCapability("finance.post");
  const result = await repoRefresh();
  revalidatePath("/fx");
  revalidatePath("/invoices/new");
  revalidatePath("/bills/new");
  return result;
}
