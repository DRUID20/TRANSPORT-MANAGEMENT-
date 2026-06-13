"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

/** Title-case a path segment ("job-descriptions" → "Job Descriptions"). */
function humanize(seg: string) {
  // Leave id-looking segments (uuids / numbers) as a short ref.
  if (/^[0-9a-f]{8}-/i.test(seg) || /^\d+$/.test(seg)) return seg.slice(0, 8);
  return seg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Topbar breadcrumb (DESIGN.md §7) — derived from the pathname. Each segment
 * links to its own level; the last is the current page (not a link).
 */
export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: humanize(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    last: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm md:flex">
      {crumbs.map((c) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1">
          {c.last ? (
            <span className="truncate font-medium text-fg-primary">{c.label}</span>
          ) : (
            <Link
              href={c.href}
              className="truncate text-fg-tertiary transition-colors hover:text-fg-secondary"
            >
              {c.label}
            </Link>
          )}
          {!c.last && <ChevronRight className="size-3.5 shrink-0 text-fg-tertiary/60" />}
        </span>
      ))}
    </nav>
  );
}
