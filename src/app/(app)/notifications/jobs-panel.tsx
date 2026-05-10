"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Loader2, ShieldCheck } from "lucide-react";
import { runComplianceCheck, runDailyDigest } from "@/server/actions/notifications-jobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function JobsPanel() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function fire(name: "compliance" | "digest") {
    setError(null);
    setResult(null);
    start(async () => {
      const r = name === "compliance" ? await runComplianceCheck() : await runDailyDigest();
      if (!r.ok) setError(r.error);
      else
        setResult(
          name === "compliance"
            ? `Compliance check sent ${r.sent} notification${r.sent === 1 ? "" : "s"}.`
            : `Daily digest dispatched (${r.sent} channel${r.sent === 1 ? "" : "s"}).`,
        );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled jobs</CardTitle>
        <CardDescription>
          Manual triggers for the cron jobs that run in production. Compliance check
          runs daily at 06:00 EAT; digest at 18:00 EAT.
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
          <Button variant="outline" onClick={() => fire("digest")} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
            Send daily digest
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
