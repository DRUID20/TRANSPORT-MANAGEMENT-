"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeExpense } from "@/server/actions/expenses";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/** Delete an expense (handy for clearing out test/mock data). */
export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this expense? This cannot be undone.")) return;
        start(async () => {
          const r = await removeExpense(expenseId);
          if (!r.ok) {
            toast.error("Could not delete", { description: r.error });
            return;
          }
          toast.success("Expense deleted");
          router.push("/expenses");
          router.refresh();
        });
      }}
    >
      <Trash2 className="size-3.5" /> {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
