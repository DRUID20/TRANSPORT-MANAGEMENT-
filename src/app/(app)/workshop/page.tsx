import Link from "next/link";
import { Plus, Truck as TruckIcon, Wrench } from "lucide-react";
import { listJobCards } from "@/server/actions/job-cards";
import { listTrucks } from "@/server/actions/trucks";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { JobCardStatusPill } from "@/components/workshop/job-card-status-pill";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function WorkshopPage() {
  const [all, trucks] = await Promise.all([listJobCards(), listTrucks()]);
  const truckById = new Map(trucks.map((t) => [t.id, t]));

  const open = all.filter((j) =>
    ["open", "in_progress", "awaiting_parts"].includes(j.status),
  );
  const completed = all.filter((j) => j.status === "completed");

  const openSpend = open.reduce((s, j) => s + j.totalKes, 0);
  const completedSpend = completed.reduce((s, j) => s + j.totalKes, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Workshop"
        title="Job cards"
        description="Every yard service generates a job card. Spares post to the truck; supplier AP statements auto-build."
        actions={
          <Button asChild>
            <Link href="/workshop/new">
              <Plus className="size-4" />
              New job card
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatPill label="Open" value={open.length} tone="info" />
        <StatPill
          label="Open spend"
          value={formatMoney(openSpend, "KES", { compact: true })}
          tone="info"
          mono
        />
        <StatPill label="Completed" value={completed.length} tone="success" />
        <StatPill
          label="Completed spend"
          value={formatMoney(completedSpend, "KES", { compact: true })}
          tone="success"
          mono
        />
      </div>

      <Section
        title="Open"
        empty="No open job cards — workshop bays are clear."
        cards={open}
        truckById={truckById}
        showCta={all.length === 0}
      />
      <Section
        title="Completed"
        empty="No completed job cards yet."
        cards={completed}
        truckById={truckById}
      />
    </div>
  );
}

function Section({
  title,
  empty,
  cards,
  truckById,
  showCta = false,
}: {
  title: string;
  empty: string;
  cards: Awaited<ReturnType<typeof listJobCards>>;
  truckById: Map<string, Awaited<ReturnType<typeof listTrucks>>[number]>;
  showCta?: boolean;
}) {
  return (
    <div>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">
        {title} <span className="ml-1 font-mono tnum text-fg-tertiary/70">({cards.length})</span>
      </h2>
      {cards.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={Wrench}
            title={empty}
            size="sm"
            action={
              showCta ? (
                <Button asChild size="sm">
                  <Link href="/workshop/new">
                    <Plus className="size-3.5" />
                    New job card
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {cards.map((j) => {
            const t = truckById.get(j.truckId);
            return (
              <Link
                key={j.id}
                href={`/workshop/${j.id}`}
                className="surface-card surface-interactive lift-on-hover group flex items-start gap-4 p-5"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                  <Wrench className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue">
                      {j.number}
                    </span>
                    <JobCardStatusPill status={j.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-fg-primary">
                    <TruckIcon className="size-3.5 text-fg-tertiary" />
                    <span className="font-mono">{t?.registration ?? "?"}</span>
                    <span className="text-fg-tertiary">·</span>
                    <span className="text-fg-secondary">{j.mechanicName}</span>
                  </div>
                  {j.mechanicAnalysis && (
                    <p className="mt-2 line-clamp-2 text-xs text-fg-tertiary">
                      {j.mechanicAnalysis}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="text-fg-tertiary">
                      Opened {new Date(j.openedAt).toLocaleDateString("en-GB")}
                    </span>
                    <span className="font-mono tnum text-fg-primary">
                      {formatMoney(j.totalKes, "KES")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "info" | "success" | "warning";
  mono?: boolean;
}) {
  const colour =
    tone === "info"
      ? "text-brand-blue"
      : tone === "success"
        ? "text-status-success"
        : tone === "warning"
          ? "text-status-warning"
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
