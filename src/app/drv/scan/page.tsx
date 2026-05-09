import { redirect } from "next/navigation";
import { currentDriverId } from "@/server/actions/driver-session";
import { tripsForDriver, getTripById } from "@/server/actions/trips";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanFlow } from "./scan-flow";

export default async function DriverScanPage() {
  const driverId = await currentDriverId();
  if (!driverId) redirect("/drv/login");
  const all = await tripsForDriver(driverId);
  const active = all.find((t) => t.status !== "closed" && t.status !== "cancelled");

  if (!active) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document scan</CardTitle>
          <CardDescription>You need an active trip first.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-fg-secondary">
            Once a trip is dispatched to you, come back here to scan documents:
            manifest, customs, weighbridge, POD, etc.
          </p>
        </CardContent>
      </Card>
    );
  }

  const trip = await getTripById(active.id);
  if (!trip) redirect("/drv");

  return (
    <ScanFlow
      tripId={trip.id}
      tripNumber={trip.number}
      origin={trip.origin}
      destination={trip.destination}
    />
  );
}
