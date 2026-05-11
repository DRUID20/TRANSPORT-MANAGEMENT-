import Link from "next/link";
import { Pause, Truck } from "lucide-react";
import { idleTrucks } from "@/server/actions/tracker";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

export default async function IdleTrucksPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const within = days ? parseInt(days, 10) || 14 : 14;
  const rows = await idleTrucks(within);
  const noTrips = rows.filter((r) => r.daysIdle === null).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Tracker", href: "/tracker" }, { label: "Idle trucks" }]}
        eyebrow="Operations · Performance"
        title="Idle trucks"
        description={`Trucks with no trip activity in the last ${within} day${within === 1 ? "" : "s"}.`}
      />

      <Card>
        <CardContent className="!p-5">
          <form className="flex items-center gap-3">
            <label className="text-xs uppercase tracking-wider text-fg-tertiary">
              Idle threshold (days)
            </label>
            <input
              type="number"
              name="days"
              min={1}
              defaultValue={within}
              className="w-24 rounded-md border border-border bg-bg-elevated px-3 py-2 text-right font-mono text-sm tnum"
            />
            <button
              type="submit"
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              Reload
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label={`Idle ≥ ${within} d`} value={String(rows.length)} tone="warning" />
        <Stat label="Never used" value={String(noTrips)} tone={noTrips > 0 ? "danger" : "default"} />
        <Stat
          label="Without driver"
          value={String(rows.filter((r) => !r.defaultDriverName).length)}
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Truck</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Default driver</th>
                  <th className="px-3 py-2 text-right font-medium">Days idle</th>
                  <th className="px-3 py-2 font-medium">Last trip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.truckId} className="group transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2">
                      <Link
                        href={`/tracker/${r.truckId}`}
                        className="inline-flex items-center gap-1.5 text-fg-primary group-hover:text-brand-blue"
                      >
                        <Truck className="size-3.5 text-fg-tertiary" />
                        <span className="font-mono text-xs">{r.registration}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={r.status === "active" ? "success" : "neutral"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-fg-secondary">
                      {r.defaultDriverName ?? <span className="text-fg-tertiary">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum">
                      {r.daysIdle === null ? (
                        <span className="text-status-danger">never used</span>
                      ) : (
                        <span className="text-status-warning">{r.daysIdle}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-fg-secondary">
                      {r.lastTripNumber
                        ? `${r.lastTripNumber} (${r.lastTripDate})`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      <Pause className="mx-auto mb-2 size-6" />
                      No idle trucks at the {within}-day threshold.
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
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger";
}) {
  const colour =
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-2xl font-medium ${colour}`}>{value}</div>
    </div>
  );
}
