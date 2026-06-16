"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, Fuel, Loader2, RotateCcw, Save } from "lucide-react";
import { createFuelLog } from "@/server/actions/fuel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";

type T = { id: string; label: string; truckId: string; driverId: string };
type Truck = { id: string; registration: string };
type Driver = { id: string; fullName: string };

type Currency = "KES" | "USD" | "UGX";
const FX_FALLBACK: Record<Currency, number> = { KES: 1, USD: 129.41, UGX: 0.0347 };
/** Default fuelling currency for each country of purchase. */
const COUNTRY_CURRENCY: Record<string, Currency> = {
  KE: "KES",
  UG: "UGX",
  TZ: "USD",
  RW: "USD",
  SS: "USD",
  CD: "USD",
};

export function FuelLogCreateForm({
  trips,
  trucks,
  drivers,
  preselectTripId,
  preselectTruckId,
  ratesToKes,
}: {
  trips: T[];
  trucks: Truck[];
  drivers: Driver[];
  preselectTripId?: string;
  preselectTruckId?: string;
  ratesToKes?: Partial<Record<string, number>>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tripId, setTripId] = useState(preselectTripId ?? "");
  const [truckId, setTruckId] = useState(preselectTruckId ?? "");
  const [driverId, setDriverId] = useState("");
  const [litres, setLitres] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [country, setCountry] = useState("KE");
  const [currency, setCurrency] = useState<Currency>("KES");
  const [cost, setCost] = useState(""); // amount in the selected currency
  const [formKey, setFormKey] = useState(0);

  const rateToKes = (c: Currency) => ratesToKes?.[c] ?? FX_FALLBACK[c];
  const litresNum = Number(litres);
  const costNum = Number(cost);
  // Convert the entered amount to KES — costKes is what we persist.
  const costKes = currency === "KES" ? costNum : Math.round(costNum * rateToKes(currency) * 100) / 100;
  const ppl = litresNum > 0 && costKes > 0 ? (costKes / litresNum).toFixed(2) : "—";

  function onTripChange(value: string) {
    setTripId(value);
    const t = trips.find((x) => x.id === value);
    if (t) {
      setTruckId(t.truckId);
      setDriverId(t.driverId);
    }
  }

  function onCountryChange(value: string) {
    setCountry(value);
    const suggested = COUNTRY_CURRENCY[value];
    if (suggested) setCurrency(suggested);
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
      countryCode: country,
      litres: litresNum,
      costKes, // already converted to KES from the entered currency
      odometerKm: Number(odometerKm),
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
    setOdometerKm("");
    setCountry("KE");
    setCurrency("KES");
    setCost("");
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
        <FormField label="Country" required helper="Sets the default fuelling currency.">
          <Select value={country} onChange={(e) => onCountryChange(e.currentTarget.value)}>
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
          <NumberInput
            value={odometerKm}
            onValueChange={setOdometerKm}
            decimal={false}
            required
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
          <NumberInput
            value={litres}
            onValueChange={setLitres}
            required
            className="font-mono tnum"
            placeholder="165"
            leadingIcon={<Fuel />}
          />
        </FormField>
        <FormField label="Currency" required helper="Currency the fuel was paid in.">
          <Select value={currency} onChange={(e) => setCurrency(e.currentTarget.value as Currency)}>
            <option value="KES">KES — Kenyan Shilling</option>
            <option value="UGX">UGX — Ugandan Shilling</option>
            <option value="USD">USD — US Dollar</option>
          </Select>
        </FormField>
        <FormField label="Cost" required hint={currency}>
          <NumberInput
            value={cost}
            onValueChange={setCost}
            required
            className="font-mono tnum"
            placeholder={currency === "UGX" ? "1,200,000" : "24,500"}
            leadingIcon={<Banknote />}
          />
        </FormField>
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-bg-surface/60 px-4 py-3">
          <div className="flex flex-col">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              {currency === "KES" ? "Cost (KES)" : "Converted to KES"}
            </div>
            <div className="font-mono tnum text-base font-semibold text-fg-primary">
              KSh {costKes > 0 ? costKes.toLocaleString() : "—"}
              {currency !== "KES" && costNum > 0 && (
                <span className="ml-1.5 text-xs font-medium text-fg-tertiary">
                  ({costNum.toLocaleString()} {currency} × {rateToKes(currency)})
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              Price per litre
            </div>
            <div className="font-mono tnum text-lg font-semibold text-status-warning">
              KSh {ppl}
              <span className="ml-1 text-xs text-fg-tertiary">/L</span>
            </div>
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
