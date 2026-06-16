"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, Fuel, Loader2, RotateCcw, Save } from "lucide-react";
import { createFuelLog } from "@/server/actions/fuel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";

type T = { id: string; label: string; truckId: string; driverId: string };
type Truck = { id: string; registration: string };
type Driver = { id: string; fullName: string };

export function FuelLogCreateForm({
  trips,
  trucks,
  drivers,
  preselectTripId,
  preselectTruckId,
}: {
  trips: T[];
  trucks: Truck[];
  drivers: Driver[];
  preselectTripId?: string;
  preselectTruckId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tripId, setTripId] = useState(preselectTripId ?? "");
  const [truckId, setTruckId] = useState(preselectTruckId ?? "");
  const [driverId, setDriverId] = useState("");
  const [litres, setLitres] = useState("");
  const [costKes, setCostKes] = useState("");
  const [formKey, setFormKey] = useState(0);

  const litresNum = Number(litres);
  const costNum = Number(costKes);
  const ppl =
    litresNum > 0 && costNum > 0 ? (costNum / litresNum).toFixed(2) : "—";

  function onTripChange(value: string) {
    setTripId(value);
    const t = trips.find((x) => x.id === value);
    if (t) {
      setTruckId(t.truckId);
      setDriverId(t.driverId);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createFuelLog({
      tripId: tripId || undefined,
      truckId,
      driverId: driverId || undefined,
      datetime: String(fd.get("datetime") ?? new Date().toISOString()),
      station: String(fd.get("station") ?? ""),
      countryCode: String(fd.get("countryCode") ?? "KE"),
      litres: litresNum,
      costKes: costNum,
      odometerKm: Number(fd.get("odometerKm") ?? 0),
      stationManagerName: String(fd.get("stationManagerName") ?? "").trim(),
      notes: String(fd.get("notes") ?? "") || undefined,
      submittedBy: String(fd.get("submittedBy") ?? "Dispatcher"),
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/fuel");
  }

  function reset() {
    setTripId(preselectTripId ?? "");
    setTruckId(preselectTruckId ?? "");
    setDriverId("");
    setLitres("");
    setCostKes("");
    setError(null);
    setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} onSubmit={onSubmit} className="flex flex-col gap-5 pb-20">
      {error && (
        <div className="surface-card animate-content-in border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger">
          {error}
        </div>
      )}

      <FormSection
        eyebrow="Step 1"
        title="Allocation"
        description="Picking a trip auto-fills the truck and driver. For non-trip fuel (workshop test runs, transfers) pick the truck directly."
        columns={2}
      >
        <FormField
          label="Trip"
          hint="OPTIONAL"
          helper="Auto-fills truck + driver from the trip record."
          className="sm:col-span-2"
        >
          <Select value={tripId} onChange={(e) => onTripChange(e.currentTarget.value)}>
            <option value="">— None (manual allocation) —</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Truck" required>
          <Select
            value={truckId}
            onChange={(e) => setTruckId(e.currentTarget.value)}
            required
          >
            <option value="" disabled>
              Select a truck…
            </option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.registration}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Driver" hint="OPTIONAL">
          <Select value={driverId} onChange={(e) => setDriverId(e.currentTarget.value)}>
            <option value="">— None —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </Select>
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Step 2"
        title="Fuelling"
        description="Engine fuel pumped at any station along the route. Odometer drives km/L computation in the Performance Tracker."
        columns={2}
      >
        <FormField label="Date & time" required>
          <Input
            name="datetime"
            type="datetime-local"
            required
            defaultValue={new Date().toISOString().slice(0, 16)}
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Station" required>
          <Input name="station" required placeholder="Total Mariakani" />
        </FormField>
        <FormField label="Country" required>
          <Select name="countryCode" defaultValue="KE">
            <option value="KE">🇰🇪 Kenya</option>
            <option value="UG">🇺🇬 Uganda</option>
            <option value="TZ">🇹🇿 Tanzania</option>
            <option value="RW">🇷🇼 Rwanda</option>
            <option value="SS">🇸🇸 South Sudan</option>
            <option value="CD">🇨🇩 DR Congo</option>
          </Select>
        </FormField>
        <FormField
          label="Odometer reading"
          required
          hint="KM"
          helper="Verified by the station manager — drives trip km and km/L."
        >
          <Input
            name="odometerKm"
            type="number"
            required
            min={1}
            className="font-mono tnum"
            placeholder="412,500"
          />
        </FormField>
        <FormField
          label="Station manager (verifying)"
          required
          helper="Person at the pump who confirmed the reading. Required for audit."
        >
          <Input
            name="stationManagerName"
            required
            minLength={2}
            placeholder="e.g. D. Mwendwa (shift manager)"
          />
        </FormField>
        <FormField label="Litres" required>
          <Input
            type="number"
            required
            min={0}
            step="0.01"
            value={litres}
            onChange={(e) => setLitres(e.currentTarget.value)}
            className="font-mono tnum"
            placeholder="165"
            leadingIcon={<Fuel />}
          />
        </FormField>
        <FormField label="Cost" required hint="KES">
          <Input
            type="number"
            required
            min={0}
            step="0.01"
            value={costKes}
            onChange={(e) => setCostKes(e.currentTarget.value)}
            className="font-mono tnum"
            placeholder="24,500"
            leadingIcon={<Banknote />}
          />
        </FormField>
        <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-dashed border-border bg-bg-surface/60 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
            Computed price per litre
          </div>
          <div className="font-mono tnum text-lg font-semibold text-status-warning">
            KSh {ppl}
            <span className="ml-1 text-xs text-fg-tertiary">/L</span>
          </div>
        </div>
      </FormSection>

      <FormSection
        eyebrow="Optional"
        title="Submission"
        description="Dispatcher captures most logs from receipts; mark notes if the pump price didn't match."
        columns={2}
      >
        <FormField label="Submitted by">
          <Input name="submittedBy" defaultValue="Dispatcher" />
        </FormField>
        <FormField label="Notes" hint="OPTIONAL" className="sm:col-span-2">
          <Textarea
            name="notes"
            rows={2}
            placeholder="e.g. AGO pump price 152.30/L · paid in cash from advance"
          />
        </FormField>
      </FormSection>

      <FormFooter
        meta={
          <span>
            Logs immediately feed the Performance Tracker and per-country split.
          </span>
        }
      >
        <Button type="button" variant="ghost" onClick={reset} disabled={loading}>
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !truckId}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save fuel log
            </>
          )}
        </Button>
      </FormFooter>
    </form>
  );
}
