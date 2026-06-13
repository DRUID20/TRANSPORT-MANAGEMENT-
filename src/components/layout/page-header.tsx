import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — canonical header at the top of every page.
 *
 * Visual rhythm: muted breadcrumb row, optional small eyebrow in
 * fg-tertiary (NOT brand-accent — eyebrow-on-every-page is the AI
 * tell the taste-skill warns about), 28px tight-tracking title,
 * a single-line description, right-aligned actions.
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
        "flex flex-col gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex flex-wrap items-center gap-0.5 text-[11px] text-fg-tertiary"
          >
            <Link
              href="/dashboard"
              aria-label="Dashboard"
              className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-fg-tertiary transition-colors hover:bg-bg-surface hover:text-fg-primary"
            >
              <Home className="size-3" />
            </Link>
            <ChevronRight className="size-3 text-fg-tertiary/50" />
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {b.href ? (
                  <Link
                    href={b.href}
                    className="rounded px-1 py-0.5 transition-colors hover:bg-bg-surface hover:text-fg-primary"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span className="px-1 py-0.5 text-fg-secondary">{b.label}</span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <ChevronRight className="size-3 text-fg-tertiary/50" />
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-tertiary">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-1 text-[24px] font-semibold leading-[1.15] tracking-[-0.012em] text-fg-primary sm:text-[26px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-3xl text-[13px] leading-snug text-fg-secondary">
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
