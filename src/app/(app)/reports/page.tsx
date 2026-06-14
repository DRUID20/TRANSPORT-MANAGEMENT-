import Link from "next/link";
import {
  Activity,
  BarChart3,
  Banknote,
  Building2,
  Droplet,
  Fuel,
  LineChart,
  Percent,
  PieChart,
  Receipt,
  Scale,
  Table,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

interface Report {
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  ready: boolean;
  group: "Finance" | "Operations" | "Cash flow";
}

const reports: Report[] = [
  // Finance
  {
    href: "/reports/profit-and-loss",
    title: "Profit & Loss",
    desc: "Income, direct costs, gross profit, operating expenses, net profit. KES base.",
    icon: TrendingUp,
    ready: true,
    group: "Finance",
  },
  {
    href: "/reports/balance-sheet",
    title: "Statement of Financial Position",
    desc: "Assets vs Liabilities + Equity at a point in time. Validates the GL.",
    icon: Scale,
    ready: true,
    group: "Finance",
  },
  {
    href: "/ledger/trial-balance",
    title: "Trial Balance",
    desc: "Account-by-account Dr/Cr totals + balances. The basis for all other reports.",
    icon: Table,
    ready: true,
    group: "Finance",
  },
  {
    href: "/reports/ar-aging",
    title: "AR Aging",
    desc: "Open customer balances aged into current / 30 / 60 / 90 / 90+ buckets.",
    icon: Banknote,
    ready: true,
    group: "Finance",
  },
  {
    href: "/reports/ap-aging",
    title: "AP Aging",
    desc: "Open supplier balances aged the same way for cash-out planning.",
    icon: TrendingDown,
    ready: true,
    group: "Finance",
  },
  {
    href: "/reports/expenses",
    title: "Expense Breakdown",
    desc: "Approved + reimbursed expenses sliced by category, truck or currency.",
    icon: Receipt,
    ready: true,
    group: "Finance",
  },
  {
    href: "/reports/revenue-by-customer",
    title: "Revenue by Customer",
    desc: "Invoiced, received and outstanding per customer with collection rate. Ranked by revenue.",
    icon: Building2,
    ready: true,
    group: "Finance",
  },
  {
    href: "/reports/vat-summary",
    title: "VAT Summary",
    desc: "Output VAT on sales vs input VAT on purchases, by month, with net payable. KRA-ready.",
    icon: Percent,
    ready: true,
    group: "Finance",
  },
  {
    href: "/reports/monthly-trend",
    title: "Monthly Trend",
    desc: "Revenue, cost and gross profit by month with a 12-month chart. Spot seasonality.",
    icon: Activity,
    ready: true,
    group: "Finance",
  },

  // Operations
  {
    href: "/reports/profit-per-trip",
    title: "Profit per Trip",
    desc: "Per-trip revenue minus direct costs (border, advance, expenses, fuel).",
    icon: LineChart,
    ready: true,
    group: "Operations",
  },
  {
    href: "/reports/profit-per-truck",
    title: "P&L per Truck",
    desc: "Income statement per truck: revenue, direct costs, gross profit, indirect costs, operating profit.",
    icon: Truck,
    ready: true,
    group: "Operations",
  },
  {
    href: "/reports/fleet-utilisation",
    title: "Fleet Utilisation",
    desc: "Per-truck trips, KM, revenue, costs and gross profit. Drives the Truck Performance Tracker.",
    icon: Truck,
    ready: true,
    group: "Operations",
  },
  {
    href: "/reports/fuel-efficiency",
    title: "Fuel Efficiency",
    desc: "Per-truck L/100km, KES per km, average price per litre (tank-to-tank).",
    icon: Fuel,
    ready: true,
    group: "Operations",
  },
  {
    href: "/reports/ullage",
    title: "Ullage report",
    desc: "Loaded vs discharged litres (20 °C corrected) per trip. Flags variance above 0.5%.",
    icon: Droplet,
    ready: true,
    group: "Operations",
  },
  {
    href: "/reports/driver-performance",
    title: "Driver Performance",
    desc: "Trips, completion, revenue generated and ullage discipline per driver. Ranked.",
    icon: Users,
    ready: true,
    group: "Operations",
  },
  {
    href: "/reports/truck-statement",
    title: "Truck Statement",
    desc: "Per-truck monthly retained earnings carried forward — owned or subcontracted.",
    icon: Truck,
    ready: true,
    group: "Operations",
  },

  // Cash flow + later
  {
    href: "/reports/fx-revaluation",
    title: "FX Revaluation",
    desc: "Period-end revaluation of foreign-currency balances using CBK rates.",
    icon: BarChart3,
    ready: false,
    group: "Cash flow",
  },
  {
    href: "/reports/cash-flow",
    title: "Cash Flow",
    desc: "Indirect cash-flow statement built from net income + working capital movement.",
    icon: PieChart,
    ready: false,
    group: "Cash flow",
  },
];

const GROUPS: Array<Report["group"]> = ["Finance", "Operations", "Cash flow"];

export default function ReportsIndexPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Reports"
        title="Reports library"
        description="Built from the General Ledger and operational logs."
      />

      {GROUPS.map((g) => {
        const subset = reports.filter((r) => r.group === g);
        if (subset.length === 0) return null;
        return (
          <section key={g}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-tertiary">
              {g}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subset.map((r) => {
                const Icon = r.icon;
                const Wrap = ({ children }: { children: React.ReactNode }) =>
                  r.ready ? (
                    <Link href={r.href} className="group block">{children}</Link>
                  ) : (
                    <div className="block opacity-60">{children}</div>
                  );
                return (
                  <Wrap key={r.href}>
                    <Card className="transition-all group-hover:border-border-strong group-hover:shadow-soft">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex size-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                            <Icon className="size-5" />
                          </div>
                          {!r.ready && <Badge variant="neutral">Soon</Badge>}
                        </div>
                        <CardTitle className="mt-3 group-hover:text-brand-blue">{r.title}</CardTitle>
                        <CardDescription>{r.desc}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Wrap>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
