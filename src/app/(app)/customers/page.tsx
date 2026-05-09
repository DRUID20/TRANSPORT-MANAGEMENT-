import Link from "next/link";
import { Building2, Mail, Phone, Plus } from "lucide-react";
import { listCustomers } from "@/server/actions/customers";
import { listBookings } from "@/server/actions/bookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

export default async function CustomersPage() {
  const customers = await listCustomers();
  const allBookings = await listBookings();
  const bookingCount = (cusId: string) => allBookings.filter((b) => b.customerId === cusId).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Partners"
        title="Customers"
        description="Export shippers and domestic customers Nile Valley hauls for."
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="size-4" />
              Add Customer
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customers.map((c) => (
          <Link
            key={c.id}
            href={`/customers/${c.id}`}
            className="group rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
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
        {customers.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-sm text-fg-tertiary">
              No customers yet.{" "}
              <Link href="/customers/new" className="text-brand-blue hover:underline">
                Add the first one →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
