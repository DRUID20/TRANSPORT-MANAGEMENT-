import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, FileText, Mail, Phone, Plus } from "lucide-react";
import { getCustomerById } from "@/server/actions/customers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { BookingStatusPill } from "@/components/trips/booking-status-pill";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCustomerById(id);
  if (!c) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Customers", href: "/customers" }, { label: c.name }]}
        eyebrow="Customer"
        title={c.name}
        actions={
          <>
            <Badge variant="info">{c.billingCurrency}</Badge>
            <Badge variant="outline">Net {c.paymentTermsDays}d</Badge>
            <Button asChild size="sm">
              <Link href={{ pathname: "/bookings/new", query: { customer: c.id } }}>
                <Plus className="size-3.5" />
                New Booking
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Row icon={Building2} label="Contact person" value={c.contactPerson} />
            <Row icon={Phone} label="Phone" value={c.phone} mono />
            {c.email && <Row icon={Mail} label="Email" value={c.email} />}
            {c.kraPin && <Row icon={FileText} label="KRA PIN" value={c.kraPin} mono />}
            {c.billingAddress && (
              <Row icon={Building2} label="Billing address" value={c.billingAddress} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Default settlement terms for AR</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Row icon={FileText} label="Currency" value={c.billingCurrency} />
            <Row icon={FileText} label="Payment terms" value={`Net ${c.paymentTermsDays} days`} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>Orders placed by {c.name}</CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          {c.bookings.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-tertiary">
              No bookings yet.{" "}
              <Link
                href={{ pathname: "/bookings/new", query: { customer: c.id } }}
                className="text-brand-blue hover:underline"
              >
                Create the first one →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Booking</th>
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Cargo</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {c.bookings.map((b) => (
                  <tr key={b.id} className="group transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-3">
                      <Link href={`/bookings/${b.id}`} className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                        {b.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-fg-primary">
                      {b.origin} <span className="text-fg-tertiary">→</span> {b.destination}
                    </td>
                    <td className="px-5 py-3 text-fg-secondary">
                      <span className="font-mono tnum">{b.cargoQuantity}</span> {b.cargoUnit} · {b.cargoType}
                    </td>
                    <td className="px-5 py-3">
                      <BookingStatusPill status={b.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-mono tnum text-fg-secondary">
                      {b.agreedAmount} {b.agreedCurrency}/{b.agreedBasis.replace("per_", "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {c.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-fg-secondary">{c.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value, mono = false }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-fg-tertiary" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
        <div className={"text-sm text-fg-primary " + (mono ? "font-mono tnum tracking-wider" : "")}>{value}</div>
      </div>
    </div>
  );
}
