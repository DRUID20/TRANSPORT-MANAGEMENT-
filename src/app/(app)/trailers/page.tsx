import Link from "next/link";
import { Container, Plus } from "lucide-react";
import { listTrailers } from "@/server/actions/trailers";
import { listTrucks } from "@/server/actions/trucks";
import { listSubcontractors } from "@/server/actions/subcontractors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { OwnerPill } from "@/components/fleet/owner-pill";
import {
  TrailerStatusPill,
  trailerTypeLabel,
} from "@/components/fleet/trailer-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";

export default async function TrailersPage() {
  const trailers = await listTrailers();
  const trucks = await listTrucks();
  const subs = await listSubcontractors();
  const truckById = new Map(trucks.map((t) => [t.id, t]));
  const subById = new Map(subs.map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Fleet"
        title="Trailers"
        description="All trailers — flatbeds, tankers, container skeletons, etc."
        actions={
          <Button asChild>
            <Link href="/trailers/new">
              <Plus className="size-4" />
              Add Trailer
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Registration</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Capacity</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Attached to</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Insurance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trailers.map((t) => {
                  const truck = t.attachedTruckId ? truckById.get(t.attachedTruckId) : undefined;
                  const sub = t.subcontractorId ? subById.get(t.subcontractorId) : undefined;
                  return (
                    <tr key={t.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-3">
                        <Link href={`/trailers/${t.id}`} className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                            <Container className="size-3.5 text-fg-tertiary" />
                          </span>
                          <span className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                            {t.registration}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-fg-primary">
                        {trailerTypeLabel[t.type]}
                      </td>
                      <td className="px-5 py-3 font-mono tnum text-fg-secondary">
                        {t.capacityTonnes}t · {t.axles} axles
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          <OwnerPill ownerType={t.ownerType} />
                          {sub && <span className="text-[10px] text-fg-tertiary">{sub.name}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3">
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
                      </td>
                      <td className="px-5 py-3">
                        <TrailerStatusPill status={t.status} />
                      </td>
                      <td className="px-5 py-3">
                        <ExpiryChip date={t.insuranceExpiry} />
                      </td>
                    </tr>
                  );
                })}
                {trailers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No trailers yet.{" "}
                      <Link href="/trailers/new" className="text-brand-blue hover:underline">
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
