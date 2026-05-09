"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { reverseJournal } from "@/server/actions/ledger";
import { Button } from "@/components/ui/button";

export function ReverseEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    setError(null);
    if (!confirm("Reverse this journal entry? A reversal entry will be posted today.")) return;
    start(async () => {
      const r = await reverseJournal(entryId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/ledger/${r.id}`);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={go}
        disabled={pending}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
        Reverse
      </Button>
      {error && (
        <span className="text-[11px] text-status-danger">{error}</span>
      )}
    </>
  );
}
