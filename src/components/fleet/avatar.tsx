import { cn } from "@/lib/utils";

/** Initials avatar — works without an actual photo. */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join("");
  const sizing = {
    sm: "size-7 text-[10px]",
    md: "size-10 text-xs",
    lg: "size-14 text-base",
  }[size];
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-navy font-mono font-semibold tracking-wider text-white ring-2 ring-bg-elevated",
        sizing,
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
