"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Truck,
  Route,
  Receipt,
  Wrench,
  Users,
  Building2,
  BarChart3,
  Settings,
  Wallet,
  Handshake,
  Container,
  IdCard,
  Store,
  ShieldCheck,
  ClipboardList,
  Tag,
  Fuel as FuelIcon,
  Smartphone,
  BookOpen,
  ListChecks,
  Scale,
  ScrollText,
  Hourglass,
  FileText,
  Banknote,
  CalendarRange,
  CalendarDays,
  GraduationCap,
  KeyRound,
  Bell,
  Sliders,
  FileEdit,
  Inbox,
  Sparkles,
  Trophy,
  Pause,
  Grid3X3,
  FileBarChart,
  PanelLeftClose,
  PanelLeftOpen,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

/**
 * Sidebar navigation — premium SaaS shell.
 *
 * Two visual modes:
 *  - expanded (240px): labels + icons + group eyebrows
 *  - collapsed (64px):  icons only, with tooltip-equivalent title attrs
 *
 * State is persisted to localStorage so users only choose once. Hidden
 * below md: a hamburger in the topbar (out of scope here) toggles a
 * mobile drawer that re-uses this component.
 *
 * The active state uses a left accent rule + soft brand-blue background
 * pill — a cleaner pattern than full-row fill, and consistent with
 * Linear / Notion / Vercel.
 */
const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Operations",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calendar", label: "Schedule", icon: Calendar },
      { href: "/bookings", label: "Bookings", icon: ClipboardList },
      { href: "/trips", label: "Trips", icon: Route },
      { href: "/trucks", label: "Trucks", icon: Truck },
      { href: "/trailers", label: "Trailers", icon: Container },
      { href: "/drivers", label: "Drivers", icon: IdCard },
      { href: "/workshop", label: "Workshop", icon: Wrench },
      { href: "/compliance", label: "Compliance", icon: ShieldCheck },
      { href: "/rates", label: "Rates", icon: Tag },
    ],
  },
  {
    title: "Partners",
    items: [
      { href: "/customers", label: "Customers", icon: Building2 },
      { href: "/subcontractors", label: "Subcontractors", icon: Handshake },
      { href: "/suppliers", label: "Suppliers", icon: Store },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/hr", label: "HR Hub", icon: Users },
      { href: "/hr/employees", label: "Employees", icon: IdCard },
      { href: "/hr/departments", label: "Departments", icon: Building2 },
      { href: "/hr/compliance", label: "HR Compliance", icon: ShieldCheck },
      { href: "/hr/leave", label: "Leave", icon: CalendarRange },
      { href: "/hr/attendance", label: "Attendance", icon: CalendarDays },
      { href: "/hr/payroll", label: "Payroll", icon: Wallet },
      { href: "/hr/loans", label: "Loans", icon: Wallet },
      { href: "/hr/appraisals", label: "Appraisals", icon: GraduationCap },
      { href: "/hr/job-descriptions", label: "Job Descriptions", icon: KeyRound },
      { href: "/hr/permissions", label: "Permission Matrix", icon: KeyRound },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/expenses", label: "Expenses", icon: Receipt },
      { href: "/fuel", label: "Fuel", icon: FuelIcon },
      { href: "/mpesa", label: "M-Pesa", icon: Smartphone },
      { href: "/accounts", label: "Chart of Accounts", icon: BookOpen },
      { href: "/ledger", label: "General Ledger", icon: ListChecks },
      { href: "/ledger/trial-balance", label: "Trial Balance", icon: Scale },
      { href: "/invoices", label: "Invoices (AR)", icon: ScrollText },
      { href: "/invoices/aged", label: "Aged AR", icon: Hourglass },
      { href: "/bills", label: "Bills (AP)", icon: FileText },
      { href: "/bills/aged", label: "Aged AP", icon: Hourglass },
      { href: "/bank", label: "Bank Reconciliation", icon: Banknote },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/management-pack", label: "Management Pack", icon: FileBarChart },
    ],
  },
  {
    title: "Communications",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/notifications/inbox", label: "Inbox", icon: Inbox },
      { href: "/notifications/log", label: "Outbound log", icon: ScrollText },
      { href: "/notifications/templates", label: "Templates", icon: FileEdit },
      { href: "/notifications/preferences", label: "Preferences", icon: Sliders },
    ],
  },
  {
    title: "Performance",
    items: [
      { href: "/tracker", label: "Truck tracker", icon: Trophy },
      { href: "/tracker/idle", label: "Idle trucks", icon: Pause },
      { href: "/tracker/matrix", label: "Customer × route", icon: Grid3X3 },
    ],
  },
  {
    title: "AI",
    items: [{ href: "/assistant", label: "Assistant", icon: Sparkles }],
  },
  {
    title: "Admin",
    items: [{ href: "/settings", label: "Settings", icon: Settings, badge: "soon" }],
  },
];

const STORAGE_KEY = "tx.sidebar.collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // localStorage may be unavailable (private mode); fall back silently.
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r border-border bg-bg-surface transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-[68px]" : "w-60",
      )}
      aria-label="Primary navigation"
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-3">
        <Link
          href="/dashboard"
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
        {hydrated && (
          <button
            type="button"
            onClick={toggle}
            className={cn(
              "rounded-md p-1.5 text-fg-tertiary transition-colors hover:bg-bg-elevated hover:text-fg-primary",
              collapsed && "absolute left-1/2 mt-12 -translate-x-1/2",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group) => (
          <div key={group.title} className={cn("mb-5", collapsed ? "px-2" : "px-3")}>
            {!collapsed && (
              <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">
                {group.title}
              </div>
            )}
            {collapsed && <div aria-hidden className="mx-2 mb-2 h-px bg-border" />}
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
            <div className="font-mono text-xs text-fg-secondary">
              tx-system v0.1
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
