import Link from "next/link";
import { Building2, Mail, Phone, Plus } from "lucide-react";
import { listCustomers } from "@/server/actions/customers";
import { listBookings } from "@/server/actions/bookings";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

export default async function CustomersPage() {
  const [customers, allBookings] = await Promise.all([listCustomers(), listBookings()]);
  const bookingCount = (cusId: string) =>
    allBookings.filter((b) => b.customerId === cusId).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Partners"
        title="Customers"
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="size-4" />
              Add customer
            </Link>
          </Button>
        }
      />

      {customers.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={Building2}
            title="No customers yet"
            description="Add a customer to start invoicing fuel hauls."
            action={
              <Button asChild>
                <Link href="/customers/new">
                  <Plus className="size-3.5" />
                  Add customer
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customers.map((c) => (
          <Link
            key={c.id}
            href={`/customers/${c.id}`}
            className="surface-card surface-interactive lift-on-hover group p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-fg-primary group-hover:text-brand-blue">
                  {c.name}
                </div>
                <div className="text-xs text-fg-tertiary">{c.contactPerson}</div>
              </div>
              <Badge variant="info">{c.billingCurrency}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
              <div className="flex items-center gap-1.5 text-fg-secondary">
                <Phone className="size-3 text-fg-tertiary" />
                <span className="font-mono tnum">{c.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-fg-secondary">
                {c.email ? (
                  <>
                    <Mail className="size-3 text-fg-tertiary" />
                    <span className="truncate">{c.email}</span>
                  </>
                ) : (
                  <>
                    <span className="text-fg-tertiary">Net {c.paymentTermsDays}d</span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">Bookings</span>
              <span className="font-mono text-sm font-medium text-fg-primary">{bookingCount(c.id)}</span>
            </div>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
}
