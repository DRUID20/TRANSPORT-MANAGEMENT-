import Link from "next/link";
import { Fuel as FuelIcon, Plus } from "lucide-react";
import { listFuelLogs, fleetFuelSnapshot } from "@/server/actions/fuel";
import { listTrucks } from "@/server/actions/trucks";
import { listTrips } from "@/server/actions/trips";
import { listDrivers } from "@/server/actions/drivers";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { DeleteFuelLogButton } from "@/components/fuel/delete-fuel-log-button";
import { hasCapability } from "@/server/auth/permissions";
import { cn } from "@/lib/utils";

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

export default async function FuelPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string; truck?: string }>;
}) {
  const { trip: tripFilter, truck: truckFilter } = await searchParams;
  const [logs, trucks, trips, drivers, snap, isAdmin] = await Promise.all([
    listFuelLogs({
      tripId: tripFilter || undefined,
      truckId: truckFilter || undefined,
    }),
    listTrucks(),
    listTrips(),
    listDrivers(),
    fleetFuelSnapshot(),
    hasCapability("admin"),
  ]);
  const truckById = new Map(trucks.map((t) => [t.id, t]));
  const tripById = new Map(trips.map((t) => [t.id, t]));
  const driverById = new Map(drivers.map((d) => [d.id, d]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Fuel"
        actions={
          <Button asChild>
            <Link href="/fuel/new">
              <Plus className="size-4" />
              Log fuel
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat
          label="Fleet efficiency"
          value={snap.fleetKmPerLitre !== null ? `${snap.fleetKmPerLitre} km/L` : "—"}
          tone="info"
        />
        <Stat label="Litres pumped" value={snap.totalLitres.toLocaleString()} mono />
        <Stat label="Cost" value={`KSh ${snap.totalCostKes.toLocaleString()}`} mono />
        <Stat label="Logs" value={logs.length} />
      </div>

      {snap.byCountry.length > 0 && (
        <div className="surface-card p-5">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">
            Per-country split
          </div>
          <div className="flex flex-col gap-2.5">
            {snap.byCountry.map((c) => (
              <div key={c.code} className="flex items-center gap-3">
                <span className="text-base">{countryFlag[c.code] ?? "🏳"}</span>
                <span className="w-28 text-xs text-fg-secondary">
                  {countryName[c.code] ?? c.code}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-surface">
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
        </div>
      )}

      {logs.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={FuelIcon}
            title="No fuel logs yet"
            description="Capture engine fuel pumped at any station — the Tracker uses these for km/L, cost-per-km, and the per-country split."
            action={
              <Button asChild>
                <Link href="/fuel/new">
                  <Plus className="size-3.5" />
                  Log fuel
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {logs.length} log{logs.length === 1 ? "" : "s"} · newest first
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Log</DataTableHeaderCell>
              <DataTableHeaderCell>Truck</DataTableHeaderCell>
              <DataTableHeaderCell>Trip</DataTableHeaderCell>
              <DataTableHeaderCell>Driver</DataTableHeaderCell>
              <DataTableHeaderCell>Station</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Litres</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Odometer</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Cost (KES)</DataTableHeaderCell>
              <DataTableHeaderCell align="right">KSh/L</DataTableHeaderCell>
              {isAdmin && <DataTableHeaderCell align="right"> </DataTableHeaderCell>}
            </tr>
          </DataTableHead>
          <DataTableBody>
            {logs.map((l) => {
              const truck = truckById.get(l.truckId);
              const trip = l.tripId ? tripById.get(l.tripId) : undefined;
              const driver = l.driverId ? driverById.get(l.driverId) : undefined;
              return (
                <DataTableRow key={l.id}>
                  <DataTableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-md border border-status-warning/20 bg-status-warning/10">
                        <FuelIcon className="size-3.5 text-status-warning" />
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="font-mono text-xs font-semibold text-fg-primary">
                          {l.number}
                        </span>
                        <span className="font-mono text-[10px] text-fg-tertiary">
                          {new Date(l.datetime).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    {truck && (
                      <Link
                        href={`/trucks/${truck.id}`}
                        className="font-mono text-xs text-fg-primary hover:text-brand-blue"
                      >
                        {truck.registration}
                      </Link>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    {trip ? (
                      <Link
                        href={`/trips/${trip.id}`}
                        className="font-mono text-xs text-fg-secondary hover:text-brand-blue"
                      >
                        {trip.number}
                      </Link>
                    ) : (
                      <span className="text-xs text-fg-tertiary">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    {driver?.fullName ?? "—"}
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    <span className="mr-1">{countryFlag[l.countryCode] ?? ""}</span>
                    {l.station}
                  </DataTableCell>
                  <DataTableCell mono align="right">
                    {l.litres.toLocaleString()}
                  </DataTableCell>
                  <DataTableCell mono align="right" className="text-fg-secondary">
                    {l.odometerKm.toLocaleString()}
                  </DataTableCell>
                  <DataTableCell mono align="right">
                    {l.costKes.toLocaleString()}
                  </DataTableCell>
                  <DataTableCell mono align="right" className="text-status-warning">
                    {l.pricePerLitreKes.toFixed(2)}
                  </DataTableCell>
                  {isAdmin && (
                    <DataTableCell align="right">
                      <DeleteFuelLogButton fuelLogId={l.id} variant="row" />
                    </DataTableCell>
                  )}
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
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
    tone === "info"
      ? "text-brand-blue"
      : tone === "warning"
        ? "text-status-warning"
        : "text-fg-primary";
  return (
    <div className="surface-card lift-on-hover p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold", mono && "font-mono tnum", colour)}>
        {value}
      </div>
    </div>
  );
}
