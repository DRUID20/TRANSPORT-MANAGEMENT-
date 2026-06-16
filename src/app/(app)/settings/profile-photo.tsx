"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Loader2, Trash2, User } from "lucide-react";
import { clearMyProfilePhoto, setMyProfilePhoto } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";

/**
 * Profile-photo uploader. Local preview before upload, server-side validation
 * for image MIME + 5 MB cap, and an explicit "Remove" so the avatar falls
 * back to initials.
 */
export function ProfilePhoto({
  initials,
  initialUrl,
}: {
  initials: string;
  initialUrl?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(initialUrl);

  function flash() {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Profile photo must be an image (JPG, PNG or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be 5 MB or smaller.");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    const form = new FormData();
    form.set("file", file);
    start(async () => {
      const r = await setMyProfilePhoto(form);
      if (!r.ok) {
        setError(r.error);
        setPreview(initialUrl);
        return;
      }
      flash();
      router.refresh();
    });
  }

  function onRemove() {
    setError(null);
    start(async () => {
      const r = await clearMyProfilePhoto();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPreview(undefined);
      flash();
      router.refresh();
    });
  }

  return (
    <FormSection
      eyebrow="Personal"
      title="Profile photo"
      description="Shown in the sidebar and anywhere your name appears. JPG, PNG or WebP, up to 5 MB."
      columns={1}
    >
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm font-medium text-status-danger">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-5">
        <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-bg-elevated">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Profile photo" className="size-full object-cover" />
          ) : initials ? (
            <span className="font-mono text-base font-bold tracking-tight text-fg-secondary">{initials}</span>
          ) : (
            <User className="size-8 text-fg-tertiary" />
          )}
          {pending && (
            <div className="absolute inset-0 grid place-items-center bg-bg-base/70 backdrop-blur-sm">
              <Loader2 className="size-5 animate-spin text-fg-secondary" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onPick}
          />
          <Button type="button" variant="primary" disabled={pending} onClick={() => inputRef.current?.click()}>
            <Camera className="size-4" />
            {preview ? "Replace photo" : "Upload photo"}
          </Button>
          {preview && (
            <Button type="button" variant="outline" disabled={pending} onClick={onRemove}>
              <Trash2 className="size-4" />
              Remove
            </Button>
          )}
          {savedFlash && (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-status-success">
              <CheckCircle2 className="size-3.5" />
              Saved
            </span>
          )}
        </div>
      </div>
    </FormSection>
  );
}
