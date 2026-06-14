import { cn } from "@/lib/utils";

/**
 * NVL logo lockup — text-only fallback until the SVG arrives.
 * The deep navy NVL letters + "NILE VALLEY LOGISTICS" wordmark + a swoosh.
 * When the SVG is provided this component swaps to render it.
 */
export function Logo({
  className,
  variant = "horizontal",
  showWordmark = true,
  onDark = false,
}: {
  className?: string;
  variant?: "horizontal" | "icon";
  showWordmark?: boolean;
  /** Render the wordmark for a dark background (e.g. the black sidebar). */
  onDark?: boolean;
}) {
  if (variant === "icon") {
    return (
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-md bg-brand-navy text-white",
          className,
        )}
        aria-label="Nile Valley Logistics"
      >
        <span className="font-mono text-xs font-bold tracking-tight">NVL</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="Nile Valley Logistics">
      <div className="relative flex size-9 items-center justify-center overflow-hidden rounded-md bg-brand-navy">
        <span className="font-mono text-sm font-bold tracking-tight text-white">NVL</span>
        {/* Swoosh */}
        <svg
          className="absolute inset-0 h-full w-full text-brand-blue/70"
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 22 C 12 6, 24 6, 36 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "text-sm font-semibold tracking-tight",
              onDark ? "text-white" : "text-fg-primary",
            )}
          >
            Nile Valley
          </span>
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-[0.14em]",
              onDark ? "text-gold" : "text-brand-blue",
            )}
          >
            Logistics
          </span>
        </div>
      )}
    </div>
  );
}
