"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { createCustomer } from "@/server/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";

export function CustomerCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createCustomer({
      name: String(fd.get("name") ?? ""),
      contactPerson: String(fd.get("contactPerson") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? "") || undefined,
      kraPin: String(fd.get("kraPin") ?? "") || undefined,
      billingAddress: String(fd.get("billingAddress") ?? "") || undefined,
      billingCurrency: String(fd.get("billingCurrency") ?? "KES") as "KES" | "USD",
      paymentTermsDays: Number(fd.get("paymentTermsDays") ?? 30),
      notes: String(fd.get("notes") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/customers/${result.id}`);
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
        description="Company name + primary contact. Used on invoices, dispatch notes, and customer-facing emails."
        columns={2}
      >
        <FormField label="Customer name" required className="sm:col-span-2">
          <Input name="name" required placeholder="Saharan Trading Co." />
        </FormField>
        <FormField label="Contact person" required>
          <Input name="contactPerson" required placeholder="Yusuf Adan" />
        </FormField>
        <FormField label="Phone" required>
          <Input name="phone" required type="tel" placeholder="+254 711 220 008" />
        </FormField>
        <FormField label="Email" hint="OPTIONAL">
          <Input name="email" type="email" placeholder="ops@example.com" />
        </FormField>
        <FormField label="KRA PIN" hint="OPTIONAL">
          <Input
            name="kraPin"
            placeholder="P051441002A"
            className="font-mono uppercase"
          />
        </FormField>
        <FormField
          label="Billing address"
          hint="OPTIONAL"
          className="sm:col-span-2"
          helper="Printed on every invoice issued to this customer."
        >
          <Input
            name="billingAddress"
            placeholder="Sameer Park, Mombasa Road, Nairobi"
          />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Step 2"
        title="Billing"
        description="Currency drives the default on each booking. Payment terms set the invoice due date."
        columns={2}
      >
        <FormField
          label="Billing currency"
          required
          helper="USD is common for export shippers; KES for domestic."
        >
          <Select name="billingCurrency" defaultValue="KES">
            <option value="KES">KES — Kenyan Shilling</option>
            <option value="USD">USD — US Dollar</option>
          </Select>
        </FormField>
        <FormField label="Payment terms" required hint="DAYS">
          <Input
            name="paymentTermsDays"
            type="number"
            min={0}
            max={180}
            defaultValue={30}
            className="font-mono tnum"
          />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Optional"
        title="Notes"
        description="Anything that should stay on this customer's record — credit limit comments, dispatch preferences."
        columns={1}
      >
        <FormField label="Notes" hint="OPTIONAL">
          <Textarea
            name="notes"
            rows={3}
            placeholder="e.g. Prefers SMS dispatch updates · Net-30 strict"
          />
        </FormField>
      </FormSection>

      <FormFooter
        meta={
          <span>
            New customers are immediately eligible for bookings and invoicing.
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
              Save customer
            </>
          )}
        </Button>
      </FormFooter>
    </form>
  );
}
