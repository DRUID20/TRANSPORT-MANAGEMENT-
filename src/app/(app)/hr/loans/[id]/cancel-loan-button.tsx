"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, XCircle } from "lucide-react";
import { cancelLoan } from "@/server/actions/payroll";
import { Button } from "@/components/ui/button";

export function CancelLoanButton({ loanId }: { loanId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    if (!confirm("Cancel this loan? Outstanding balance will no longer be recovered.")) return;
    setError(null);
    start(async () => {
      const r = await cancelLoan(loanId);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={go} disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
        Cancel loan
      </Button>
      {error && <span className="text-[11px] text-status-danger">{error}</span>}
    </>
  );
}
