import { redirect } from "next/navigation";
import { currentDriverId } from "@/server/actions/driver-session";
import { tripsForDriver, getTripById } from "@/server/actions/trips";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanModeTabs } from "./scan-mode-tabs";

export default async function DriverScanPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const driverId = await currentDriverId();
  if (!driverId) redirect("/drv/login");
  const { mode: rawMode } = await searchParams;
  const mode = rawMode === "receipt" ? "receipt" : "document";

  const all = await tripsForDriver(driverId);
  const active = all.find((t) => t.status !== "closed" && t.status !== "cancelled");

  if (!active) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan</CardTitle>
          <CardDescription>You need an active trip first.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-fg-secondary">
            Once a trip is dispatched to you, come back here to scan documents
            (manifest / POD / customs) or receipts (fuel / border / per-diem).
          </p>
        </CardContent>
      </Card>
    );
  }

  const trip = await getTripById(active.id);
  if (!trip) redirect("/drv");

  return (
    <ScanModeTabs
      mode={mode}
      tripId={trip.id}
      tripNumber={trip.number}
      origin={trip.origin}
      destination={trip.destination}
      truckId={trip.truckId}
      driverId={driverId}
    />
  );
}
