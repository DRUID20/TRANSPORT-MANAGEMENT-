"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { createDriver } from "@/server/actions/drivers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";

type T = { id: string; registration: string };

export function DriverCreateForm({ trucks }: { trucks: T[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createDriver({
      fullName: String(fd.get("fullName") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      nationalId: String(fd.get("nationalId") ?? ""),
      status: "active",
      licenceClass: String(fd.get("licenceClass") ?? "CE") as
        | "BCE"
        | "CD"
        | "CE"
        | "DE",
      licenceNumber: String(fd.get("licenceNumber") ?? ""),
      licenceExpiry: String(fd.get("licenceExpiry") ?? "") || undefined,
      medicalExpiry: String(fd.get("medicalExpiry") ?? "") || undefined,
      passportNumber: String(fd.get("passportNumber") ?? "") || undefined,
      passportExpiry: String(fd.get("passportExpiry") ?? "") || undefined,
      comesaDriverPermitExpiry:
        String(fd.get("comesaDriverPermitExpiry") ?? "") || undefined,
      defaultTruckId: String(fd.get("defaultTruckId") ?? "") || undefined,
      hireDate: String(fd.get("hireDate") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/drivers/${result.id}`);
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
        title="Identity"
        description="Personal details and dispatcher's default truck assignment."
        columns={2}
      >
        <FormField label="Full name" required className="sm:col-span-2">
          <Input name="fullName" required placeholder="Joseph Mwangi" />
        </FormField>
        <FormField label="Phone" required>
          <Input
            name="phone"
            required
            type="tel"
            placeholder="+254 722 410 220"
          />
        </FormField>
        <FormField label="National ID" required>
          <Input
            name="nationalId"
            required
            placeholder="21884401"
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Hire date" hint="OPTIONAL">
          <Input name="hireDate" type="date" />
        </FormField>
        <FormField
          label="Default truck"
          hint="OPTIONAL"
          helper="Shown on the driver card; can be reassigned at dispatch."
        >
          <Select name="defaultTruckId" defaultValue="">
            <option value="">— None —</option>
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
        title="Licence"
        description="NTSA driving licence and KMC medical certificate. The dashboard alerts you 30 days before either expires."
        columns={2}
      >
        <FormField label="Class" required>
          <Select name="licenceClass" defaultValue="CE">
            <option value="BCE">BCE</option>
            <option value="CD">CD</option>
            <option value="CE">CE</option>
            <option value="DE">DE</option>
          </Select>
        </FormField>
        <FormField label="Number" required>
          <Input
            name="licenceNumber"
            required
            placeholder="DL/CE/0009212"
            className="font-mono uppercase"
          />
        </FormField>
        <FormField label="Licence expiry">
          <Input name="licenceExpiry" type="date" />
        </FormField>
        <FormField label="Medical expiry">
          <Input name="medicalExpiry" type="date" />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Step 3"
        title="Cross-border"
        description="Passport + COMESA permit are required for trips crossing into Uganda, Rwanda, Burundi, DRC, or South Sudan."
        columns={2}
      >
        <FormField label="Passport number" hint="OPTIONAL">
          <Input
            name="passportNumber"
            placeholder="A8849921"
            className="font-mono uppercase"
          />
        </FormField>
        <FormField label="Passport expiry">
          <Input name="passportExpiry" type="date" />
        </FormField>
        <FormField
          label="COMESA driver permit expiry"
          className="sm:col-span-2"
          helper="Required to drive into the COMESA bloc."
        >
          <Input name="comesaDriverPermitExpiry" type="date" />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Optional"
        title="Notes"
        description="Anything that should stay on this driver's record — preferences, allergies, performance notes."
        columns={1}
      >
        <FormField label="Notes" hint="OPTIONAL">
          <Textarea name="notes" rows={3} placeholder="Optional notes…" />
        </FormField>
      </FormSection>

      <FormFooter
        meta={
          <span>
            Drivers default to active status and become immediately eligible for
            dispatch.
          </span>
        }
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setFormKey((k) => k + 1);
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
              Save driver
            </>
          )}
        </Button>
      </FormFooter>
    </form>
  );
}
