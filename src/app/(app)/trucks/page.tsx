import Link from "next/link";
import { Plus, Search, Truck as TruckIcon } from "lucide-react";
import { listTrucks } from "@/server/actions/trucks";
import { listSubcontractors } from "@/server/actions/subcontractors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { OwnerPill } from "@/components/fleet/owner-pill";
import { TruckStatusPill } from "@/components/fleet/truck-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";
import { cn } from "@/lib/utils";

export default async function TrucksPage() {
  const [trucks, subs] = await Promise.all([listTrucks(), listSubcontractors()]);
  const subById = new Map(subs.map((s) => [s.id, s]));

  const ownStats = trucks.filter((t) => t.ownerType === "company_owned").length;
  const subStats = trucks.filter((t) => t.ownerType === "subcontractor").length;
  const activeStats = trucks.filter((t) => t.status === "active").length;
  const workshopStats = trucks.filter((t) => t.status === "in_workshop").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Fleet"
        title="Trucks"
        description="Asset register for company-owned and subcontractor tankers operating under Nile Valley."
        actions={
          <Button asChild>
            <Link href="/trucks/new">
              <Plus className="size-4" />
              Add truck
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatPill label="Total" value={trucks.length} />
        <StatPill label="Company-owned" value={ownStats} />
        <StatPill label="Subcontractor" value={subStats} />
        <StatPill label="In workshop" value={workshopStats} tone="warning" />
      </div>

      <div className="surface-card p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="search"
            placeholder="Search by registration, make, model…"
            leadingIcon={<Search />}
            className="h-9 flex-1"
          />
          <div className="font-mono text-xs tnum text-fg-tertiary">
            {trucks.length} truck{trucks.length === 1 ? "" : "s"} · {activeStats} active
          </div>
        </div>
      </div>

      {trucks.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={TruckIcon}
            title="No trucks registered yet"
            description="Add your first tanker to start dispatching fuel hauls."
            action={
              <Button asChild>
                <Link href="/trucks/new">
                  <Plus className="size-3.5" />
                  Add truck
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Registration</DataTableHeaderCell>
              <DataTableHeaderCell>Make / Model</DataTableHeaderCell>
              <DataTableHeaderCell>Year</DataTableHeaderCell>
              <DataTableHeaderCell>Tank</DataTableHeaderCell>
              <DataTableHeaderCell>Owner</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Insurance</DataTableHeaderCell>
              <DataTableHeaderCell>COMESA</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {trucks.map((t) => {
              const sub = t.subcontractorId ? subById.get(t.subcontractorId) : undefined;
              return (
                <DataTableRow key={t.id} linkHref={`/trucks/${t.id}`}>
                  <DataTableCell>
                    <Link href={`/trucks/${t.id}`} className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-md border border-border bg-bg-surface">
                        <TruckIcon className="size-3.5 text-fg-tertiary" />
                      </span>
                      <span className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue">
                        {t.registration}
                      </span>
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-fg-primary">{t.make}</span>{" "}
                    <span className="text-fg-tertiary">{t.model}</span>
                  </DataTableCell>
                  <DataTableCell mono className="text-fg-secondary">
                    {t.year}
                  </DataTableCell>
                  <DataTableCell mono className="text-fg-secondary">
                    {t.tankCapacityLitres ? (
                      <>
                        {t.tankCapacityLitres.toLocaleString()}{" "}
                        <span className="text-fg-tertiary">L</span>
                      </>
                    ) : (
                      <>
                        {t.capacityTonnes} <span className="text-fg-tertiary">t</span>
                      </>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-col gap-0.5">
                      <OwnerPill ownerType={t.ownerType} />
                      {sub && (
                        <span className="text-[10px] text-fg-tertiary">{sub.name}</span>
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <TruckStatusPill status={t.status} />
                  </DataTableCell>
                  <DataTableCell>
                    <ExpiryChip date={t.insuranceExpiry} />
                  </DataTableCell>
                  <DataTableCell>
                    <ExpiryChip date={t.comesaPermitExpiry} />
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
  tone?: "default" | "warning";
}) {
  return (
    <div className="surface-card lift-on-hover p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-2xl tnum font-semibold",
          tone === "warning" ? "text-status-warning" : "text-fg-primary",
        )}
      >
        {value}
      </div>
    </div>
  );
}
