"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createDriver } from "@/server/actions/drivers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type T = { id: string; registration: string };

export function DriverCreateForm({ trucks }: { trucks: T[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      licenceClass: String(fd.get("licenceClass") ?? "CE") as "BCE" | "CD" | "CE" | "DE",
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
          <Field label="Full name" className="sm:col-span-2">
            <Input name="fullName" required placeholder="Joseph Mwangi" />
          </Field>
          <Field label="Phone">
            <Input name="phone" required type="tel" placeholder="+254 722 410 220" />
          </Field>
          <Field label="National ID">
            <Input name="nationalId" required placeholder="21884401" className="font-mono tnum" />
          </Field>
          <Field label="Hire date" hint="Optional">
            <Input name="hireDate" type="date" />
          </Field>
          <Field label="Default truck" hint="Optional">
            <Select name="defaultTruckId" defaultValue="">
              <option value="">— None —</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>{t.registration}</option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Licence</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Class">
            <Select name="licenceClass" defaultValue="CE">
              <option value="BCE">BCE</option>
              <option value="CD">CD</option>
              <option value="CE">CE</option>
              <option value="DE">DE</option>
            </Select>
          </Field>
          <Field label="Number">
            <Input name="licenceNumber" required placeholder="DL/CE/0009212" className="font-mono uppercase" />
          </Field>
          <Field label="Licence expiry">
            <Input name="licenceExpiry" type="date" />
          </Field>
          <Field label="Medical expiry">
            <Input name="medicalExpiry" type="date" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cross-border</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Passport number">
            <Input name="passportNumber" placeholder="A8849921" className="font-mono uppercase" />
          </Field>
          <Field label="Passport expiry">
            <Input name="passportExpiry" type="date" />
          </Field>
          <Field label="COMESA driver permit expiry" className="sm:col-span-2">
            <Input name="comesaDriverPermitExpiry" type="date" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={3} placeholder="Optional notes…" />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save Driver</>}
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
