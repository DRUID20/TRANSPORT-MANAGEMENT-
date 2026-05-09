import Link from "next/link";
import { Fuel as FuelIcon, Plus } from "lucide-react";
import { listFuelLogs, fleetFuelSnapshot } from "@/server/actions/fuel";
import { listTrucks } from "@/server/actions/trucks";
import { listTrips } from "@/server/actions/trips";
import { listDrivers } from "@/server/actions/drivers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

const countryFlag: Record<string, string> = {
  KE: "🇰🇪",
  UG: "🇺🇬",
  TZ: "🇹🇿",
  RW: "🇷🇼",
  SS: "🇸🇸",
  CD: "🇨🇩",
  BI: "🇧🇮",
  ET: "🇪🇹",
};

const countryName: Record<string, string> = {
  KE: "Kenya",
  UG: "Uganda",
  TZ: "Tanzania",
  RW: "Rwanda",
  SS: "South Sudan",
  CD: "DR Congo",
  BI: "Burundi",
  ET: "Ethiopia",
};

export default async function FuelPage() {
  const logs = await listFuelLogs();
  const trucks = await listTrucks();
  const trips = await listTrips();
  const drivers = await listDrivers();
  const truckById = new Map(trucks.map((t) => [t.id, t]));
  const tripById = new Map(trips.map((t) => [t.id, t]));
  const driverById = new Map(drivers.map((d) => [d.id, d]));

  const snap = await fleetFuelSnapshot();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Fuel"
        description="Per-truck fuel logs feeding the Performance Tracker. Drives km/L efficiency, cost-per-km, and per-country split."
        actions={
          <Button asChild>
            <Link href="/fuel/new">
              <Plus className="size-4" />
              Log Fuel
            </Link>
          </Button>
        }
      />

      {/* Fleet snapshot */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Fleet efficiency"
          value={snap.fleetKmPerLitre !== null ? `${snap.fleetKmPerLitre} km/L` : "—"}
          tone="info"
        />
        <Stat
          label="Litres pumped"
          value={snap.totalLitres.toLocaleString()}
          mono
        />
        <Stat
          label="Cost (KES)"
          value={`KSh ${snap.totalCostKes.toLocaleString()}`}
          mono
        />
        <Stat label="Logs" value={logs.length} />
      </div>

      {/* Country split */}
      {snap.byCountry.length > 0 && (
        <Card>
          <CardContent className="!p-5">
            <div className="mb-3 text-xs font-mono uppercase tracking-[0.16em] text-fg-tertiary">
              Per-country split
            </div>
            <div className="flex flex-col gap-2">
              {snap.byCountry.map((c) => (
                <div key={c.code} className="flex items-center gap-3">
                  <span className="text-base">{countryFlag[c.code] ?? "🏳"}</span>
                  <span className="w-28 text-xs text-fg-secondary">
                    {countryName[c.code] ?? c.code}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-base">
                    <div
                      className="h-full rounded-full bg-status-warning transition-all"
                      style={{ width: `${c.pct * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono tnum text-[11px] text-fg-tertiary">
                    {c.litres.toLocaleString()} L
                  </span>
                  <span className="w-10 text-right font-mono tnum text-[11px] text-fg-secondary">
                    {(c.pct * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs table */}
      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Log</th>
                  <th className="px-5 py-3 font-medium">Truck</th>
                  <th className="px-5 py-3 font-medium">Trip</th>
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium">Station</th>
                  <th className="px-5 py-3 text-right font-medium">Litres</th>
                  <th className="px-5 py-3 text-right font-medium">Odometer</th>
                  <th className="px-5 py-3 text-right font-medium">Cost (KES)</th>
                  <th className="px-5 py-3 text-right font-medium">KSh/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((l) => {
                  const truck = truckById.get(l.truckId);
                  const trip = l.tripId ? tripById.get(l.tripId) : undefined;
                  const driver = l.driverId ? driverById.get(l.driverId) : undefined;
                  return (
                    <tr key={l.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                            <FuelIcon className="size-3.5 text-status-warning" />
                          </span>
                          <span className="font-mono text-xs font-medium text-fg-primary">{l.number}</span>
                        </div>
                        <div className="font-mono text-[10px] text-fg-tertiary">
                          {new Date(l.datetime).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {truck && (
                          <Link
                            href={`/trucks/${truck.id}`}
                            className="font-mono text-xs text-fg-primary hover:text-brand-blue"
                          >
                            {truck.registration}
                          </Link>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {trip ? (
                          <Link href={`/trips/${trip.id}`} className="font-mono text-xs text-fg-secondary hover:text-brand-blue">
                            {trip.number}
                          </Link>
                        ) : (
                          <span className="text-xs text-fg-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-fg-secondary">
                        {driver?.fullName ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-fg-secondary">
                        <span className="mr-1">{countryFlag[l.countryCode] ?? ""}</span>
                        {l.station}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tnum text-fg-primary">
                        {l.litres.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tnum text-fg-secondary">
                        {l.odometerKm.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tnum text-fg-primary">
                        {l.costKes.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tnum text-status-warning">
                        {l.pricePerLitreKes.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No fuel logs yet.{" "}
                      <Link href="/fuel/new" className="text-brand-blue hover:underline">
                        Log the first one →
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "info" | "warning";
  mono?: boolean;
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono tnum" : ""} text-2xl font-medium ${colour}`}>
        {value}
      </div>
    </div>
  );
}
