"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { navGroups } from "@/components/layout/nav-data";
import { SidebarUser, type SidebarUserInfo } from "@/components/layout/sidebar-user";

const GROUPS_KEY = "tx.sidebar.groups";

/**
 * SidebarBody — nav rendered inside the desktop Sidebar and the mobile drawer.
 * Black panel with a gold active pill (UNOC). Groups are collapsible: click a
 * header to open/close it (smooth height); state persists per group and the
 * group containing the current page auto-opens.
 */
export function SidebarBody({
  collapsed = false,
  user,
  onNavigate,
}: {
  collapsed?: boolean;
  user?: SidebarUserInfo;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // Longest matching href wins (so only the most specific item highlights).
  const activeHref = navGroups
    .flatMap((g) => g.items)
    .reduce(
      (best, it) => {
        const matches = pathname === it.href || pathname.startsWith(it.href + "/");
        return matches && it.href.length > best.len ? { href: it.href, len: it.href.length } : best;
      },
      { href: "", len: -1 },
    ).href;
  const activeGroup = navGroups.find((g) => g.items.some((i) => i.href === activeHref))?.title;

  // Groups default open; hydrate persisted state; force the active group open.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((g) => [g.title, true])),
  );
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GROUPS_KEY);
      if (raw) setOpen((prev) => ({ ...prev, ...(JSON.parse(raw) as Record<string, boolean>) }));
    } catch {
      /* private mode — ignore */
    }
  }, []);
  useEffect(() => {
    if (activeGroup) setOpen((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
  }, [activeGroup]);

  function toggle(title: string) {
    setOpen((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-fg">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-white/10",
            collapsed && "w-full justify-center px-0",
          )}
        >
          {collapsed ? (
            <span
              className="grid size-8 place-items-center rounded-lg bg-gold text-[11px] font-bold tracking-wide text-sidebar-active-fg"
              aria-label="Nile Valley"
            >
              NV
            </span>
          ) : (
            <Logo onDark />
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group) => {
          const isOpen = collapsed ? true : open[group.title] !== false;
          return (
            <div key={group.title} className={cn("mb-1 mt-4 first:mt-1", collapsed ? "px-2" : "px-3")}>
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggle(group.title)}
                  aria-expanded={isOpen}
                  className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-sidebar-muted transition-colors hover:text-sidebar-fg"
                >
                  {group.title}
                  <ChevronDown
                    className={cn(
                      "size-3.5 shrink-0 transition-transform duration-200",
                      isOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </button>
              ) : (
                <div aria-hidden className="mx-2 mb-2 h-px bg-sidebar-border" />
              )}

              <div className="collapsible" data-open={isOpen}>
                <div className="collapsible-inner">
                  <div className="flex flex-col gap-0.5 pb-1">
                    {group.items.map((item) => {
                      const active = item.href === activeHref;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onNavigate}
                          title={collapsed ? item.label : undefined}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group relative flex h-9 items-center gap-2.5 rounded-lg text-[13px] font-semibold transition-colors duration-150",
                            collapsed ? "justify-center px-0" : "px-2.5",
                            active
                              ? "bg-gold text-sidebar-active-fg shadow-sm"
                              : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-fg",
                          )}
                        >
                          <Icon
                            strokeWidth={1.75}
                            className={cn(
                              "size-[18px] shrink-0 transition-colors",
                              active ? "text-sidebar-active-fg" : "text-sidebar-muted group-hover:text-sidebar-fg",
                            )}
                          />
                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge && (
                                <span
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums",
                                    active
                                      ? "bg-black/15 text-sidebar-active-fg"
                                      : "bg-status-danger/20 text-status-danger",
                                  )}
                                >
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
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      {user && <SidebarUser user={user} collapsed={collapsed} onNavigate={onNavigate} />}
    </div>
  );
}
