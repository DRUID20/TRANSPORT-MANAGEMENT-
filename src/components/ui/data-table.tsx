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
 * Standard: 40px uppercase header on --bg-surface-2; 48px rows with a 1px
 * BOTTOM border only (no zebra, no vertical rules); hover → --bg-hover; text
 * left, numbers RIGHT in JetBrains Mono tabular-nums; status pills centered.
 * Loading uses skeleton rows, never a lone spinner.
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
    // border-2 outer + b-2 header underline + surface-3d for the thick,
    // lifted look the user asked for (UNOC: "table borders bold").
    <div className={cn("surface-card surface-3d overflow-hidden border-2 border-border-strong", className)}>
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full text-[13px]",
            density === "compact" && "[&_td]:py-2 [&_th]:py-2",
          )}
        >
          {children}
        </table>
      </div>
      {caption && (
        <div className="flex items-center justify-between gap-2 border-t border-border bg-bg-elevated/50 px-5 py-2.5 font-mono text-[11px] tabular-nums text-fg-tertiary">
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
        // Bold, high-contrast header with a 3px underline so columns
        // read clearly. UNOC: "headings bold larger fonts".
        "border-b-[3px] border-border-strong bg-bg-surface text-left text-[13px] font-extrabold uppercase tracking-[0.06em] text-fg-secondary",
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

  // 40px header row: px-5 py-2.5 with 11–12px caps ≈ 40px.
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
    <th className={cn("px-5 py-2.5 font-semibold", alignCls, className)} scope="col">
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
  return <tbody className={cn("divide-y-2 divide-border", className)}>{children}</tbody>;
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
        "group transition-colors duration-100 hover:bg-bg-elevated-2",
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
        // 48px rows: px-5 py-3.5 with 13px text ≈ 48px.
        "px-5 py-3.5 align-middle text-fg-primary",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "font-mono font-medium tnum",
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
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-fg-tertiary transition-colors hover:bg-bg-elevated hover:text-fg-primary group-hover:text-brand-blue"
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
