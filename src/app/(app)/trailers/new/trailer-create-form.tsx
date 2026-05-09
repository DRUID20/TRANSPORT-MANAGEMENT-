"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createTrailer } from "@/server/actions/trailers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Sub = { id: string; name: string };
type T = { id: string; registration: string };

export function TrailerCreateForm({
  subcontractors,
  trucks,
}: {
  subcontractors: Sub[];
  trucks: T[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerType, setOwnerType] = useState<"company_owned" | "subcontractor">("company_owned");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createTrailer({
      registration: String(fd.get("registration") ?? ""),
      ownerType,
      subcontractorId:
        ownerType === "subcontractor" ? String(fd.get("subcontractorId") ?? "") : undefined,
      type: String(fd.get("type") ?? "flatbed") as never,
      capacityTonnes: Number(fd.get("capacityTonnes") ?? 0),
      axles: Number(fd.get("axles") ?? 3),
      year: Number(fd.get("year") ?? new Date().getFullYear()),
      status: "active",
      attachedTruckId: String(fd.get("attachedTruckId") ?? "") || undefined,
      insuranceExpiry: String(fd.get("insuranceExpiry") ?? "") || undefined,
      ntsaInspectionExpiry: String(fd.get("ntsaInspectionExpiry") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/trailers/${result.id}`);
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
          <CardTitle>Identity & specs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration plate">
            <Input
              name="registration"
              required
              placeholder="ZB 1180T"
              className="font-mono uppercase tracking-wider"
            />
          </Field>
          <Field label="Trailer type">
            <Select name="type" defaultValue="flatbed">
              <option value="flatbed">Flatbed</option>
              <option value="container_skeleton">Container Skeleton</option>
              <option value="curtain_side">Curtain-Side</option>
              <option value="tanker">Tanker</option>
              <option value="reefer">Reefer (refrigerated)</option>
              <option value="tipper">Tipper</option>
              <option value="low_loader">Low-Loader</option>
            </Select>
          </Field>
          <Field label="Owner type">
            <Select
              name="ownerType"
              value={ownerType}
              onChange={(e) => setOwnerType(e.currentTarget.value as typeof ownerType)}
            >
              <option value="company_owned">Company-Owned</option>
              <option value="subcontractor">Subcontractor</option>
            </Select>
          </Field>
          {ownerType === "subcontractor" && (
            <Field label="Subcontractor">
              <Select name="subcontractorId" required defaultValue="">
                <option value="" disabled>Select…</option>
                {subcontractors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Capacity (tonnes)">
            <Input name="capacityTonnes" type="number" required min={1} step={0.5} placeholder="30" />
          </Field>
          <Field label="Axles">
            <Input name="axles" type="number" required min={1} max={7} defaultValue={3} />
          </Field>
          <Field label="Year">
            <Input name="year" type="number" required min={1990} defaultValue={new Date().getFullYear()} />
          </Field>
          <Field label="Currently attached to (optional)">
            <Select name="attachedTruckId" defaultValue="">
              <option value="">— Not attached —</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>{t.registration}</option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Insurance expiry">
            <Input name="insuranceExpiry" type="date" />
          </Field>
          <Field label="NTSA inspection expiry">
            <Input name="ntsaInspectionExpiry" type="date" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={3} placeholder="Optional notes…" />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save Trailer</>}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"flex flex-col gap-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
