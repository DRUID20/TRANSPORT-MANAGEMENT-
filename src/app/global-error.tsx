"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO (Phase 0.5): Sentry.captureException(error)
    console.error("[tx-system] Uncaught error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-bg-base p-6">
          <div className="max-w-md text-center">
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-status-danger">
              Error 500
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg-primary">
              Something broke
            </h1>
            <p className="mt-2 text-sm text-fg-secondary">
              We've recorded the error. Try again, or refresh the page.
            </p>
            {error.digest && (
              <div className="mt-3 inline-block rounded-md bg-bg-elevated px-2.5 py-1 font-mono text-[11px] text-fg-tertiary">
                ref: {error.digest}
              </div>
            )}
            <div className="mt-5">
              <Button onClick={reset}>Try again</Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
