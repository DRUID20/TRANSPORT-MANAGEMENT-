import { Command, Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TopbarClock } from "@/components/layout/topbar-clock";
import { NotificationBell } from "@/components/layout/notification-bell";
import { listNotifications } from "@/server/actions/notifications";
import { CURRENT_USER_EMPLOYEE_ID } from "@/server/auth/current-user";

export async function Topbar() {
  // Latest 12 in-app entries for the bell drawer
  const items = await listNotifications({
    recipientId: CURRENT_USER_EMPLOYEE_ID,
    channel: "in_app",
    limit: 12,
  });

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg-base/80 px-4 backdrop-blur-xl">
      {/* Search / command palette trigger */}
      <button
        type="button"
        className="group inline-flex h-9 flex-1 max-w-md items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 text-sm text-fg-tertiary transition-colors hover:border-border-strong hover:text-fg-secondary"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search trips, trucks, customers…</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-border bg-bg-base px-1.5 py-0.5 font-mono text-[10px] text-fg-tertiary sm:inline-flex">
          <Command className="size-2.5" />K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <TopbarClock />
        <ThemeToggle />
        <NotificationBell initialItems={items} />

        {/* Avatar (placeholder) */}
        <div className="flex size-9 items-center justify-center rounded-full bg-bg-elevated text-xs font-medium text-fg-secondary ring-1 ring-border">
          NV
        </div>
      </div>
    </header>
  );
}
