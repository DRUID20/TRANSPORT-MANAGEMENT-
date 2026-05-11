"use client";

import { useState, useTransition } from "react";
import { CalendarClock, CalendarRange, Loader2, ShieldCheck } from "lucide-react";
import {
  runComplianceCheck,
  runDailyDigest,
  runWeeklyDigest,
} from "@/server/actions/notifications-jobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function JobsPanel() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function fire(name: "compliance" | "daily" | "weekly") {
    setError(null);
    setResult(null);
    start(async () => {
      const r =
        name === "compliance"
          ? await runComplianceCheck()
          : name === "daily"
            ? await runDailyDigest()
            : await runWeeklyDigest();
      if (!r.ok) setError(r.error);
      else {
        const msg =
          name === "compliance"
            ? `Compliance check sent ${r.sent} notification${r.sent === 1 ? "" : "s"}.`
            : name === "daily"
              ? `Daily digest dispatched (${r.sent} channel${r.sent === 1 ? "" : "s"}).`
              : `Weekly summary dispatched to management (${r.sent} channel${r.sent === 1 ? "" : "s"}).`;
        setResult(msg);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled jobs</CardTitle>
        <CardDescription>
          Manual triggers for the cron jobs that run in production. Compliance check
          daily at 06:00 EAT, daily digest at 18:00, weekly summary on Friday at
          17:00.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}
        {result && (
          <div className="rounded-md border border-status-success/30 bg-status-success/10 p-3 text-sm text-status-success">
            {result}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fire("compliance")} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Run compliance check
          </Button>
          <Button variant="outline" onClick={() => fire("daily")} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
            Send daily digest
          </Button>
          <Button variant="outline" onClick={() => fire("weekly")} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CalendarRange className="size-4" />}
            Send weekly summary
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
