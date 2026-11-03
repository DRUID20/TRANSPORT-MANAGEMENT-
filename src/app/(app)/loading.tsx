/**
 * Instant loading state for every page inside the app shell.
 *
 * Without this, clicking a menu item showed nothing until the server had
 * finished rendering the whole next page, so the app felt frozen. With a
 * loading boundary Next.js swaps this skeleton in immediately (the sidebar
 * and topbar stay put), and `<Link>` prefetching downloads it ahead of time
 * so the switch is instant. The real page streams in over it when ready.
 */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <span className="skeleton block h-3 w-24 rounded" />
          <span className="skeleton block h-7 w-56 rounded-md" />
        </div>
        <span className="skeleton hidden h-9 w-32 rounded-lg sm:block" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card flex flex-col gap-3 p-4">
            <span className="skeleton block h-3 w-20 rounded" />
            <span className="skeleton block h-7 w-16 rounded-md" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        <div className="flex gap-6 border-b border-border bg-bg-surface px-5 py-3.5">
          {[16, 24, 20, 14, 18].map((w, i) => (
            <span key={i} className="skeleton block h-3 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="flex gap-6 px-5 py-4">
              {[16, 24, 20, 14, 18].map((w, i) => (
                <span
                  key={i}
                  className="skeleton block h-3.5 rounded"
                  style={{ width: `${Math.max(8, w - ((r + i) % 3) * 3)}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
