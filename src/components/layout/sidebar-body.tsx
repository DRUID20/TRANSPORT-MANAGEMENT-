"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { navGroups } from "@/components/layout/nav-data";

/**
 * SidebarBody — the bare nav rendered inside both the desktop Sidebar
 * (with collapse) and the mobile drawer (always expanded). Lives in its
 * own component so we only own the nav markup once.
 */
export function SidebarBody({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  /** Fired after a nav link is clicked. Used by the mobile drawer to close itself. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-bg-elevated",
            collapsed && "w-full justify-center px-0",
          )}
        >
          {collapsed ? (
            <span
              className="grid size-8 place-items-center rounded-md bg-brand-blue text-[11px] font-semibold tracking-wide text-white shadow-soft"
              aria-label="Nile Valley"
            >
              NV
            </span>
          ) : (
            <Logo />
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group) => (
          <div key={group.title} className={cn("mb-5", collapsed ? "px-2" : "px-3")}>
            {!collapsed ? (
              <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">
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
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md text-sm transition-all",
                      collapsed ? "justify-center px-0 py-2" : "px-2.5 py-1.5",
                      active
                        ? "bg-brand-blue/10 text-fg-primary"
                        : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary",
                    )}
                  >
                    {active && !collapsed && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-blue"
                      />
                    )}
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active
                          ? "text-brand-blue"
                          : "text-fg-tertiary group-hover:text-fg-secondary",
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-bg-surface px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-tertiary ring-1 ring-border">
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

      {!collapsed && (
        <div className="border-t border-border p-3">
          <div className="rounded-lg border border-border bg-bg-base p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
              Build
            </div>
            <div className="font-mono text-xs text-fg-secondary">tx-system v0.1</div>
          </div>
        </div>
      )}
    </>
  );
}
