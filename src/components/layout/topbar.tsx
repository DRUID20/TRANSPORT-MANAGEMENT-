import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TopbarClock } from "@/components/layout/topbar-clock";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import type { SidebarUserInfo } from "@/components/layout/sidebar-user";

/**
 * Topbar — sticky chrome above the page content (DESIGN.md §7).
 * Left: mobile menu trigger + breadcrumb. Right: ⌘K command palette, clock,
 * theme toggle. The account menu lives in the sidebar's bottom user card.
 */
export function Topbar({ user }: { user?: SidebarUserInfo }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg-base/80 px-3 backdrop-blur-xl sm:px-4">
      <MobileSidebar user={user} />
      <Breadcrumb />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="w-[min(42vw,360px)]">
          <CommandPalette />
        </div>
        <TopbarClock />
        <ThemeToggle />
      </div>
    </header>
  );
}
