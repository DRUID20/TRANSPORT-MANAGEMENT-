import { notFound } from "next/navigation";
import { getEmployeeById } from "@/server/actions/hr";
import { getManagementPackById } from "@/server/actions/management-pack";
import {
  apAgingBySupplier,
  arAgingByCustomer,
  fleetUtilisation,
  fuelEfficiencyByTruck,
  profitAndLoss,
  statementOfFinancialPosition,
} from "@/server/actions/reports";
import { truckLeaderboard } from "@/server/actions/tracker";
import { STATUS_LABELS } from "@/lib/types/management-pack";

export default async function PackPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getManagementPackById(id);
  if (!pack) notFound();
  const range = { fromDate: pack.startDate, toDate: pack.endDate };
  const [pnl, sfp, ar, ap, fleet, fuel, leaderboard, prepared, reviewed, signedOff] =
    await Promise.all([
      profitAndLoss(range),
      statementOfFinancialPosition(pack.endDate),
      arAgingByCustomer(pack.endDate),
      apAgingBySupplier(pack.endDate),
      fleetUtilisation(range),
      fuelEfficiencyByTruck(range),
      truckLeaderboard(range),
      pack.preparedById ? getEmployeeById(pack.preparedById) : Promise.resolve(undefined),
      pack.reviewedById ? getEmployeeById(pack.reviewedById) : Promise.resolve(undefined),
      pack.signedOffById ? getEmployeeById(pack.signedOffById) : Promise.resolve(undefined),
    ]);

  const arTotal = ar.reduce((s, r) => s + r.total, 0);
  const apTotal = ap.reduce((s, r) => s + r.total, 0);
  const fleetRevenue = fleet.reduce((s, r) => s + r.revenueKes, 0);

  return (
    <div className="mx-auto max-w-[900px] bg-white px-12 py-10 text-black print:px-0">
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm 14mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .pp-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .pp-table th, .pp-table td { padding: 6px 8px; text-align: left; }
        .pp-table th { border-bottom: 1.5px solid #111; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; }
        .pp-table td { border-bottom: 1px solid #ddd; }
        .pp-num { font-family: 'JetBrains Mono', ui-monospace, monospace; text-align: right; font-variant-numeric: tabular-nums; }
        .pp-bold { font-weight: 600; }
        .pp-h2 { font-size: 14px; font-weight: 600; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #111; }
        .pp-meta { font-size: 11px; color: #555; }
        .pp-page { page-break-after: always; }
        .pp-signatures { margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        .pp-sig { border-top: 1px solid #111; padding-top: 6px; font-size: 10px; }
        .pp-narrative { font-size: 12px; line-height: 1.55; white-space: pre-wrap; }
      `}</style>

      {/* Cover */}
      <header className="border-b-2 border-black pb-4">
        <div className="text-xs uppercase tracking-widest text-gray-500">
          Nile Valley Logistics · Monthly close pack
        </div>
        <h1 className="mt-2 text-3xl font-bold">{pack.yearMonth}</h1>
        <div className="pp-meta mt-1">
          Period {pack.startDate} → {pack.endDate} · Status:{" "}
          <strong>{STATUS_LABELS[pack.status]}</strong>
        </div>
      </header>

      {/* KPI grid */}
      <div className="mt-6 grid grid-cols-5 gap-3">
        <Kpi label="Revenue" value={pnl.income.total} />
        <Kpi label="Direct cost" value={pnl.directCost.total} />
        <Kpi label="Gross profit" value={pnl.grossProfit} />
        <Kpi label="OPEX" value={pnl.expenses.total} />
        <Kpi label="Net profit" value={pnl.netProfit} />
      </div>

      {/* Narrative */}
      {(pack.narrative || pack.highlights || pack.risks) && (
        <>
          <h2 className="pp-h2">Narrative</h2>
          {pack.narrative && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                Commentary
              </div>
              <p className="pp-narrative">{pack.narrative}</p>
            </div>
          )}
          {pack.highlights && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                Highlights
              </div>
              <p className="pp-narrative">{pack.highlights}</p>
            </div>
          )}
          {pack.risks && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                Risks & follow-ups
              </div>
              <p className="pp-narrative">{pack.risks}</p>
            </div>
          )}
        </>
      )}

      {/* P&L */}
      <h2 className="pp-h2">Profit & Loss</h2>
      <table className="pp-table">
        <tbody>
          <Row label="Revenue" value={pnl.income.total} />
          <Row label="Direct costs" value={pnl.directCost.total} />
          <Row label="Gross profit" value={pnl.grossProfit} bold />
          <Row label="Operating expenses" value={pnl.expenses.total} />
          <Row label="Net profit" value={pnl.netProfit} bold />
        </tbody>
      </table>

      {/* SFP */}
      <h2 className="pp-h2">Statement of Financial Position</h2>
      <table className="pp-table">
        <tbody>
          <Row label="Total assets" value={sfp.assets.total} />
          <Row label="Total liabilities" value={sfp.liabilities.total} />
          <Row label="Total equity" value={sfp.equity.total} />
          <Row label="Balance check" value={sfp.balancingDifference} />
        </tbody>
      </table>

      {/* AR + AP aging */}
      <h2 className="pp-h2">AR Aging ({ar.length} customers · KSh {Math.round(arTotal).toLocaleString()})</h2>
      <table className="pp-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th className="pp-num">Current</th>
            <th className="pp-num">1-30</th>
            <th className="pp-num">31-60</th>
            <th className="pp-num">61-90</th>
            <th className="pp-num">90+</th>
            <th className="pp-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {ar.slice(0, 10).map((r) => (
            <tr key={r.customerId}>
              <td>{r.customerName}</td>
              <td className="pp-num">{r.current > 0 ? Math.round(r.current).toLocaleString() : "—"}</td>
              <td className="pp-num">{r.d1to30 > 0 ? Math.round(r.d1to30).toLocaleString() : "—"}</td>
              <td className="pp-num">{r.d31to60 > 0 ? Math.round(r.d31to60).toLocaleString() : "—"}</td>
              <td className="pp-num">{r.d61to90 > 0 ? Math.round(r.d61to90).toLocaleString() : "—"}</td>
              <td className="pp-num">{r.d90plus > 0 ? Math.round(r.d90plus).toLocaleString() : "—"}</td>
              <td className="pp-num pp-bold">{Math.round(r.total).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="pp-h2">AP Aging ({ap.length} suppliers · KSh {Math.round(apTotal).toLocaleString()})</h2>
      <table className="pp-table">
        <thead>
          <tr>
            <th>Supplier</th>
            <th className="pp-num">Current</th>
            <th className="pp-num">1-30</th>
            <th className="pp-num">31-60</th>
            <th className="pp-num">61-90</th>
            <th className="pp-num">90+</th>
            <th className="pp-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {ap.slice(0, 10).map((r) => (
            <tr key={r.supplierId}>
              <td>{r.supplierName}</td>
              <td className="pp-num">{r.current > 0 ? Math.round(r.current).toLocaleString() : "—"}</td>
              <td className="pp-num">{r.d1to30 > 0 ? Math.round(r.d1to30).toLocaleString() : "—"}</td>
              <td className="pp-num">{r.d31to60 > 0 ? Math.round(r.d31to60).toLocaleString() : "—"}</td>
              <td className="pp-num">{r.d61to90 > 0 ? Math.round(r.d61to90).toLocaleString() : "—"}</td>
              <td className="pp-num">{r.d90plus > 0 ? Math.round(r.d90plus).toLocaleString() : "—"}</td>
              <td className="pp-num pp-bold">{Math.round(r.total).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Fleet */}
      <h2 className="pp-h2">Fleet utilisation ({fleet.length} trucks · KSh {Math.round(fleetRevenue).toLocaleString()})</h2>
      <table className="pp-table">
        <thead>
          <tr>
            <th>Truck</th>
            <th className="pp-num">Trips</th>
            <th className="pp-num">KM</th>
            <th className="pp-num">Revenue</th>
            <th className="pp-num">Profit</th>
            <th className="pp-num">Margin</th>
          </tr>
        </thead>
        <tbody>
          {fleet.map((r) => (
            <tr key={r.truckId}>
              <td>{r.registration}</td>
              <td className="pp-num">{r.tripCount}</td>
              <td className="pp-num">{r.kmDriven.toLocaleString()}</td>
              <td className="pp-num">{Math.round(r.revenueKes).toLocaleString()}</td>
              <td className="pp-num">{Math.round(r.grossProfitKes).toLocaleString()}</td>
              <td className="pp-num">{r.marginPct === null ? "—" : `${(r.marginPct * 100).toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Fuel */}
      <h2 className="pp-h2">Fuel efficiency</h2>
      <table className="pp-table">
        <thead>
          <tr>
            <th>Truck</th>
            <th className="pp-num">Fills</th>
            <th className="pp-num">Litres</th>
            <th className="pp-num">KM</th>
            <th className="pp-num">L/100km</th>
            <th className="pp-num">KES/km</th>
          </tr>
        </thead>
        <tbody>
          {fuel.map((r) => (
            <tr key={r.truckId}>
              <td>{r.registration}</td>
              <td className="pp-num">{r.fills}</td>
              <td className="pp-num">{r.totalLitres.toLocaleString()}</td>
              <td className="pp-num">{r.kmCovered.toLocaleString()}</td>
              <td className="pp-num">{r.litresPer100km === null ? "—" : r.litresPer100km.toFixed(1)}</td>
              <td className="pp-num">{r.kesPerKm === null ? "—" : r.kesPerKm.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Performance */}
      <h2 className="pp-h2">Performance leaderboard</h2>
      <table className="pp-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Truck</th>
            <th className="pp-num">Score</th>
            <th className="pp-num">Trips</th>
            <th className="pp-num">Margin</th>
            <th className="pp-num">L/100km</th>
            <th className="pp-num">Downtime</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((r, i) => (
            <tr key={r.truckId}>
              <td>{i + 1}</td>
              <td>{r.registration}</td>
              <td className="pp-num pp-bold">{r.score}</td>
              <td className="pp-num">{r.tripCount}</td>
              <td className="pp-num">{r.marginPct === null ? "—" : `${(r.marginPct * 100).toFixed(1)}%`}</td>
              <td className="pp-num">{r.litresPer100km === null ? "—" : r.litresPer100km.toFixed(1)}</td>
              <td className="pp-num">{r.downtimeDays === 0 ? "—" : `${r.downtimeDays}d`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signatures */}
      <h2 className="pp-h2">Sign-off</h2>
      <div className="pp-signatures">
        <Sig label="Prepared" name={prepared?.fullName} at={pack.preparedAt} />
        <Sig label="Reviewed" name={reviewed?.fullName} at={pack.reviewedAt} />
        <Sig label="Signed-off" name={signedOff?.fullName} at={pack.signedOffAt} />
      </div>

      <footer className="mt-12 border-t border-gray-300 pt-2 text-[10px] text-gray-500">
        Generated by TX System · Nile Valley Logistics · {new Date().toLocaleString()}
      </footer>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l-4 border-black pl-2">
      <div className="text-[9px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="pp-num pp-bold text-sm">KSh {Math.round(value).toLocaleString()}</div>
    </div>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <tr>
      <td className={bold ? "pp-bold" : ""}>{label}</td>
      <td className={"pp-num" + (bold ? " pp-bold" : "")}>{Math.round(value).toLocaleString()}</td>
    </tr>
  );
}

function Sig({
  label,
  name,
  at,
}: {
  label: string;
  name: string | undefined;
  at: string | undefined;
}) {
  return (
    <div className="pp-sig">
      <div>{label}</div>
      <div className="pp-bold">{name ?? "—"}</div>
      <div className="text-gray-500">{at ? new Date(at).toLocaleDateString() : "pending"}</div>
    </div>
  );
}
