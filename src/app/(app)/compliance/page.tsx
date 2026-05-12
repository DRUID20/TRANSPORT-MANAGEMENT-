import Link from "next/link";
import {
  Container,
  IdCard as IdCardIcon,
  Truck as TruckIcon,
} from "lucide-react";
import {
  getComplianceSummary,
  listExpiries,
  type ExpiryEntityKind,
  type ExpiryItem,
} from "@/server/actions/compliance";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ExpiryChip } from "@/components/fleet/expiry-chip";
import { ComplianceFilters } from "./compliance-filters";

const entityIcon: Record<ExpiryEntityKind, React.ComponentType<{ className?: string }>> = {
  truck: TruckIcon,
  trailer: Container,
  driver: IdCardIcon,
};

const entityLabel: Record<ExpiryEntityKind, string> = {
  truck: "Truck",
  trailer: "Trailer",
  driver: "Driver",
};

type Filter =
  | "all"
  | "expired"
  | "critical"
  | "warning"
  | "ok"
  | "insurance"
  | "comesa"
  | "driver"
  | "fuel";

function applyFilter(items: ExpiryItem[], filter: Filter): ExpiryItem[] {
  switch (filter) {
    case "all":
      return items;
    case "expired":
    case "critical":
    case "warning":
    case "ok":
      return items.filter((i) => i.status === filter);
    case "insurance":
      return items.filter((i) => i.documentLabel === "Insurance");
    case "comesa":
      return items.filter(
        (i) =>
          i.documentLabel === "COMESA Permit" || i.documentLabel === "COMESA Driver Permit",
      );
    case "driver":
      return items.filter((i) => i.entityKind === "driver");
    case "fuel":
      return items.filter((i) => i.category === "fuel");
    default:
      return items;
  }
}

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = (
    [
      "all",
      "expired",
      "critical",
      "warning",
      "ok",
      "insurance",
      "comesa",
      "driver",
      "fuel",
    ].includes(rawFilter ?? "")
      ? rawFilter
      : "all"
  ) as Filter;

  const [items, summary] = await Promise.all([listExpiries(), getComplianceSummary()]);
  const filtered = applyFilter(items, filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Fleet"
        title="Compliance"
        description={
          filter === "fuel"
            ? "Petroleum-carrier paperwork — HazMat, EPRA, PUC, tank calibration, petroleum liability."
            : "Every expiring document across trucks, trailers, and drivers — sorted by urgency."
        }
      />

      {/* Status summary stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Total tracked" value={summary.totalItems} />
        <Stat label="Expired" value={summary.expiredCount} tone="danger" />
        <Stat label="Critical (≤14d)" value={summary.criticalCount} tone="danger" />
        <Stat label="Warning (≤30d)" value={summary.warningCount} tone="warning" />
        <Stat label="Fuel paperwork" value={summary.fuelComplianceExpiring} tone="danger" />
      </div>

      <ComplianceFilters active={filter} />

      {/* Items table */}
      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Entity</th>
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 text-right font-medium">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((it) => {
                  const Icon = entityIcon[it.entityKind];
                  return (
                    <tr key={it.key} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-3">
                        <Link href={it.href} className="flex items-center gap-2.5">
                          <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                            <Icon className="size-3.5 text-fg-tertiary" />
                          </span>
                          <div className="flex flex-col leading-tight">
                            <span className="text-sm text-fg-primary group-hover:text-brand-blue">
                              {it.entityLabel}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">
                              {entityLabel[it.entityKind]}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-fg-primary">{it.documentLabel}</td>
                      <td className="px-5 py-3">
                        <ExpiryChip date={it.dueDate} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={
                            "font-mono text-xs tnum " +
                            (it.daysUntilExpiry < 0
                              ? "text-status-danger"
                              : it.daysUntilExpiry <= 14
                                ? "text-status-danger"
                                : it.daysUntilExpiry <= 30
                                  ? "text-status-warning"
                                  : "text-fg-secondary")
                          }
                        >
                          {it.daysUntilExpiry < 0
                            ? `${Math.abs(it.daysUntilExpiry)}d overdue`
                            : `${it.daysUntilExpiry}d`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      Nothing matches this filter.
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
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning";
}) {
  const colour =
    tone === "danger"
      ? "text-status-danger"
      : tone === "warning"
        ? "text-status-warning"
        : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono text-2xl tnum font-medium ${colour}`}>{value}</div>
    </div>
  );
}
