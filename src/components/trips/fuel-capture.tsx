"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  captureTripDischarge,
  captureTripLoading,
} from "@/server/actions/trips";
import {
  correctVolumeTo20C,
  FUEL_TYPICAL_DENSITY,
  type FuelProduct,
} from "@/lib/types/trips";

/**
 * Inline capture button for the Fuel Cargo card. Renders a small "Capture"
 * pill when collapsed; expands into a card-local form when clicked. We
 * intentionally don't use a modal — the form belongs visually inside the
 * Loading / Discharge block it edits.
 */
export function CaptureLoadingButton({
  tripId,
  product,
  initialLitres,
  hasExisting,
}: {
  tripId: string;
  product: FuelProduct;
  initialLitres?: number;
  hasExisting: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [loadedLitres, setLoadedLitres] = useState<string>(
    initialLitres !== undefined ? String(initialLitres) : "",
  );
  const [loadingTempC, setLoadingTempC] = useState<string>("28.0");
  const [density15C, setDensity15C] = useState<string>(
    String(FUEL_TYPICAL_DENSITY[product]),
  );
  const [loadingSealNumbers, setLoadingSealNumbers] = useState<string>("");

  const litresNum = Number(loadedLitres);
  const tempNum = Number(loadingTempC);
  const preview20C =
    Number.isFinite(litresNum) && Number.isFinite(tempNum) && litresNum > 0
      ? correctVolumeTo20C(product, litresNum, tempNum)
      : undefined;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await captureTripLoading(tripId, {
        loadedLitres: Number(fd.get("loadedLitres") ?? 0),
        loadingTempC: Number(fd.get("loadingTempC") ?? 0),
        density15C: Number(fd.get("density15C") ?? 0),
        loadingSealNumbers: String(fd.get("loadingSealNumbers") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="mt-2 w-full justify-center"
      >
        <Pencil className="size-3" />
        {hasExisting ? "Update loading" : "Capture loading"}
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-3 rounded-md border border-brand-blue/40 bg-bg-elevated p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-blue">
          Depot loading
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-fg-tertiary hover:text-fg-primary"
          aria-label="Cancel"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-2 text-[11px] text-status-danger">
          {error}
        </div>
      )}

      <div className="grid gap-2">
        <FieldSmall label="Observed litres">
          <Input
            name="loadedLitres"
            type="number"
            required
            min={1}
            step="1"
            value={loadedLitres}
            onChange={(e) => setLoadedLitres(e.currentTarget.value)}
            className="h-8 font-mono tnum"
          />
        </FieldSmall>
        <FieldSmall label="Loading temp (°C)">
          <Input
            name="loadingTempC"
            type="number"
            required
            min={-10}
            max={80}
            step="0.1"
            value={loadingTempC}
            onChange={(e) => setLoadingTempC(e.currentTarget.value)}
            className="h-8 font-mono tnum"
          />
        </FieldSmall>
        <FieldSmall label="Density at 15 °C (kg/L)">
          <Input
            name="density15C"
            type="number"
            required
            min={0.6}
            max={1.0}
            step="0.001"
            value={density15C}
            onChange={(e) => setDensity15C(e.currentTarget.value)}
            className="h-8 font-mono tnum"
          />
        </FieldSmall>
        <FieldSmall label="Seal numbers">
          <Input
            name="loadingSealNumbers"
            required
            value={loadingSealNumbers}
            onChange={(e) => setLoadingSealNumbers(e.currentTarget.value)}
            className="h-8 font-mono"
            placeholder="KPC 12345, 12346"
          />
        </FieldSmall>
        {preview20C !== undefined && (
          <div className="rounded-md border border-dashed border-border bg-bg-base/40 p-2 text-[11px] text-fg-tertiary">
            <span className="text-fg-secondary">@ 20 °C preview:</span>{" "}
            <span className="font-mono tnum font-semibold text-fg-primary">
              {preview20C.toLocaleString()} L
            </span>
          </div>
        )}
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <>
            <Save className="size-3.5" />
            Save loading
          </>
        )}
      </Button>
    </form>
  );
}

export function CaptureDischargeButton({
  tripId,
  product,
  hasLoading,
  hasExisting,
  initialLitres,
}: {
  tripId: string;
  product: FuelProduct;
  hasLoading: boolean;
  hasExisting: boolean;
  initialLitres?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [dischargedLitres, setDischargedLitres] = useState<string>(
    initialLitres !== undefined ? String(initialLitres) : "",
  );
  const [dischargeTempC, setDischargeTempC] = useState<string>("30.0");
  const [dischargeSealNumbers, setDischargeSealNumbers] = useState<string>("");

  const litresNum = Number(dischargedLitres);
  const tempNum = Number(dischargeTempC);
  const preview20C =
    Number.isFinite(litresNum) && Number.isFinite(tempNum) && litresNum > 0
      ? correctVolumeTo20C(product, litresNum, tempNum)
      : undefined;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await captureTripDischarge(tripId, {
        dischargedLitres: Number(fd.get("dischargedLitres") ?? 0),
        dischargeTempC: Number(fd.get("dischargeTempC") ?? 0),
        dischargeSealNumbers: String(fd.get("dischargeSealNumbers") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!hasLoading) {
    return (
      <div className="mt-2 rounded-md border border-dashed border-border bg-bg-base/40 p-2 text-[11px] text-fg-tertiary">
        Capture depot loading first.
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="mt-2 w-full justify-center"
      >
        <Pencil className="size-3" />
        {hasExisting ? "Update discharge" : "Capture discharge"}
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-3 rounded-md border border-brand-blue/40 bg-bg-elevated p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-blue">
          Customer discharge
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-fg-tertiary hover:text-fg-primary"
          aria-label="Cancel"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-2 text-[11px] text-status-danger">
          {error}
        </div>
      )}

      <div className="grid gap-2">
        <FieldSmall label="Discharged litres">
          <Input
            name="dischargedLitres"
            type="number"
            required
            min={1}
            step="1"
            value={dischargedLitres}
            onChange={(e) => setDischargedLitres(e.currentTarget.value)}
            className="h-8 font-mono tnum"
          />
        </FieldSmall>
        <FieldSmall label="Discharge temp (°C)">
          <Input
            name="dischargeTempC"
            type="number"
            required
            min={-10}
            max={80}
            step="0.1"
            value={dischargeTempC}
            onChange={(e) => setDischargeTempC(e.currentTarget.value)}
            className="h-8 font-mono tnum"
          />
        </FieldSmall>
        <FieldSmall label="Seal numbers">
          <Input
            name="dischargeSealNumbers"
            required
            value={dischargeSealNumbers}
            onChange={(e) => setDischargeSealNumbers(e.currentTarget.value)}
            className="h-8 font-mono"
            placeholder="KPC 12345, 12346 (matched on arrival)"
          />
        </FieldSmall>
        {preview20C !== undefined && (
          <div className="rounded-md border border-dashed border-border bg-bg-base/40 p-2 text-[11px] text-fg-tertiary">
            <span className="text-fg-secondary">@ 20 °C preview:</span>{" "}
            <span className="font-mono tnum font-semibold text-fg-primary">
              {preview20C.toLocaleString()} L
            </span>
          </div>
        )}
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <>
            <Save className="size-3.5" />
            Save discharge
          </>
        )}
      </Button>
    </form>
  );
}

function FieldSmall({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] uppercase tracking-wider text-fg-tertiary">
        {label}
      </Label>
      {children}
    </div>
  );
}
