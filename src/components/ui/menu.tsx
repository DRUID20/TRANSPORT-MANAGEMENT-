"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Dropdown menu (DESIGN.md §7/§12) — action menus (row "…", account, etc.).
 * Dark surface, radius-10, 34px items; destructive items render in --danger
 * below a divider via <MenuItem destructive>.
 */
export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({
  children,
  align = "end",
  sideOffset = 6,
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[160] min-w-[180px] overflow-hidden rounded-xl border border-border-strong bg-bg-surface p-1 shadow-modal",
          "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 duration-150",
          className,
        )}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  children,
  onSelect,
  destructive = false,
  disabled = false,
  icon,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex h-[34px] cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 text-[13px] outline-none transition-colors",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        destructive
          ? "text-status-danger data-[highlighted]:bg-status-danger/12"
          : "text-fg-secondary data-[highlighted]:bg-bg-elevated-2 data-[highlighted]:text-fg-primary",
      )}
    >
      {icon && <span className="grid size-4 place-items-center [&_svg]:size-4">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </DropdownMenu.Item>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-border" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu.Label className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
      {children}
    </DropdownMenu.Label>
  );
}
