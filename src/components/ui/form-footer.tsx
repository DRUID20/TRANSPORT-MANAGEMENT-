"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * FormFooter — sticky action bar at the bottom of a long form.
 *
 * Quiet by default: no meta line, just the buttons. The footer
 * detaches from page background as the page scrolls so the buttons
 * always have visual weight against the content above.
 */
export function FormFooter({
  children,
  className,
  inline = false,
  // Legacy — ignored.
  meta: _meta,
}: {
  children: React.ReactNode;
  className?: string;
  inline?: boolean;
  meta?: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (inline) return;
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [inline]);

  if (inline) {
    return (
      <div className={cn("mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end", className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-bg-base/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6",
        scrolled && "shadow-[0_-8px_24px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div className="mx-auto flex max-w-screen-2xl flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        {children}
      </div>
    </div>
  );
}
