/**
 * GET /api/files/[...key] — auth-proxied download of a stored file.
 *
 * The URL-encoded storage key is the catch-all path. We verify the caller is
 * signed in, that the key belongs to their organisation (cross-org access is
 * rejected without ever opening the file), then stream the bytes back with the
 * stored content-type. No public URLs ever leave the server.
 */
import { NextResponse } from "next/server";
import { requireOrgId } from "@/server/auth/current-org";
import { downloadFile, isKeyForOrg } from "@/server/storage/files";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { key } = await params;
  const storageKey = key.map(decodeURIComponent).join("/");

  // Org-isolation: storage keys are namespaced `{orgId}/...`.
  if (!isKeyForOrg(storageKey, orgId)) {
    // Identical to "not found" so we don't leak whether a key exists.
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await downloadFile(storageKey);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(file.bytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      // Inline so PDFs / images preview in the browser; downloads still work
      // via the browser's "Save as…" — the caller can pass ?download=1 if they
      // need to force a Save dialog later.
      "Content-Disposition": "inline",
      // Storage keys embed a fresh UUID per upload, so the bytes behind a key
      // never change — let the browser keep them (private: per-user only).
      // Saves a server + Storage round-trip for e.g. the sidebar avatar on
      // every page load.
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
