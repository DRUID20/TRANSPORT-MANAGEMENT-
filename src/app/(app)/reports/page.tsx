import Link from "next/link";
import {
  BarChart3,
  LineChart,
  PieChart,
  Scale,
  Table,
  TrendingUp,
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
}

const reports: Report[] = [
  {
    href: "/reports/profit-and-loss",
    title: "Profit & Loss",
    desc: "Income, direct costs, gross profit, operating expenses, net profit. KES base.",
    icon: TrendingUp,
    ready: true,
  },
  {
    href: "/reports/balance-sheet",
    title: "Statement of Financial Position",
    desc: "Assets vs Liabilities + Equity at a point in time. Validates the GL.",
    icon: Scale,
    ready: true,
  },
  {
    href: "/reports/profit-per-trip",
    title: "Profit per Trip",
    desc: "Per-trip revenue minus direct costs (border, advance, expenses, fuel). Drives the Truck Performance Tracker.",
    icon: LineChart,
    ready: true,
  },
  {
    href: "/ledger/trial-balance",
    title: "Trial Balance",
    desc: "Account-by-account Dr/Cr totals + balances. The basis for all other reports.",
    icon: Table,
    ready: true,
  },
  {
    href: "/reports/fx-revaluation",
    title: "FX Revaluation",
    desc: "Period-end revaluation of foreign-currency balances using CBK rates. Phase 5F+.",
    icon: BarChart3,
    ready: false,
  },
  {
    href: "/reports/cash-flow",
    title: "Cash Flow",
    desc: "Indirect cash-flow statement. Phase 5F+.",
    icon: PieChart,
    ready: false,
  },
];

export default function ReportsIndexPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Reports"
        description="Drill-down financial reports built from the General Ledger."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => {
          const Icon = r.icon;
          const Wrap = ({ children }: { children: React.ReactNode }) =>
            r.ready ? (
              <Link href={r.href} className="group block">
                {children}
              </Link>
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
    </div>
  );
}
