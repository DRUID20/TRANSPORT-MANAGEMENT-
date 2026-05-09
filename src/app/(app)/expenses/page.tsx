import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { listExpenses } from "@/server/actions/expenses";
import { listTrips } from "@/server/actions/trips";
import { listTrucks } from "@/server/actions/trucks";
import { listDrivers } from "@/server/actions/drivers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseStatusPill } from "@/components/expenses/expense-status-pill";
import { ExpensesFilters } from "./expenses-filters";
import {
  expenseCategoryLabel,
  paymentMethodLabel,
  type ExpenseStatus,
} from "@/lib/types/expenses";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = (
    ["pending", "approved", "rejected", "reimbursed"].includes(rawStatus ?? "")
      ? rawStatus
      : undefined
  ) as ExpenseStatus | undefined;

  const all = await listExpenses();
  const filtered = await listExpenses(status ? { status } : undefined);
  const trips = await listTrips();
  const trucks = await listTrucks();
  const drivers = await listDrivers();
  const tripById = new Map(trips.map((t) => [t.id, t]));
  const truckById = new Map(trucks.map((t) => [t.id, t]));
  const driverById = new Map(drivers.map((d) => [d.id, d]));

  const counts = {
    pending: all.filter((e) => e.status === "pending").length,
    approved: all.filter((e) => e.status === "approved").length,
    rejected: all.filter((e) => e.status === "rejected").length,
    reimbursed: all.filter((e) => e.status === "reimbursed").length,
  };
  const pendingValue = all
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + e.amountKes, 0);
  const approvedValue = all
    .filter((e) => e.status === "approved" || e.status === "reimbursed")
    .reduce((s, e) => s + e.amountKes, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Expenses"
        description="Driver-submitted and dispatcher-captured trip expenses. Approve to release for reimbursement."
        actions={
          <Button asChild>
            <Link href="/expenses/new">
              <Plus className="size-4" />
              New Expense
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total" value={all.length} />
        <Stat label="Pending" value={counts.pending} tone="warning" />
        <Stat label="Pending value (KES)" value={`KSh ${pendingValue.toLocaleString()}`} tone="warning" mono />
        <Stat label="Approved value (KES)" value={`KSh ${approvedValue.toLocaleString()}`} tone="success" mono />
      </div>

      <ExpensesFilters active={status ?? "all"} />

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Expense</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Trip / Truck</th>
                  <th className="px-5 py-3 font-medium">Submitter</th>
                  <th className="px-5 py-3 font-medium">Paid by</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Amount (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => {
                  const trip = e.tripId ? tripById.get(e.tripId) : undefined;
                  const truck = e.truckId ? truckById.get(e.truckId) : undefined;
                  const driver = e.driverId ? driverById.get(e.driverId) : undefined;
                  return (
                    <tr key={e.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-3">
                        <Link href={`/expenses/${e.id}`} className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                            <Receipt className="size-3.5 text-fg-tertiary" />
                          </span>
                          <div className="flex flex-col leading-tight">
                            <span className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                              {e.number}
                            </span>
                            <span className="text-[11px] text-fg-tertiary">{e.description}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-fg-secondary">
                        {expenseCategoryLabel[e.category]}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        <div className="flex flex-col leading-tight">
                          {trip ? (
                            <Link href={`/trips/${trip.id}`} className="font-mono text-fg-primary hover:text-brand-blue">
                              {trip.number}
                            </Link>
                          ) : (
                            <span className="text-fg-tertiary">—</span>
                          )}
                          {truck && (
                            <Link href={`/trucks/${truck.id}`} className="font-mono text-[11px] text-fg-tertiary hover:text-brand-blue">
                              {truck.registration}
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-fg-secondary">
                        {driver?.fullName ?? e.submittedBy}
                      </td>
                      <td className="px-5 py-3 text-xs text-fg-secondary">
                        {paymentMethodLabel[e.paidBy]}
                      </td>
                      <td className="px-5 py-3">
                        <ExpenseStatusPill status={e.status} />
                      </td>
                      <td className="px-5 py-3 text-right font-mono tnum text-fg-primary">
                        {e.amountKes.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No expenses match this filter.
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

function Stat({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "success" | "danger";
  mono?: boolean;
}) {
  const colour =
    tone === "warning" ? "text-status-warning" :
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono tnum" : ""} text-2xl font-medium ${colour}`}>
        {value}
      </div>
    </div>
  );
}
