import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — the canonical header used at the top of every page.
 *
 * Visual hierarchy:
 *   breadcrumbs (xs, muted, home icon at root)
 *   eyebrow (uppercase, brand accent)
 *   title (28px semibold, tight tracking)
 *   description (sm, fg-secondary)
 *   actions (right-aligned, button-grouped)
 *
 * On mobile the layout stacks: title above, then actions wrap to a
 * full-width row so primary CTAs stay tappable.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex flex-wrap items-center gap-1 text-xs text-fg-tertiary"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-fg-tertiary transition-colors hover:bg-bg-elevated hover:text-fg-primary"
              aria-label="Dashboard"
            >
              <Home className="size-3" />
            </Link>
            <ChevronRight className="size-3 text-fg-tertiary/60" />
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {b.href ? (
                  <Link
                    href={b.href}
                    className="rounded px-1 py-0.5 transition-colors hover:bg-bg-elevated hover:text-fg-primary"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-fg-primary">{b.label}</span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <ChevronRight className="size-3 text-fg-tertiary/60" />
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-blue">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-tight text-fg-primary sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-fg-secondary">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
