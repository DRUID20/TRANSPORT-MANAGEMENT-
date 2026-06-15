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
import type { FuelProduct } from "@/lib/types/trips";

/**
 * Inline capture forms for the Fuel Cargo card.
 *
 * Simplified per the BOL-first workflow: the Bill of Lading prints the
 * volume already standardized to 20 °C, so the dispatcher just types that
 * number. No temperature / density inputs, no @20 °C back-calculation —
 * ullage is straight (loaded − discharged)/loaded × 100 in raw litres.
 *
 * `bolVolumeL` is the BOL's printed volume — used to pre-fill the input
 * so the dispatcher only has to confirm + add seal numbers.
 */
export function CaptureLoadingButton({
  tripId,
  product: _product,
  initialLitres,
  bolVolumeL,
  hasExisting,
}: {
  tripId: string;
  product: FuelProduct;
  initialLitres?: number;
  bolVolumeL?: number;
  hasExisting: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const defaultLitres = initialLitres ?? bolVolumeL;
  const [loadedLitres, setLoadedLitres] = useState<string>(
    defaultLitres !== undefined ? String(defaultLitres) : "",
  );
  const [loadingSealNumbers, setLoadingSealNumbers] = useState<string>("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await captureTripLoading(tripId, {
        loadedLitres: Number(fd.get("loadedLitres") ?? 0),
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
        <FieldSmall
          label={
            bolVolumeL !== undefined
              ? `Loaded litres (BOL @ 20 °C: ${bolVolumeL.toLocaleString()} L)`
              : "Loaded litres (per BOL, @ 20 °C)"
          }
        >
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
  product: _product,
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
  const [dischargeSealNumbers, setDischargeSealNumbers] = useState<string>("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await captureTripDischarge(tripId, {
        dischargedLitres: Number(fd.get("dischargedLitres") ?? 0),
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
        <FieldSmall label="Discharged litres (@ 20 °C)">
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
