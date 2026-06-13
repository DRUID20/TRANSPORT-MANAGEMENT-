"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { navGroups } from "@/components/layout/nav-data";
import { SidebarUser, type SidebarUserInfo } from "@/components/layout/sidebar-user";

/**
 * SidebarBody — nav rendered inside both the desktop Sidebar (collapsible)
 * and the mobile drawer. Styled to DESIGN.md §7.
 */
export function SidebarBody({
  collapsed = false,
  user,
  onNavigate,
}: {
  collapsed?: boolean;
  user?: SidebarUserInfo;
  /** Fired after a nav link is clicked. Used by the mobile drawer to close itself. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-bg-elevated-2",
            collapsed && "w-full justify-center px-0",
          )}
        >
          {collapsed ? (
            <span
              className="grid size-8 place-items-center rounded-lg bg-brand-blue text-[11px] font-semibold tracking-wide text-white"
              aria-label="Nile Valley"
            >
              NV
            </span>
          ) : (
            <Logo />
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group) => (
          <div key={group.title} className={cn("mb-1 mt-5 first:mt-1", collapsed ? "px-2" : "px-3")}>
            {!collapsed ? (
              <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
                {group.title}
              </div>
            ) : (
              <div aria-hidden className="mx-2 mb-2 h-px bg-border" />
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-9 items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150",
                      collapsed ? "justify-center px-0" : "px-2.5",
                      active
                        ? "bg-bg-elevated-2 text-fg-primary"
                        : "text-fg-secondary hover:bg-bg-elevated-2 hover:text-fg-primary",
                    )}
                  >
                    {active && !collapsed && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-blue"
                      />
                    )}
                    <Icon
                      strokeWidth={1.5}
                      className={cn(
                        "size-[18px] shrink-0 transition-colors",
                        active ? "text-brand-blue" : "text-fg-tertiary group-hover:text-fg-secondary",
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-status-danger/15 px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-status-danger">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      {user && <SidebarUser user={user} collapsed={collapsed} onNavigate={onNavigate} />}
    </>
  );
}
