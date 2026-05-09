"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Home, Route as RouteIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/drv",         label: "Home",  icon: Home },
  { href: "/drv/trip",    label: "Trip",  icon: RouteIcon },
  { href: "/drv/scan",    label: "Scan",  icon: Camera },
  { href: "/drv/profile", label: "Me",    icon: User },
];

export function DriverBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-elevated/90 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md items-center justify-around">
        {items.map((it) => {
          const Icon = it.icon;
          const active =
            pathname === it.href ||
            (it.href !== "/drv" && pathname.startsWith(it.href));
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-3 text-[10px] font-medium uppercase tracking-wider transition-colors",
                  active ? "text-brand-blue" : "text-fg-tertiary hover:text-fg-secondary",
                )}
              >
                <Icon className="size-5" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
