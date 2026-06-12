"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Droplet,
  ExternalLink,
  Fuel,
  IdCard,
  Package,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { localIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventKind } from "@/server/actions/calendar";

type View = "month" | "week";

/**
 * CalendarBoard — premium dispatch board.
 *
 * Renders a 7-column month grid with the current month's days, leading
 * and trailing days from adjacent months shown faded. Each day cell
 * holds up to 3 event chips with a "+N more" overflow link. Clicking
 * any event opens a right-side drawer with full detail and links to
 * the underlying trip / employee record.
 *
 * Filters are client-side (the page hands the whole 3-month event
 * window to the board, so toggling a filter is instant).
 */
const TONE_CLASSES: Record<
  CalendarEvent["tone"],
  { bg: string; text: string; border: string; chip: string; dot: string }
> = {
  info: {
    bg: "bg-brand-blue/10",
    text: "text-brand-blue",
    border: "border-brand-blue/20",
    chip: "bg-brand-blue/10 text-brand-blue border-brand-blue/20 hover:bg-brand-blue/15",
    dot: "bg-brand-blue",
  },
  success: {
    bg: "bg-status-success/10",
    text: "text-status-success",
    border: "border-status-success/20",
    chip: "bg-status-success/10 text-status-success border-status-success/20 hover:bg-status-success/15",
    dot: "bg-status-success",
  },
  warning: {
    bg: "bg-status-warning/15",
    text: "text-status-warning",
    border: "border-status-warning/30",
    chip: "bg-status-warning/15 text-status-warning border-status-warning/30 hover:bg-status-warning/25",
    dot: "bg-status-warning",
  },
  danger: {
    bg: "bg-status-danger/10",
    text: "text-status-danger",
    border: "border-status-danger/25",
    chip: "bg-status-danger/10 text-status-danger border-status-danger/25 hover:bg-status-danger/15",
    dot: "bg-status-danger",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/20",
    chip: "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/15",
    dot: "bg-purple-500",
  },
};

const KIND_LABELS: Record<CalendarEventKind, string> = {
  trip_loading: "Loading",
  trip_delivery: "Delivery",
  compliance_expiry: "Compliance",
  maintenance: "Maintenance",
  leave: "Leave",
};

const KIND_ICONS: Record<
  CalendarEventKind,
  React.ComponentType<{ className?: string }>
> = {
  trip_loading: Truck,
  trip_delivery: Package,
  compliance_expiry: ShieldCheck,
  maintenance: Fuel,
  leave: Users,
};

