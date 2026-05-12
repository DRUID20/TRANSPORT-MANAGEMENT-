"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { createSubcontractor } from "@/server/actions/subcontractors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";

export function SubcontractorCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createSubcontractor({
      name: String(fd.get("name") ?? ""),
      contactPerson: String(fd.get("contactPerson") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? "") || undefined,
      kraPin: String(fd.get("kraPin") ?? "") || undefined,
      mpesaNumber: String(fd.get("mpesaNumber") ?? "") || undefined,
      bankName: String(fd.get("bankName") ?? "") || undefined,
      bankAccount: String(fd.get("bankAccount") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/subcontractors/${result.id}`);
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
        title="Identity & contact"
        description="Trading entity and primary contact. KRA PIN drives year-end withholding."
        columns={2}
      >
        <FormField label="Company / trading name" required className="sm:col-span-2">
          <Input name="name" required placeholder="Mwalimu Logistics Ltd" />
        </FormField>
        <FormField label="Contact person" required>
          <Input name="contactPerson" required placeholder="James Mwalimu" />
        </FormField>
        <FormField label="Phone" required>
          <Input name="phone" required type="tel" placeholder="+254 722 884 110" />
        </FormField>
        <FormField label="Email" hint="OPTIONAL">
          <Input name="email" type="email" placeholder="ops@example.co.ke" />
        </FormField>
        <FormField
          label="KRA PIN"
          hint="OPTIONAL"
          helper="Required for year-end tax / withholding."
        >
          <Input
            name="kraPin"
            placeholder="P051234567A"
            className="font-mono uppercase"
          />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Step 2"
        title="Settlement details"
        description="Where year-end payouts go. M-Pesa is fine for small operators; bank for the larger ones."
        columns={2}
      >
        <FormField label="M-Pesa number" hint="OPTIONAL">
          <Input name="mpesaNumber" placeholder="+254 722 884 110" />
        </FormField>
        <FormField label="Bank name" hint="OPTIONAL">
          <Input name="bankName" placeholder="Equity Bank" />
        </FormField>
        <FormField label="Bank account" hint="OPTIONAL" className="sm:col-span-2">
          <Input
            name="bankAccount"
            placeholder="0123456789"
            className="font-mono tnum"
          />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Optional"
        title="Notes"
        description="Background, lanes they specialise in, fleet size, dispatcher preferences."
        columns={1}
      >
        <FormField label="Notes" hint="OPTIONAL">
          <Textarea
            name="notes"
            rows={3}
            placeholder="e.g. 3 tankers · Mombasa-Nairobi corridor · prefers night dispatch"
          />
        </FormField>
      </FormSection>

      <FormFooter
        meta={
          <span>
            Subcontractors are immediately eligible to be linked from trucks
            and trailers.
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
              Save subcontractor
            </>
          )}
        </Button>
      </FormFooter>
    </form>
  );
}
