"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { createSupplier } from "@/server/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";

export function SupplierCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createSupplier({
      name: String(fd.get("name") ?? ""),
      contactPerson: String(fd.get("contactPerson") ?? "") || undefined,
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? "") || undefined,
      kraPin: String(fd.get("kraPin") ?? "") || undefined,
      paymentTerms: String(fd.get("paymentTerms") ?? "net_30") as never,
      defaultPaymentMethod: String(
        fd.get("defaultPaymentMethod") ?? "mpesa",
      ) as never,
      mpesaNumber: String(fd.get("mpesaNumber") ?? "") || undefined,
      bankName: String(fd.get("bankName") ?? "") || undefined,
      bankAccount: String(fd.get("bankAccount") ?? "") || undefined,
      defaultExpenseCategory:
        String(fd.get("defaultExpenseCategory") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/suppliers/${result.id}`);
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
        description="Trading entity and primary contact. Default expense category pre-fills bills issued against this supplier."
        columns={2}
      >
        <FormField label="Supplier name" required className="sm:col-span-2">
          <Input name="name" required placeholder="Bandari Motors Spares" />
        </FormField>
        <FormField label="Contact person" hint="OPTIONAL">
          <Input name="contactPerson" placeholder="Ravi Patel" />
        </FormField>
        <FormField label="Phone" required>
          <Input
            name="phone"
            required
            type="tel"
            placeholder="+254 722 110 880"
          />
        </FormField>
        <FormField label="Email" hint="OPTIONAL">
          <Input name="email" type="email" placeholder="sales@example.co.ke" />
        </FormField>
        <FormField label="KRA PIN" hint="OPTIONAL">
          <Input
            name="kraPin"
            placeholder="P051234567A"
            className="font-mono uppercase"
          />
        </FormField>
        <FormField
          label="Default expense category"
          hint="OPTIONAL"
          helper="Free-text for now; chart-of-accounts linked in a later phase."
          className="sm:col-span-2"
        >
          <Input
            name="defaultExpenseCategory"
            placeholder="e.g. Spare parts & consumables"
          />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Step 2"
        title="Payment"
        description="Payment terms drive the AP due date; default method is the channel you usually pay this supplier through."
        columns={2}
      >
        <FormField label="Payment terms" required>
          <Select name="paymentTerms" defaultValue="net_30">
            <option value="cash_on_delivery">Cash on delivery</option>
            <option value="net_7">Net 7</option>
            <option value="net_14">Net 14</option>
            <option value="net_30">Net 30</option>
            <option value="net_60">Net 60</option>
          </Select>
        </FormField>
        <FormField label="Default method" required>
          <Select name="defaultPaymentMethod" defaultValue="mpesa">
            <option value="mpesa">M-Pesa</option>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
          </Select>
        </FormField>
        <FormField label="M-Pesa number" hint="OPTIONAL">
          <Input name="mpesaNumber" placeholder="+254 722 110 880" />
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
        description="Anything that should stay on this supplier's record."
        columns={1}
      >
        <FormField label="Notes" hint="OPTIONAL">
          <Textarea
            name="notes"
            rows={3}
            placeholder="e.g. Bulk-deal discounts on filters · slow on quotes"
          />
        </FormField>
      </FormSection>

      <FormFooter
        meta={
          <span>
            Suppliers can be referenced from bills and expenses immediately
            after saving.
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
              Save supplier
            </>
          )}
        </Button>
      </FormFooter>
    </form>
  );
}
