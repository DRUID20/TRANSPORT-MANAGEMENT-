"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createFuelLog } from "@/server/actions/fuel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

  const ppl = litres && costKes && Number(litres) > 0
    ? (Number(costKes) / Number(litres)).toFixed(2)
    : "—";

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
      litres: Number(litres),
      costKes: Number(costKes),
      odometerKm: Number(fd.get("odometerKm") ?? 0),
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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Allocation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Trip (optional)" hint="Auto-fills truck + driver" className="sm:col-span-2">
            <Select value={tripId} onChange={(e) => onTripChange(e.currentTarget.value)}>
              <option value="">— None —</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Truck">
            <Select value={truckId} onChange={(e) => setTruckId(e.currentTarget.value)} required>
              <option value="" disabled>Select…</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>{t.registration}</option>
              ))}
            </Select>
          </Field>
          <Field label="Driver (optional)">
            <Select value={driverId} onChange={(e) => setDriverId(e.currentTarget.value)}>
              <option value="">— None —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fuelling</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Date & time">
            <Input
              name="datetime"
              type="datetime-local"
              required
              defaultValue={new Date().toISOString().slice(0, 16)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Station">
            <Input name="station" required placeholder="Total Mariakani" />
          </Field>
          <Field label="Country">
            <Select name="countryCode" defaultValue="KE">
              <option value="KE">🇰🇪 Kenya</option>
              <option value="UG">🇺🇬 Uganda</option>
              <option value="TZ">🇹🇿 Tanzania</option>
              <option value="RW">🇷🇼 Rwanda</option>
              <option value="SS">🇸🇸 South Sudan</option>
              <option value="CD">🇨🇩 DR Congo</option>
            </Select>
          </Field>
          <Field label="Odometer reading (km)">
            <Input
              name="odometerKm"
              type="number"
              required
              min={0}
              className="font-mono tnum"
              placeholder="412500"
            />
          </Field>
          <Field label="Litres">
            <Input
              type="number"
              required
              min={0}
              step="0.01"
              value={litres}
              onChange={(e) => setLitres(e.currentTarget.value)}
              className="font-mono tnum"
              placeholder="165"
            />
          </Field>
          <Field label="Cost (KES)">
            <Input
              type="number"
              required
              min={0}
              step="0.01"
              value={costKes}
              onChange={(e) => setCostKes(e.currentTarget.value)}
              className="font-mono tnum"
              placeholder="24500"
            />
          </Field>
          <div className="sm:col-span-2 rounded-md bg-bg-base/60 p-3 ring-1 ring-border">
            <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">
              Computed price per litre
            </div>
            <div className="mt-0.5 font-mono tnum text-lg font-semibold text-status-warning">
              KSh {ppl}/L
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Submitted by">
            <Input name="submittedBy" defaultValue="Dispatcher" />
          </Field>
          <div />
          <Field label="Notes (optional)" className="sm:col-span-2">
            <Textarea name="notes" rows={2} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading || !truckId}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save Fuel Log</>}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"flex flex-col gap-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
      {hint && <span className="text-[11px] text-fg-tertiary">{hint}</span>}
    </div>
  );
}
