"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDriver, listDrivers } from "@/server/repos/drivers";

const COOKIE_NAME = "tx_drv";

const norm = (s: string) => s.replace(/\s+/g, "").trim().toLowerCase();

/**
 * Driver kiosk sign-in. Requires a knowledge factor — the driver must supply
 * BOTH their phone number and National ID, matched against an active driver
 * record. This replaces the previous "pick any name from a list" flow, which
 * let anyone impersonate any driver. (A phone-OTP upgrade is the intended
 * long-term auth; this is the interim barrier.)
 */
export async function authenticateDriver(formData: FormData): Promise<void> {
  const phone = norm(String(formData.get("phone") ?? ""));
  const nationalId = norm(String(formData.get("nationalId") ?? ""));
  if (!phone || !nationalId) {
    redirect("/drv/login?error=missing");
  }

  const drivers = await listDrivers();
  const match = drivers.find(
    (d) =>
      d.status !== "terminated" &&
      norm(d.phone) === phone &&
      norm(d.nationalId ?? "") === nationalId &&
      norm(d.nationalId ?? "").length > 0,
  );
  if (!match) {
    redirect("/drv/login?error=nomatch");
  }

  const c = await cookies();
  c.set(COOKIE_NAME, match.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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

/** Resolve the signed-in driver's id from the kiosk cookie, and confirm the
 *  driver still exists + is active. Returns null otherwise. */
export async function currentDriverId(): Promise<string | null> {
  const c = await cookies();
  const id = c.get(COOKIE_NAME)?.value;
  if (!id) return null;
  const driver = await getDriver(id);
  if (!driver || driver.status === "terminated") return null;
  return id;
}
