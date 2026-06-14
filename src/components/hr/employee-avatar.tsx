import { cn } from "@/lib/utils";

/**
 * Employee avatar — renders the uploaded profile photo (auth-proxied from the
 * private `documents` bucket) or falls back to the person's initials on a
 * tinted disc. Used on the employee detail header + roster list.
 */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const SIZES: Record<NonNullable<EmployeeAvatarProps["size"]>, string> = {
  sm: "size-8 text-[11px]",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
};

interface EmployeeAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EmployeeAvatar({ name, photoUrl, size = "md", className }: EmployeeAvatarProps) {
  const base = cn(
    "shrink-0 overflow-hidden rounded-full ring-1 ring-border",
    SIZES[size],
    className,
  );
  if (photoUrl) {
    const href = `/api/files/${photoUrl.split("/").map(encodeURIComponent).join("/")}`;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={href} alt={name} className={cn(base, "object-cover")} />;
  }
  return (
    <span
      className={cn(
        base,
        "flex items-center justify-center bg-bg-elevated font-semibold text-fg-secondary",
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
