"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createLeaveRequest } from "@/server/actions/leave";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload, type UploadedAttachment } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { workingDaysBetween } from "@/lib/types/leave";

type Emp = { id: string; name: string };

export function LeaveRequestForm({
  employees,
  preselectEmployeeId,
}: {
  employees: Emp[];
  preselectEmployeeId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState(preselectEmployeeId ?? "");
  const [leaveType, setLeaveType] = useState<
    "annual" | "sick" | "compassionate" | "maternity" | "paternity" | "study" | "unpaid"
  >("annual");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<UploadedAttachment | null>(null);
  const days = workingDaysBetween(startDate, endDate);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createLeaveRequest({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
      attachmentUrl: attachment?.storageKey,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/hr/leave/${result.id}`);
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
          <CardTitle>Request</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee" className="sm:col-span-2">
            <Select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.currentTarget.value)}
            >
              <option value="">— Select employee —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Leave type">
            <Select
              value={leaveType}
              onChange={(e) => setLeaveType(e.currentTarget.value as typeof leaveType)}
            >
              <option value="annual">Annual (21 d/yr)</option>
              <option value="sick">Sick (14 d/yr)</option>
              <option value="compassionate">Compassionate (5 d/yr)</option>
              <option value="maternity">Maternity (90 d)</option>
              <option value="paternity">Paternity (14 d)</option>
              <option value="study">Study</option>
              <option value="unpaid">Unpaid</option>
            </Select>
          </Field>
          <Field label="Working days">
            <Input
              readOnly
              value={`${days} day${days === 1 ? "" : "s"}`}
              className="bg-bg-base/40 font-mono tnum"
            />
          </Field>
          <Field label="Start date">
            <Input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Reason" className="sm:col-span-2">
            <Textarea
              required
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
              rows={3}
              placeholder="Brief reason for the leave."
            />
          </Field>
          <Field label="Supporting document (optional)" className="sm:col-span-2">
            <FileUpload
              namespace="leave"
              value={attachment}
              onUploaded={setAttachment}
              onCleared={() => setAttachment(null)}
              hint="Sick note, court summons, or other evidence. PDF or photo, max 25 MB."
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading || !employeeId || days <= 0}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Submitting…</> : <><Save className="size-4" />Submit Request</>}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"flex flex-col gap-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
