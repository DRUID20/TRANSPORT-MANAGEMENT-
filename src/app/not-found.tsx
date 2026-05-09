import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-6">
      <div className="max-w-md text-center">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-fg-tertiary">
          Error 404
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg-primary">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-fg-secondary">
          The page you're looking for doesn't exist or has moved.
        </p>
        <div className="mt-5">
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
