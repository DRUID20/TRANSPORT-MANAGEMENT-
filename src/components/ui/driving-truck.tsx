import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Decorative driving truck — a small truck glyph that drives across a dashed
 * road. Purely cosmetic feedback (NOT real GPS); used on the tracker hero and
 * empty states. Respects prefers-reduced-motion (animation disabled there).
 */
export function DrivingTruck({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-9 w-full overflow-hidden", className)} aria-hidden="true">
      {/* Road surface + dashed centre line */}
      <div className="absolute inset-x-0 bottom-1 h-px bg-border" />
      <div
        className="absolute inset-x-0 bottom-[3px] h-px opacity-70"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0, transparent 10px, rgb(var(--border-strong)) 10px, rgb(var(--border-strong)) 20px)",
        }}
      />
      {/* The truck */}
      <div className="animate-truck absolute bottom-1 text-gold">
        <Truck className="size-6 drop-shadow" strokeWidth={2} />
      </div>
    </div>
  );
}
