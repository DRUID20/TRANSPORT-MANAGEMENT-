import Link from "next/link";
import {
  Container,
  IdCard as IdCardIcon,
  ShieldCheck,
  Truck as TruckIcon,
} from "lucide-react";
import {
  getComplianceSummary,
  listExpiries,
  type ExpiryEntityKind,
  type ExpiryItem,
} from "@/server/actions/compliance";
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
import { ExpiryChip } from "@/components/fleet/expiry-chip";
import { ComplianceFilters } from "./compliance-filters";
import { cn } from "@/lib/utils";

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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <Stat label="Total tracked" value={summary.totalItems} />
        <Stat label="Expired" value={summary.expiredCount} tone="danger" />
        <Stat label="Critical (≤14d)" value={summary.criticalCount} tone="danger" />
        <Stat label="Warning (≤30d)" value={summary.warningCount} tone="warning" />
        <Stat label="Fuel paperwork" value={summary.fuelComplianceExpiring} tone="danger" />
      </div>

      <ComplianceFilters active={filter} />

      {filtered.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={ShieldCheck}
            title="Nothing matches this filter"
            description="Try clearing filters above, or check back as expiries approach."
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {filtered.length} document{filtered.length === 1 ? "" : "s"} · most
              urgent first
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Entity</DataTableHeaderCell>
              <DataTableHeaderCell>Document</DataTableHeaderCell>
              <DataTableHeaderCell>Due</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Days</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {filtered.map((it) => {
              const Icon = entityIcon[it.entityKind];
              return (
                <DataTableRow key={it.key} linkHref={it.href}>
                  <DataTableCell>
                    <Link href={it.href} className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-md border border-border bg-bg-surface">
                        <Icon className="size-3.5 text-fg-tertiary" />
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-medium text-fg-primary group-hover:text-brand-blue">
                          {it.entityLabel}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">
                          {entityLabel[it.entityKind]}
                        </span>
                      </div>
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-fg-primary">
                    {it.documentLabel}
                  </DataTableCell>
                  <DataTableCell>
                    <ExpiryChip date={it.dueDate} />
                  </DataTableCell>
                  <DataTableCell align="right" mono>
                    <span
                      className={cn(
                        "text-xs",
                        it.daysUntilExpiry < 0
                          ? "font-semibold text-status-danger"
                          : it.daysUntilExpiry <= 14
                            ? "font-semibold text-status-danger"
                            : it.daysUntilExpiry <= 30
                              ? "text-status-warning"
                              : "text-fg-secondary",
                      )}
                    >
                      {it.daysUntilExpiry < 0
                        ? `${Math.abs(it.daysUntilExpiry)}d overdue`
                        : `${it.daysUntilExpiry}d`}
                    </span>
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
