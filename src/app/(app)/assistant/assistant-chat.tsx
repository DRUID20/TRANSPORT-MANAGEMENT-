"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Loader2, Send, Sparkles, User } from "lucide-react";
import { ask } from "@/server/actions/assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Answer } from "@/lib/types/assistant";

interface Turn {
  id: string;
  question: string;
  answer?: Answer;
  intentKind?: string;
  pending?: boolean;
}

export function AssistantChat({ suggestions }: { suggestions: string[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length]);

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTurns((prev) => [...prev, { id, question: q, pending: true }]);
    setInput("");
    start(async () => {
      const r = await ask(q);
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, answer: r.answer, intentKind: r.intentKind, pending: false } : t,
        ),
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-border bg-bg-base/60 px-3 py-1.5 text-xs text-fg-secondary transition-all hover:border-border-strong hover:bg-bg-elevated hover:text-fg-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <div
          ref={scrollRef}
          className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-bg-base/40 p-4"
        >
          {turns.map((t) => (
            <div key={t.id} className="flex flex-col gap-2">
              <UserBubble text={t.question} />
              {t.pending ? (
                <AssistantBubble pending />
              ) : t.answer ? (
                <AssistantBubble answer={t.answer} intentKind={t.intentKind} />
              ) : null}
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          placeholder="Ask a question, e.g. 'top 5 trucks by profit this year'"
          className="flex-1"
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Ask
        </Button>
      </form>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start justify-end gap-2">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md border border-border bg-bg-elevated px-4 py-2 text-sm text-fg-primary">
        {text}
      </div>
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-bg-base ring-1 ring-border">
        <User className="size-3.5 text-fg-tertiary" />
      </div>
    </div>
  );
}

function AssistantBubble({
  answer,
  intentKind,
  pending,
}: {
  answer?: Answer;
  intentKind?: string;
  pending?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 ring-1 ring-brand-blue/30">
        <Sparkles className="size-3.5 text-brand-blue" />
      </div>
      <div className="max-w-[90%] flex-1">
        <div
          className={
            "rounded-2xl rounded-tl-md border border-border bg-bg-elevated px-4 py-3 text-sm " +
            (answer && !answer.recognised ? "border-status-warning/30 bg-status-warning/5" : "")
          }
        >
          {pending ? (
            <div className="flex items-center gap-2 text-fg-tertiary">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Looking it up…</span>
            </div>
          ) : answer ? (
            <>
              <p className="whitespace-pre-wrap text-fg-primary">{answer.text}</p>
              {answer.table && answer.table.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-bg-base/40 text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                        {answer.table.headers.map((h) => (
                          <th key={h} className="px-3 py-1.5 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {answer.table.rows.map((row, i) => (
                        <tr key={i}>
                          {answer.table!.headers.map((h) => (
                            <td
                              key={h}
                              className="px-3 py-1.5 font-mono tnum text-fg-secondary"
                            >
                              {typeof row[h] === "number"
                                ? Number(row[h]).toLocaleString()
                                : row[h] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {answer.href && (
                <div className="mt-3">
                  <Link
                    href={answer.href}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                  >
                    {answer.hrefLabel ?? "Open report"}
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              )}
            </>
          ) : null}
        </div>
        {intentKind && intentKind !== "unknown" && (
          <div className="mt-1 px-1 font-mono text-[10px] text-fg-tertiary">
            intent: {intentKind}
          </div>
        )}
      </div>
    </div>
  );
}
