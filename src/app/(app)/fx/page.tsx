import { getLatestFxRates, getRatesToKesMap } from "@/server/actions/fx";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { FxConverter } from "@/components/fx/fx-converter";
import { FxRefreshButton } from "@/components/fx/fx-refresh-button";

export const dynamic = "force-dynamic";

export default async function FxPage() {
  const [rates, map] = await Promise.all([getLatestFxRates(), getRatesToKesMap()]);
  const usdKes = map.USD ?? 0;
  const ugxKes = map.UGX ?? 0;
  const usdUgx = ugxKes > 0 ? usdKes / ugxKes : 0;
  const kesUgx = ugxKes > 0 ? 1 / ugxKes : 0;

  const asOf = rates[0]?.rateDate;
  const source = rates[0]?.source;
  const fmt = (n: number, dp = 2) =>
    new Intl.NumberFormat("en-KE", { maximumFractionDigits: dp }).format(n);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Finance", href: "/expenses" }, { label: "FX Rates" }]}
        eyebrow="Finance · Treasury"
        title="Foreign Exchange"
        description="Live KES / USD / UGX rates used to price every multi-currency invoice, bill and journal."
        actions={<FxRefreshButton />}
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-fg-tertiary">
        <span>As at</span>
        <span className="font-mono tnum text-fg-secondary">{asOf ?? "—"}</span>
        {source && <Badge variant={source === "MANUAL" ? "warning" : "info"}>{source}</Badge>}
        <span className="text-fg-tertiary">· refreshed daily 17:30 EAT (Mon–Fri)</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Pair from="USD" to="KES" value={`${fmt(usdKes)} KES`} note={`1 KES = ${fmt(1 / (usdKes || 1), 6)} USD`} />
        <Pair from="USD" to="UGX" value={`${fmt(usdUgx, 0)} UGX`} note={`1 UGX = ${fmt(usdUgx > 0 ? 1 / usdUgx : 0, 6)} USD`} />
        <Pair from="KES" to="UGX" value={`${fmt(kesUgx)} UGX`} note={`1 UGX = ${fmt(ugxKes, 4)} KES`} />
      </div>

      <FxConverter rates={map} />

      <Card>
        <CardContent className="!p-5 text-sm text-fg-secondary">
          <p>
            Rates are stored as KES-equivalents and refreshed automatically each business day, with
            a manual <span className="text-fg-primary">Refresh</span> available above. When you raise
            a USD or UGX invoice or bill, the FX field is pre-filled with the latest rate — you can
            still override it with a contracted or Central Bank of Kenya rate, which is captured on
            the posted journal entry for audit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Pair({
  from,
  to,
  value,
  note,
}: {
  from: string;
  to: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">
        1 {from} → {to}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tnum text-fg-primary">{value}</div>
      <div className="mt-1 font-mono text-[11px] text-fg-tertiary">{note}</div>
    </div>
  );
}
