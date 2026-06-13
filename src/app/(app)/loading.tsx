/**
 * App-group loading skeleton.
 *
 * Shown instantly during navigation between any (app) page while the server
 * renders the real content. The sidebar + topbar (in the layout) stay put,
 * so switching sections feels immediate instead of frozen.
 */
export default function AppLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden="true">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 rounded bg-bg-elevated" />
        <div className="h-7 w-56 rounded bg-bg-elevated" />
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card h-20 p-4">
            <div className="h-2.5 w-16 rounded bg-bg-elevated" />
            <div className="mt-3 h-5 w-12 rounded bg-bg-elevated" />
          </div>
        ))}
      </div>

      {/* Table / list */}
      <div className="surface-card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <div className="h-3 w-32 rounded bg-bg-elevated" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="size-8 rounded-md bg-bg-elevated" />
              <div className="h-3 flex-1 rounded bg-bg-elevated" />
              <div className="h-3 w-24 rounded bg-bg-elevated" />
              <div className="h-3 w-16 rounded bg-bg-elevated" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
