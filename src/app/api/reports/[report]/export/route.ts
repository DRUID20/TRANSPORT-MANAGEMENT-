import { NextResponse } from "next/server";
import {
  apAgingBySupplier,
  arAgingByCustomer,
  expenseBreakdown,
  fleetProfitAndLoss,
  fleetUtilisation,
  fuelEfficiencyByTruck,
  truckProfitAndLoss,
} from "@/server/store/mock-store";

type Row = Record<string, string | number | null>;

function toCsv(headers: string[], rows: Row[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    const cells = headers.map((h) => {
      const v = row[h];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    });
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const { report } = await params;
  const url = new URL(req.url);
  const asOf = url.searchParams.get("asOf") ?? undefined;
  const fromDate = url.searchParams.get("from") ?? undefined;
  const toDate = url.searchParams.get("to") ?? undefined;
  const dim = url.searchParams.get("dim") ?? "category";

  let headers: string[];
  let rows: Row[];
  let filename: string;

  switch (report) {
    case "ar-aging": {
      const data = arAgingByCustomer(asOf ? new Date(asOf) : undefined);
      headers = ["customer_id", "customer_name", "invoice_count", "current", "1_30", "31_60", "61_90", "90_plus", "total_kes"];
      rows = data.map((r) => ({
        customer_id: r.customerId,
        customer_name: r.customerName,
        invoice_count: r.invoiceCount,
        current: Math.round(r.current),
        "1_30": Math.round(r.d1to30),
        "31_60": Math.round(r.d31to60),
        "61_90": Math.round(r.d61to90),
        "90_plus": Math.round(r.d90plus),
        total_kes: Math.round(r.total),
      }));
      filename = `ar-aging-${asOf ?? "today"}.csv`;
      break;
    }
    case "ap-aging": {
      const data = apAgingBySupplier(asOf ? new Date(asOf) : undefined);
      headers = ["supplier_id", "supplier_name", "bill_count", "current", "1_30", "31_60", "61_90", "90_plus", "total_kes"];
      rows = data.map((r) => ({
        supplier_id: r.supplierId,
        supplier_name: r.supplierName,
        bill_count: r.billCount,
        current: Math.round(r.current),
        "1_30": Math.round(r.d1to30),
        "31_60": Math.round(r.d31to60),
        "61_90": Math.round(r.d61to90),
        "90_plus": Math.round(r.d90plus),
        total_kes: Math.round(r.total),
      }));
      filename = `ap-aging-${asOf ?? "today"}.csv`;
      break;
    }
    case "fleet-utilisation": {
      const data = fleetUtilisation({ fromDate, toDate });
      headers = ["truck_id", "registration", "status", "trips", "km_driven", "revenue_kes", "fuel_kes", "expenses_kes", "gross_profit_kes", "margin_pct"];
      rows = data.map((r) => ({
        truck_id: r.truckId,
        registration: r.registration,
        status: r.status,
        trips: r.tripCount,
        km_driven: r.kmDriven,
        revenue_kes: Math.round(r.revenueKes),
        fuel_kes: Math.round(r.fuelKes),
        expenses_kes: Math.round(r.expensesKes),
        gross_profit_kes: Math.round(r.grossProfitKes),
        margin_pct: r.marginPct === null ? null : Number((r.marginPct * 100).toFixed(2)),
      }));
      filename = `fleet-utilisation-${fromDate ?? "ytd"}-${toDate ?? "today"}.csv`;
      break;
    }
    case "fuel-efficiency": {
      const data = fuelEfficiencyByTruck({ fromDate, toDate });
      headers = ["truck_id", "registration", "fills", "total_litres", "total_kes", "km_covered", "l_per_100km", "kes_per_km", "avg_kes_per_l"];
      rows = data.map((r) => ({
        truck_id: r.truckId,
        registration: r.registration,
        fills: r.fills,
        total_litres: r.totalLitres,
        total_kes: Math.round(r.totalKes),
        km_covered: r.kmCovered,
        l_per_100km: r.litresPer100km === null ? null : Number(r.litresPer100km.toFixed(2)),
        kes_per_km: r.kesPerKm === null ? null : Number(r.kesPerKm.toFixed(2)),
        avg_kes_per_l: r.avgPricePerLitre === null ? null : Number(r.avgPricePerLitre.toFixed(2)),
      }));
      filename = `fuel-efficiency-${fromDate ?? "ytd"}-${toDate ?? "today"}.csv`;
      break;
    }
    case "expenses": {
      const data = expenseBreakdown({
        dimension: (dim === "truck" || dim === "currency" ? dim : "category") as
          | "category"
          | "truck"
          | "currency",
        fromDate,
        toDate,
      });
      headers = ["dimension", "key", "label", "count", "amount_kes"];
      rows = data.map((r) => ({
        dimension: dim,
        key: r.key,
        label: r.label,
        count: r.count,
        amount_kes: Math.round(r.amountKes),
      }));
      filename = `expenses-${dim}-${fromDate ?? "ytd"}-${toDate ?? "today"}.csv`;
      break;
    }
    case "truck-pnl": {
      const truckParam = url.searchParams.get("truck") ?? undefined;
      const data = truckParam
        ? (() => {
            const single = truckProfitAndLoss(truckParam, { fromDate, toDate });
            return single ? [single] : [];
          })()
        : fleetProfitAndLoss({ fromDate, toDate });
      headers = [
        "truck_id",
        "registration",
        "status",
        "trip_count",
        "km_driven",
        "revenue_kes",
        "fuel_kes",
        "border_kes",
        "advance_used_kes",
        "trip_expenses_kes",
        "direct_cost_total",
        "gross_profit",
        "gross_margin_pct",
        "workshop_kes",
        "tyre_kes",
        "indirect_cost_total",
        "operating_profit",
        "operating_margin_pct",
        "revenue_per_km",
        "cost_per_km",
        "profit_per_km",
      ];
      rows = data.map((r) => ({
        truck_id: r.truckId,
        registration: r.registration,
        status: r.status,
        trip_count: r.tripCount,
        km_driven: r.kmDriven,
        revenue_kes: Math.round(r.revenueKes),
        fuel_kes: Math.round(r.fuelKes),
        border_kes: Math.round(r.borderChargesKes),
        advance_used_kes: Math.round(r.driverAdvanceUsedKes),
        trip_expenses_kes: Math.round(r.tripExpensesKes),
        direct_cost_total: Math.round(r.directCostTotal),
        gross_profit: Math.round(r.grossProfit),
        gross_margin_pct:
          r.grossMarginPct === null ? null : Number((r.grossMarginPct * 100).toFixed(2)),
        workshop_kes: Math.round(r.workshopKes),
        tyre_kes: Math.round(r.tyreKes),
        indirect_cost_total: Math.round(r.indirectCostTotal),
        operating_profit: Math.round(r.operatingProfit),
        operating_margin_pct:
          r.operatingMarginPct === null ? null : Number((r.operatingMarginPct * 100).toFixed(2)),
        revenue_per_km: r.revenuePerKm === null ? null : Math.round(r.revenuePerKm),
        cost_per_km: r.costPerKm === null ? null : Math.round(r.costPerKm),
        profit_per_km: r.profitPerKm === null ? null : Math.round(r.profitPerKm),
      }));
      filename = truckParam
        ? `truck-pnl-${truckParam}-${fromDate ?? "ytd"}-${toDate ?? "today"}.csv`
        : `truck-pnl-${fromDate ?? "ytd"}-${toDate ?? "today"}.csv`;
      break;
    }
    default:
      return new NextResponse(`Unknown report: ${report}`, { status: 404 });
  }

  const body = toCsv(headers, rows);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
