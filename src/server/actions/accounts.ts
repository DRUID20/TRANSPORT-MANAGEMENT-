"use server";

import {
  accountClassCounts as repoCounts,
  getAccount,
  getAccountByCode,
  listAccounts as repoList,
} from "@/server/repos/accounts";
import type { AccountClass, AccountStatus } from "@/lib/types/accounts";

export async function listAccounts(filter?: {
  class?: AccountClass;
  status?: AccountStatus;
  search?: string;
}) {
  return repoList(filter);
}

export async function getAccountById(id: string) {
  return getAccount(id);
}

export async function getAccountByCodeAction(code: string) {
  return getAccountByCode(code);
}

export async function accountClassCounts() {
  return repoCounts();
}
