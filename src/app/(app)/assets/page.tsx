import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { listAssets } from "@/server/actions/assets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  ASSET_CATEGORIES,
  ASSET_STATUS_LABEL,
  netBookValue,
  type AssetStatus,
} from "@/lib/types/assets";
import { cn } from "@/lib/utils";
import { RunDepreciation } from "./run-depreciation";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<AssetStatus, "success" | "neutral" | "warning" | "info"> = {
  active: "success",
  fully_depreciated: "info",
  disposed: "neutral",
  written_off: "warning",
};

export default async function AssetsPage() {
  let assets: Awaited<ReturnType<typeof listAssets>>;
  try {
    assets = await listAssets();
  } catch (e) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Finance" title="Asset Register" description="Fixed assets, depreciation and disposals." />
        <Card>
          <CardContent className="!p-6">
            <p className="text-sm text-status-danger">
              {e instanceof Error ? e.message : "You don't have access to the asset register."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const live = assets.filter((a) => a.status === "active" || a.status === "fully_depreciated");
  const totalCost = live.reduce((s, a) => s + a.cost, 0);
  const totalAccum = live.reduce((s, a) => s + a.accumulatedDepreciation, 0);
  const totalNbv = live.reduce((s, a) => s + netBookValue(a), 0);

  return (
    <div className="page-3d-bg flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Asset Register"
        description="Fixed assets, depreciation and disposals — posted straight to the general ledger."
        actions={
          <Button asChild size="sm">
            <Link href="/assets/new">
              <Plus className="size-3.5" />
              New asset
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Assets on register" value={String(live.length)} />
        <Stat label="Total cost" value={`KSh ${Math.round(totalCost).toLocaleString()}`} mono />
        <Stat label="Accumulated depreciation" value={`KSh ${Math.round(totalAccum).toLocaleString()}`} mono tone="warning" />
        <Stat label="Net book value" value={`KSh ${Math.round(totalNbv).toLocaleString()}`} mono tone="success" />
      </div>

      <RunDepreciation />

      {assets.length === 0 ? (
        <Card>
          <CardContent className="!p-6">
            <EmptyState
              icon={Boxes}
              title="No assets registered"
              description="Add buildings, vehicles, plant, equipment or software to start tracking depreciation."
              action={
                <Button asChild>
                  <Link href="/assets/new">
                    <Plus className="size-3.5" />
                    Register an asset
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <DataTable caption={<span>{assets.length} asset{assets.length === 1 ? "" : "s"} · newest first</span>}>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Asset</DataTableHeaderCell>
              <DataTableHeaderCell>Category</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Cost</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Acc. dep.</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Net book value</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {assets.map((a) => (
              <DataTableRow key={a.id} linkHref={`/assets/${a.id}`}>
                <DataTableCell>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-fg-primary group-hover:text-brand-blue">{a.name}</span>
                    <span className="font-mono text-[11px] text-fg-tertiary">{a.number}</span>
                  </div>
                </DataTableCell>
                <DataTableCell className="text-xs text-fg-secondary">
                  {ASSET_CATEGORIES[a.category]?.label ?? a.category}
                </DataTableCell>
                <DataTableCell mono align="right">{Math.round(a.cost).toLocaleString()}</DataTableCell>
                <DataTableCell mono align="right">{Math.round(a.accumulatedDepreciation).toLocaleString()}</DataTableCell>
                <DataTableCell mono align="right">{Math.round(netBookValue(a)).toLocaleString()}</DataTableCell>
                <DataTableCell>
                  <Badge variant={STATUS_VARIANT[a.status]}>{ASSET_STATUS_LABEL[a.status]}</Badge>
                </DataTableCell>
              </DataTableRow>
            ))}
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
  mono,
}: {
  label: string;
  value: string;
  tone?: "warning" | "success";
  mono?: boolean;
}) {
  const colour = tone === "warning" ? "text-status-warning" : tone === "success" ? "text-status-success" : "text-fg-primary";
  return (
    <div className="surface-card lift-on-hover p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">{label}</div>
      <div className={cn("mt-1 text-xl font-semibold", mono && "font-mono tnum", colour)}>{value}</div>
    </div>
  );
}
