"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import { advancePack } from "@/server/actions/management-pack";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ManagementPackStatus } from "@/lib/types/management-pack";

export function PackActions({
  packId,
  status,
  locked,
}: {
  packId: string;
  status: ManagementPackStatus;
  locked: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go(to: ManagementPackStatus, prompt: string) {
    if (!confirm(prompt)) return;
    setError(null);
    start(async () => {
      const r = await advancePack(packId, to);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  if (status === "published") {
    return (
      <Card>
        <CardContent className="!p-4 text-center text-sm text-fg-tertiary">
          <CheckCircle2 className="mx-auto mb-1 size-4 text-status-success" />
          Pack is published — read-only.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow</CardTitle>
        <CardDescription>
          {status === "draft" && "Populate the narrative, then submit for review."}
          {status === "in_review" && "Review the figures, then sign-off."}
          {status === "signed_off" && "Pack is locked. Publish to share."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {status === "draft" && (
            <Button
              onClick={() => go("in_review", "Submit this pack for review?")}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Submit for review
            </Button>
          )}
          {status === "in_review" && (
            <Button
              variant="success"
              onClick={() => go("signed_off", "Sign-off this pack? Once signed-off the narrative + figures are locked.")}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Sign-off
            </Button>
          )}
          {status === "signed_off" && (
            <Button
              onClick={() => go("published", "Publish this pack to the management distribution list?")}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Publish
            </Button>
          )}
        </div>
        {locked && (
          <p className="text-[11px] text-fg-tertiary">
            Narrative is read-only once signed-off.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
