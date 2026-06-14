import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-6">
      <div className="surface-card flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-brand-blue/12 text-brand-blue">
          <Compass className="size-6" strokeWidth={1.75} />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-tertiary">
          Error 404
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight text-fg-primary">
          Page not found
        </h1>
        <p className="max-w-sm text-sm text-fg-secondary">
          The page you&apos;re looking for doesn&apos;t exist or has moved. Check the
          URL, or jump back to the dashboard.
        </p>
        <div className="mt-1">
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-3.5" /> Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
