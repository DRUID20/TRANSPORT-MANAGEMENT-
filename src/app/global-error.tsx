"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

/**
 * Root error boundary — fires when the root layout itself throws (RootLayout
 * fonts/providers, middleware, theme provider, etc.). Replaces the entire
 * html tree, so it must include its own <html> and <body>.
 *
 * For errors INSIDE the authenticated app shell, the route-scoped
 * `(app)/error.tsx` runs instead and keeps the sidebar + ⌘K palette visible.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: wire Sentry.captureException(error) once Sentry is installed.
    console.error("[tx-system] uncaught root error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0A0E14",
          color: "#EDF1F7",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="surface-card flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-status-danger/12 text-status-danger">
              <AlertTriangle className="size-6" strokeWidth={1.75} />
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-status-danger">
              Error 500
            </div>
            <h1 className="text-[20px] font-semibold tracking-tight text-fg-primary">
              Something broke
            </h1>
            <p className="max-w-sm text-sm text-fg-secondary">
              We&apos;ve logged the error. Try again, or refresh the page. Quote
              the reference below to support if it keeps happening.
            </p>
            {error.digest && (
              <div className="inline-flex items-center gap-2 rounded-md bg-bg-elevated px-2.5 py-1 font-mono text-[11px] text-fg-tertiary">
                ref <span className="text-fg-secondary">{error.digest}</span>
              </div>
            )}
            <div className="mt-1">
              <Button onClick={reset}>
                <RefreshCw className="size-3.5" /> Try again
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
