import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Receipt } from "lucide-react";
import { currentDriverId } from "@/server/actions/driver-session";
import { listExpenses } from "@/server/actions/expenses";
import { tripsForDriver } from "@/server/actions/trips";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpenseStatusPill } from "@/components/expenses/expense-status-pill";
import { expenseCategoryLabel, paymentMethodLabel } from "@/lib/types/expenses";

export default async function DriverExpensesPage() {
  const driverId = await currentDriverId();
  if (!driverId) redirect("/drv/login");

  const myExpenses = await listExpenses({ driverId });
  const allTrips = await tripsForDriver(driverId);
  const tripById = new Map(allTrips.map((t) => [t.id, t]));

  const pending = myExpenses.filter((e) => e.status === "pending");
  const recent = myExpenses.slice(0, 20);

  const pendingTotal = pending.reduce((s, e) => s + e.amountKes, 0);
  const approvedTotal = myExpenses
    .filter((e) => e.status === "approved" || e.status === "reimbursed")
    .reduce((s, e) => s + e.amountKes, 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>My expenses</CardTitle>
              <CardDescription>
                {myExpenses.length} total · {pending.length} pending
              </CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href="/drv/scan?mode=receipt">
                <Plus className="size-3.5" />
                New
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-bg-base/60 p-3 ring-1 ring-border">
            <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">
              Pending value
            </div>
            <div className="mt-1 font-mono tnum text-lg font-semibold text-status-warning">
              KSh {pendingTotal.toLocaleString()}
            </div>
          </div>
          <div className="rounded-md bg-bg-base/60 p-3 ring-1 ring-border">
            <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">
              Approved value
            </div>
            <div className="mt-1 font-mono tnum text-lg font-semibold text-status-success">
              KSh {approvedTotal.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {recent.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-fg-tertiary">
            No expenses yet. Tap{" "}
            <Link href="/drv/scan?mode=receipt" className="text-brand-blue hover:underline">
              Scan a receipt
            </Link>{" "}
            to submit your first one.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent</CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            <ul className="flex flex-col divide-y divide-border">
              {recent.map((e) => {
                const trip = e.tripId ? tripById.get(e.tripId) : undefined;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                        <Receipt className="size-4 text-fg-tertiary" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-fg-primary">
                          {e.description}
                        </div>
                        <div className="truncate font-mono text-[11px] tnum text-fg-tertiary">
                          {expenseCategoryLabel[e.category]} · {paymentMethodLabel[e.paidBy]}
                          {trip && ` · ${trip.number}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono tnum text-sm font-semibold text-fg-primary">
                        KSh {e.amountKes.toLocaleString()}
                      </span>
                      <ExpenseStatusPill status={e.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
