import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Calendar,
  IdCard as IdCardIcon,
  MapPin,
  Receipt,
  Tag,
  Truck as TruckIcon,
  Wallet,
} from "lucide-react";
import { getExpenseById } from "@/server/actions/expenses";
import { getTruck } from "@/server/actions/trucks";
import { getDriverById } from "@/server/actions/drivers";
import { getTripById } from "@/server/actions/trips";
import { getSupplierById } from "@/server/actions/suppliers";
import {
  expenseCategoryLabel,
  paymentMethodLabel,
} from "@/lib/types/expenses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseStatusPill } from "@/components/expenses/expense-status-pill";
import { ExpenseReviewActions } from "./expense-review-actions";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exp = await getExpenseById(id);
  if (!exp) notFound();

  const trip = exp.tripId ? await getTripById(exp.tripId) : undefined;
  const truck = exp.truckId ? await getTruck(exp.truckId) : undefined;
  const driver = exp.driverId ? await getDriverById(exp.driverId) : undefined;
  const supplier = exp.supplierId ? await getSupplierById(exp.supplierId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Expenses", href: "/expenses" }, { label: exp.number }]}
        eyebrow="Expense"
        title={exp.number}
        description={exp.description}
        actions={<ExpenseStatusPill status={exp.status} />}
      />

      <Card>
        <CardContent className="!p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Wallet} label="Amount (KES)" value={`KSh ${exp.amountKes.toLocaleString()}`} mono />
            <Stat icon={Tag} label="Category" value={expenseCategoryLabel[exp.category]} />
            <Stat icon={Receipt} label="Paid by" value={paymentMethodLabel[exp.paidBy]} />
            <Stat
              icon={Calendar}
              label="Incurred"
              value={new Date(exp.incurredAt).toLocaleDateString("en-GB")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Allocation */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
            <CardDescription>Where the cost rolls up</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {trip && (
              <Row
                icon={ArrowRight}
                label="Trip"
                value={`${trip.number} · ${trip.origin} → ${trip.destination}`}
                href={`/trips/${trip.id}`}
              />
            )}
            {truck && (
              <Row
                icon={TruckIcon}
                label="Truck"
                value={truck.registration}
                href={`/trucks/${truck.id}`}
                mono
              />
            )}
            {driver && (
              <Row
                icon={IdCardIcon}
                label="Driver"
                value={driver.fullName}
                href={`/drivers/${driver.id}`}
              />
            )}
            {supplier && (
              <Row
                icon={Building2}
                label="Supplier"
                value={supplier.name}
                href={`/suppliers/${supplier.id}`}
              />
            )}
            {exp.location && <Row icon={MapPin} label="Location" value={exp.location} />}
            {!trip && !truck && !driver && !supplier && (
              <span className="text-sm text-fg-tertiary">Not allocated.</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row icon={IdCardIcon} label="Submitted by" value={exp.submittedBy} />
            <Row
              icon={Calendar}
              label="Submitted at"
              value={new Date(exp.submittedAt).toLocaleString("en-GB")}
            />
            {exp.approvedAt && (
              <Row
                icon={Calendar}
                label="Reviewed at"
                value={new Date(exp.approvedAt).toLocaleString("en-GB")}
              />
            )}
            {exp.approvedBy && <Row icon={IdCardIcon} label="Reviewed by" value={exp.approvedBy} />}
            {exp.rejectionReason && (
              <div className="rounded-md bg-status-danger/10 px-3 py-2 text-sm text-status-danger ring-1 ring-status-danger/20">
                Rejected: {exp.rejectionReason}
              </div>
            )}
            {exp.reimbursedAt && (
              <Row
                icon={Calendar}
                label="Reimbursed at"
                value={new Date(exp.reimbursedAt).toLocaleString("en-GB")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review actions */}
      {(exp.status === "pending" || exp.status === "approved") && (
        <ExpenseReviewActions expenseId={exp.id} status={exp.status} />
      )}

      {exp.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-fg-secondary">{exp.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
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
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        <Icon className="size-3" /> {label}
      </div>
      <div className={"mt-1 text-base font-medium text-fg-primary " + (mono ? "font-mono tnum" : "")}>
        {value}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  href,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
}) {
  const inner = (
    <>
      <Icon className="mt-0.5 size-4 shrink-0 text-fg-tertiary" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
        <div className={"text-sm text-fg-primary " + (mono ? "font-mono tnum tracking-wider" : "")}>
          {value}
        </div>
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="group flex items-start gap-3 hover:text-brand-blue">
        {inner}
      </Link>
    );
  }
  return <div className="flex items-start gap-3">{inner}</div>;
}
