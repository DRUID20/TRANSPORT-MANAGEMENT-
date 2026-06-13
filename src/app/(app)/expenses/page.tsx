import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { listExpenses } from "@/server/actions/expenses";
import { listTrips } from "@/server/actions/trips";
import { listTrucks } from "@/server/actions/trucks";
import { listDrivers } from "@/server/actions/drivers";
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
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseStatusPill } from "@/components/expenses/expense-status-pill";
import { ExpensesFilters } from "./expenses-filters";
import {
  expenseCategoryLabel,
  paymentMethodLabel,
  type ExpenseStatus,
} from "@/lib/types/expenses";
import { cn } from "@/lib/utils";

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

  const [all, filtered, trips, trucks, drivers] = await Promise.all([
    listExpenses(),
    listExpenses(status ? { status } : undefined),
    listTrips(),
    listTrucks(),
    listDrivers(),
  ]);
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
        actions={
          <Button asChild>
            <Link href="/expenses/new">
              <Plus className="size-4" />
              New expense
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Total" value={all.length} />
        <Stat label="Pending" value={counts.pending} tone="warning" />
        <Stat
          label="Pending value"
          value={`KSh ${pendingValue.toLocaleString()}`}
          tone="warning"
          mono
        />
        <Stat
          label="Approved value"
          value={`KSh ${approvedValue.toLocaleString()}`}
          tone="success"
          mono
        />
      </div>

      <ExpensesFilters active={status ?? "all"} />

      {filtered.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={Receipt}
            title={all.length === 0 ? "No expenses yet" : "No expenses match this filter"}
            description={
              all.length === 0
                ? "Capture your first driver expense to start the approval flow."
                : "Try clearing the status filter to see all expenses."
            }
            action={
              all.length === 0 ? (
                <Button asChild>
                  <Link href="/expenses/new">
                    <Plus className="size-3.5" />
                    New expense
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {filtered.length} expense{filtered.length === 1 ? "" : "s"}
              {status ? ` · ${status}` : ""}
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Expense</DataTableHeaderCell>
              <DataTableHeaderCell>Category</DataTableHeaderCell>
              <DataTableHeaderCell>Trip / Truck</DataTableHeaderCell>
              <DataTableHeaderCell>Submitter</DataTableHeaderCell>
              <DataTableHeaderCell>Paid by</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Amount (KES)</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {filtered.map((e) => {
              const trip = e.tripId ? tripById.get(e.tripId) : undefined;
              const truck = e.truckId ? truckById.get(e.truckId) : undefined;
              const driver = e.driverId ? driverById.get(e.driverId) : undefined;
              return (
                <DataTableRow key={e.id} linkHref={`/expenses/${e.id}`}>
                  <DataTableCell>
                    <Link href={`/expenses/${e.id}`} className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-md border border-border bg-bg-surface">
                        <Receipt className="size-3.5 text-fg-tertiary" />
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue">
                          {e.number}
                        </span>
                        <span className="text-[11px] text-fg-tertiary">
                          {e.description}
                        </span>
                      </div>
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-fg-secondary">
                    {expenseCategoryLabel[e.category]}
                  </DataTableCell>
                  <DataTableCell className="text-xs">
                    <div className="flex flex-col leading-tight">
                      {trip ? (
                        <Link
                          href={`/trips/${trip.id}`}
                          className="font-mono text-fg-primary hover:text-brand-blue"
                        >
                          {trip.number}
                        </Link>
                      ) : (
                        <span className="text-fg-tertiary">—</span>
                      )}
                      {truck && (
                        <Link
                          href={`/trucks/${truck.id}`}
                          className="font-mono text-[11px] text-fg-tertiary hover:text-brand-blue"
                        >
                          {truck.registration}
                        </Link>
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    {driver?.fullName ?? e.submittedBy}
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    {paymentMethodLabel[e.paidBy]}
                  </DataTableCell>
                  <DataTableCell>
                    <ExpenseStatusPill status={e.status} />
                  </DataTableCell>
                  <DataTableCell mono align="right">
                    {e.amountKes.toLocaleString()}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
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
    tone === "warning"
      ? "text-status-warning"
      : tone === "success"
        ? "text-status-success"
        : tone === "danger"
          ? "text-status-danger"
          : "text-fg-primary";
  return (
    <div className="surface-card lift-on-hover p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold",
          mono && "font-mono tnum",
          colour,
        )}
      >
        {value}
      </div>
    </div>
  );
}
