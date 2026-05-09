"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createCustomer } from "@/server/actions/customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function CustomerCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <Field label="Customer name" className="sm:col-span-2">
            <Input name="name" required placeholder="Saharan Trading Co." />
          </Field>
          <Field label="Contact person">
            <Input name="contactPerson" required placeholder="Yusuf Adan" />
          </Field>
          <Field label="Phone">
            <Input name="phone" required type="tel" placeholder="+254 711 220 008" />
          </Field>
          <Field label="Email" hint="Optional">
            <Input name="email" type="email" placeholder="ops@example.com" />
          </Field>
          <Field label="KRA PIN" hint="Optional">
            <Input name="kraPin" placeholder="P051441002A" className="font-mono uppercase" />
          </Field>
          <Field label="Billing address" hint="Optional" className="sm:col-span-2">
            <Input name="billingAddress" placeholder="Sameer Park, Mombasa Road, Nairobi" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Billing currency" hint="USD common for export shippers">
            <Select name="billingCurrency" defaultValue="KES">
              <option value="KES">KES</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field label="Payment terms (days)">
            <Input name="paymentTermsDays" type="number" min={0} max={180} defaultValue={30} className="font-mono tnum" />
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
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save Customer</>}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={"flex flex-col gap-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
      {hint && <span className="text-[11px] text-fg-tertiary">{hint}</span>}
    </div>
  );
}
