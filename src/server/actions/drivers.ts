"use server";

import { revalidatePath } from "next/cache";
import {
  createDriver as storeCreate,
  getDriver,
  listDrivers as storeList,
  updateDriver as storeUpdate,
} from "@/server/store/mock-store";
import { driverCreateSchema, type DriverCreateInput } from "@/lib/validators/fleet";

export async function listDrivers() {
  return storeList();
}
export async function getDriverById(id: string) {
  return getDriver(id);
}

export type CreateDriverResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createDriver(input: DriverCreateInput): Promise<CreateDriverResult> {
  const parsed = driverCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const data = parsed.data;
  const created = storeCreate({
    fullName: data.fullName,
    phone: data.phone,
    nationalId: data.nationalId,
    status: data.status,
    licenceClass: data.licenceClass,
    licenceNumber: data.licenceNumber,
    licenceExpiry: data.licenceExpiry || undefined,
    medicalExpiry: data.medicalExpiry || undefined,
    passportNumber: data.passportNumber || undefined,
    passportExpiry: data.passportExpiry || undefined,
    comesaDriverPermitExpiry: data.comesaDriverPermitExpiry || undefined,
    defaultTruckId: data.defaultTruckId || undefined,
    hireDate: data.hireDate || undefined,
    notes: data.notes || undefined,
  });
  revalidatePath("/drivers");
  return { ok: true, id: created.id };
}

export async function updateDriverAction(id: string, patch: Partial<DriverCreateInput>) {
  storeUpdate(id, patch);
  revalidatePath("/drivers");
  revalidatePath(`/drivers/${id}`);
}
