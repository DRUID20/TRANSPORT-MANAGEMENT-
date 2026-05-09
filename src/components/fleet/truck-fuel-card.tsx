import Link from "next/link";
import { Fuel, Plus } from "lucide-react";
import { fuelLogsForTruck, truckFuelEfficiency } from "@/server/actions/fuel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export async function TruckFuelCard({ truckId }: { truckId: string }) {
  const logs = (await fuelLogsForTruck(truckId)).slice(0, 8);
  const eff = await truckFuelEfficiency(truckId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="size-4 text-status-warning" />
              Fuel & efficiency
            </CardTitle>
            <CardDescription>
              {logs.length === 0
                ? "No fuel logs yet."
                : `${eff.count} log${eff.count === 1 ? "" : "s"} · ${eff.litresTotal.toLocaleString()} L · KSh ${eff.costKesTotal.toLocaleString()}`}
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={{ pathname: "/fuel/new", query: { truck: truckId } }}>
              <Plus className="size-3.5" />
              Log
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Efficiency hero */}
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="Efficiency"
            value={eff.kmPerLitre !== null ? `${eff.kmPerLitre} km/L` : "—"}
            tone="info"
          />
          <Stat
            label="Km covered"
            value={eff.kmCovered.toLocaleString()}
            mono
          />
          <Stat
            label="Litres"
            value={eff.litresTotal.toLocaleString()}
            mono
          />
        </div>

        {logs.length > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-bg-base/40">
            {logs.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate text-fg-primary">{l.station}</div>
                  <div className="font-mono text-[10px] text-fg-tertiary">
                    {new Date(l.datetime).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · odo {l.odometerKm.toLocaleString()} km
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono tnum text-fg-primary">
                    {l.litres.toLocaleString()} L
                  </div>
                  <div className="font-mono text-[10px] text-fg-tertiary">
                    KSh {l.costKes.toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "info";
  mono?: boolean;
}) {
  const colour = tone === "info" ? "text-brand-blue" : "text-fg-primary";
  return (
    <div className="rounded-md bg-bg-base/60 p-2.5 ring-1 ring-border">
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono tnum" : ""} text-base font-semibold ${colour}`}>
        {value}
      </div>
    </div>
  );
}
