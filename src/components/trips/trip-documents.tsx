"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { reviewDocument, removeDocument, uploadDocument } from "@/server/actions/documents";
import {
  documentKindLabel,
  documentStages,
  type TripDocument,
  type TripDocumentKind,
} from "@/lib/types/documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DocumentStatusPill } from "@/components/trips/document-status-pill";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TripDocuments({
  tripId,
  documents,
}: {
  tripId: string;
  documents: TripDocument[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Group docs by status for the summary header
  const pendingCount = documents.filter((d) => d.status === "pending").length;
  const approvedCount = documents.filter((d) => d.status === "approved").length;
  const rejectedCount = documents.filter((d) => d.status === "rejected").length;

  // Upload form state
  const [kind, setKind] = useState<TripDocumentKind>("manifest");
  const [name, setName] = useState("");
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number; type: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [uploadedBy, setUploadedBy] = useState("Dispatcher");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    setFileMeta({ name: f.name, size: f.size, type: f.type || "application/octet-stream" });
    if (!name) setName(`${documentKindLabel[kind]} — ${f.name}`);
  }

  function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!fileMeta) {
      setError("Pick a file first.");
      return;
    }
    startTransition(async () => {
      const result = await uploadDocument({
        tripId,
        kind,
        name: name || `${documentKindLabel[kind]} — ${fileMeta.name}`,
        fileName: fileMeta.name,
        fileSize: fileMeta.size,
        mimeType: fileMeta.type,
        uploadedBy,
        notes: notes || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Reset form
      setName("");
      setFileMeta(null);
      setNotes("");
      const fileInput = document.getElementById("doc-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              Manifest, customs, weighbridge, POD — every paper for this trip.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] tnum">
            <span className="rounded-full bg-status-warning/10 px-2 py-0.5 text-status-warning ring-1 ring-status-warning/20">
              {pendingCount} pending
            </span>
            <span className="rounded-full bg-status-success/10 px-2 py-0.5 text-status-success ring-1 ring-status-success/20">
              {approvedCount} approved
            </span>
            {rejectedCount > 0 && (
              <span className="rounded-full bg-status-danger/10 px-2 py-0.5 text-status-danger ring-1 ring-status-danger/20">
                {rejectedCount} rejected
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}

        {/* Document list grouped by stage */}
        {documents.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-tertiary">
            No documents yet. Upload one below.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {documentStages.map((stage) => {
              const docs = documents.filter((d) => stage.kinds.includes(d.kind));
              if (docs.length === 0) return null;
              return (
                <div key={stage.label}>
                  <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.16em] text-fg-tertiary">
                    {stage.label}
                  </div>
                  <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-bg-base/40">
                    {docs.map((d) => (
                      <DocRow key={d.id} doc={d} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload form */}
        <form
          onSubmit={onUpload}
          className="rounded-md border border-dashed border-border bg-bg-base/40 p-4"
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-fg-primary">
            <Upload className="size-4 text-fg-tertiary" />
            Upload a document
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={kind}
                onChange={(e) => setKind(e.currentTarget.value as TripDocumentKind)}
              >
                {Object.entries(documentKindLabel).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Display name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder={`${documentKindLabel[kind]} — Mombasa`}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>File</Label>
              <Input
                id="doc-file"
                type="file"
                onChange={onFile}
                className="cursor-pointer file:mr-3 file:rounded-md file:border file:border-border file:bg-bg-elevated file:px-3 file:py-1 file:text-xs file:font-medium file:text-fg-primary"
              />
              {fileMeta && (
                <span className="font-mono text-[11px] text-fg-tertiary">
                  {fileMeta.name} · {formatBytes(fileMeta.size)} · {fileMeta.type || "unknown"}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Uploaded by</Label>
              <Input
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.currentTarget.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                rows={2}
                placeholder="Anything notable about this document"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end">
            <Button type="submit" disabled={pending || !fileMeta}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-fg-tertiary">
            Mock storage — Phase 2G + Supabase Storage will replace this with real
            file uploads. The metadata persists until the dev server restarts.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function DocRow({ doc }: { doc: TripDocument }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const isImage = doc.mimeType.startsWith("image/");

  function approve() {
    startTransition(async () => {
      await reviewDocument({
        documentId: doc.id,
        approve: true,
        reviewedBy: "Manager",
      });
      router.refresh();
    });
  }

  function reject() {
    if (!reason) {
      setShowReject(true);
      return;
    }
    startTransition(async () => {
      await reviewDocument({
        documentId: doc.id,
        approve: false,
        reason,
        reviewedBy: "Manager",
      });
      setShowReject(false);
      setReason("");
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await removeDocument(doc.id);
      router.refresh();
    });
  }

  return (
    <li className={cn("flex flex-col gap-2 p-3 transition-colors hover:bg-bg-base/40")}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-bg-base text-fg-tertiary ring-1 ring-border">
          {isImage ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium text-fg-primary">{doc.name}</span>
            <span className="rounded-md bg-bg-base px-1.5 py-0.5 font-mono text-[10px] text-fg-secondary ring-1 ring-border">
              {documentKindLabel[doc.kind]}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[11px] tnum text-fg-tertiary">
            {doc.fileName} · {formatBytes(doc.fileSize)}
            <span>·</span>
            <span>
              uploaded by {doc.uploadedBy} ·{" "}
              {new Date(doc.uploadedAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {doc.reviewedAt && (
            <div className="mt-0.5 font-mono text-[11px] tnum text-fg-tertiary">
              reviewed by {doc.reviewedBy} ·{" "}
              {new Date(doc.reviewedAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
          {doc.rejectionReason && (
            <div className="mt-1 rounded-md bg-status-danger/10 px-2 py-1 text-xs text-status-danger ring-1 ring-status-danger/20">
              Rejected: {doc.rejectionReason}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <DocumentStatusPill status={doc.status} />
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {doc.storageKey && (
          <Button variant="ghost" size="sm" disabled>
            <ExternalLink className="size-3.5" />
            View
          </Button>
        )}
        {doc.status === "pending" && (
          <>
            <Button variant="success" size="sm" onClick={approve} disabled={pending}>
              <CheckCircle2 className="size-3.5" />
              Approve
            </Button>
            <Button variant="outline" size="sm" onClick={reject} disabled={pending}>
              <XCircle className="size-3.5" />
              Reject
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={remove}
          disabled={pending}
          className="ml-auto text-fg-tertiary hover:text-status-danger"
          aria-label="Remove document"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {showReject && doc.status === "pending" && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3">
          <Label className="text-status-danger">Rejection reason</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
              placeholder="Blurry photo / wrong document / etc."
              className="flex-1"
            />
            <Button variant="danger" size="sm" onClick={reject} disabled={pending || !reason}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Reject"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
