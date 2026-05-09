"use client";

import { usePathname, useRouter } from "next/navigation";
import { FileText, Receipt } from "lucide-react";
import { ScanFlow } from "./scan-flow";
import { ReceiptScanFlow } from "./receipt-scan-flow";
import { cn } from "@/lib/utils";

export function ScanModeTabs({
  mode,
  tripId,
  tripNumber,
  origin,
  destination,
  truckId,
  driverId,
}: {
  mode: "document" | "receipt";
  tripId: string;
  tripNumber: string;
  origin: string;
  destination: string;
  truckId: string;
  driverId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function go(m: "document" | "receipt") {
    const qs = new URLSearchParams({ mode: m });
    router.push(`${pathname}?${qs.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mode tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-bg-elevated p-1">
        <Tab
          icon={FileText}
          label="Document"
          active={mode === "document"}
          onClick={() => go("document")}
        />
        <Tab
          icon={Receipt}
          label="Receipt"
          active={mode === "receipt"}
          onClick={() => go("receipt")}
        />
      </div>

      {mode === "document" ? (
        <ScanFlow
          tripId={tripId}
          tripNumber={tripNumber}
          origin={origin}
          destination={destination}
        />
      ) : (
        <ReceiptScanFlow
          tripId={tripId}
          tripNumber={tripNumber}
          truckId={truckId}
          driverId={driverId}
        />
      )}
    </div>
  );
}

function Tab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-bg-base text-fg-primary shadow-soft"
          : "text-fg-secondary hover:bg-bg-base/60 hover:text-fg-primary",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
