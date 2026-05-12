"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * FormFooter — sticky action bar for long forms.
 *
 * Pinned to the bottom of the viewport when the form scrolls; loses the
 * shadow once the user scrolls past the form's natural footer so it
 * doesn't double-stack with a page footer.
 *
 * Place at the end of the <form>. The footer is responsive: stacks
 * vertically on mobile, right-aligned actions on desktop.
 */
export function FormFooter({
  meta,
  children,
  className,
  /** When true, the footer is rendered inline (no sticky positioning). */
  inline = false,
}: {
  /** Optional left-aligned text — e.g. "Unsaved changes" or a save hint. */
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  inline?: boolean;
}) {
  // Detect whether the page has scrolled — if so, render a stronger shadow.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (inline) return;
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [inline]);

  return (
    <div
      className={cn(
        inline
          ? "mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end"
          : "sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-bg-base/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6",
        !inline && scrolled && "shadow-[0_-8px_24px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      {inline ? (
        <>{children}</>
      ) : (
        <div className="mx-auto flex max-w-screen-2xl flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-fg-tertiary">{meta}</div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
