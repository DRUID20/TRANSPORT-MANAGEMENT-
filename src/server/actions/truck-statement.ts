"use server";

import { truckStatement } from "@/server/repos/truck-statement";

export async function getTruckStatement(truckId: string) {
  return truckStatement(truckId);
}
