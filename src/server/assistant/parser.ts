/**
 * Rule-based intent parser. Maps natural-language questions to structured
 * Intents. Designed to be replaced by an LLM-backed planner that emits
 * the same shape — call sites only depend on Intent.
 */

import type { Intent, IntentKind, IntentRange } from "@/lib/types/assistant";

function dayIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // Monday-start
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function detectRange(q: string): IntentRange | undefined {
  const now = new Date();
  const today = dayIso(now);

  if (/this week|the week|past week|last 7 days/.test(q)) {
    const start = startOfWeek(now);
    return { fromDate: dayIso(start), toDate: today, label: "this week" };
  }
  if (/last week/.test(q)) {
    const start = startOfWeek(now);
    const lastStart = new Date(start);
    lastStart.setDate(lastStart.getDate() - 7);
    const lastEnd = new Date(start);
    lastEnd.setDate(lastEnd.getDate() - 1);
    return { fromDate: dayIso(lastStart), toDate: dayIso(lastEnd), label: "last week" };
  }
  if (/this month|the month/.test(q)) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromDate: dayIso(start), toDate: today, label: "this month" };
  }
  if (/last month/.test(q)) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { fromDate: dayIso(start), toDate: dayIso(end), label: "last month" };
  }
  if (/this year|year to date|ytd/.test(q)) {
    const start = new Date(now.getFullYear(), 0, 1);
    return { fromDate: dayIso(start), toDate: today, label: "this year" };
  }
  if (/last year/.test(q)) {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31);
    return { fromDate: dayIso(start), toDate: dayIso(end), label: "last year" };
  }
  if (/today/.test(q)) {
    return { fromDate: today, toDate: today, label: "today" };
  }
  return undefined;
}

function detectLimit(q: string): number | undefined {
  const m = q.match(/top\s+(\d+)|first\s+(\d+)|(\d+)\s+best/i);
  if (m) return parseInt(m[1] ?? m[2] ?? m[3] ?? "0", 10) || undefined;
  if (/top\b/i.test(q)) return 5;
  return undefined;
}

interface Rule {
  kind: IntentKind;
  /** Pattern must match (case-insensitive). */
  match: RegExp;
}

const RULES: Rule[] = [
  // How-to (must run before the data rules — "how do I see who owes us" is
  // a how-to, not an AR query). The keyword routing is intentionally broad;
  // the executor's scoring picks the best KB entry from there.
  {
    kind: "howto",
    match:
      /\b(how (do|can|should) (i|we|you)|how to|how would i|where (do|can) i|what'?s the way to|what is the way to|guide me|teach me|show me how|walk me through|tell me how|explain how|where is|where can i find|i don'?t know how|i dont know how|i need to know how|steps to|instructions to|process (to|for))\b/,
  },
  // Bare "how to X" or "where is X" at the start of the question.
  // Kept narrow — don't grab "what do we owe" (that's an AP query, not how-to).
  {
    kind: "howto",
    match: /^\s*(how to|how can|where is|where can)\b/,
  },
  // AR
  { kind: "overdue_invoices", match: /overdue|past due|late paying|late pay|behind/ },
  { kind: "ar_outstanding", match: /customer.*owe|owed by customer|how much .*owed|receivables|outstanding invoice|outstanding AR|ar balance|debtor/ },
  // AP
  { kind: "ap_outstanding", match: /supplier.*owe|owe (the )?supplier|payable|how much do we owe|outstanding bill|outstanding AP|ap balance|creditor/ },
  // Profit
  { kind: "profit_this_period", match: /profit|p\s*&\s*l|net income|net profit/ },
  // Revenue
  { kind: "revenue_period", match: /revenue|sales|turnover|income/ },
  // Trucks
  { kind: "top_trucks_by_profit", match: /(top|most profitable|best).*truck|truck.*(profit|earning|revenue)|truck.*top|leaderboard/ },
  // Fuel
  { kind: "best_fuel", match: /(best|most efficient).*(fuel|consumption|truck)|fuel.*(best|efficient)/ },
  { kind: "worst_fuel", match: /(worst|least efficient|gas guzzler|most fuel|highest fuel).*(fuel|truck|consumption)?|truck.*(worst|guzzler)/ },
  // Compliance
  { kind: "compliance_expiring", match: /(licence|license|medical|passport|comesa|permit|cert|certificate|compliance).*(expir|due|renew)/ },
  // Leave
  { kind: "leave_pending", match: /(leave|holiday|absence).*(pending|awaiting|requested|approval)|pending leave/ },
  // Trips
  { kind: "open_trips", match: /(open|active|in.progress|running).*(trip|load)|trips? (running|in progress)|trips? today/ },
  // Headcount
  { kind: "headcount", match: /(headcount|how many (people|employees|staff))/ },
  // Fleet size
  { kind: "fleet_size", match: /(how many|count|number of).*(truck|trailer|driver|vehicle)|fleet size/ },
  // Help
  { kind: "help", match: /^(help|what can you do|examples|hi|hello|hey)\b/ },
];

export function parseIntent(question: string): Intent {
  const q = question.trim().toLowerCase();
  if (q.length === 0) {
    return { kind: "unknown", question };
  }

  for (const r of RULES) {
    if (r.match.test(q)) {
      return {
        kind: r.kind,
        question,
        range: detectRange(q),
        limit: detectLimit(q),
      };
    }
  }
  // Fallback: try the how-to KB. The executor's scoring will only return a
  // recognised answer if it actually matches something; otherwise it falls
  // through to the generic "I didn't understand" reply.
  return { kind: "howto", question };
}
