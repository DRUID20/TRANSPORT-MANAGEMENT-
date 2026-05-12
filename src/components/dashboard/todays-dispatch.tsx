"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Droplet,
  Package,
  ShieldCheck,
  Truck as TruckIcon,
} from "lucide-react";
import { listCalendarEvents, type CalendarEvent } from "@/server/actions/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * TodaysDispatch — dashboard hero card showing the next two days of events
 * pulled from the dispatch calendar. Renders a tight two-column layout
 * (today / tomorrow) with up to three rows per column plus an overflow
 * link to the full /calendar view.
 *
 * Client-side: useEffect calls the same `listCalendarEvents` action that
 * the calendar page uses, so the source of truth is unified.
 */
const KIND_ICONS: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  trip_loading: { icon: TruckIcon, tone: "text-brand-blue" },
  trip_delivery: { icon: Package, tone: "text-status-success" },
  compliance_expiry: { icon: ShieldCheck, tone: "text-status-warning" },
};

const TONE_BG: Record<string, string> = {
  info: "border-brand-blue/20 bg-brand-blue/[0.04]",
  success: "border-status-success/20 bg-status-success/[0.05]",
  warning: "border-status-warning/30 bg-status-warning/[0.06]",
  danger: "border-status-danger/25 bg-status-danger/[0.05]",
  purple: "border-purple-500/20 bg-purple-500/[0.05]",
};

function todayIso(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function TodaysDispatch() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const today = todayIso();
    const in14 = todayIso(14);
    listCalendarEvents({ fromDate: today, toDate: in14 }).then((all) => {
      if (cancelled) return;
      setEvents(all);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todayIso();
  const tomorrow = todayIso(1);
  const todays = events.filter((e) => e.date === today);
  const tomorrows = events.filter((e) => e.date === tomorrow);

  return (
    <section className="surface-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
            <CalendarDays className="size-4" />
          </span>
          <div className="leading-tight">
            <h2 className="text-[15px] font-semibold tracking-tight text-fg-primary">
              Today's dispatch
            </h2>
            <p className="text-xs text-fg-tertiary">
              Loadings, deliveries and paperwork due in the next two days.
            </p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/calendar">
            Open schedule
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <Column
          title="Today"
          subtitle={dayLabel(today)}
          events={todays}
          emptyHint="No movements scheduled."
          highlight
          loaded={loaded}
        />
        <Column
          title="Tomorrow"
          subtitle={dayLabel(tomorrow)}
          events={tomorrows}
          emptyHint="Nothing planned yet."
          loaded={loaded}
        />
      </div>
    </section>
  );
}

function Column({
  title,
  subtitle,
  events,
  emptyHint,
  highlight = false,
  loaded,
}: {
  title: string;
  subtitle: string;
  events: CalendarEvent[];
  emptyHint: string;
  highlight?: boolean;
  loaded: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.16em]",
              highlight ? "text-brand-blue" : "text-fg-tertiary",
            )}
          >
            {title}
          </div>
          <div className="text-sm font-semibold text-fg-primary">{subtitle}</div>
        </div>
        <span className="font-mono text-xs tnum text-fg-tertiary">
          {events.length}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {!loaded ? (
          <>
            <SkeletonChip />
            <SkeletonChip />
            <SkeletonChip />
          </>
        ) : events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-surface/50 px-3 py-4 text-center text-[11px] text-fg-tertiary">
            {emptyHint}
          </div>
        ) : (
          <>
            {events.slice(0, 4).map((ev) => {
              const kindMeta = KIND_ICONS[ev.kind] ?? KIND_ICONS.trip_loading!;
              const Icon = kindMeta.icon;
              return (
                <Link
                  key={ev.id}
                  href={ev.href ?? "/calendar"}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all hover:shadow-soft",
                    TONE_BG[ev.tone] ?? TONE_BG.info,
                  )}
                >
                  <Icon className={cn("size-3.5 shrink-0", kindMeta.tone)} />
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-xs font-semibold text-fg-primary group-hover:text-brand-blue">
                      {ev.title}
                    </span>
                    {ev.subtitle && (
                      <span className="truncate text-[10px] text-fg-tertiary">
                        {ev.subtitle}
                      </span>
                    )}
                  </div>
                  {ev.product && (
                    <span className="inline-flex items-center gap-0.5 rounded-md border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-tertiary">
                      <Droplet className="size-2.5" />
                      {ev.product}
                    </span>
                  )}
                </Link>
              );
            })}
            {events.length > 4 && (
              <Link
                href="/calendar"
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-fg-tertiary transition-colors hover:bg-bg-surface/50 hover:text-fg-primary"
              >
                + {events.length - 4} more on this day
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SkeletonChip() {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2">
      <span className="skeleton block h-3 w-3/4 rounded" />
      <span className="skeleton mt-1 block h-2 w-1/2 rounded" />
    </div>
  );
}
