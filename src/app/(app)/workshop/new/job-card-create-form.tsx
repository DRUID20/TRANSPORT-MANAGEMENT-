"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createJobCard } from "@/server/actions/job-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type T = { id: string; registration: string };

export function JobCardCreateForm({
  trucks,
  preselectTruckId,
}: {
  trucks: T[];
  preselectTruckId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createJobCard({
      truckId: String(fd.get("truckId") ?? ""),
      mechanicName: String(fd.get("mechanicName") ?? ""),
      openingOdometer: fd.get("openingOdometer")
        ? Number(fd.get("openingOdometer"))
        : undefined,
      mechanicAnalysis: String(fd.get("mechanicAnalysis") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/workshop/${result.id}`);
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
          <CardTitle>Intake</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Truck</Label>
            <Select name="truckId" required defaultValue={preselectTruckId ?? ""}>
              <option value="" disabled>Select a truck…</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>{t.registration}</option>
              ))}
            </Select>
            <span className="text-[11px] text-fg-tertiary">
              Truck status auto-changes to <span className="font-mono">In Workshop</span> when this card opens.
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Mechanic / Workshop</Label>
            <Input name="mechanicName" required placeholder="Joseph Kamau" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Opening odometer (km)</Label>
            <Input
              name="openingOdometer"
              type="number"
              min={0}
              placeholder="412880"
              className="font-mono tnum"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Initial mechanic analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="mechanicAnalysis"
            rows={5}
            placeholder="Diagnostic / what's wrong / what needs to be done. Refine as work progresses."
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Opening…</> : <><Save className="size-4" />Open Job Card</>}
        </Button>
      </div>
    </form>
  );
}
