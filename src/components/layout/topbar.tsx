import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TopbarClock } from "@/components/layout/topbar-clock";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Kbd } from "@/components/ui/kbd";
import { listNotifications } from "@/server/actions/notifications";
import { CURRENT_USER_EMPLOYEE_ID } from "@/server/auth/current-user";

/**
 * Topbar — sticky chrome above the page content.
 *
 * Layout (left to right):
 *  - Command-K search trigger (focuses to the right with a kbd hint)
 *  - Right cluster: clock, theme toggle, notifications bell, avatar
 *
 * The bar is translucent + backdrop-blurred so the page underneath
 * subtly bleeds through when scrolling — the Linear / Vercel feel.
 */
export async function Topbar() {
  const items = await listNotifications({
    recipientId: CURRENT_USER_EMPLOYEE_ID,
    channel: "in_app",
    limit: 12,
  });

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg-base/75 px-4 backdrop-blur-xl">
      <button
        type="button"
        className="group inline-flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 text-sm text-fg-tertiary shadow-soft transition-all hover:border-border-strong hover:text-fg-secondary"
        aria-label="Open command menu"
      >
        <Search className="size-4 text-fg-tertiary group-hover:text-fg-secondary" />
        <span className="flex-1 text-left">Search trips, trucks, customers…</span>
        <span className="hidden items-center gap-1 sm:inline-flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <TopbarClock />
        <ThemeToggle />
        <NotificationBell initialItems={items} />

        <button
          type="button"
          aria-label="Account menu"
          className="flex size-9 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-semibold text-brand-blue ring-1 ring-brand-blue/20 transition-shadow hover:ring-brand-blue/40 hover:shadow-soft"
        >
          NV
        </button>
      </div>
    </header>
  );
}
