"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDriver } from "@/server/store/mock-store";

const COOKIE_NAME = "tx_drv";

/** Mock driver session. Replaced by real Supabase phone-OTP in Phase 2F+. */
export async function setDriverSession(driverId: string) {
  const driver = getDriver(driverId);
  if (!driver) {
    return { ok: false, error: "Driver not found" };
  }
  const c = await cookies();
  c.set(COOKIE_NAME, driverId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/drv");
  redirect("/drv");
}

export async function clearDriverSession() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
  redirect("/drv/login");
}

export async function currentDriverId(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value ?? null;
}
