import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AssistantChat } from "./assistant-chat";

const SUGGESTIONS = [
  "How much do customers owe us?",
  "Show overdue invoices",
  "What's our profit this month?",
  "Top 3 trucks by profit",
  "Which trucks use the most fuel?",
  "What licences are expiring?",
  "Any leave requests pending?",
  "How many drivers do we have?",
];

export default function AssistantPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        eyebrow="AI"
        title="Assistant"
        description="Ask natural-language questions about finance, operations, fleet, fuel, HR and compliance."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1.5 text-[11px] font-medium text-brand-blue ring-1 ring-brand-blue/30">
            <Sparkles className="size-3" />
            Beta · rule-based
          </span>
        }
      />

      <Card>
        <CardContent className="!p-5">
          <div className="mb-3 text-xs uppercase tracking-wider text-fg-tertiary">
            Try one of these
          </div>
          <AssistantChat suggestions={SUGGESTIONS} />
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-fg-tertiary">
        Currently powered by a deterministic intent parser. A real Claude / GPT-backed
        planner can be swapped in by replacing <code className="font-mono">parseIntent()</code>
        — the executor shape is unchanged.
      </p>
    </div>
  );
}
