import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Server-rendered paginator strip. Caller provides the current page (1-based),
 * total row count, page size, and a function that builds the href for an
 * arbitrary page (so query params other than `page` are preserved). The strip
 * shows "N of M shown" plus prev/next + a couple of numbered pages on each side.
 */
export function Paginator({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (p: number) => string;
}) {
  if (total <= pageSize) return null;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(lastPage, page + 2); p++) pages.push(p);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg-surface px-4 py-3 text-xs"
    >
      <span className="text-fg-tertiary">
        Showing <span className="font-mono tnum font-semibold text-fg-secondary">{from.toLocaleString()}</span>–
        <span className="font-mono tnum font-semibold text-fg-secondary">{to.toLocaleString()}</span> of{" "}
        <span className="font-mono tnum font-semibold text-fg-secondary">{total.toLocaleString()}</span>
      </span>
      <div className="flex items-center gap-1">
        <PageLink href={page > 1 ? hrefFor(page - 1) : undefined} aria-label="Previous">
          <ChevronLeft className="size-3.5" />
        </PageLink>
        {pages[0]! > 1 && (
          <>
            <PageLink href={hrefFor(1)}>1</PageLink>
            {pages[0]! > 2 && <span className="px-1 text-fg-tertiary">…</span>}
          </>
        )}
        {pages.map((p) => (
          <PageLink key={p} href={p === page ? undefined : hrefFor(p)} current={p === page}>
            {p}
          </PageLink>
        ))}
        {pages[pages.length - 1]! < lastPage && (
          <>
            {pages[pages.length - 1]! < lastPage - 1 && <span className="px-1 text-fg-tertiary">…</span>}
            <PageLink href={hrefFor(lastPage)}>{lastPage}</PageLink>
          </>
        )}
        <PageLink href={page < lastPage ? hrefFor(page + 1) : undefined} aria-label="Next">
          <ChevronRight className="size-3.5" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  current,
  children,
  ...rest
}: {
  href?: string;
  current?: boolean;
  children: React.ReactNode;
} & React.AriaAttributes) {
  const cls =
    "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 font-mono text-[11px] tnum transition-colors " +
    (current
      ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
      : href
        ? "border-border bg-bg-elevated text-fg-secondary hover:border-border-strong hover:text-fg-primary"
        : "border-border bg-bg-elevated/40 text-fg-tertiary opacity-60");
  if (!href)
    return (
      <span className={cls} {...rest}>
        {children}
      </span>
    );
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
