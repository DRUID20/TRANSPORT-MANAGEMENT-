import Link from "next/link";
import { Smartphone } from "lucide-react";
import { listMpesaTransactions } from "@/server/actions/mpesa";
import { listDrivers } from "@/server/actions/drivers";
import { listTrips } from "@/server/actions/trips";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  transactionTypeLabel,
  type MpesaTransactionStatus,
} from "@/lib/types/mpesa";

const statusConfig: Record<
  MpesaTransactionStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  pending:   { label: "Pending",   variant: "warning" },
  sent:      { label: "Sent",      variant: "success" },
  failed:    { label: "Failed",    variant: "danger" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

export default async function MpesaPage() {
  const txs = await listMpesaTransactions();
  const drivers = await listDrivers();
  const trips = await listTrips();
  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const tripById = new Map(trips.map((t) => [t.id, t]));

  const sentTotal = txs
    .filter((t) => t.status === "sent")
    .reduce((s, t) => s + t.amountKes, 0);
  const failedCount = txs.filter((t) => t.status === "failed").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="M-Pesa transactions"
        description="Daraja-powered driver advances + reimbursements + supplier payments. Mock mode until your Daraja keys are wired."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total" value={txs.length} />
        <Stat label="Sent" value={txs.filter((t) => t.status === "sent").length} tone="success" />
        <Stat label="Failed" value={failedCount} tone="danger" />
        <Stat label="Sent value (KES)" value={`KSh ${sentTotal.toLocaleString()}`} tone="success" mono />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Tx</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Recipient</th>
                  <th className="px-5 py-3 font-medium">Trip</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Receipt</th>
                  <th className="px-5 py-3 text-right font-medium">Amount (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {txs.map((tx) => {
                  const driver = tx.driverId ? driverById.get(tx.driverId) : undefined;
                  const trip = tx.tripId ? tripById.get(tx.tripId) : undefined;
                  return (
                    <tr key={tx.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-md bg-status-success/10 text-status-success ring-1 ring-status-success/30">
                            <Smartphone className="size-3.5" />
                          </span>
                          <div className="flex flex-col leading-tight">
                            <span className="font-mono text-xs font-medium text-fg-primary">
                              {tx.number}
                            </span>
                            <span className="font-mono text-[10px] text-fg-tertiary">
                              {new Date(tx.initiatedAt).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-fg-secondary">
                        {transactionTypeLabel[tx.type]}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs text-fg-primary">
                            {tx.recipientName ?? driver?.fullName ?? "—"}
                          </span>
                          <span className="font-mono text-[11px] tnum text-fg-tertiary">
                            {tx.recipient}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {trip ? (
                          <Link href={`/trips/${trip.id}`} className="font-mono text-xs text-fg-secondary hover:text-brand-blue">
                            {trip.number}
                          </Link>
                        ) : (
                          <span className="text-xs text-fg-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusConfig[tx.status].variant} dot>
                          {statusConfig[tx.status].label}
                        </Badge>
                        {tx.errorMessage && (
                          <div className="mt-1 max-w-xs truncate text-[10px] text-status-danger">
                            {tx.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] tnum text-fg-secondary">
                        {tx.mpesaReceiptNumber ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tnum text-fg-primary">
                        {tx.amountKes.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {txs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No M-Pesa transactions yet. Issue a driver advance from a trip,
                      or reimburse an approved expense.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="!p-4 text-xs text-fg-tertiary">
          <strong className="text-fg-secondary">Daraja status:</strong> Mock mode.
          Set <code className="rounded bg-bg-base px-1 py-0.5 font-mono text-[10px]">MPESA_CONSUMER_KEY</code>,{" "}
          <code className="rounded bg-bg-base px-1 py-0.5 font-mono text-[10px]">MPESA_CONSUMER_SECRET</code>,{" "}
          <code className="rounded bg-bg-base px-1 py-0.5 font-mono text-[10px]">MPESA_SHORTCODE</code>,{" "}
          <code className="rounded bg-bg-base px-1 py-0.5 font-mono text-[10px]">MPESA_PASSKEY</code> in{" "}
          <code className="rounded bg-bg-base px-1 py-0.5 font-mono text-[10px]">.env.local</code> to switch on real STK Push + B2C.
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "danger" | "warning";
  mono?: boolean;
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono tnum" : ""} text-2xl font-medium ${colour}`}>
        {value}
      </div>
    </div>
  );
}
