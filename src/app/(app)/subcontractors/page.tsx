import Link from "next/link";
import { Building2, Handshake, Phone, Plus, Truck } from "lucide-react";
import { listSubcontractors } from "@/server/actions/subcontractors";
import { listTrucks } from "@/server/actions/trucks";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default async function SubcontractorsPage() {
  const [subs, trucks] = await Promise.all([listSubcontractors(), listTrucks()]);

  const truckCount = (subId: string) =>
    trucks.filter((t) => t.subcontractorId === subId).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Partners"
        title="Subcontractors"
        description="Third-party hauliers operating under Nile Valley. Settlements run at month-end."
        actions={
          <Button asChild>
            <Link href="/subcontractors/new">
              <Plus className="size-4" />
              Add subcontractor
            </Link>
          </Button>
        }
      />

      {subs.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={Handshake}
            title="No subcontractors yet"
            description="Add a partner haulier whose trucks you'll dispatch under your contracts."
            action={
              <Button asChild>
                <Link href="/subcontractors/new">
                  <Plus className="size-3.5" />
                  Add subcontractor
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map((s) => (
            <Link
              key={s.id}
              href={`/subcontractors/${s.id}`}
              className="surface-card surface-interactive lift-on-hover group p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning ring-1 ring-status-warning/20">
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
        </div>
      )}
    </div>
  );
}
