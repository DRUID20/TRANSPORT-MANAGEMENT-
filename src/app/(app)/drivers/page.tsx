import Link from "next/link";
import { Phone, Plus, Truck as TruckIcon } from "lucide-react";
import { listDrivers } from "@/server/actions/drivers";
import { listTrucks } from "@/server/actions/trucks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/fleet/avatar";
import { DriverStatusPill } from "@/components/fleet/driver-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";

export default async function DriversPage() {
  const drivers = await listDrivers();
  const trucks = await listTrucks();
  const truckById = new Map(trucks.map((t) => [t.id, t]));

  const onTrip = drivers.filter((d) => d.status === "on_trip").length;
  const onLeave = drivers.filter((d) => d.status === "on_leave").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="HR & Staff"
        title="Drivers"
        description="Driver register — licences, medicals, passports, COMESA permits, default truck."
        actions={
          <Button asChild>
            <Link href="/drivers/new">
              <Plus className="size-4" />
              Add Driver
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatPill label="Total" value={drivers.length} />
        <StatPill label="On Trip" value={onTrip} tone="info" />
        <StatPill label="On Leave" value={onLeave} tone="warning" />
        <StatPill label="Available" value={drivers.length - onTrip - onLeave} tone="success" />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium">Licence</th>
                  <th className="px-5 py-3 font-medium">Default Truck</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Licence expiry</th>
                  <th className="px-5 py-3 font-medium">Medical</th>
                  <th className="px-5 py-3 font-medium">COMESA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drivers.map((d) => {
                  const truck = d.defaultTruckId ? truckById.get(d.defaultTruckId) : undefined;
                  return (
                    <tr key={d.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-3">
                        <Link
                          href={`/drivers/${d.id}`}
                          className="flex items-center gap-3"
                        >
                          <Avatar name={d.fullName} />
                          <div className="flex flex-col leading-tight">
                            <span className="text-sm font-medium text-fg-primary group-hover:text-brand-blue">
                              {d.fullName}
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[11px] text-fg-tertiary">
                              <Phone className="size-2.5" />
                              {d.phone}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-fg-secondary">
                        Class {d.licenceClass}
                      </td>
                      <td className="px-5 py-3">
                        {truck ? (
                          <Link
                            href={`/trucks/${truck.id}`}
                            className="inline-flex items-center gap-1.5 font-mono text-xs text-fg-secondary hover:text-brand-blue"
                          >
                            <TruckIcon className="size-3 text-fg-tertiary" />
                            {truck.registration}
                          </Link>
                        ) : (
                          <span className="text-xs text-fg-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <DriverStatusPill status={d.status} />
                      </td>
                      <td className="px-5 py-3">
                        <ExpiryChip date={d.licenceExpiry} />
                      </td>
                      <td className="px-5 py-3">
                        <ExpiryChip date={d.medicalExpiry} />
                      </td>
                      <td className="px-5 py-3">
                        <ExpiryChip date={d.comesaDriverPermitExpiry} />
                      </td>
                    </tr>
                  );
                })}
                {drivers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No drivers yet.{" "}
                      <Link href="/drivers/new" className="text-brand-blue hover:underline">
                        Add the first one →
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

function StatPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "info" | "success";
}) {
  const colourClass =
    tone === "warning"
      ? "text-status-warning"
      : tone === "info"
        ? "text-brand-blue"
        : tone === "success"
          ? "text-status-success"
          : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono text-2xl tnum font-medium ${colourClass}`}>{value}</div>
    </div>
  );
}
