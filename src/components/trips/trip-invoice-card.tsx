import Link from "next/link";
import { ArrowRight, FileText, ScrollText } from "lucide-react";
import { invoicesForTrip } from "@/server/actions/ar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceStatusPill } from "@/components/finance/invoice-status-pill";

export async function TripInvoiceCard({
  tripId,
  readyToInvoice,
}: {
  tripId: string;
  readyToInvoice: boolean;
}) {
  const invoices = await invoicesForTrip(tripId);
  const hasActive = invoices.some((i) => i.status !== "cancelled");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="size-4 text-fg-tertiary" />
              Invoice
            </CardTitle>
            <CardDescription>
              {hasActive
                ? `${invoices.length} invoice${invoices.length === 1 ? "" : "s"} on this trip`
                : readyToInvoice
                  ? "Ready to invoice this trip."
                  : "Invoices appear here after the trip is closed and reconciled."}
            </CardDescription>
          </div>
          {readyToInvoice && !hasActive && (
            <Button asChild size="sm">
              <Link href={{ pathname: "/invoices/new", query: { trip: tripId } }}>
                <FileText className="size-3.5" />
                Generate Invoice
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      {invoices.length > 0 && (
        <CardContent className="!p-0">
          <ul className="flex flex-col divide-y divide-border">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg-base/40"
                >
                  <div className="flex flex-col leading-tight">
                    <span className="font-mono text-xs font-medium text-fg-primary">
                      {inv.number}
                    </span>
                    <span className="text-[11px] text-fg-tertiary">
                      Issued {inv.issueDate} · Due {inv.dueDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tnum text-sm text-fg-primary">
                      {inv.total.toLocaleString()} {inv.currency}
                    </span>
                    <InvoiceStatusPill status={inv.status} />
                    <ArrowRight className="size-3.5 text-fg-tertiary" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
