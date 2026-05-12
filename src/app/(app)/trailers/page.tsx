import Link from "next/link";
import { Container, Plus } from "lucide-react";
import { listTrailers } from "@/server/actions/trailers";
import { listTrucks } from "@/server/actions/trucks";
import { listSubcontractors } from "@/server/actions/subcontractors";
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
import { OwnerPill } from "@/components/fleet/owner-pill";
import {
  TrailerStatusPill,
  trailerTypeLabel,
} from "@/components/fleet/trailer-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";

export default async function TrailersPage() {
  const [trailers, trucks, subs] = await Promise.all([
    listTrailers(),
    listTrucks(),
    listSubcontractors(),
  ]);
  const truckById = new Map(trucks.map((t) => [t.id, t]));
  const subById = new Map(subs.map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Fleet"
        title="Trailers"
        description="All trailers — flatbeds, tankers, container skeletons."
        actions={
          <Button asChild>
            <Link href="/trailers/new">
              <Plus className="size-4" />
              Add trailer
            </Link>
          </Button>
        }
      />

      {trailers.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={Container}
            title="No trailers yet"
            description="Register your first trailer to start attaching it to dispatched trucks."
            action={
              <Button asChild>
                <Link href="/trailers/new">
                  <Plus className="size-3.5" />
                  Add trailer
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {trailers.length} trailer{trailers.length === 1 ? "" : "s"}
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Registration</DataTableHeaderCell>
              <DataTableHeaderCell>Type</DataTableHeaderCell>
              <DataTableHeaderCell>Capacity</DataTableHeaderCell>
              <DataTableHeaderCell>Owner</DataTableHeaderCell>
              <DataTableHeaderCell>Attached to</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Insurance</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {trailers.map((t) => {
              const truck = t.attachedTruckId
                ? truckById.get(t.attachedTruckId)
                : undefined;
              const sub = t.subcontractorId ? subById.get(t.subcontractorId) : undefined;
              return (
                <DataTableRow key={t.id} linkHref={`/trailers/${t.id}`}>
                  <DataTableCell>
                    <Link href={`/trailers/${t.id}`} className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-md border border-border bg-bg-surface">
                        <Container className="size-3.5 text-fg-tertiary" />
                      </span>
                      <span className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue">
                        {t.registration}
                      </span>
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-fg-primary">
                    {trailerTypeLabel[t.type]}
                  </DataTableCell>
                  <DataTableCell mono className="text-fg-secondary">
                    {t.capacityTonnes}
                    <span className="text-fg-tertiary">t · {t.axles} axles</span>
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
                    {truck ? (
                      <Link
                        href={`/trucks/${truck.id}`}
                        className="font-mono text-xs text-fg-secondary hover:text-brand-blue"
                      >
                        {truck.registration}
                      </Link>
                    ) : (
                      <span className="text-xs text-fg-tertiary">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <TrailerStatusPill status={t.status} />
                  </DataTableCell>
                  <DataTableCell>
                    <ExpiryChip date={t.insuranceExpiry} />
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
