"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-scoped error boundary for everything under `(app)/`.
 *
 * Unlike `global-error.tsx` (which replaces the whole html tree), this one
 * renders INSIDE the AppShell — the sidebar, breadcrumb, and ⌘K palette
 * stay visible so the operator can navigate away rather than refreshing
 * the world. The matching layout for this segment is the AppShell itself.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] uncaught route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="surface-card flex w-full max-w-md flex-col items-center gap-4 p-8">
        <div className="grid size-12 place-items-center rounded-full bg-status-danger/12 text-status-danger">
          <AlertTriangle className="size-6" strokeWidth={1.75} />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-status-danger">
          Error 500
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight text-fg-primary">
          Something didn&apos;t load
        </h1>
        <p className="max-w-sm text-sm text-fg-secondary">
          We&apos;ve logged the issue. Try again, or head back to the dashboard.
          If it keeps happening, quote the reference below to support.
        </p>

        {error.digest && (
          <div className="inline-flex items-center gap-2 rounded-md bg-bg-elevated px-2.5 py-1 font-mono text-[11px] text-fg-tertiary">
            ref <span className="text-fg-secondary">{error.digest}</span>
          </div>
        )}

        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset}>
            <RefreshCw className="size-3.5" /> Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard">
              <ArrowLeft className="size-3.5" /> Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
