"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeExpense } from "@/server/actions/expenses";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/**
 * Delete an expense. Two visuals:
 *  - default: full-width button on the detail page → navigates to /expenses
 *  - row:     icon-only on list rows → stays on the list (router.refresh)
 *
 * Handy for clearing out test/mock data; gated server-side by the existing
 * removeExpense action.
 */
export function DeleteExpenseButton({
  expenseId,
  variant = "default",
}: {
  expenseId: string;
  variant?: "default" | "row";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    start(async () => {
      const r = await removeExpense(expenseId);
      if (!r.ok) {
        toast.error("Could not delete", { description: r.error });
        return;
      }
      toast.success("Expense deleted");
      if (variant === "row") {
        router.refresh();
      } else {
        router.push("/expenses");
        router.refresh();
      }
    });
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        aria-label="Delete expense"
        title="Delete"
        className="rounded p-1 text-fg-tertiary transition-colors hover:bg-status-danger/10 hover:text-status-danger disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
    );
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={onDelete}>
      <Trash2 className="size-3.5" /> {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
