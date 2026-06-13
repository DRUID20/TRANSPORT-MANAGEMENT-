import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
} from "lucide-react";
import { getCustomerById } from "@/server/actions/customers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { BookingStatusPill } from "@/components/trips/booking-status-pill";
import { computeFuelRevenue } from "@/lib/types/trips";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCustomerById(id);
  if (!c) notFound();

  const totalRevenue = c.bookings.reduce(
    (sum, b) =>
      sum +
      computeFuelRevenue({
        basis: b.agreedBasis,
        amount: b.agreedAmount,
        cargoQuantityLitres: b.cargoQuantity,
      }),
    0,
  );
  const activeBookings = c.bookings.filter(
    (b) => b.status === "confirmed" || b.status === "planned",
  ).length;

  return (
    <div className="stagger-children flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: c.name },
        ]}
        eyebrow="Customer"
        title={c.name}
        actions={
          <>
            <Badge variant="info">{c.billingCurrency}</Badge>
            <Badge variant="outline">Net {c.paymentTermsDays}d</Badge>
            <Button asChild size="sm">
              <Link href={{ pathname: "/bookings/new", query: { customer: c.id } }}>
                <Plus className="size-3.5" />
                New booking
              </Link>
            </Button>
          </>
        }
      />

      {/* FACTS */}
      <section className="surface-card grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        <FactCell label="Bookings" value={String(c.bookings.length)} sub="placed lifetime" />
        <FactCell label="Active" value={String(activeBookings)} sub="open right now" />
        <FactCell
          label="Revenue"
          value={totalRevenue.toLocaleString()}
          unit={c.billingCurrency}
          sub="across all bookings"
        />
        <FactCell label="Terms" value={`Net ${c.paymentTermsDays}d`} sub="invoice due" />
      </section>

      {/* RELATED — contact + billing */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card overflow-hidden">
          <header className="border-b border-border px-5 py-3">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              Contact
            </h2>
          </header>
          <div className="flex flex-col gap-3 px-5 py-4">
            <Row icon={Building2} label="Contact person" value={c.contactPerson} />
            <Row icon={Phone} label="Phone" value={c.phone} mono />
            {c.email && <Row icon={Mail} label="Email" value={c.email} />}
            {c.kraPin && <Row icon={FileText} label="KRA PIN" value={c.kraPin} mono />}
            {c.billingAddress && (
              <Row icon={MapPin} label="Billing address" value={c.billingAddress} />
            )}
          </div>
        </section>

        <section className="surface-card overflow-hidden">
          <header className="border-b border-border px-5 py-3">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              Billing
            </h2>
          </header>
          <div className="flex flex-col gap-3 px-5 py-4">
            <Row icon={FileText} label="Currency" value={c.billingCurrency} />
            <Row icon={FileText} label="Payment terms" value={`Net ${c.paymentTermsDays} days`} />
          </div>
        </section>
      </div>

      {/* BOOKINGS */}
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-fg-primary">
            <ClipboardList className="size-3.5 text-fg-tertiary" />
            Bookings
          </h2>
          {c.bookings.length > 0 && (
            <span className="font-mono text-[11px] tnum text-fg-tertiary">
              {c.bookings.length} total
            </span>
          )}
        </header>
        {c.bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-xl border border-border bg-bg-surface text-fg-tertiary">
              <ClipboardList className="size-5" />
            </span>
            <div className="text-sm text-fg-primary">No bookings yet</div>
            <Button asChild size="sm" variant="secondary">
              <Link href={{ pathname: "/bookings/new", query: { customer: c.id } }}>
                <Plus className="size-3.5" />
                Create first booking
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-surface/40 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-fg-tertiary">
                  <th className="px-5 py-2.5 font-semibold">Booking</th>
                  <th className="px-5 py-2.5 font-semibold">Route</th>
                  <th className="px-5 py-2.5 font-semibold">Cargo</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {c.bookings.map((b) => (
                  <tr key={b.id} className="group transition-colors hover:bg-brand-blue/[0.04]">
                    <td className="px-5 py-3">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="font-mono text-[12px] font-semibold text-fg-primary group-hover:text-brand-blue"
                      >
                        {b.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-fg-primary">
                        {b.origin}
                        <ArrowRight className="size-3 text-fg-tertiary" />
                        {b.destination}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-fg-secondary">
                      <span className="font-mono tnum">{b.cargoQuantity.toLocaleString()}</span>{" "}
                      {b.cargoUnit}
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
          </div>
        )}
      </section>

      {c.notes && (
        <section className="surface-card overflow-hidden">
          <header className="border-b border-border px-5 py-3">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              Notes
            </h2>
          </header>
          <p className="px-5 py-4 text-sm text-fg-secondary">{c.notes}</p>
        </section>
      )}
    </div>
  );
}

function FactCell({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-tertiary">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono tnum text-2xl font-semibold text-fg-primary">
          {value}
        </span>
        {unit && (
          <span className="text-[11px] font-medium uppercase tracking-wider text-fg-tertiary">
            {unit}
          </span>
        )}
      </div>
      {sub && <span className="text-[11px] text-fg-tertiary">{sub}</span>}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-fg-tertiary" />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-tertiary">
          {label}
        </div>
        <div
          className={
            "text-sm text-fg-primary " + (mono ? "font-mono tnum tracking-wide" : "")
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}
