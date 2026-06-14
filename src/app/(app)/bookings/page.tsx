import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, Plus } from "lucide-react";
import { listBookings } from "@/server/actions/bookings";
import { listCustomers } from "@/server/actions/customers";
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
import { Paginator } from "@/components/ui/paginator";
import { PageHeader } from "@/components/layout/page-header";
import { BookingStatusPill } from "@/components/trips/booking-status-pill";
import { cn } from "@/lib/utils";

const basisShort = {
  per_m3: "m³",
  per_litre: "L",
  per_trip: "trip",
} as const;

const PAGE_SIZE = 50;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const [bookings, customers] = await Promise.all([listBookings(), listCustomers()]);
  const bookingsCount = bookings.length;
  const paged = bookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hrefForPage = (p: number) => `/bookings?page=${p}`;
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const draft = bookings.filter((b) => b.status === "draft").length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const planned = bookings.filter((b) => b.status === "planned").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Bookings"
        actions={
          <Button asChild>
            <Link href="/bookings/new">
              <Plus className="size-4" />
              New booking
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Total" value={bookings.length} />
        <Stat label="Draft" value={draft} tone="neutral" />
        <Stat label="Confirmed" value={confirmed} tone="info" />
        <Stat label="Planned" value={planned} tone="success" />
      </div>

      {bookings.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={ClipboardList}
            title="No bookings yet"
            description="Create your first customer order to start the dispatch flow."
            action={
              <Button asChild>
                <Link href="/bookings/new">
                  <Plus className="size-3.5" />
                  Create booking
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Booking</DataTableHeaderCell>
              <DataTableHeaderCell>Customer</DataTableHeaderCell>
              <DataTableHeaderCell>Route</DataTableHeaderCell>
              <DataTableHeaderCell>Cargo</DataTableHeaderCell>
              <DataTableHeaderCell>Requested</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Rate</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {paged.map((b) => {
              const c = customerById.get(b.customerId);
              return (
                <DataTableRow key={b.id} linkHref={`/bookings/${b.id}`}>
                  <DataTableCell>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue"
                    >
                      {b.number}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    {c ? (
                      <Link
                        href={`/customers/${c.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-fg-secondary hover:text-brand-blue"
                      >
                        <Building2 className="size-3 text-fg-tertiary" />
                        {c.name}
                      </Link>
                    ) : (
                      <span className="text-fg-tertiary">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="inline-flex items-center gap-2 text-sm text-fg-primary">
                      <span>{b.origin}</span>
                      <ArrowRight className="size-3 text-fg-tertiary" />
                      <span>{b.destination}</span>
                    </span>
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    <span className="font-mono tnum">
                      {b.cargoQuantity.toLocaleString()}
                    </span>{" "}
                    {b.cargoUnit}
                  </DataTableCell>
                  <DataTableCell mono className="text-xs text-fg-secondary">
                    {new Date(b.requestedDate).toLocaleDateString("en-GB")}
                  </DataTableCell>
                  <DataTableCell>
                    <BookingStatusPill status={b.status} />
                  </DataTableCell>
                  <DataTableCell mono align="right" className="text-fg-secondary">
                    {b.agreedAmount} {b.agreedCurrency}/{basisShort[b.agreedBasis]}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
      <Paginator page={page} pageSize={PAGE_SIZE} total={bookingsCount} hrefFor={hrefForPage} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "neutral" | "info" | "success";
}) {
  const colour =
    tone === "info"
      ? "text-brand-blue"
      : tone === "success"
        ? "text-status-success"
        : tone === "neutral"
          ? "text-fg-secondary"
          : "text-fg-primary";
  return (
    <div className="surface-card lift-on-hover p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-2xl tnum font-semibold", colour)}>
        {value}
      </div>
    </div>
  );
}
