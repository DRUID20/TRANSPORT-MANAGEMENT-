import { redirect } from "next/navigation";
import { currentDriverId } from "@/server/actions/driver-session";
import { tripsForDriver } from "@/server/actions/trips";

export default async function DriverTripIndex() {
  const driverId = await currentDriverId();
  if (!driverId) redirect("/drv/login");
  const all = await tripsForDriver(driverId);
  const active = all.find((t) => t.status !== "closed" && t.status !== "cancelled");
  if (active) redirect(`/drv/trip/${active.id}`);
  // No active trip — redirect home
  redirect("/drv");
}
