"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createEmployee } from "@/server/actions/hr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Dept = { id: string; name: string; code: string };
type Mgr = { id: string; name: string };
type DrvOpt = { id: string; name: string };

export function EmployeeCreateForm({
  nextNumber,
  departments,
  managers,
  unlinkedDrivers,
}: {
  nextNumber: string;
  departments: Dept[];
  managers: Mgr[];
  unlinkedDrivers: DrvOpt[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeNumber, setEmployeeNumber] = useState(nextNumber);
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [dob, setDob] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [nssfNo, setNssfNo] = useState("");
  const [shaNo, setShaNo] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [email, setEmail] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"active" | "probation">("probation");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [jobTitle, setJobTitle] = useState("");
  const [lineManagerId, setLineManagerId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createEmployee({
      employeeNumber,
      fullName,
      preferredName: preferredName || undefined,
      gender: gender || undefined,
      dob: dob || undefined,
      nationalId,
      kraPin: kraPin || undefined,
      nssfNo: nssfNo || undefined,
      shaNo: shaNo || undefined,
      mpesaPhone,
      alternatePhone: alternatePhone || undefined,
      email: email || undefined,
      physicalAddress: physicalAddress || undefined,
      emergencyContactName: emergencyContactName || undefined,
      emergencyContactRelationship: emergencyContactRelationship || undefined,
      emergencyContactPhone: emergencyContactPhone || undefined,
      bankName: bankName || undefined,
      bankBranch: bankBranch || undefined,
      bankAccountNo: bankAccountNo || undefined,
      bankAccountName: bankAccountName || undefined,
      hireDate,
      status,
      departmentId,
      jobTitle,
      lineManagerId: lineManagerId || undefined,
      driverId: driverId || undefined,
      notes: notes || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/hr/employees/${result.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee number">
            <Input
              required
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.currentTarget.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Hire date">
            <Input
              type="date"
              required
              value={hireDate}
              onChange={(e) => setHireDate(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Full name" className="sm:col-span-2">
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.currentTarget.value)}
              placeholder="Mary Wanjiku Kamau"
            />
          </Field>
          <Field label="Preferred name (optional)">
            <Input
              value={preferredName}
              onChange={(e) => setPreferredName(e.currentTarget.value)}
              placeholder="Mary"
            />
          </Field>
          <Field label="Gender">
            <Select value={gender} onChange={(e) => setGender(e.currentTarget.value as typeof gender)}>
              <option value="">— Select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Date of birth">
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="National ID">
            <Input
              required
              value={nationalId}
              onChange={(e) => setNationalId(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="KRA PIN">
            <Input
              value={kraPin}
              onChange={(e) => setKraPin(e.currentTarget.value)}
              className="font-mono"
              placeholder="A001234567Z"
            />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.currentTarget.value as typeof status)}>
              <option value="probation">Probation</option>
              <option value="active">Active</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Role</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Department">
            <Select
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.currentTarget.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Job title">
            <Input
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.currentTarget.value)}
              placeholder="Dispatcher"
            />
          </Field>
          <Field label="Line manager">
            <Select value={lineManagerId} onChange={(e) => setLineManagerId(e.currentTarget.value)}>
              <option value="">— None —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Linked driver record (if applicable)"
            hint="Link to an existing Driver record so trips inherit this employee."
          >
            <Select value={driverId} onChange={(e) => setDriverId(e.currentTarget.value)}>
              <option value="">— None —</option>
              {unlinkedDrivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="M-Pesa phone (for payroll)">
            <Input
              required
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.currentTarget.value)}
              placeholder="+254 7xx xxx xxx"
              className="font-mono"
            />
          </Field>
          <Field label="Alternate phone">
            <Input
              value={alternatePhone}
              onChange={(e) => setAlternatePhone(e.currentTarget.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Email" className="sm:col-span-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="employee@nilevalley.co.ke"
            />
          </Field>
          <Field label="Physical address" className="sm:col-span-2">
            <Input
              value={physicalAddress}
              onChange={(e) => setPhysicalAddress(e.currentTarget.value)}
              placeholder="Estate, Town"
            />
          </Field>
          <Field label="Emergency contact name">
            <Input
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.currentTarget.value)}
            />
          </Field>
          <Field label="Relationship">
            <Input
              value={emergencyContactRelationship}
              onChange={(e) => setEmergencyContactRelationship(e.currentTarget.value)}
              placeholder="Spouse / Parent / Sibling"
            />
          </Field>
          <Field label="Emergency contact phone" className="sm:col-span-2">
            <Input
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.currentTarget.value)}
              className="font-mono"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Statutory & Bank</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="NSSF Number">
            <Input value={nssfNo} onChange={(e) => setNssfNo(e.currentTarget.value)} className="font-mono" />
          </Field>
          <Field label="SHA Number" hint="Replaces NHIF since 2024">
            <Input value={shaNo} onChange={(e) => setShaNo(e.currentTarget.value)} className="font-mono" />
          </Field>
          <Field label="Bank">
            <Input value={bankName} onChange={(e) => setBankName(e.currentTarget.value)} placeholder="Equity Bank" />
          </Field>
          <Field label="Branch">
            <Input value={bankBranch} onChange={(e) => setBankBranch(e.currentTarget.value)} />
          </Field>
          <Field label="Account number">
            <Input
              value={bankAccountNo}
              onChange={(e) => setBankAccountNo(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Account name">
            <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.currentTarget.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} rows={2} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading || !fullName || !nationalId}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Create Employee</>}
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
