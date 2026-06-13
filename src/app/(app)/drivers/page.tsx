import Link from "next/link";
import { IdCard, Phone, Plus, Truck as TruckIcon } from "lucide-react";
import { listDrivers } from "@/server/actions/drivers";
import { listTrucks } from "@/server/actions/trucks";
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
import { Avatar } from "@/components/fleet/avatar";
import { DriverStatusPill } from "@/components/fleet/driver-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";
import { cn } from "@/lib/utils";

export default async function DriversPage() {
  const [drivers, trucks] = await Promise.all([listDrivers(), listTrucks()]);
  const truckById = new Map(trucks.map((t) => [t.id, t]));

  const onTrip = drivers.filter((d) => d.status === "on_trip").length;
  const onLeave = drivers.filter((d) => d.status === "on_leave").length;
  const available = drivers.length - onTrip - onLeave;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="HR & Staff"
        title="Drivers"
        actions={
          <Button asChild>
            <Link href="/drivers/new">
              <Plus className="size-4" />
              Add driver
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatPill label="Total" value={drivers.length} />
        <StatPill label="On trip" value={onTrip} tone="info" />
        <StatPill label="On leave" value={onLeave} tone="warning" />
        <StatPill label="Available" value={available} tone="success" />
      </div>

      {drivers.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={IdCard}
            title="No drivers yet"
            description="Add a driver to start dispatching trips. You can attach a default truck and track licence + medical + COMESA permit expiries."
            action={
              <Button asChild>
                <Link href="/drivers/new">
                  <Plus className="size-3.5" />
                  Add driver
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {drivers.length} driver{drivers.length === 1 ? "" : "s"} · {available} available now
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Driver</DataTableHeaderCell>
              <DataTableHeaderCell>Licence</DataTableHeaderCell>
              <DataTableHeaderCell>Default truck</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Licence expiry</DataTableHeaderCell>
              <DataTableHeaderCell>Medical</DataTableHeaderCell>
              <DataTableHeaderCell>COMESA</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {drivers.map((d) => {
              const truck = d.defaultTruckId ? truckById.get(d.defaultTruckId) : undefined;
              return (
                <DataTableRow key={d.id} linkHref={`/drivers/${d.id}`}>
                  <DataTableCell>
                    <Link href={`/drivers/${d.id}`} className="flex items-center gap-3">
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
                  </DataTableCell>
                  <DataTableCell mono className="text-xs text-fg-secondary">
                    Class {d.licenceClass}
                  </DataTableCell>
                  <DataTableCell>
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
                  </DataTableCell>
                  <DataTableCell>
                    <DriverStatusPill status={d.status} />
                  </DataTableCell>
                  <DataTableCell>
                    <ExpiryChip date={d.licenceExpiry} />
                  </DataTableCell>
                  <DataTableCell>
                    <ExpiryChip date={d.medicalExpiry} />
                  </DataTableCell>
                  <DataTableCell>
                    <ExpiryChip date={d.comesaDriverPermitExpiry} />
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
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
  const colour =
    tone === "warning"
      ? "text-status-warning"
      : tone === "info"
        ? "text-brand-blue"
        : tone === "success"
          ? "text-status-success"
          : "text-fg-primary";
  return (
    <div className="surface-card lift-on-hover p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-2xl tnum font-semibold", colour)}>
        {value}
      </div>
    </div>
  );
}
