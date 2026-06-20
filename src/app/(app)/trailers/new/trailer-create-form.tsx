"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { createTrailer } from "@/server/actions/trailers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";

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
  const [ownerType, setOwnerType] = useState<"company_owned" | "subcontractor">(
    "company_owned",
  );
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createTrailer({
      registration: String(fd.get("registration") ?? ""),
      ownerType,
      subcontractorId:
        ownerType === "subcontractor"
          ? String(fd.get("subcontractorId") ?? "")
          : undefined,
      type: String(fd.get("type") ?? "flatbed") as never,
      capacityTonnes: Number(fd.get("capacityTonnes") ?? 0),
      axles: Number(fd.get("axles") ?? 3),
      year: Number(fd.get("year") ?? new Date().getFullYear()),
      status: "active",
      attachedTruckId: String(fd.get("attachedTruckId") ?? "") || undefined,
      insuranceExpiry: String(fd.get("insuranceExpiry") ?? "") || undefined,
      ntsaInspectionExpiry:
        String(fd.get("ntsaInspectionExpiry") ?? "") || undefined,
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
    <form key={formKey} onSubmit={onSubmit} className="flex flex-col gap-5 pb-20">
      {error && (
        <div className="surface-card animate-content-in border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger">
          {error}
        </div>
      )}

      <FormSection
        eyebrow="Step 1"
        title="Identity & specs"
        description="Plate, type, and capacity. Tanker trailers are most common for the fuel-only workflow."
        columns={2}
      >
        <FormField
          label="Trailer ID"
          required
          helper="Plate (KE or foreign), chassis number, VIN, or your internal tag — any format works."
        >
          <Input
            name="registration"
            required
            maxLength={32}
            placeholder="e.g. ZB 1180T · CHASSIS-1HSXY1 · TRL-014"
            className="font-mono uppercase tracking-wider"
          />
        </FormField>
        <FormField label="Trailer type" required>
          <Select name="type" defaultValue="flatbed">
            <option value="flatbed">Flatbed</option>
            <option value="container_skeleton">Container skeleton</option>
            <option value="curtain_side">Curtain-side</option>
            <option value="tanker">Tanker</option>
            <option value="reefer">Reefer (refrigerated)</option>
            <option value="tipper">Tipper</option>
            <option value="low_loader">Low-loader</option>
          </Select>
        </FormField>
        <FormField label="Owner type" required>
          <Select
            name="ownerType"
            value={ownerType}
            onChange={(e) => setOwnerType(e.currentTarget.value as typeof ownerType)}
          >
            <option value="company_owned">Company-owned</option>
            <option value="subcontractor">Subcontractor</option>
          </Select>
        </FormField>
        {ownerType === "subcontractor" && (
          <FormField label="Subcontractor" required>
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
                <Link
                  href="/subcontractors/new"
                  className="text-brand-blue hover:underline"
                >
                  Add one first.
                </Link>
              </p>
            )}
          </FormField>
        )}
        <FormField label="Capacity" required hint="TONNES">
          <Input
            name="capacityTonnes"
            type="number"
            required
            min={1}
            step={0.5}
            placeholder="30"
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Axles" required>
          <Input
            name="axles"
            type="number"
            required
            min={1}
            max={7}
            defaultValue={3}
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Year" required>
          <Input
            name="year"
            type="number"
            required
            min={1990}
            defaultValue={new Date().getFullYear()}
            className="font-mono tnum"
          />
        </FormField>
        <FormField
          label="Currently attached to"
          hint="OPTIONAL"
          helper="Pre-attach to a tractor unit if known."
        >
          <Select name="attachedTruckId" defaultValue="">
            <option value="">— Not attached —</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.registration}
              </option>
            ))}
          </Select>
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Step 2"
        title="Compliance"
        description="Insurance and NTSA inspection dates flow onto the Compliance dashboard 30 days before expiry."
        columns={2}
      >
        <FormField label="Insurance expiry">
          <Input name="insuranceExpiry" type="date" />
        </FormField>
        <FormField label="NTSA inspection expiry">
          <Input name="ntsaInspectionExpiry" type="date" />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Optional"
        title="Notes"
        description="Free-form notes about this trailer."
        columns={1}
      >
        <FormField label="Notes" hint="OPTIONAL">
          <Textarea
            name="notes"
            rows={3}
            placeholder="e.g. 4-compartment fuel tanker · last calibrated 2024-06"
          />
        </FormField>
      </FormSection>

      <FormFooter
        meta={
          <span>
            Trailers default to active and become attachable from any trip
            immediately.
          </span>
        }
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setFormKey((k) => k + 1);
            setOwnerType("company_owned");
            setError(null);
          }}
          disabled={loading}
        >
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
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save trailer
            </>
          )}
        </Button>
      </FormFooter>
    </form>
  );
}
