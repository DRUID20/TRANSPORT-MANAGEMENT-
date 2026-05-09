"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createRate } from "@/server/actions/rates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Cus = { id: string; name: string };

export function RateCreateForm({ customers }: { customers: Cus[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createRate({
      origin: String(fd.get("origin") ?? ""),
      destination: String(fd.get("destination") ?? ""),
      customerId: String(fd.get("customerId") ?? "") || undefined,
      cargoClass: String(fd.get("cargoClass") ?? "") || undefined,
      basis: String(fd.get("basis") ?? "per_tonne") as never,
      amount: Number(fd.get("amount") ?? 0),
      currency: String(fd.get("currency") ?? "USD") as never,
      notes: String(fd.get("notes") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/rates");
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
          <CardTitle>Route</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Origin">
            <Input name="origin" required placeholder="Mombasa" />
          </Field>
          <Field label="Destination">
            <Input name="destination" required placeholder="Kampala" />
          </Field>
          <Field label="Customer (optional)" hint="Leave blank for default rate" className="sm:col-span-2">
            <Select name="customerId" defaultValue="">
              <option value="">— Default (any customer) —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cargo class (optional)" hint="e.g. general, containerised, fuel" className="sm:col-span-2">
            <Input name="cargoClass" placeholder="general" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Basis">
            <Select name="basis" defaultValue="per_tonne">
              <option value="per_tonne">Per tonne</option>
              <option value="per_container">Per container</option>
              <option value="per_trip">Per trip</option>
              <option value="per_km">Per km</option>
            </Select>
          </Field>
          <Field label="Amount">
            <Input name="amount" type="number" required min={0} step="0.01" placeholder="95" className="font-mono tnum" />
          </Field>
          <Field label="Currency">
            <Select name="currency" defaultValue="USD">
              <option value="USD">USD</option>
              <option value="KES">KES</option>
              <option value="UGX">UGX</option>
              <option value="TZS">TZS</option>
              <option value="RWF">RWF</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent><Textarea name="notes" rows={3} /></CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save Rate</>}
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
