import Link from "next/link";
import { Building2, Phone, Plus, Truck } from "lucide-react";
import {
  listSubcontractors,
} from "@/server/actions/subcontractors";
import { listTrucks } from "@/server/actions/trucks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default async function SubcontractorsPage() {
  const subs = await listSubcontractors();
  const trucks = await listTrucks();

  const truckCount = (subId: string) =>
    trucks.filter((t) => t.subcontractorId === subId).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Partners"
        title="Subcontractors"
        description="Third-party hauliers operating under Nile Valley. Year-end settlement (rate methodology TBD)."
        actions={
          <Button asChild>
            <Link href="/subcontractors/new">
              <Plus className="size-4" />
              Add Subcontractor
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subs.map((s) => (
          <Link
            key={s.id}
            href={`/subcontractors/${s.id}`}
            className="group rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-status-warning/10 text-status-warning ring-1 ring-status-warning/20">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-fg-primary group-hover:text-brand-blue">
                  {s.name}
                </div>
                <div className="text-xs text-fg-tertiary">{s.contactPerson}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
              <div className="flex items-center gap-1.5 text-fg-secondary">
                <Phone className="size-3 text-fg-tertiary" />
                <span className="font-mono tnum">{s.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-fg-secondary">
                <Truck className="size-3 text-fg-tertiary" />
                <span className="font-mono tnum">
                  {truckCount(s.id)} truck{truckCount(s.id) === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {subs.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-sm text-fg-tertiary">
              No subcontractors yet.{" "}
              <Link href="/subcontractors/new" className="text-brand-blue hover:underline">
                Add the first one →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
