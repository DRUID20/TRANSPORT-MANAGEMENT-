"use server";

import type { Answer } from "@/lib/types/assistant";
import { executeIntent } from "@/server/assistant/executor";
import { parseIntent } from "@/server/assistant/parser";

export async function ask(question: string): Promise<{
  question: string;
  answer: Answer;
  intentKind: string;
}> {
  const intent = parseIntent(question);
  const answer = await executeIntent(intent);
  return { question, answer, intentKind: intent.kind };
}
