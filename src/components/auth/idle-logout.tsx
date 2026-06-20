"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { signOutIdle } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import {
  IDLE_ACTIVITY_KEY,
  IDLE_TIMEOUT_MS,
  IDLE_WARN_MS,
} from "@/lib/auth/idle";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

/**
 * Auto sign-out after IDLE_TIMEOUT_MS of no user activity, with a warning
 * dialog in the final IDLE_WARN_MS so nobody loses work to a surprise logout.
 *
 * - Tracks real input (mouse/keyboard/scroll/touch), throttled.
 * - Cross-tab: activity in any tab writes a timestamp to localStorage; other
 *   tabs reset on the storage event, so working in one tab keeps them all alive.
 * - The server (middleware) enforces the same window independently, so this is
 *   the proactive UX layer, not the only line of defence.
 */
export function IdleLogout() {
  const [pending, startLogout] = useTransition();
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(IDLE_WARN_MS / 1000));

  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBroadcast = useRef(0);
  const loggedOut = useRef(false);

  const doLogout = useCallback(() => {
    if (loggedOut.current) return;
    loggedOut.current = true;
    startLogout(async () => {
      try {
        await signOutIdle();
      } catch {
        // Server action redirects on success; if anything slips through,
        // fall back to a hard navigation.
      }
      window.location.assign("/login?reason=idle");
    });
  }, []);

  const clearTimers = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (countdown.current) clearInterval(countdown.current);
    warnTimer.current = logoutTimer.current = countdown.current = null;
  }, []);

  const schedule = useCallback(() => {
    clearTimers();
    setWarning(false);
    warnTimer.current = setTimeout(() => {
      setSecondsLeft(Math.ceil(IDLE_WARN_MS / 1000));
      setWarning(true);
      countdown.current = setInterval(() => {
        setSecondsLeft((s) => (s > 1 ? s - 1 : 0));
      }, 1000);
    }, Math.max(0, IDLE_TIMEOUT_MS - IDLE_WARN_MS));
    logoutTimer.current = setTimeout(doLogout, IDLE_TIMEOUT_MS);
  }, [clearTimers, doLogout]);

  // Register activity → reschedule + (throttled) cross-tab broadcast.
  const onActivity = useCallback(() => {
    if (loggedOut.current) return;
    const now = Date.now();
    if (now - lastBroadcast.current > 5000) {
      lastBroadcast.current = now;
      try {
        window.localStorage.setItem(IDLE_ACTIVITY_KEY, String(now));
      } catch {
        /* private mode — cross-tab sync simply won't fire */
      }
    }
    schedule();
  }, [schedule]);

  useEffect(() => {
    schedule(); // arm on mount
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === IDLE_ACTIVITY_KEY) schedule(); // another tab is active
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearTimers();
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity);
      window.removeEventListener("storage", onStorage);
    };
  }, [onActivity, schedule, clearTimers]);

  if (!warning) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg-base/70 backdrop-blur-sm">
      <div className="surface-card mx-4 w-full max-w-sm border-2 border-border-strong p-6 text-center shadow-modal">
        <h2 className="text-[17px] font-extrabold tracking-tight text-fg-primary">
          Still there?
        </h2>
        <p className="mt-2 text-[13px] font-medium text-fg-secondary">
          You&apos;ve been inactive. For security you&apos;ll be signed out in{" "}
          <span className="font-mono font-bold text-status-danger tnum">{secondsLeft}s</span>.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button type="button" variant="primary" onClick={() => onActivity()} disabled={pending}>
            Stay signed in
          </Button>
          <Button type="button" variant="secondary" onClick={doLogout} disabled={pending}>
            Sign out now
          </Button>
        </div>
      </div>
    </div>
  );
}