export function CalendarBoard({
  referenceMonth,
  ymStartIso,
  ymEndIso,
  events,
  trucks,
  drivers,
  customers,
}: {
  referenceMonth: string;
  ymStartIso: string;
  ymEndIso: string;
  events: CalendarEvent[];
  trucks: { id: string; registration: string }[];
  drivers: { id: string; fullName: string }[];
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("month");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  // Filters
  const [truckReg, setTruckReg] = useState<string>("all");
  const [driverName, setDriverName] = useState<string>("all");
  const [customer, setCustomer] = useState<string>("all");
  const [kind, setKind] = useState<"all" | CalendarEventKind>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (truckReg !== "all" && e.truckRegistration !== truckReg) return false;
      if (driverName !== "all" && e.driverName !== driverName) return false;
      if (customer !== "all" && e.customerName !== customer) return false;
      if (kind !== "all" && e.kind !== kind) return false;
      if (q) {
        const hay = `${e.title} ${e.subtitle ?? ""} ${e.truckRegistration ?? ""} ${e.driverName ?? ""} ${e.customerName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, truckReg, driverName, customer, kind, search]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of filtered) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [filtered]);

  // Build the month grid (always 6 rows × 7 cols so prev/next don't reflow)
  const grid = useMemo(() => buildMonthGrid(ymStartIso), [ymStartIso]);
  const monthLabel = useMemo(() => {
    const d = new Date(ymStartIso + "T00:00:00");
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }, [ymStartIso]);

  function goPrev() {
    const d = new Date(referenceMonth + "-01");
    d.setMonth(d.getMonth() - 1);
    router.push(`/calendar?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function goNext() {
    const d = new Date(referenceMonth + "-01");
    d.setMonth(d.getMonth() + 1);
    router.push(`/calendar?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function goToday() {
    router.push("/calendar");
  }

  const truckOptions = useMemo(
    () => Array.from(new Set(trucks.map((t) => t.registration))).sort(),
    [trucks],
  );
  const driverOptions = useMemo(
    () => Array.from(new Set(drivers.map((d) => d.fullName))).sort(),
    [drivers],
  );
  const customerOptions = useMemo(
    () => Array.from(new Set(customers.map((c) => c.name))).sort(),
    [customers],
  );

  const totalThisMonth = useMemo(() => {
    return filtered.filter(
      (e) => e.date >= ymStartIso && e.date <= ymEndIso,
    ).length;
  }, [filtered, ymStartIso, ymEndIso]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="surface-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goPrev} aria-label="Previous month">
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="font-medium">
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={goNext} aria-label="Next month">
            <ChevronRight className="size-3.5" />
          </Button>
          <div className="ml-2 flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight text-fg-primary">
              {monthLabel}
            </span>
            <span className="text-xs font-medium text-fg-tertiary">
              {totalThisMonth} event{totalThisMonth === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
          ]}
          size="sm"
        />
      </div>

      {/* Filters */}
      <div className="surface-card flex flex-wrap gap-2 p-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search trips, drivers, customers…"
          className="h-9 max-w-xs flex-1"
        />
        <Select value={truckReg} onChange={(e) => setTruckReg(e.currentTarget.value)} className="max-w-[180px]">
          <option value="all">All trucks</option>
          {truckOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select value={driverName} onChange={(e) => setDriverName(e.currentTarget.value)} className="max-w-[200px]">
          <option value="all">All drivers</option>
          {driverOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select value={customer} onChange={(e) => setCustomer(e.currentTarget.value)} className="max-w-[220px]">
          <option value="all">All customers</option>
          {customerOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={kind} onChange={(e) => setKind(e.currentTarget.value as never)} className="max-w-[180px]">
          <option value="all">All event types</option>
          <option value="trip_loading">Loading</option>
          <option value="trip_delivery">Delivery</option>
          <option value="compliance_expiry">Compliance</option>
        </Select>
        {(truckReg !== "all" ||
          driverName !== "all" ||
          customer !== "all" ||
          kind !== "all" ||
          search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTruckReg("all");
              setDriverName("all");
              setCustomer("all");
              setKind("all");
              setSearch("");
            }}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}

        {/* Legend */}
        <div className="ml-auto hidden items-center gap-3 text-[11px] text-fg-tertiary lg:flex">
          <Legend tone="info" label="Loading" />
          <Legend tone="success" label="Delivered" />
          <Legend tone="warning" label="Compliance" />
          <Legend tone="danger" label="Delayed" />
        </div>
      </div>

      {/* Month grid */}
      {view === "month" ? (
        <div className="surface-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-bg-surface">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((cell, i) => {
              const dayEvents = eventsByDay.get(cell.iso) ?? [];
              const isToday = cell.iso === localIsoDate();
              const isCurrentMonth = cell.iso.startsWith(referenceMonth);
              return (
                <div
                  key={cell.iso + i}
                  className={cn(
                    "group relative flex min-h-[120px] flex-col gap-1 border-b border-r border-border p-2 transition-colors hover:bg-bg-surface/60",
                    !isCurrentMonth && "bg-bg-surface/30",
                    (i + 1) % 7 === 0 && "border-r-0",
                    i >= 35 && "border-b-0",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
                        isToday
                          ? "bg-brand-blue text-white shadow-soft"
                          : isCurrentMonth
                            ? "text-fg-primary"
                            : "text-fg-tertiary",
                      )}
                    >
                      {cell.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="font-mono text-[9px] text-fg-tertiary">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const Icon = KIND_ICONS[ev.kind];
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setSelected(ev)}
                          className={cn(
                            "group/chip flex w-full items-center gap-1.5 truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-all",
                            TONE_CLASSES[ev.tone].chip,
                          )}
                        >
                          <Icon className="size-3 shrink-0" />
                          <span className="truncate">{ev.title}</span>
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setSelected(dayEvents[0]!)}
                        className="rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium text-fg-tertiary hover:bg-bg-elevated hover:text-fg-primary"
                      >
                        + {dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <WeekView events={filtered} onSelect={setSelected} />
      )}

      {/* Empty state for the visible month */}
      {totalThisMonth === 0 && (
        <div className="surface-card">
          <EmptyState
            icon={Package}
            title="No events scheduled in this view"
            description="Try clearing filters or jump to a month with planned trips. Create a booking and plan it to get a load on the board."
            action={
              <Button asChild size="sm">
                <Link href="/bookings/new">
                  <Truck className="size-3.5" />
                  Create booking
                </Link>
              </Button>
            }
          />
        </div>
      )}

      {/* Event drawer */}
      {selected && (
        <EventDrawer event={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Legend({ tone, label }: { tone: CalendarEvent["tone"]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", TONE_CLASSES[tone].dot)} />
      {label}
    </span>
  );
}

function WeekView({
  events,
  onSelect,
}: {
  events: CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
}) {
  // Week starting Monday containing today
  const today = new Date();
  const day = today.getDay(); // 0 (Sun) - 6 (Sat)
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      iso: localIsoDate(d),
      label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }),
      isToday: d.toDateString() === today.toDateString(),
    };
  });

  return (
    <div className="surface-card overflow-hidden">
      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-7 md:divide-x md:divide-y-0">
        {week.map((d) => {
          const dayEvents = events.filter((e) => e.date === d.iso);
          return (
            <div key={d.iso} className="flex min-h-[260px] flex-col">
              <div
                className={cn(
                  "flex items-center justify-between border-b border-border px-3 py-2 text-xs",
                  d.isToday ? "bg-brand-blue/5" : "bg-bg-surface/50",
                )}
              >
                <span
                  className={cn(
                    "font-semibold",
                    d.isToday ? "text-brand-blue" : "text-fg-primary",
                  )}
                >
                  {d.label}
                </span>
                <span className="font-mono text-[10px] text-fg-tertiary">
                  {dayEvents.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-2">
                {dayEvents.length === 0 ? (
                  <span className="my-auto text-center text-[11px] text-fg-tertiary">
                    —
                  </span>
                ) : (
                  dayEvents.map((ev) => {
                    const Icon = KIND_ICONS[ev.kind];
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelect(ev)}
                        className={cn(
                          "flex w-full flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left transition-all hover:shadow-soft",
                          TONE_CLASSES[ev.tone].chip,
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                          <Icon className="size-3" />
                          <span className="truncate">{ev.title}</span>
                        </span>
                        {ev.subtitle && (
                          <span className="truncate text-[10px] opacity-80">
                            {ev.subtitle}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventDrawer({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const Icon = KIND_ICONS[event.kind];
  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-40 bg-fg-primary/30 backdrop-blur-sm animate-content-in"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Event detail — ${event.title}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-bg-base shadow-modal animate-content-in"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "grid size-10 place-items-center rounded-lg border",
                TONE_CLASSES[event.tone].bg,
                TONE_CLASSES[event.tone].border,
                TONE_CLASSES[event.tone].text,
              )}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">
                {KIND_LABELS[event.kind]}
              </div>
              <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-fg-primary">
                {event.title}
              </h2>
              {event.subtitle && (
                <p className="text-sm text-fg-secondary">{event.subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-fg-tertiary hover:bg-bg-elevated hover:text-fg-primary"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          <DetailRow icon={Droplet} label="Date">
            {new Date(event.date).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </DetailRow>
          {event.truckRegistration && (
            <DetailRow icon={Truck} label="Truck">
              <span className="font-mono">{event.truckRegistration}</span>
            </DetailRow>
          )}
          {event.driverName && (
            <DetailRow icon={IdCard} label="Driver">
              {event.driverName}
            </DetailRow>
          )}
          {event.customerName && (
            <DetailRow icon={Users} label="Customer">
              {event.customerName}
            </DetailRow>
          )}
          {event.status && (
            <DetailRow icon={ShieldCheck} label="Status">
              <span className="capitalize">{event.status.replace(/_/g, " ")}</span>
            </DetailRow>
          )}
        </div>

        {event.href && (
          <footer className="border-t border-border p-4">
            <Button asChild className="w-full">
              <Link href={event.href}>
                Open record
                <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          </footer>
        )}
      </aside>
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-bg-surface/50 p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-fg-tertiary" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-tertiary">
          {label}
        </div>
        <div className="mt-0.5 text-sm text-fg-primary">{children}</div>
      </div>
    </div>
  );
}

/**
 * Build a 42-cell month grid starting from the Monday of the week
 * containing the 1st of the reference month. Each cell is { iso, day }.
 */
function buildMonthGrid(ymStartIso: string): Array<{ iso: string; day: number }> {
  // "T00:00:00" forces local-time parsing; a bare YYYY-MM-DD parses as UTC
  // midnight and shifts the weekday in non-UTC timezones.
  const first = new Date(ymStartIso + "T00:00:00");
  // Monday-first weekday index (Mon=0 … Sun=6)
  const jsDay = first.getDay();
  const offset = jsDay === 0 ? 6 : jsDay - 1;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - offset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return {
      iso: localIsoDate(d),
      day: d.getDate(),
    };
  });
}
