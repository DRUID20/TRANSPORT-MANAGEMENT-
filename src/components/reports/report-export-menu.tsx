"use client";

import { ChevronDown, Download, FileSpreadsheet, Printer } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";

/**
 * Report export menu — Excel (branded .xlsx), CSV, and Print/PDF (uses the
 * §13 light print stylesheet). `exportPath` is the report's API export URL
 * (without a format param).
 */
export function ReportExportMenu({ exportPath }: { exportPath: string }) {
  const sep = exportPath.includes("?") ? "&" : "?";
  const go = (fmt: string) => () => {
    window.location.href = `${exportPath}${sep}format=${fmt}`;
  };
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          className="no-print inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
        >
          <Download className="size-3.5" /> Export <ChevronDown className="size-3" />
        </button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem icon={<FileSpreadsheet />} onSelect={go("xlsx")}>
          Excel (.xlsx)
        </MenuItem>
        <MenuItem icon={<Download />} onSelect={go("csv")}>
          CSV
        </MenuItem>
        <MenuItem icon={<Printer />} onSelect={() => window.print()}>
          Print / PDF
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
