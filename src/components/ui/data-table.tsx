import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DataTable — a thin, premium presentation shell for list pages.
 *
 * The component is deliberately data-agnostic: pages compose their own
 * column logic in JSX (sort URLs, filter chips, action menus), but
 * delegate the visual frame — bordered card, sticky header, hover row,
 * row-link affordance, empty / loading states, footer caption — to this
 * primitive.
 *
 * Use <DataTable> as the outer wrapper. Inside, drop your <thead>/<tbody>
 * using the <DataTableHeaderCell> and <DataTableRow> / <DataTableCell>
 * helpers so the typography stays consistent. For rows that link to a
 * detail page, wrap the row content with <RowLink>.
 */
export function DataTable({
  children,
  className,
  caption,
  density = "comfortable",
}: {
  children: React.ReactNode;
  className?: string;
  /** Optional footer caption (e.g. "Showing 24 of 56 trips · sorted by date"). */
  caption?: React.ReactNode;
  density?: "comfortable" | "compact";
}) {
  return (
    <div className={cn("surface-card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full text-sm",
            density === "compact" && "[&_td]:py-2 [&_th]:py-2",
          )}
        >
          {children}
        </table>
      </div>
      {caption && (
        <div className="flex items-center justify-between gap-2 border-t border-border bg-bg-surface/40 px-5 py-2.5 text-xs text-fg-tertiary">
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
        "border-b border-border bg-bg-surface/60 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary",
        sticky && "sticky top-0 z-10 backdrop-blur",
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
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "px-5 py-3 font-semibold",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
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
  return <tbody className={cn("divide-y divide-border", className)}>{children}</tbody>;
}

/**
 * Single data row. Pass `linkHref` to make the entire row a clickable
 * link with a hover affordance — the standard pattern across list
 * pages.
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
        "group transition-colors",
        linkHref ? "hover:bg-brand-blue/[0.04]" : "hover:bg-bg-surface/40",
        className,
      )}
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
        "px-5 py-3 text-fg-primary align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "font-mono tnum",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Renders an inline link with a chevron — typically used in the last
 *  column of a row when the row itself isn't a link. */
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

/** Skeleton row — render N of these inside <DataTableBody> while
 *  data loads to keep the layout stable. */
export function DataTableSkeletonRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <span className="skeleton block h-3 w-3/4 rounded" />
        </td>
      ))}
    </tr>
  );
}
