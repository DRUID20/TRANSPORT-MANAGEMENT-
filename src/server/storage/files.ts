/**
 * File storage — Supabase Storage backed.
 *
 * The app uses a private `documents` bucket for all uploaded files (trip docs,
 * HR compliance attachments, leave attachments, employee photos). Reads are
 * proxied through `/api/files/[...key]` so we can run our session + org checks
 * before the bytes are returned — no public URLs, no link-sharing without auth.
 *
 * Storage keys are namespaced by organisation:
 *   {orgId}/{namespace}/{uuid}.{ext}
 *
 * The Supabase admin client uses the service-role key (server-only) so writes
 * succeed without RLS policies on the bucket. The key MUST be set in the
 * `SUPABASE_SERVICE_ROLE_KEY` env var; if missing we throw a clear error rather
 * than failing later inside Storage.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const BUCKET = "documents";

/** 25 MB — matches the bucket's `file_size_limit`. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Whitelist of mime types we accept — matches the bucket policy too. */
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

let _admin: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. File uploads/downloads require the " +
        "service-role key. Add it in Vercel env vars (Supabase → Settings → API → " +
        "service_role). Never commit it.",
    );
  }
  _admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _admin;
}

/** Extension-safe slugified filename suffix, e.g. "trip-manifest.pdf" → ".pdf". */
function extOf(fileName: string): string {
  const m = fileName.match(/\.([a-zA-Z0-9]{1,8})$/);
  return m ? `.${m[1]!.toLowerCase()}` : "";
}

export interface UploadedFile {
  /** Storage path inside the bucket, e.g. `{orgId}/trip/{uuid}.pdf`. Persist this. */
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Upload a single file to the documents bucket. Caller has already verified
 * the user's session and org membership.
 *
 * @throws if the file exceeds MAX_FILE_BYTES or its mime type isn't allowed.
 */
export async function uploadFile(args: {
  orgId: string;
  namespace: "trip" | "employee" | "leave" | "compliance" | "profile" | "other";
  file: File;
}): Promise<UploadedFile> {
  const { orgId, namespace, file } = args;
  if (!file || file.size === 0) throw new Error("Empty file.");
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File exceeds the ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB limit.`);
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    throw new Error(`Unsupported file type: ${mime}`);
  }
  const key = `${orgId}/${namespace}/${randomUUID()}${extOf(file.name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin()
    .storage.from(BUCKET)
    .upload(key, bytes, {
      contentType: mime,
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return {
    storageKey: key,
    fileName: file.name,
    fileSize: file.size,
    mimeType: mime,
  };
}

/** Download a file's bytes + content-type. Caller must verify the storage key
 *  is org-owned (it begins with the user's orgId/) before calling. */
export async function downloadFile(
  storageKey: string,
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const { data, error } = await admin().storage.from(BUCKET).download(storageKey);
  if (error || !data) return null;
  const bytes = new Uint8Array(await data.arrayBuffer());
  return { bytes, mimeType: data.type || "application/octet-stream" };
}

/** Delete a file. No-op if it doesn't exist. */
export async function deleteFile(storageKey: string): Promise<void> {
  await admin().storage.from(BUCKET).remove([storageKey]);
}

/** Validate a storage key belongs to the caller's org. */
export function isKeyForOrg(storageKey: string, orgId: string): boolean {
  return storageKey.startsWith(`${orgId}/`);
}
