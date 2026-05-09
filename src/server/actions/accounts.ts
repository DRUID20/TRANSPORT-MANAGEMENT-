"use server";

import {
  accountClassCounts as storeCounts,
  getAccount,
  getAccountByCode,
  listAccounts as storeList,
} from "@/server/store/mock-store";
import type { AccountClass, AccountStatus } from "@/lib/types/accounts";

export async function listAccounts(filter?: {
  class?: AccountClass;
  status?: AccountStatus;
  search?: string;
}) {
  return storeList(filter);
}

export async function getAccountById(id: string) {
  return getAccount(id);
}

export async function getAccountByCodeAction(code: string) {
  return getAccountByCode(code);
}

export async function accountClassCounts() {
  return storeCounts();
}
