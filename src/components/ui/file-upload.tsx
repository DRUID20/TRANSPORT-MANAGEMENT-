"use client";

import { useCallback, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Single-file upload — dashed drop-zone (§6) with progress + filename preview.
 *
 * Workflow:
 *   1. User picks (or drops) a file.
 *   2. The component POSTs it to `/api/files/upload?namespace={ns}` as
 *      multipart FormData.
 *   3. On success the server returns the storage key + metadata; the
 *      component calls `onUploaded` with that payload so the caller can
 *      stash it in its own form state and submit it alongside the rest of
 *      the create/update action.
 *
 * The component is uncontrolled by default — once a file is uploaded the
 * caller is responsible for displaying its link. Pass `value={...}` for a
 * controlled mode (e.g. when editing an existing record that already has a
 * file attached).
 */

export interface UploadedAttachment {
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

const MAX_BYTES_DEFAULT = 25 * 1024 * 1024;
const DEFAULT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  return FileText;
}

export function FileUpload({
  namespace,
  value,
  onUploaded,
  onCleared,
  accept = DEFAULT_ACCEPT,
  maxBytes = MAX_BYTES_DEFAULT,
  label = "Attach a document",
  hint,
  disabled = false,
  className,
}: {
  namespace: "trip" | "employee" | "leave" | "compliance" | "other";
  value?: UploadedAttachment | null;
  onUploaded: (file: UploadedAttachment) => void;
  onCleared?: () => void;
  accept?: string;
  maxBytes?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > maxBytes) {
        setError(`File exceeds ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
        return;
      }
      const form = new FormData();
      form.set("file", file);
      form.set("namespace", namespace);
      setBusy(true);
      try {
        const res = await fetch("/api/files/upload", { method: "POST", body: form });
        const json = (await res.json()) as
          | { ok: true; storageKey: string; fileName: string; fileSize: number; mimeType: string }
          | { ok: false; error: string };
        if (!res.ok || !json.ok) {
          throw new Error("error" in json ? json.error : `Upload failed (${res.status})`);
        }
        onUploaded({
          storageKey: json.storageKey,
          fileName: json.fileName,
          fileSize: json.fileSize,
          mimeType: json.mimeType,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [maxBytes, namespace, onUploaded],
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  // Already uploaded — render the preview chip with a Clear button.
  if (value) {
    const Icon = iconFor(value.mimeType);
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-status-success/30 bg-status-success/5 p-3",
          className,
        )}
      >
        <div className="grid size-8 place-items-center rounded-md bg-status-success/15 text-status-success">
          <CheckCircle2 className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate text-[13px] font-medium text-fg-primary">
            <Icon className="size-3.5 shrink-0 text-fg-tertiary" />
            <span className="truncate">{value.fileName}</span>
          </div>
          <div className="font-mono text-[11px] text-fg-tertiary">
            {formatBytes(value.fileSize)} · {value.mimeType}
          </div>
        </div>
        {onCleared && (
          <button
            type="button"
            onClick={onCleared}
            className="grid size-7 place-items-center rounded-md text-fg-tertiary transition-colors hover:bg-bg-elevated-2 hover:text-fg-primary"
            aria-label="Remove file"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-bg-elevated/40 px-4 py-6 transition-colors",
          dragOver
            ? "border-brand-blue bg-brand-blue/5"
            : error
              ? "border-status-danger/50 bg-status-danger/[0.04]"
              : "border-border hover:border-border-strong hover:bg-bg-elevated/70",
          (disabled || busy) && "cursor-not-allowed opacity-70",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="size-5 animate-spin text-brand-blue" />
            <div className="text-xs text-fg-secondary">Uploading…</div>
          </>
        ) : (
          <>
            <Paperclip className="size-5 text-fg-tertiary" strokeWidth={1.75} />
            <div className="text-[13px] font-medium text-fg-primary">{label}</div>
            <div className="text-[11px] text-fg-tertiary">
              Drag &amp; drop, or click to browse · max {Math.round(maxBytes / 1024 / 1024)} MB
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onPick}
          disabled={disabled || busy}
          className="sr-only"
        />
      </label>
      {hint && !error && <div className="text-[11px] text-fg-tertiary">{hint}</div>}
      {error && <div className="text-[11px] font-medium text-status-danger">{error}</div>}
    </div>
  );
}
