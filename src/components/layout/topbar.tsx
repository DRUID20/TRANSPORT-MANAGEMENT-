import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TopbarClock } from "@/components/layout/topbar-clock";
import { NotificationBell } from "@/components/layout/notification-bell";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { Kbd } from "@/components/ui/kbd";
import { listNotifications } from "@/server/actions/notifications";
import {
  CURRENT_USER_EMPLOYEE_ID,
  getCurrentEmployee,
  getCurrentUser,
} from "@/server/auth/current-user";

/**
 * Topbar — sticky chrome above the page content.
 *
 * Layout (left to right):
 *  - Mobile menu trigger (md:hidden)
 *  - Command-K search trigger
 *  - Right cluster: clock, theme toggle, notifications bell, user menu
 *
 * The bar is translucent + backdrop-blurred so the page underneath
 * subtly bleeds through when scrolling — the Linear / Vercel feel.
 */
export async function Topbar() {
  const [items, sessionUser] = await Promise.all([
    listNotifications({
      recipientId: CURRENT_USER_EMPLOYEE_ID,
      channel: "in_app",
      limit: 12,
    }),
    getCurrentUser(),
  ]);

  // Identity for the user menu: prefer the signed-in user, fall back to
  // the seed employee so the topbar still renders during the transition
  // period while data tables migrate.
  const fallback = getCurrentEmployee();
  const fullName = sessionUser?.fullName ?? fallback?.fullName ?? "Nile Valley";
  const email = sessionUser?.email ?? fallback?.email ?? "—";
  const initials = computeInitials(fullName);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg-base/75 px-3 backdrop-blur-xl sm:gap-3 sm:px-4">
      <MobileSidebar />
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
        <UserMenu fullName={fullName} email={email} initials={initials} />
      </div>
    </header>
  );
}

function computeInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NV";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
