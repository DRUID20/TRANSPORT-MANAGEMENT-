import Link from "next/link";
import {
  Building2,
  ClipboardList,
  IdCard,
  Route as RouteIcon,
  Truck as TruckIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Compact, always-visible trip context strip rendered at the top of EVERY
 * wizard page (above the stage bar). Lets the dispatcher keep facts in view
 * without flipping back to the detail page:
 *   TRP-2026-0001  ·  Customer  ·  Eldoret → Malaba (TBC)  ·  KDB 157R  ·  driver
 *
 * `blocker` is the single most important "you can't move on because…"
 * sentence for the current stage — kept here so it's visible from any sub-route.
 */
export function WizardTripHeader({
  tripId,
  tripNumber,
  customerName,
  customerId,
  origin,
  destination,
  truckReg,
  truckId,
  driverName,
  driverId,
  statusBadge,
  blocker,
}: {
  tripId: string;
  tripNumber: string;
  customerName?: string;
  customerId?: string;
  origin: string;
  destination?: string;
  truckReg?: string;
  truckId?: string;
  driverName?: string;
  driverId?: string;
  statusBadge?: React.ReactNode;
  blocker?: string;
}) {
  return (
    <header className="surface-card surface-3d border-2 border-border-strong px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <Link
          href={`/trips/${tripId}`}
          className="font-mono text-[18px] font-extrabold tracking-tight text-fg-primary hover:text-brand-blue"
          title="Trip overview"
        >
          {tripNumber}
        </Link>
        {statusBadge}
      </div>

      <ul className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
        <Chip icon={Building2} label="Customer" value={customerName} href={customerId ? `/customers/${customerId}` : undefined} />
        <Chip
          icon={RouteIcon}
          label="Route"
          value={`${origin} → ${destination ?? "TBC"}`}
          tone={destination ? "default" : "muted"}
        />
        <Chip icon={TruckIcon} label="Truck" value={truckReg} href={truckId ? `/trucks/${truckId}` : undefined} mono />
        <Chip icon={IdCard} label="Driver" value={driverName} href={driverId ? `/drivers/${driverId}` : undefined} />
      </ul>

      {blocker && (
        <div className="mt-3 flex items-start gap-2 rounded-md border-l-4 border-status-warning bg-status-warning/[0.06] px-3 py-2.5 text-[13px] font-medium text-fg-secondary">
          <ClipboardList className="mt-0.5 size-4 shrink-0 text-status-warning" />
          <span>
            <span className="font-extrabold text-fg-primary">Next:</span> {blocker}
          </span>
        </div>
      )}
    </header>
  );
}

export function ReadOnlyBanner({ kind }: { kind: "closed" | "cancelled" }) {
  const closed = kind === "closed";
  return (
    <div
      className={cn(
        "surface-card surface-3d flex items-center gap-3 border-2 px-5 py-3",
        closed
          ? "border-status-success/40 bg-status-success/[0.06]"
          : "border-status-danger/40 bg-status-danger/[0.06]",
      )}
    >
      <span
        className={cn(
          "rounded-md px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase tracking-wider text-white",
          closed ? "bg-status-success" : "bg-status-danger",
        )}
      >
        {closed ? "Closed" : "Cancelled"}
      </span>
      <span className="text-[13px] font-semibold text-fg-secondary">
        {closed
          ? "Trip is closed — every stage is read-only. Need to fix something? Use the Reopen action on the Invoice step (admin only)."
          : "Trip was cancelled — every stage is read-only and no further changes will be accepted."}
      </span>
    </div>
  );
}

function Chip({
  icon: Icon,
  label,
  value,
  href,
  mono = false,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  href?: string;
  mono?: boolean;
  tone?: "default" | "muted";
}) {
  const content = (
    <>
      <Icon className="size-3.5 text-fg-tertiary" />
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fg-tertiary">
        {label}
      </span>
      <span
        className={cn(
          "font-semibold",
          mono && "font-mono tnum",
          tone === "muted" ? "text-fg-tertiary" : "text-fg-primary",
        )}
      >
        {value ?? "—"}
      </span>
    </>
  );
  return href ? (
    <li>
      <Link href={href} className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-blue">
        {content}
      </Link>
    </li>
  ) : (
    <li className="inline-flex items-center gap-1.5">{content}</li>
  );
}

export { Badge };
