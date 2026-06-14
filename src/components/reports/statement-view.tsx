import type { Statement } from "@/server/repos/statements";

/**
 * Shared statement renderer (AR + AP): the opening/closing/outstanding stat
 * strip and the chronological transaction table with a running balance. KES.
 */
export function StatementSummary({ stmt }: { stmt: Statement }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Stat label="Opening balance" value={stmt.openingBalance} />
      <Stat label="Closing balance" value={stmt.closingBalance} tone="info" />
      <Stat label="Total outstanding" value={stmt.totalOutstanding} tone="danger" />
    </div>
  );
}

export function StatementTable({
  stmt,
  party,
}: {
  stmt: Statement;
  party: "customer" | "supplier";
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
              <th className="px-5 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Reference</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium">Debit</th>
              <th className="px-3 py-2 text-right font-medium">Credit</th>
              <th className="px-3 py-2 text-right font-medium">Balance (KES)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="bg-bg-elevated">
              <td className="px-5 py-2 text-fg-secondary" colSpan={5}>
                Opening balance
              </td>
              <td className="px-3 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                {Math.round(stmt.openingBalance).toLocaleString()}
              </td>
            </tr>
            {stmt.rows.map((r, i) => (
              <tr key={`${r.ref}-${i}`} className="transition-colors hover:bg-bg-base/40">
                <td className="px-5 py-2 font-mono tnum text-fg-secondary">{r.date}</td>
                <td className="px-3 py-2 font-mono text-fg-primary">{r.ref}</td>
                <td className="px-3 py-2 text-fg-secondary">{r.description}</td>
                <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                  {r.debit > 0 ? Math.round(r.debit).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                  {r.credit > 0 ? Math.round(r.credit).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono tnum font-medium text-fg-primary">
                  {Math.round(r.balance).toLocaleString()}
                </td>
              </tr>
            ))}
            {stmt.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                  No transactions in this period.
                </td>
              </tr>
            )}
            <tr className="bg-bg-elevated">
              <td
                className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary"
                colSpan={5}
              >
                Closing balance
              </td>
              <td className="px-3 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                {Math.round(stmt.closingBalance).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-5 py-3 text-right text-xs text-fg-tertiary">
        {party === "customer" ? "Total receivable outstanding" : "Total payable outstanding"}:{" "}
        <span className="font-mono tnum font-semibold text-fg-primary">
          {Math.round(stmt.totalOutstanding).toLocaleString()} KES
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "danger";
}) {
  const colour =
    tone === "info"
      ? "text-brand-blue"
      : tone === "danger"
        ? "text-status-danger"
        : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-xl font-medium ${colour}`}>
        {Math.round(value).toLocaleString()} <span className="text-xs text-fg-tertiary">KES</span>
      </div>
    </div>
  );
}
