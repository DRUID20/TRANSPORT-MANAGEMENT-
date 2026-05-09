import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { expensesForTrip } from "@/server/actions/expenses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpenseStatusPill } from "@/components/expenses/expense-status-pill";
import { expenseCategoryLabel } from "@/lib/types/expenses";

export async function TripExpensesCard({ tripId }: { tripId: string }) {
  const expenses = await expensesForTrip(tripId);
  const pending = expenses.filter((e) => e.status === "pending").length;
  const approvedTotal = expenses
    .filter((e) => e.status === "approved" || e.status === "reimbursed")
    .reduce((s, e) => s + e.amountKes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>
              {expenses.length === 0
                ? "No expenses captured yet."
                : `${expenses.length} expense${expenses.length === 1 ? "" : "s"} · KSh ${approvedTotal.toLocaleString()} approved · ${pending} pending`}
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={{ pathname: "/expenses/new", query: { trip: tripId } }}>
              <Plus className="size-3.5" />
              Add
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="!p-0">
        {expenses.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-fg-tertiary">
            No expenses on this trip yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {expenses.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/expenses/${e.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg-base/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                      <Receipt className="size-3.5 text-fg-tertiary" />
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="font-mono text-xs font-medium text-fg-primary">{e.number}</span>
                      <span className="text-[11px] text-fg-tertiary">
                        {expenseCategoryLabel[e.category]} · {e.description}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tnum text-sm text-fg-primary">
                      KSh {e.amountKes.toLocaleString()}
                    </span>
                    <ExpenseStatusPill status={e.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
