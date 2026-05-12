"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Droplet, Loader2, RotateCcw, Save } from "lucide-react";
import { createTruck } from "@/server/actions/trucks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";

type Sub = { id: string; name: string };

export function TruckCreateForm({ subcontractors }: { subcontractors: Sub[] }) {
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
    const input = {
      registration: String(fd.get("registration") ?? ""),
      ownerType,
      subcontractorId:
        ownerType === "subcontractor" ? String(fd.get("subcontractorId") ?? "") : undefined,
      make: String(fd.get("make") ?? ""),
      model: String(fd.get("model") ?? ""),
      year: Number(fd.get("year") ?? 0),
      fuelType: String(fd.get("fuelType") ?? "diesel") as "diesel" | "petrol",
      capacityTonnes: Number(fd.get("capacityTonnes") ?? 0),
      axles: Number(fd.get("axles") ?? 3),
      status: "active" as const,
      tankCapacityLitres: Number(fd.get("tankCapacityLitres") ?? 0) || undefined,
      compartmentCount: Number(fd.get("compartmentCount") ?? 0) || undefined,
      lastCalibrationDate: String(fd.get("lastCalibrationDate") ?? "") || undefined,
      calibrationDueDate: String(fd.get("calibrationDueDate") ?? "") || undefined,
      permittedProducts: (fd.getAll("permittedProducts") as string[]).filter(
        (p): p is "PMS" | "AGO" => p === "PMS" || p === "AGO",
      ),
      insuranceExpiry: String(fd.get("insuranceExpiry") ?? "") || undefined,
      ntsaInspectionExpiry: String(fd.get("ntsaInspectionExpiry") ?? "") || undefined,
      comesaPermitExpiry: String(fd.get("comesaPermitExpiry") ?? "") || undefined,
      transitPermitExpiry: String(fd.get("transitPermitExpiry") ?? "") || undefined,
      epraTransitLicenceExpiry: String(fd.get("epraTransitLicenceExpiry") ?? "") || undefined,
      petroleumLiabilityExpiry: String(fd.get("petroleumLiabilityExpiry") ?? "") || undefined,
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
    <form
      key={formKey}
      onSubmit={onSubmit}
      className="flex flex-col gap-5 pb-20"
    >
      {error && (
        <div className="surface-card animate-content-in border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger">
          {error}
        </div>
      )}

      <FormSection
        eyebrow="Step 1"
        title="Identity"
        description="Plate number and ownership. Subcontractor trucks point to the partner who owns them."
        columns={2}
      >
        <FormField label="Registration plate" required hint="e.g. KCB 421R">
          <Input
            name="registration"
            required
            placeholder="KCB 421R"
            className="font-mono uppercase tracking-wider"
          />
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
          <FormField
            label="Subcontractor"
            required
            className="sm:col-span-2"
            helper={
              subcontractors.length === 0 ? undefined : "Owner of the truck."
            }
          >
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
          </FormField>
        )}
      </FormSection>

      <FormSection
        eyebrow="Step 2"
        title="Vehicle specifications"
        description="Make, model, drivetrain — used in dispatch lookups and on the truck detail page."
        columns={3}
      >
        <FormField label="Make" required>
          <Input name="make" required placeholder="Mercedes-Benz" />
        </FormField>
        <FormField label="Model" required>
          <Input name="model" required placeholder="Actros 2545" />
        </FormField>
        <FormField label="Year" required>
          <Input
            name="year"
            type="number"
            required
            min={1990}
            max={new Date().getFullYear() + 1}
            defaultValue={new Date().getFullYear()}
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Engine fuel" required>
          <Select name="fuelType" defaultValue="diesel">
            <option value="diesel">Diesel</option>
            <option value="petrol">Petrol</option>
          </Select>
        </FormField>
        <FormField label="GVW" required hint="TONNES">
          <Input
            name="capacityTonnes"
            type="number"
            required
            min={1}
            step={0.5}
            placeholder="28"
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Axles" required>
          <Input
            name="axles"
            type="number"
            required
            min={2}
            max={7}
            defaultValue={3}
            className="font-mono tnum"
          />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Step 3"
        title="Tanker spec"
        description="EPRA calibration metadata and which fuel products this tanker is rated to carry."
        columns={2}
      >
        <FormField label="Tank capacity" hint="LITRES" helper="Sum of all compartments.">
          <Input
            name="tankCapacityLitres"
            type="number"
            min={1000}
            step={100}
            placeholder="40,000"
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Compartments" helper="Typically 4 to 7 on a fuel tanker.">
          <Input
            name="compartmentCount"
            type="number"
            min={1}
            max={10}
            placeholder="5"
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Last calibration date" helper="EPRA cert; valid for 2 years.">
          <Input name="lastCalibrationDate" type="date" />
        </FormField>
        <FormField label="Calibration due">
          <Input name="calibrationDueDate" type="date" />
        </FormField>
        <FormField label="Permitted products" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            <ProductCheckbox value="PMS" label="PMS (petrol)" />
            <ProductCheckbox value="AGO" label="AGO (diesel)" />
          </div>
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Step 4"
        title="Compliance & expiries"
        description="The dashboard surfaces these dates on the Needs Attention card so you can renew before they bite."
        columns={2}
      >
        <FormField label="Insurance expiry" helper="GIT + comprehensive.">
          <Input name="insuranceExpiry" type="date" />
        </FormField>
        <FormField
          label="Petroleum carriers' liability"
          helper="Required to load at KPC depots."
        >
          <Input name="petroleumLiabilityExpiry" type="date" />
        </FormField>
        <FormField label="NTSA inspection expiry">
          <Input name="ntsaInspectionExpiry" type="date" />
        </FormField>
        <FormField label="EPRA transit licence">
          <Input name="epraTransitLicenceExpiry" type="date" />
        </FormField>
        <FormField label="COMESA permit expiry">
          <Input name="comesaPermitExpiry" type="date" />
        </FormField>
        <FormField label="Transit permit expiry">
          <Input name="transitPermitExpiry" type="date" />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Optional"
        title="Notes"
        description="Any free-form notes about this truck — special quirks, dispatch preferences, etc."
        columns={1}
      >
        <FormField label="Notes" hint="OPTIONAL">
          <Textarea
            name="notes"
            placeholder="e.g. Prefers night dispatch · long-haul certified driver pool"
            rows={3}
          />
        </FormField>
      </FormSection>

      <FormFooter
        meta={
          <span>
            All dates in EAT. Trucks are immediately available for booking once
            saved.
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
              Save truck
            </>
          )}
        </Button>
      </FormFooter>
    </form>
  );
}

function ProductCheckbox({ value, label }: { value: string; label: string }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-fg-primary shadow-soft transition-colors hover:border-border-strong has-[:checked]:border-brand-blue/50 has-[:checked]:bg-brand-blue/5 has-[:checked]:text-brand-blue">
      <input
        type="checkbox"
        name="permittedProducts"
        value={value}
        defaultChecked
        className="size-3.5 accent-brand-blue"
      />
      <Droplet className="size-3.5" />
      <span>{label}</span>
    </label>
  );
}
