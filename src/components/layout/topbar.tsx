import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TopbarClock } from "@/components/layout/topbar-clock";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import type { SidebarUserInfo } from "@/components/layout/sidebar-user";
import { Kbd } from "@/components/ui/kbd";

/**
 * Topbar — sticky chrome above the page content (DESIGN.md §7).
 * Mobile menu trigger, Cmd+K search, clock + theme toggle. The account
 * menu now lives in the sidebar's bottom user card.
 */
export function Topbar({ user }: { user?: SidebarUserInfo }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg-base/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4">
      <MobileSidebar user={user} />
      <button
        type="button"
        className="group inline-flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 text-sm text-fg-tertiary transition-colors hover:border-border-strong hover:text-fg-secondary"
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
      </div>
    </header>
  );
}
