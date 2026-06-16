/**
 * POST /api/files/upload — multipart upload to the documents bucket.
 *
 * Body: multipart/form-data with a `file` field and a `namespace` field
 * (`trip` | `employee` | `leave` | `compliance` | `other`).
 *
 * Response: { storageKey, fileName, fileSize, mimeType }
 *
 * The client uploads here, gets the storage key back, then includes that key
 * in the create/update action of the consuming entity (trip document,
 * compliance record, employee photo, etc.). Files are persisted to Supabase
 * Storage; the key is the only thing stored in our domain tables.
 */
import { NextResponse } from "next/server";
import { requireOrgId } from "@/server/auth/current-org";
import { uploadFile } from "@/server/storage/files";

// Supabase upload needs Buffer/streams — pin to Node runtime.
export const runtime = "nodejs";

const NAMESPACES = new Set(["trip", "employee", "leave", "compliance", "profile", "other"]);

export async function POST(req: Request) {
  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  const ns = String(form.get("namespace") ?? "other");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing `file` field." }, { status: 400 });
  }
  if (!NAMESPACES.has(ns)) {
    return NextResponse.json({ ok: false, error: `Unknown namespace: ${ns}` }, { status: 400 });
  }

  try {
    const result = await uploadFile({
      orgId,
      namespace: ns as "trip" | "employee" | "leave" | "compliance" | "profile" | "other",
      file,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
