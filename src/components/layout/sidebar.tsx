"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Operations",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/trips", label: "Trips", icon: Route, badge: "soon" },
      { href: "/trucks", label: "Trucks", icon: Truck },
      { href: "/trailers", label: "Trailers", icon: Container },
      { href: "/drivers", label: "Drivers", icon: IdCard },
      { href: "/workshop", label: "Workshop", icon: Wrench },
    ],
  },
  {
    title: "Partners",
    items: [
      { href: "/customers", label: "Customers", icon: Building2, badge: "soon" },
      { href: "/subcontractors", label: "Subcontractors", icon: Handshake },
      { href: "/suppliers", label: "Suppliers", icon: Store },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/expenses", label: "Expenses", icon: Receipt, badge: "soon" },
      { href: "/finance", label: "Finance", icon: Wallet, badge: "soon" },
      { href: "/reports", label: "Reports", icon: BarChart3, badge: "soon" },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/hr", label: "HR & Staff", icon: Users, badge: "soon" },
      { href: "/settings", label: "Settings", icon: Settings, badge: "soon" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-60 flex-col border-r border-border bg-bg-surface md:flex">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/dashboard" className="-mx-1 rounded-md px-1 py-1 transition-colors hover:bg-bg-elevated">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-5 px-3">
            <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">
              {group.title}
            </div>
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
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-all",
                      active
                        ? "bg-brand-blue/10 text-fg-primary"
                        : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active ? "text-brand-blue" : "text-fg-tertiary group-hover:text-fg-secondary",
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-bg-elevated-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-tertiary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-md bg-bg-elevated p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-fg-tertiary">
            Build
          </div>
          <div className="font-mono text-xs text-fg-secondary">tx-system v0.1 · phase 0</div>
        </div>
      </div>
    </aside>
  );
}
