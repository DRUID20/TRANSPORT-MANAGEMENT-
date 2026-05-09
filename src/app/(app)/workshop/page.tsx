import Link from "next/link";
import { Plus, Truck as TruckIcon, Wrench } from "lucide-react";
import { listJobCards } from "@/server/actions/job-cards";
import { listTrucks } from "@/server/actions/trucks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { JobCardStatusPill } from "@/components/workshop/job-card-status-pill";
import { formatMoney } from "@/lib/format";

export default async function WorkshopPage() {
  const all = await listJobCards();
  const trucks = await listTrucks();
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
        title="Job Cards"
        description="Every yard service generates a Job Card. Spares post to the truck; supplier AP statements auto-build (Phase 5)."
        actions={
          <Button asChild>
            <Link href="/workshop/new">
              <Plus className="size-4" />
              New Job Card
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatPill label="Open" value={open.length} tone="info" />
        <StatPill
          label="Open spend (KES)"
          value={formatMoney(openSpend, "KES", { compact: true }).replace("KSh ", "")}
          tone="info"
          mono
        />
        <StatPill label="Completed (MTD)" value={completed.length} tone="success" />
        <StatPill
          label="Completed spend (KES)"
          value={formatMoney(completedSpend, "KES", { compact: true }).replace("KSh ", "")}
          tone="success"
          mono
        />
      </div>

      <Section title="Open" empty="No open job cards." cards={open} truckById={truckById} />
      <Section title="Completed" empty="No completed job cards yet." cards={completed} truckById={truckById} />
    </div>
  );
}

function Section({
  title,
  empty,
  cards,
  truckById,
}: {
  title: string;
  empty: string;
  cards: Awaited<ReturnType<typeof listJobCards>>;
  truckById: Map<string, Awaited<ReturnType<typeof listTrucks>>[number]>;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-secondary">
        {title} <span className="font-mono text-fg-tertiary">({cards.length})</span>
      </h2>
      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-fg-tertiary">{empty}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {cards.map((j) => {
            const t = truckById.get(j.truckId);
            return (
              <Link
                key={j.id}
                href={`/workshop/${j.id}`}
                className="group flex items-start gap-4 rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
              >
                <div className="flex size-10 items-center justify-center rounded-md bg-bg-base text-fg-tertiary ring-1 ring-border group-hover:text-brand-blue">
                  <Wrench className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
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
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div
        className={`mt-1 ${mono ? "font-mono tnum" : ""} text-2xl font-medium ${colour}`}
      >
        {value}
      </div>
    </div>
  );
}
