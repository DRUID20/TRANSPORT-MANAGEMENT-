import { customerRouteMatrix } from "@/server/actions/tracker";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default async function MatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;

  const cells = await customerRouteMatrix({ fromDate, toDate });

  // Pivot: rows = unique customers, columns = unique routes
  const customers = [...new Set(cells.map((c) => c.customerName))];
  const routes = [...new Set(cells.map((c) => c.route))];
  // Order customers by total revenue desc
  const customerTotals = customers
    .map((cn) => ({
      name: cn,
      total: cells.filter((c) => c.customerName === cn).reduce((s, c) => s + c.revenueKes, 0),
    }))
    .sort((a, b) => b.total - a.total);
  // Order routes by total revenue desc
  const routeTotals = routes
    .map((r) => ({
      route: r,
      total: cells.filter((c) => c.route === r).reduce((s, c) => s + c.revenueKes, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const lookup = new Map<string, { revenue: number; trips: number }>();
  for (const c of cells) {
    lookup.set(`${c.customerName}|${c.route}`, { revenue: c.revenueKes, trips: c.tripCount });
  }

  const grand = cells.reduce(
    (acc, c) => {
      acc.revenue += c.revenueKes;
      acc.trips += c.tripCount;
      return acc;
    },
    { revenue: 0, trips: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Tracker", href: "/tracker" }, { label: "Customer × Route" }]}
        eyebrow="Operations · Volume matrix"
        title="Customer × Route matrix"
        description={`Trips and revenue per customer per lane. ${fromDate} → ${toDate}. KES base.`}
      />

      <Card>
        <CardContent className="!p-5">
          <form className="flex flex-wrap items-center gap-3">
            <label className="text-xs uppercase tracking-wider text-fg-tertiary">From</label>
            <input
              type="date"
              name="from"
              defaultValue={fromDate}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-sm tnum"
            />
            <label className="text-xs uppercase tracking-wider text-fg-tertiary">To</label>
            <input
              type="date"
              name="to"
              defaultValue={toDate}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-sm tnum"
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Customers" value={String(customerTotals.length)} />
        <Stat label="Routes" value={String(routeTotals.length)} />
        <Stat label="Trips" value={String(grand.trips)} />
        <Stat
          label="Revenue (KES)"
          value={Math.round(grand.revenue).toLocaleString()}
          tone="info"
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="sticky left-0 z-10 bg-bg-elevated px-5 py-2 font-medium">
                    Customer
                  </th>
                  {routeTotals.map(({ route }) => (
                    <th key={route} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {route}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customerTotals.map(({ name, total }) => (
                  <tr key={name} className="transition-colors hover:bg-bg-base/40">
                    <td className="sticky left-0 z-10 bg-bg-base/40 px-5 py-2 text-fg-primary">
                      {name}
                    </td>
                    {routeTotals.map(({ route }) => {
                      const cell = lookup.get(`${name}|${route}`);
                      return (
                        <td
                          key={route}
                          className="px-3 py-2 text-right font-mono tnum text-fg-secondary"
                        >
                          {cell ? (
                            <div>
                              <div className="text-fg-primary">
                                {Math.round(cell.revenue).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-fg-tertiary">
                                {cell.trips} trip{cell.trips === 1 ? "" : "s"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-fg-tertiary">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-mono tnum font-semibold text-brand-blue">
                      {Math.round(total).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {customerTotals.length === 0 && (
                  <tr>
                    <td colSpan={routeTotals.length + 2} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No trips in the range.
                    </td>
                  </tr>
                )}
                {customerTotals.length > 0 && (
                  <tr className="bg-bg-elevated">
                    <td className="sticky left-0 z-10 bg-bg-elevated px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
                      Route total
                    </td>
                    {routeTotals.map(({ total }, i) => (
                      <td
                        key={i}
                        className="px-3 py-2 text-right font-mono tnum font-semibold text-fg-primary"
                      >
                        {Math.round(total).toLocaleString()}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono tnum font-bold text-brand-blue">
                      {Math.round(grand.revenue).toLocaleString()}
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
  tone?: "default" | "info";
}) {
  const colour = tone === "info" ? "text-brand-blue" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-2xl font-medium ${colour}`}>{value}</div>
    </div>
  );
}
