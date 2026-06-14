"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck } from "lucide-react";
import { createComplianceRecord } from "@/server/actions/hr-compliance";
import { KIND_LABELS, type ComplianceKind } from "@/lib/types/hr-compliance";
import { Button } from "@/components/ui/button";
import { FileUpload, type UploadedAttachment } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

/**
 * Add a compliance record (driving licence, medical, passport, HazMat, …) to
 * an employee — with a real file attachment uploaded to Supabase Storage.
 * Renders as a "+ Add document" button on the employee profile that opens a
 * modal with the form.
 */
export function AddComplianceForm({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<ComplianceKind>("driving_licence");
  const [label, setLabel] = useState("");
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [attachment, setAttachment] = useState<UploadedAttachment | null>(null);
  const [notes, setNotes] = useState("");

  function reset() {
    setKind("driving_licence");
    setLabel("");
    setNumber("");
    setIssueDate("");
    setExpiryDate("");
    setIssuingAuthority("");
    setAttachment(null);
    setNotes("");
    setError(null);
  }

  function onSubmit() {
    setError(null);
    start(async () => {
      const result = await createComplianceRecord({
        employeeId,
        kind,
        label: label || undefined,
        number: number || undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
        issuingAuthority: issuingAuthority || undefined,
        attachmentUrl: attachment?.storageKey,
        notes: notes || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Compliance record added", {
        description: `${KIND_LABELS[kind]}${number ? ` · ${number}` : ""}`,
      });
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" /> Add document
      </Button>

      <Modal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
        title="Add compliance document"
        description="Upload the certificate or licence and capture its details. Stored privately in Supabase Storage; only authorised users can view it."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={pending}>
              <ShieldCheck className="size-3.5" />
              {pending ? "Saving…" : "Save record"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Document type</Label>
            <Select value={kind} onChange={(e) => setKind(e.currentTarget.value as ComplianceKind)}>
              {(Object.keys(KIND_LABELS) as ComplianceKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Number / reference</Label>
            <Input
              value={number}
              onChange={(e) => setNumber(e.currentTarget.value)}
              placeholder="e.g. DL-2026-001"
              className="font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Issuing authority</Label>
            <Input
              value={issuingAuthority}
              onChange={(e) => setIssuingAuthority(e.currentTarget.value)}
              placeholder="e.g. NTSA, EPRA, KMTC"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Issue date</Label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.currentTarget.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Expiry date</Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.currentTarget.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
              placeholder={`e.g. "Class CE — heavy commercial"`}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Attachment</Label>
            <FileUpload
              namespace="compliance"
              value={attachment}
              onUploaded={setAttachment}
              onCleared={() => setAttachment(null)}
              hint="PDF or photo of the certificate. Max 25 MB."
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              rows={2}
              placeholder="Anything noteworthy — endorsements, restrictions, renewal context"
            />
          </div>

          {error && (
            <div className="sm:col-span-2 rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
              {error}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
