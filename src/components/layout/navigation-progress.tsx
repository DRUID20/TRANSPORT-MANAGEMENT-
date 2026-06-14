"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top navigation progress bar — the thin "filling" indicator at the very top
 * of the viewport that gives instant feedback during route changes, so the app
 * feels like it never stops to "load" a full page.
 *
 * How it works in the App Router (which has no router events):
 *  - START on a user-initiated navigation: we intercept same-origin anchor
 *    clicks (capture phase) and patch history.pushState (covers router.push).
 *  - FINISH when the committed route actually changes — we watch pathname +
 *    searchParams and complete the bar once they update.
 *  - A safety timeout completes the bar if a navigation never commits, so it
 *    can never get stuck.
 *
 * File downloads (export links, /api/*) and new-tab / modified clicks are
 * ignored so the bar only reflects real in-app navigations.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (trickle.current) { clearInterval(trickle.current); trickle.current = null; }
    if (safety.current) { clearTimeout(safety.current); safety.current = null; }
  };

  const done = useCallback(() => {
    clearTimers();
    setProgress(100);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
  }, []);

  const start = useCallback(() => {
    if (trickle.current) return; // already in flight
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    setVisible(true);
    setProgress(8);
    // Ease toward 90% and hold there until the route commits.
    trickle.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.max(0.4, (90 - p) * 0.06)));
    }, 110);
    // Never get stuck if a navigation is cancelled / never commits.
    safety.current = setTimeout(() => done(), 8000);
  }, [done]);

  // Complete the bar when the route actually changes.
  useEffect(() => {
    if (visible) done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Wire up navigation-start detection once.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/api/")) return; // downloads / data routes
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };

    document.addEventListener("click", onClick, true);

    const origPush = window.history.pushState;
    window.history.pushState = function pushState(this: History, ...args) {
      start();
      return origPush.apply(this, args as Parameters<typeof origPush>);
    };
    const onPop = () => start();
    window.addEventListener("popstate", onPop);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.history.pushState = origPush;
      window.removeEventListener("popstate", onPop);
      clearTimers();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [start]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 print:hidden"
    >
      <div
        className="h-full rounded-r-full bg-brand-blue transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
          boxShadow: "0 0 8px rgb(var(--brand-blue) / 0.8), 0 0 2px rgb(var(--brand-blue) / 0.9)",
        }}
      />
    </div>
  );
}
