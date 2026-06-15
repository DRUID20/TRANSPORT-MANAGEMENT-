import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssetById, getAssetHistory } from "@/server/actions/assets";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  ASSET_CATEGORIES,
  ASSET_STATUS_LABEL,
  DEPRECIATION_METHOD_LABEL,
  netBookValue,
} from "@/lib/types/assets";
import { DisposeAsset } from "./dispose-asset";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAssetById(id);
  if (!asset) notFound();
  const history = await getAssetHistory(id);
  const cfg = ASSET_CATEGORIES[asset.category];
  const nbv = netBookValue(asset);
  const disposable = asset.status === "active" || asset.status === "fully_depreciated";

  return (
    <div className="page-3d-bg flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Asset Register", href: "/assets" }, { label: asset.number }]}
        eyebrow="Finance · Asset"
        title={asset.name}
        description={`${cfg?.label ?? asset.category} · acquired ${asset.acquisitionDate}`}
        actions={<Badge variant={asset.status === "active" ? "success" : "neutral"}>{ASSET_STATUS_LABEL[asset.status]}</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Cost" value={`KSh ${Math.round(asset.cost).toLocaleString()}`} />
        <Stat label="Accumulated dep." value={`KSh ${Math.round(asset.accumulatedDepreciation).toLocaleString()}`} tone="warning" />
        <Stat label="Net book value" value={`KSh ${Math.round(nbv).toLocaleString()}`} tone="success" />
        <Stat label="Residual" value={`KSh ${Math.round(asset.residualValue).toLocaleString()}`} />
      </div>

      <section className="surface-card surface-3d border-2 border-border-strong p-5">
        <h2 className="text-[15px] font-extrabold text-fg-primary">Depreciation</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3">
          <Row label="Method" value={DEPRECIATION_METHOD_LABEL[asset.depreciationMethod]} />
          {asset.depreciationMethod === "straight_line" && (
            <Row label="Useful life" value={asset.usefulLifeMonths ? `${asset.usefulLifeMonths} months` : "—"} />
          )}
          {asset.depreciationMethod === "reducing_balance" && (
            <Row label="Annual rate" value={asset.depreciationRatePct != null ? `${asset.depreciationRatePct}%` : "—"} />
          )}
          <Row label="Start date" value={asset.depreciationStartDate} />
          <Row label="Last charged" value={asset.lastDepreciatedOn ?? "Never"} />
          <Row label="GL accounts" value={cfg?.accumCode ? `${cfg.costCode} / ${cfg.accumCode} / ${cfg.expenseCode}` : `${cfg?.costCode} (not depreciated)`} mono />
          {asset.serialNumber && <Row label="Serial / tag" value={asset.serialNumber} mono />}
          {asset.location && <Row label="Location" value={asset.location} />}
          {asset.disposalDate && <Row label="Disposed" value={`${asset.disposalDate} · proceeds KSh ${Math.round(asset.disposalProceeds ?? 0).toLocaleString()}`} />}
        </dl>
        {asset.description && <p className="mt-4 text-[13px] text-fg-secondary">{asset.description}</p>}
        {disposable && (
          <div className="mt-5 border-t-2 border-border pt-4">
            <DisposeAsset assetId={asset.id} nbv={nbv} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-extrabold text-fg-primary">Ledger history</h2>
        {history.length === 0 ? (
          <p className="surface-card p-5 text-[13px] text-fg-tertiary">
            No depreciation or disposal posted yet. Run the monthly depreciation from the Asset Register.
          </p>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Date</DataTableHeaderCell>
                <DataTableHeaderCell>Journal</DataTableHeaderCell>
                <DataTableHeaderCell>Memo</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Amount (KES)</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {history.map((e) => (
                <DataTableRow key={e.id} linkHref={`/ledger/${e.id}`}>
                  <DataTableCell mono>{e.date}</DataTableCell>
                  <DataTableCell className="font-mono text-xs text-fg-secondary">{e.number}</DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">{e.memo}</DataTableCell>
                  <DataTableCell mono align="right">{Math.round(e.totalDebitKes).toLocaleString()}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </section>

      <div>
        <Link href="/assets" className="text-sm text-fg-tertiary hover:text-fg-secondary">← Back to Asset Register</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "success" }) {
  const colour = tone === "warning" ? "text-status-warning" : tone === "success" ? "text-status-success" : "text-fg-primary";
  return (
    <div className="surface-card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-lg font-semibold ${colour}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-fg-tertiary">{label}</dt>
      <dd className={`text-fg-primary ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
