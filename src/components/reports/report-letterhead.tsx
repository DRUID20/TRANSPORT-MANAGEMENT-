/**
 * Print-only report letterhead (DESIGN.md §13). Hidden on screen; on print/PDF
 * it renders a branded document header — logo mark, company line, report title,
 * period, and generated-at — above the report body. Server component (computes
 * the timestamp at render, no hydration concerns).
 */
export function ReportLetterhead({
  title,
  period,
}: {
  title: string;
  period?: string;
}) {
  const generated = new Date().toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  });
  return (
    <div className="mb-6 hidden border-b-2 border-[#0F4C81] pb-4 print:block">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="grid size-10 place-items-center rounded-lg font-mono text-[13px] font-bold text-white"
            style={{ background: "#0F4C81" }}
          >
            NVL
          </div>
          <div>
            <div className="text-[15px] font-bold text-[#0F172A]">Nile Valley Logistics</div>
            <div className="text-[11px] text-[#64748B]">
              Cross-border fuel haulage · East Africa
            </div>
          </div>
        </div>
        <div className="text-right text-[11px] text-[#64748B]">
          Generated
          <br />
          {generated} EAT
        </div>
      </div>
      <div className="mt-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">{title}</h1>
        {period && <div className="mt-0.5 text-[12px] text-[#475569]">{period}</div>}
      </div>
    </div>
  );
}
