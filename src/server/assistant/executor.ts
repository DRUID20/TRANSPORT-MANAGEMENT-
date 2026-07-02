/**
 * Executes a parsed Intent against the data layer and returns an Answer.
 * No call into providers / LLMs here — pure data lookups.
 */

import type { Answer, Intent } from "@/lib/types/assistant";
import {
  apAgingBySupplier,
  arAgingByCustomer,
  fleetUtilisation,
  fuelEfficiencyByTruck,
  profitAndLoss,
} from "@/server/repos/reports";
import { listComplianceRecords } from "@/server/repos/hr-compliance";
import { listEmployees } from "@/server/repos/hr";
import { listLeaveRequests } from "@/server/repos/leave";
import { listDrivers } from "@/server/repos/drivers";
import { listTrailers } from "@/server/repos/trailers";
import { listTrips } from "@/server/repos/trips";
import { listTrucks } from "@/server/repos/trucks";
import {
  KIND_LABELS,
  complianceStatus,
  daysUntilExpiry,
} from "@/lib/types/hr-compliance";
import { HOWTO_KB, type HowToEntry } from "@/server/assistant/kb";

const KES = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

export async function executeIntent(intent: Intent): Promise<Answer> {
  switch (intent.kind) {
    case "ar_outstanding": {
      const rows = await arAgingByCustomer();
      const total = rows.reduce((s, r) => s + r.total, 0);
      return {
        recognised: true,
        text:
          rows.length === 0
            ? "All customers are square — there's no outstanding AR."
            : `Customers owe ${KES(total)} across ${rows.length} customer${rows.length === 1 ? "" : "s"}. The biggest is ${rows[0]!.customerName} at ${KES(rows[0]!.total)}.`,
        table: {
          headers: ["Customer", "Current", "1-30d", "31-60d", "61-90d", "90+d", "Total KES"],
          rows: rows.slice(0, 6).map((r) => ({
            Customer: r.customerName,
            Current: Math.round(r.current),
            "1-30d": Math.round(r.d1to30),
            "31-60d": Math.round(r.d31to60),
            "61-90d": Math.round(r.d61to90),
            "90+d": Math.round(r.d90plus),
            "Total KES": Math.round(r.total),
          })),
        },
        href: "/reports/ar-aging",
        hrefLabel: "Open AR Aging report",
      };
    }
    case "ap_outstanding": {
      const rows = await apAgingBySupplier();
      const total = rows.reduce((s, r) => s + r.total, 0);
      return {
        recognised: true,
        text:
          rows.length === 0
            ? "We have no outstanding supplier balances."
            : `We owe suppliers ${KES(total)} across ${rows.length} supplier${rows.length === 1 ? "" : "s"}. The largest is ${rows[0]!.supplierName} at ${KES(rows[0]!.total)}.`,
        table: {
          headers: ["Supplier", "Current", "1-30d", "31-60d", "61-90d", "90+d", "Total KES"],
          rows: rows.slice(0, 6).map((r) => ({
            Supplier: r.supplierName,
            Current: Math.round(r.current),
            "1-30d": Math.round(r.d1to30),
            "31-60d": Math.round(r.d31to60),
            "61-90d": Math.round(r.d61to90),
            "90+d": Math.round(r.d90plus),
            "Total KES": Math.round(r.total),
          })),
        },
        href: "/reports/ap-aging",
        hrefLabel: "Open AP Aging report",
      };
    }
    case "overdue_invoices": {
      const rows = await arAgingByCustomer();
      const overdue = rows
        .map((r) => ({
          customer: r.customerName,
          overdue: r.d1to30 + r.d31to60 + r.d61to90 + r.d90plus,
          worst: r.d90plus > 0 ? "90+d" : r.d61to90 > 0 ? "61-90d" : r.d31to60 > 0 ? "31-60d" : "1-30d",
        }))
        .filter((r) => r.overdue > 0)
        .sort((a, b) => b.overdue - a.overdue);
      const total = overdue.reduce((s, r) => s + r.overdue, 0);
      return {
        recognised: true,
        text:
          overdue.length === 0
            ? "No overdue invoices — every customer is current."
            : `${overdue.length} customer${overdue.length === 1 ? " is" : "s are"} overdue, totalling ${KES(total)}. The worst is ${overdue[0]!.customer} (${overdue[0]!.worst}, ${KES(overdue[0]!.overdue)}).`,
        table: {
          headers: ["Customer", "Worst bucket", "Overdue KES"],
          rows: overdue.slice(0, 8).map((r) => ({
            Customer: r.customer,
            "Worst bucket": r.worst,
            "Overdue KES": Math.round(r.overdue),
          })),
        },
        href: "/reports/ar-aging",
        hrefLabel: "Open AR Aging report",
      };
    }
    case "profit_this_period": {
      const range = intent.range ?? {
        fromDate: `${new Date().getFullYear()}-01-01`,
        toDate: new Date().toISOString().slice(0, 10),
        label: "this year",
      };
      const pnl = await profitAndLoss({ fromDate: range.fromDate, toDate: range.toDate });
      const revenue = pnl.income.total;
      const directCost = pnl.directCost.total;
      const opex = pnl.expenses.total;
      const margin = revenue > 0 ? (pnl.netProfit / revenue) * 100 : 0;
      return {
        recognised: true,
        text: `For ${range.label} (${range.fromDate} → ${range.toDate}): revenue ${KES(revenue)}, direct costs ${KES(directCost)}, gross profit ${KES(pnl.grossProfit)}, operating expenses ${KES(opex)}, **net profit ${KES(pnl.netProfit)}** (${margin.toFixed(1)}% net margin).`,
        href: `/reports/profit-and-loss?from=${range.fromDate}&to=${range.toDate}`,
        hrefLabel: "Open Profit & Loss",
      };
    }
    case "revenue_period": {
      const range = intent.range ?? {
        fromDate: `${new Date().getFullYear()}-01-01`,
        toDate: new Date().toISOString().slice(0, 10),
        label: "this year",
      };
      const pnl = await profitAndLoss({ fromDate: range.fromDate, toDate: range.toDate });
      return {
        recognised: true,
        text: `Revenue for ${range.label} was ${KES(pnl.income.total)} across all customers and trips. Open the P&L for the full breakdown.`,
        href: `/reports/profit-and-loss?from=${range.fromDate}&to=${range.toDate}`,
        hrefLabel: "Open Profit & Loss",
      };
    }
    case "top_trucks_by_profit": {
      const range = intent.range;
      const rows = (await fleetUtilisation(range)).slice(0, intent.limit ?? 5);
      return {
        recognised: true,
        text: `Top ${rows.length} truck${rows.length === 1 ? "" : "s"} by gross profit${range ? ` (${range.label})` : ""}: ${rows.map((r) => `${r.registration} — ${KES(r.grossProfitKes)}`).join("; ")}.`,
        table: {
          headers: ["Truck", "Trips", "Revenue", "Costs", "Profit", "Margin"],
          rows: rows.map((r) => ({
            Truck: r.registration,
            Trips: r.tripCount,
            Revenue: Math.round(r.revenueKes),
            Costs: Math.round(r.fuelKes + r.expensesKes),
            Profit: Math.round(r.grossProfitKes),
            Margin: r.marginPct === null ? "—" : `${(r.marginPct * 100).toFixed(1)}%`,
          })),
        },
        href: "/reports/fleet-utilisation",
        hrefLabel: "Open Fleet Utilisation",
      };
    }
    case "best_fuel": {
      const all = await fuelEfficiencyByTruck(intent.range);
      const eligible = all.filter((r) => r.litresPer100km !== null);
      const top = eligible.slice(0, intent.limit ?? 3);
      return {
        recognised: true,
        text: top.length === 0
          ? "Not enough fuel data yet to rank trucks."
          : `Most efficient trucks: ${top.map((r) => `${r.registration} (${r.litresPer100km!.toFixed(1)} L/100km)`).join(", ")}.`,
        table: {
          headers: ["Truck", "Fills", "Litres", "KM", "L/100km", "KES/km"],
          rows: top.map((r) => ({
            Truck: r.registration,
            Fills: r.fills,
            Litres: r.totalLitres,
            KM: r.kmCovered,
            "L/100km": r.litresPer100km === null ? "—" : r.litresPer100km.toFixed(1),
            "KES/km": r.kesPerKm === null ? "—" : r.kesPerKm.toFixed(1),
          })),
        },
        href: "/reports/fuel-efficiency",
        hrefLabel: "Open Fuel Efficiency",
      };
    }
    case "worst_fuel": {
      const all = await fuelEfficiencyByTruck(intent.range);
      const eligible = all.filter((r) => r.litresPer100km !== null);
      const sorted = [...eligible].sort((a, b) => (b.litresPer100km ?? 0) - (a.litresPer100km ?? 0));
      const top = sorted.slice(0, intent.limit ?? 3);
      return {
        recognised: true,
        text: top.length === 0
          ? "Not enough fuel data yet to rank trucks."
          : `Highest fuel consumption: ${top.map((r) => `${r.registration} (${r.litresPer100km!.toFixed(1)} L/100km)`).join(", ")}. Investigate driving style or load weight.`,
        table: {
          headers: ["Truck", "Fills", "Litres", "KM", "L/100km", "KES/km"],
          rows: top.map((r) => ({
            Truck: r.registration,
            Fills: r.fills,
            Litres: r.totalLitres,
            KM: r.kmCovered,
            "L/100km": r.litresPer100km === null ? "—" : r.litresPer100km.toFixed(1),
            "KES/km": r.kesPerKm === null ? "—" : r.kesPerKm.toFixed(1),
          })),
        },
        href: "/reports/fuel-efficiency",
        hrefLabel: "Open Fuel Efficiency",
      };
    }
    case "compliance_expiring": {
      const recs = await listComplianceRecords();
      const employees = await listEmployees();
      const empById = new Map(employees.map((e) => [e.id, e]));
      const flagged = recs
        .map((r) => ({
          rec: r,
          status: complianceStatus(r.expiryDate),
          days: daysUntilExpiry(r.expiryDate),
        }))
        .filter((x) => x.status === "expired" || x.status === "expiring_soon")
        .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
      return {
        recognised: true,
        text: flagged.length === 0
          ? "Nothing expires in the next 30 days."
          : `${flagged.length} document${flagged.length === 1 ? " needs" : "s need"} attention (expired or expiring within 30 days).`,
        table: {
          headers: ["Employee", "Document", "Expiry", "Status"],
          rows: flagged.slice(0, 8).map((x) => {
            const emp = empById.get(x.rec.employeeId);
            return {
              Employee: emp?.fullName ?? "—",
              Document: KIND_LABELS[x.rec.kind] + (x.rec.label ? ` (${x.rec.label})` : ""),
              Expiry: x.rec.expiryDate ?? "—",
              Status: x.status === "expired"
                ? `Expired ${x.days === null ? "" : `${-x.days}d ago`}`
                : `In ${x.days}d`,
            };
          }),
        },
        href: "/hr/compliance",
        hrefLabel: "Open HR Compliance",
      };
    }
    case "leave_pending": {
      const requests = await listLeaveRequests({ status: "pending" });
      const employees = await listEmployees();
      const empById = new Map(employees.map((e) => [e.id, e]));
      return {
        recognised: true,
        text: requests.length === 0
          ? "No leave requests are awaiting approval."
          : `${requests.length} leave request${requests.length === 1 ? " is" : "s are"} pending approval.`,
        table: {
          headers: ["Request", "Employee", "Type", "Period", "Days"],
          rows: requests.slice(0, 8).map((r) => ({
            Request: r.number,
            Employee: empById.get(r.employeeId)?.fullName ?? "—",
            Type: r.leaveType,
            Period: `${r.startDate} → ${r.endDate}`,
            Days: r.days,
          })),
        },
        href: "/hr/leave",
        hrefLabel: "Open Leave",
      };
    }
    case "open_trips": {
      const trips = (await listTrips()).filter(
        (t) => t.status !== "closed" && t.status !== "cancelled",
      );
      return {
        recognised: true,
        text: trips.length === 0
          ? "No open trips right now."
          : `${trips.length} trip${trips.length === 1 ? " is" : "s are"} currently active or planned.`,
        table: {
          headers: ["Trip", "Route", "Status", "Truck"],
          rows: trips.slice(0, 8).map((t) => ({
            Trip: t.number,
            Route: `${t.origin} → ${t.destination}`,
            Status: t.status,
            Truck: t.truckId,
          })),
        },
        href: "/trips",
        hrefLabel: "Open Trips",
      };
    }
    case "headcount": {
      const emps = await listEmployees({ status: "active" });
      const probation = (await listEmployees({ status: "probation" })).length;
      const onLeave = (await listEmployees({ status: "on_leave" })).length;
      return {
        recognised: true,
        text: `Active headcount is ${emps.length}. Plus ${probation} on probation and ${onLeave} on leave.`,
        href: "/hr/employees",
        hrefLabel: "Open Employees",
      };
    }
    case "fleet_size": {
      const trucks = await listTrucks();
      const trailers = await listTrailers();
      const drivers = await listDrivers();
      return {
        recognised: true,
        text: `Fleet: ${trucks.length} trucks · ${trailers.length} trailers · ${drivers.length} drivers.`,
        href: "/trucks",
        hrefLabel: "Open Trucks",
      };
    }
    case "howto": {
      return answerHowto(intent.question);
    }
    case "help": {
      return {
        recognised: true,
        text:
          "I can answer two kinds of questions:\n\n" +
          "📊 DATA — finance, operations, fleet, fuel, HR, compliance, leave\n" +
          "  • How much do customers owe us?\n" +
          "  • Show overdue invoices\n" +
          "  • What's our profit this month?\n" +
          "  • Top 3 trucks by profit\n" +
          "  • Which trucks use the most fuel?\n" +
          "  • What licences are expiring?\n\n" +
          "📖 HOW-TO — step-by-step for any operation\n" +
          "  • How do I create a booking?\n" +
          "  • How do I capture a fuel log?\n" +
          "  • How do I send an invoice?\n" +
          "  • How do I close a trip?\n" +
          "  • How do I run monthly depreciation?\n" +
          "  • How do I create a new user?",
      };
    }
    case "unknown":
    default: {
      // Last-ditch attempt at the KB before giving up. Lets the assistant
      // answer phrasings we haven't anticipated (e.g. just "fuel log" with
      // no question words).
      const fallback = answerHowto(intent.question);
      if (fallback.recognised) return fallback;
      return {
        recognised: false,
        text:
          "I didn't catch that. Try rephrasing — or type `help` for a list of supported questions.",
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// How-to retrieval — keyword overlap + heading similarity.
//
// No LLM call. We tokenise the question, drop stop-words, then score each
// KB entry by:
//   +3  per keyword overlap
//   +2  per token also present in the entry's canonical question
//   +1  per token also present in the answer prose
// The top score wins. If the top is materially ahead of #2 → return one
// answer; otherwise list the top 3 as "Did you mean…".
// ─────────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "i", "we", "you", "to", "of", "do", "does", "is", "are",
  "in", "on", "at", "for", "by", "with", "and", "or", "how", "where", "what",
  "when", "why", "should", "can", "would", "could", "my", "our", "your",
  "any", "this", "that", "these", "those", "it", "be", "system", "please",
  "thanks", "tell", "show", "me", "us", "step", "steps", "way", "ways",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function scoreEntry(entry: HowToEntry, qTokens: string[]): number {
  const kw = new Set(entry.keywords.flatMap((k) => tokenize(k)));
  const qHead = new Set(tokenize(entry.question));
  const ans = new Set(tokenize(entry.answer));
  let score = 0;
  for (const t of qTokens) {
    if (kw.has(t)) score += 3;
    else if (qHead.has(t)) score += 2;
    else if (ans.has(t)) score += 1;
  }
  return score;
}

export function answerHowto(question: string): Answer {
  const qTokens = tokenize(question);
  if (qTokens.length === 0) {
    return {
      recognised: false,
      text:
        "Tell me what you're trying to do — e.g. 'How do I create a booking?' or 'How do I send an invoice?'",
    };
  }
  const scored = HOWTO_KB
    .map((e) => ({ entry: e, score: scoreEntry(e, qTokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      recognised: false,
      text:
        "I don't have a how-to for that yet. Try the user manual (USER_MANUAL.md at the repo root), " +
        "or rephrase — e.g. 'How do I add a truck?' or 'How do I record a customer payment?'",
    };
  }
  const top = scored[0]!;
  const second = scored[1];
  // High-confidence single answer: top is clearly ahead AND scored a decent total.
  const clearWinner =
    top.score >= 6 && (!second || top.score - second.score >= 3);

  if (clearWinner) {
    return {
      recognised: true,
      text: `[${top.entry.module}] ${top.entry.question}\n\n${top.entry.answer}`,
      href: top.entry.href,
      hrefLabel: top.entry.hrefLabel,
    };
  }
  // Lower confidence: surface the best match plus alternatives so the user
  // can re-ask precisely.
  const alternatives = scored
    .slice(0, 3)
    .map((s, i) => `${i + 1}. [${s.entry.module}] ${s.entry.question}`)
    .join("\n");
  return {
    recognised: true,
    text:
      `Best match — [${top.entry.module}] ${top.entry.question}\n\n${top.entry.answer}\n\n` +
      `If that's not what you meant, ask one of these directly:\n${alternatives}`,
    href: top.entry.href,
    hrefLabel: top.entry.hrefLabel,
  };
}
