"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createSubcontractor } from "@/server/actions/subcontractors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SubcontractorCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identity & contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Company / Trading name" className="sm:col-span-2">
            <Input name="name" required placeholder="Mwalimu Logistics Ltd" />
          </Field>
          <Field label="Contact person">
            <Input name="contactPerson" required placeholder="James Mwalimu" />
          </Field>
          <Field label="Phone">
            <Input name="phone" required type="tel" placeholder="+254 722 884 110" />
          </Field>
          <Field label="Email" hint="Optional">
            <Input name="email" type="email" placeholder="ops@example.co.ke" />
          </Field>
          <Field label="KRA PIN" hint="For year-end tax / withholding">
            <Input name="kraPin" placeholder="P051234567A" className="font-mono uppercase" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settlement details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="M-Pesa number" hint="For year-end payouts">
            <Input name="mpesaNumber" placeholder="+254 722 884 110" />
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
          <Textarea name="notes" placeholder="Any background, lanes they specialise in, etc." rows={3} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
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
              Save Subcontractor
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
