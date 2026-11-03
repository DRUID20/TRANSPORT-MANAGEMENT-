import Link from "next/link";
import { ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DataTable — Mercury/Fleetio-standard list shell (DESIGN.md §8).
 *
 * Compositional + data-agnostic: pages own their column logic in JSX (sort
 * URLs, filter chips, action menus) but delegate the visual frame to these
 * primitives so typography + density stay identical everywhere.
 *
 * Standard (Claude-style reading table): sentence-case 14px semibold header
 * on --bg-surface with a firm underline; 15px serif body rows with a 1px
 * bottom rule only (no zebra, no vertical rules); hover → soft wash; text
 * left, numbers RIGHT with tabular lining figures so columns align. Fonts
 * come from `.content-serif` (globals.css). Loading uses skeleton rows.
 */
export function DataTable({
  children,
  className,
  caption,
  density = "comfortable",
}: {
  children: React.ReactNode;
  className?: string;
  /** Optional footer caption, e.g. "1–25 of 312 trips · sorted by date". */
  caption?: React.ReactNode;
  density?: "comfortable" | "compact";
}) {
  return (
    <div className={cn("surface-card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full text-[15px] leading-[1.45]",
            density === "compact" && "[&_td]:py-2 [&_th]:py-2",
          )}
        >
          {children}
        </table>
      </div>
      {caption && (
        <div className="flex items-center justify-between gap-2 border-t border-border bg-bg-surface/50 px-5 py-3 text-[13px] tabular-nums text-fg-tertiary">
          {caption}
        </div>
      )}
    </div>
  );
}

export function DataTableHead({
  children,
  className,
  sticky = false,
}: {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <thead
      className={cn(
        // Sentence-case, semibold, full-contrast header — reads like a
        // Claude table rather than tiny shouted capitals.
        "border-b border-border-strong bg-bg-surface text-left text-[14px] font-semibold text-fg-primary",
        sticky && "sticky top-0 z-10",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function DataTableHeaderCell({
  children,
  className,
  align = "left",
  sortHref,
  sortActive = false,
  sortDir,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  /** When set, the header renders as a sort link with an arrow affordance. */
  sortHref?: string;
  sortActive?: boolean;
  sortDir?: "asc" | "desc";
}) {
  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  // ~44px header row: px-5 py-3 with 14px text.
  const inner = sortHref ? (
    <Link
      href={sortHref}
      className={cn(
        "inline-flex items-center gap-1 transition-colors hover:text-fg-secondary",
        align === "right" && "flex-row-reverse",
        sortActive && "text-brand-blue",
      )}
    >
      {children}
      {sortActive ? (
        sortDir === "asc" ? (
          <ChevronUp className="size-3" />
        ) : (
          <ChevronDown className="size-3" />
        )
      ) : (
        <ChevronsUpDown className="size-3 opacity-40" />
      )}
    </Link>
  ) : (
    children
  );

  return (
    <th className={cn("px-5 py-3 font-semibold", alignCls, className)} scope="col">
      {inner}
    </th>
  );
}

export function DataTableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Bottom borders only (no vertical rules, no zebra) — §8.
  return <tbody className={cn("divide-y divide-border", className)}>{children}</tbody>;
}

/**
 * Single data row. Pass `linkHref` to make the whole row a clickable link
 * with a hover affordance — the standard list pattern. (When `linkHref` is
 * set the row is rendered with a nested overlay link so any cell click
 * navigates, while inline controls in cells stay clickable.)
 */
export function DataTableRow({
  children,
  className,
  linkHref,
}: {
  children: React.ReactNode;
  className?: string;
  linkHref?: string;
}) {
  return (
    <tr
      className={cn(
        "group transition-colors duration-100 hover:bg-bg-surface/70",
        linkHref && "cursor-pointer",
        className,
      )}
      data-href={linkHref}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({
  children,
  className,
  align = "left",
  mono = false,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        // ~52px rows: px-5 py-3.5 with 15px text.
        "px-5 py-3.5 align-middle text-fg-primary",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "whitespace-nowrap font-mono tnum",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Inline link with a chevron — last column of a row when the row itself
 *  isn't a link. */
export function DataTableRowAction({
  href,
  label = "Open",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="font-ui inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-fg-tertiary transition-colors hover:bg-bg-elevated hover:text-fg-primary group-hover:text-brand-blue"
    >
      {label}
      <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Skeleton row — render N of these inside <DataTableBody> while data loads
 *  to keep the layout stable (never a lone spinner — §8). */
export function DataTableSkeletonRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <span
            className="skeleton block h-3 rounded"
            style={{ width: `${[70, 45, 60, 35, 55, 50][i % 6]}%` }}
          />
        </td>
      ))}
    </tr>
  );
}
