"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, Loader2, Send } from "lucide-react";
import { planTrip } from "@/server/actions/trips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-section";

type T = { id: string; registration: string };
type Drv = { id: string; fullName: string };

/**
 * TripPlanForm — converts a confirmed booking into a dispatched trip.
 * Lives inline inside the booking detail page now, so it skips the
 * outer FormSection chrome and renders as a tight inline grid.
 */
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
      plannedDepartureDate:
        String(fd.get("plannedDepartureDate") ?? "") || undefined,
      plannedDeliveryDate:
        String(fd.get("plannedDeliveryDate") ?? "") || undefined,
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Truck" required>
          <Select name="truckId" required defaultValue="">
            <option value="" disabled>Select</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>{t.registration}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Trailer" hint="OPTIONAL">
          <Select name="trailerId" defaultValue="">
            <option value="">None</option>
            {trailers.map((t) => (
              <option key={t.id} value={t.id}>{t.registration}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Driver" required>
          <Select name="driverId" required defaultValue="">
            <option value="" disabled>Select</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Planned departure">
          <Input
            name="plannedDepartureDate"
            type="date"
            defaultValue={defaultDepartureDate}
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Planned delivery">
          <Input name="plannedDeliveryDate" type="date" className="font-mono tnum" />
        </FormField>
        <FormField label="Driver advance" hint="KES">
          <Input
            name="driverAdvanceKes"
            type="number"
            min={0}
            step="100"
            placeholder="35,000"
            className="font-mono tnum"
            leadingIcon={<Banknote />}
          />
        </FormField>
      </div>

      <FormField label="Notes" hint="OPTIONAL">
        <Textarea
          name="notes"
          rows={2}
          placeholder="Customer release, route preferences"
        />
      </FormField>

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="size-3.5 animate-spin" />Planning</> : <><Send className="size-3.5" />Plan trip</>}
        </Button>
      </div>
    </form>
  );
}
