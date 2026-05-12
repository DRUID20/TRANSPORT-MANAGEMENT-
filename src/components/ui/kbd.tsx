import { cn } from "@/lib/utils";

/** Keyboard chip — used inside Cmd+K hints, action menus, etc. */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center gap-0.5 rounded border border-border bg-bg-base px-1.5 py-[1px] font-mono text-[10px] font-medium text-fg-tertiary",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
