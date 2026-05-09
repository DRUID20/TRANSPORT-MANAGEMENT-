import Link from "next/link";
import { Plus, Search, Truck as TruckIcon } from "lucide-react";
import { listTrucks } from "@/server/actions/trucks";
import { listSubcontractors } from "@/server/actions/subcontractors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { OwnerPill } from "@/components/fleet/owner-pill";
import { TruckStatusPill } from "@/components/fleet/truck-status-pill";
import { ExpiryChip } from "@/components/fleet/expiry-chip";

export default async function TrucksPage() {
  const trucks = await listTrucks();
  const subs = await listSubcontractors();
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
        description="Asset register for company-owned and subcontractor trucks operating under Nile Valley."
        actions={
          <Button asChild>
            <Link href="/trucks/new">
              <Plus className="size-4" />
              Add Truck
            </Link>
          </Button>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatPill label="Total" value={trucks.length} />
        <StatPill label="Company-Owned" value={ownStats} />
        <StatPill label="Subcontractor" value={subStats} />
        <StatPill label="In Workshop" value={workshopStats} tone="warning" />
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="!p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary" />
              <Input
                type="search"
                placeholder="Search by registration, make, model…"
                className="pl-9"
              />
            </div>
            <div className="font-mono text-xs tnum text-fg-tertiary">
              {trucks.length} truck{trucks.length === 1 ? "" : "s"} · {activeStats} active
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Truck table */}
      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Registration</th>
                  <th className="px-5 py-3 font-medium">Make / Model</th>
                  <th className="px-5 py-3 font-medium">Year</th>
                  <th className="px-5 py-3 font-medium">Capacity</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Insurance</th>
                  <th className="px-5 py-3 font-medium">COMESA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trucks.map((t) => {
                  const sub = t.subcontractorId ? subById.get(t.subcontractorId) : undefined;
                  return (
                    <tr key={t.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-3">
                        <Link href={`/trucks/${t.id}`} className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                            <TruckIcon className="size-3.5 text-fg-tertiary" />
                          </span>
                          <span className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                            {t.registration}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-fg-primary">
                        {t.make} <span className="text-fg-tertiary">{t.model}</span>
                      </td>
                      <td className="px-5 py-3 font-mono tnum text-fg-secondary">{t.year}</td>
                      <td className="px-5 py-3 font-mono tnum text-fg-secondary">
                        {t.capacityTonnes} <span className="text-fg-tertiary">t</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          <OwnerPill ownerType={t.ownerType} />
                          {sub && (
                            <span className="text-[10px] text-fg-tertiary">{sub.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <TruckStatusPill status={t.status} />
                      </td>
                      <td className="px-5 py-3">
                        <ExpiryChip date={t.insuranceExpiry} />
                      </td>
                      <td className="px-5 py-3">
                        <ExpiryChip date={t.comesaPermitExpiry} />
                      </td>
                    </tr>
                  );
                })}
                {trucks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No trucks registered yet.{" "}
                      <Link href="/trucks/new" className="text-brand-blue hover:underline">
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
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div
        className={
          "mt-1 font-mono text-2xl tnum font-medium " +
          (tone === "warning" ? "text-status-warning" : "text-fg-primary")
        }
      >
        {value}
      </div>
    </div>
  );
}
