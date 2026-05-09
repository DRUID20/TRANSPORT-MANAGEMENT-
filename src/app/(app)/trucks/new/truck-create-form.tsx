"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createTruck } from "@/server/actions/trucks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Sub = { id: string; name: string };

export function TruckCreateForm({ subcontractors }: { subcontractors: Sub[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerType, setOwnerType] = useState<"company_owned" | "subcontractor">("company_owned");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const input = {
      registration: String(fd.get("registration") ?? ""),
      ownerType,
      subcontractorId: ownerType === "subcontractor" ? String(fd.get("subcontractorId") ?? "") : undefined,
      make: String(fd.get("make") ?? ""),
      model: String(fd.get("model") ?? ""),
      year: Number(fd.get("year") ?? 0),
      fuelType: String(fd.get("fuelType") ?? "diesel") as "diesel" | "petrol",
      capacityTonnes: Number(fd.get("capacityTonnes") ?? 0),
      axles: Number(fd.get("axles") ?? 3),
      status: "active" as const,
      insuranceExpiry: String(fd.get("insuranceExpiry") ?? "") || undefined,
      ntsaInspectionExpiry: String(fd.get("ntsaInspectionExpiry") ?? "") || undefined,
      comesaPermitExpiry: String(fd.get("comesaPermitExpiry") ?? "") || undefined,
      transitPermitExpiry: String(fd.get("transitPermitExpiry") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    };
    const result = await createTruck(input);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/trucks/${result.id}`);
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
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration plate" hint="e.g. KCB 421R">
            <Input
              name="registration"
              required
              placeholder="KCB 421R"
              className="font-mono uppercase tracking-wider"
            />
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
            <Field label="Subcontractor" hint="Owner of the truck" className="sm:col-span-2">
              <Select name="subcontractorId" required defaultValue="">
                <option value="" disabled>
                  Select a subcontractor…
                </option>
                {subcontractors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              {subcontractors.length === 0 && (
                <p className="mt-1 text-xs text-fg-tertiary">
                  No subcontractors yet.{" "}
                  <Link href="/subcontractors/new" className="text-brand-blue hover:underline">
                    Add one first.
                  </Link>
                </p>
              )}
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Make">
            <Input name="make" required placeholder="Mercedes-Benz" />
          </Field>
          <Field label="Model">
            <Input name="model" required placeholder="Actros 2545" />
          </Field>
          <Field label="Year">
            <Input
              name="year"
              type="number"
              required
              min={1990}
              max={new Date().getFullYear() + 1}
              defaultValue={new Date().getFullYear()}
            />
          </Field>
          <Field label="Fuel type">
            <Select name="fuelType" defaultValue="diesel">
              <option value="diesel">Diesel</option>
              <option value="petrol">Petrol</option>
            </Select>
          </Field>
          <Field label="Capacity (tonnes)">
            <Input name="capacityTonnes" type="number" required min={1} step={0.5} placeholder="28" />
          </Field>
          <Field label="Axles">
            <Input name="axles" type="number" required min={2} max={7} defaultValue={3} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance & expiries</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Insurance expiry" hint="GIT + comprehensive">
            <Input name="insuranceExpiry" type="date" />
          </Field>
          <Field label="NTSA inspection expiry">
            <Input name="ntsaInspectionExpiry" type="date" />
          </Field>
          <Field label="COMESA permit expiry">
            <Input name="comesaPermitExpiry" type="date" />
          </Field>
          <Field label="Transit permit expiry">
            <Input name="transitPermitExpiry" type="date" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" placeholder="Any free-form notes about this truck…" rows={3} />
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save Truck
            </>
          )}
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
