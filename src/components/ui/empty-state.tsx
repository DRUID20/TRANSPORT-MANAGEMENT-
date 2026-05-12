import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * EmptyState — premium empty surface used whenever a list, table, or
 * board has no records. Avoids the bland "no data" message by giving
 * the user an icon, a clear title, a one-sentence description that
 * tells them why this is empty and what to do next, and a primary CTA.
 *
 * Pattern: ALWAYS pair with the verb the user would take ("Create
 * your first trip" rather than just "Add"). Microcopy >> styling.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const padY = size === "sm" ? "py-10" : size === "lg" ? "py-24" : "py-16";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        padY,
        className,
      )}
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 -m-2 rounded-2xl bg-brand-blue/5 blur-xl"
        />
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border bg-bg-elevated shadow-soft">
          <Icon className="size-6 text-brand-blue" />
        </div>
      </div>
      <h3 className="mt-2 text-base font-semibold tracking-tight text-fg-primary">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm text-sm text-fg-secondary">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
