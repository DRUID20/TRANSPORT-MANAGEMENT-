"use client";

import { usePathname } from "next/navigation";

/**
 * Seamless content transition between pages.
 *
 * Keying the wrapper on the pathname forces React to remount the page subtree
 * on each navigation, which replays the `.animate-content-in` keyframe — a
 * quick 280ms fade + 6px rise (opacity-only under prefers-reduced-motion).
 * Combined with the top NavigationProgress bar and the absence of a full-page
 * loading skeleton, navigating feels like the next page simply arrives rather
 * than the app stopping to "load".
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-content-in">
      {children}
    </div>
  );
}
