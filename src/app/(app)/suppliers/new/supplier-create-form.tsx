"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createSupplier } from "@/server/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function SupplierCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      defaultPaymentMethod: String(fd.get("defaultPaymentMethod") ?? "mpesa") as never,
      mpesaNumber: String(fd.get("mpesaNumber") ?? "") || undefined,
      bankName: String(fd.get("bankName") ?? "") || undefined,
      bankAccount: String(fd.get("bankAccount") ?? "") || undefined,
      defaultExpenseCategory: String(fd.get("defaultExpenseCategory") ?? "") || undefined,
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
          <Field label="Supplier name" className="sm:col-span-2">
            <Input name="name" required placeholder="Bandari Motors Spares" />
          </Field>
          <Field label="Contact person" hint="Optional">
            <Input name="contactPerson" placeholder="Ravi Patel" />
          </Field>
          <Field label="Phone">
            <Input name="phone" required type="tel" placeholder="+254 722 110 880" />
          </Field>
          <Field label="Email" hint="Optional">
            <Input name="email" type="email" placeholder="sales@example.co.ke" />
          </Field>
          <Field label="KRA PIN">
            <Input name="kraPin" placeholder="P051234567A" className="font-mono uppercase" />
          </Field>
          <Field label="Default expense category" hint="Free-text for now; CoA-linked in Phase 5" className="sm:col-span-2">
            <Input name="defaultExpenseCategory" placeholder="e.g. Spare Parts & Consumables" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Payment terms">
            <Select name="paymentTerms" defaultValue="net_30">
              <option value="cash_on_delivery">Cash on delivery</option>
              <option value="net_7">Net 7</option>
              <option value="net_14">Net 14</option>
              <option value="net_30">Net 30</option>
              <option value="net_60">Net 60</option>
            </Select>
          </Field>
          <Field label="Default method">
            <Select name="defaultPaymentMethod" defaultValue="mpesa">
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </Select>
          </Field>
          <Field label="M-Pesa number" hint="Optional">
            <Input name="mpesaNumber" placeholder="+254 722 110 880" />
          </Field>
          <Field label="Bank name" hint="Optional">
            <Input name="bankName" placeholder="Equity Bank" />
          </Field>
          <Field label="Bank account" hint="Optional" className="sm:col-span-2">
            <Input name="bankAccount" placeholder="0123456789" className="font-mono tnum" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={3} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save Supplier</>}
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
