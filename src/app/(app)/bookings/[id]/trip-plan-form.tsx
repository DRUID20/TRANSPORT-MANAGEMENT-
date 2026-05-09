"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { planTrip } from "@/server/actions/trips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type T = { id: string; registration: string };
type Drv = { id: string; fullName: string };

export function TripPlanForm({
  bookingId,
  trucks,
  trailers,
  drivers,
  defaultDepartureDate,
}: {
  bookingId: string;
  trucks: T[];
  trailers: T[];
  drivers: Drv[];
  defaultDepartureDate?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await planTrip({
      bookingId,
      truckId: String(fd.get("truckId") ?? ""),
      trailerId: String(fd.get("trailerId") ?? "") || undefined,
      driverId: String(fd.get("driverId") ?? ""),
      driverAdvanceKes: fd.get("driverAdvanceKes")
        ? Number(fd.get("driverAdvanceKes"))
        : undefined,
      plannedDepartureDate: String(fd.get("plannedDepartureDate") ?? "") || undefined,
      plannedDeliveryDate: String(fd.get("plannedDeliveryDate") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/trips/${result.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Truck">
          <Select name="truckId" required defaultValue="">
            <option value="" disabled>Select…</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>{t.registration}</option>
            ))}
          </Select>
        </Field>
        <Field label="Trailer (optional)">
          <Select name="trailerId" defaultValue="">
            <option value="">— None —</option>
            {trailers.map((t) => (
              <option key={t.id} value={t.id}>{t.registration}</option>
            ))}
          </Select>
        </Field>
        <Field label="Driver">
          <Select name="driverId" required defaultValue="">
            <option value="" disabled>Select…</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Planned departure">
          <Input
            name="plannedDepartureDate"
            type="date"
            defaultValue={defaultDepartureDate}
            className="font-mono tnum"
          />
        </Field>
        <Field label="Planned delivery">
          <Input name="plannedDeliveryDate" type="date" className="font-mono tnum" />
        </Field>
        <Field label="Driver advance (KES)" hint="Cash for fuel/tolls/border/food">
          <Input
            name="driverAdvanceKes"
            type="number"
            min={0}
            step="100"
            placeholder="35000"
            className="font-mono tnum"
          />
        </Field>
      </div>

      <Field label="Dispatch notes (optional)">
        <Textarea name="notes" rows={2} />
      </Field>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Planning…</> : <><Send className="size-4" />Plan Trip</>}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <span className="text-[11px] text-fg-tertiary">{hint}</span>}
    </div>
  );
}
