import { describe, expect, it } from "vitest";
import { parseIntent } from "./parser";

describe("parseIntent", () => {
  it("returns unknown for empty input", () => {
    expect(parseIntent("").kind).toBe("unknown");
  });

  it("recognises help / greetings", () => {
    expect(parseIntent("help").kind).toBe("help");
    expect(parseIntent("hello").kind).toBe("help");
    expect(parseIntent("Hi!").kind).toBe("help");
  });

  it("classifies AR + AP outstanding", () => {
    expect(parseIntent("How much do customers owe us?").kind).toBe("ar_outstanding");
    expect(parseIntent("What do we owe suppliers?").kind).toBe("ap_outstanding");
    expect(parseIntent("receivables").kind).toBe("ar_outstanding");
    expect(parseIntent("show payables").kind).toBe("ap_outstanding");
  });

  it("classifies overdue invoices specifically over generic AR", () => {
    expect(parseIntent("show overdue invoices").kind).toBe("overdue_invoices");
    expect(parseIntent("who is late paying").kind).toBe("overdue_invoices");
  });

  it("classifies profit + revenue questions", () => {
    expect(parseIntent("what's our profit this month?").kind).toBe("profit_this_period");
    expect(parseIntent("show me revenue this year").kind).toBe("revenue_period");
  });

  it("classifies fuel questions, distinguishing best from worst", () => {
    expect(parseIntent("which trucks use the most fuel").kind).toBe("worst_fuel");
    expect(parseIntent("show worst fuel consumption").kind).toBe("worst_fuel");
    expect(parseIntent("most efficient trucks").kind).toBe("best_fuel");
  });

  it("classifies compliance + leave + trips", () => {
    expect(parseIntent("what licences are expiring").kind).toBe("compliance_expiring");
    expect(parseIntent("any leave requests pending").kind).toBe("leave_pending");
    expect(parseIntent("show me open trips").kind).toBe("open_trips");
  });

  it("extracts top-N limit", () => {
    expect(parseIntent("top 3 trucks by profit").limit).toBe(3);
    expect(parseIntent("top trucks").limit).toBe(5);
    expect(parseIntent("first 7 best trucks").limit).toBe(7);
  });

  it("extracts date ranges", () => {
    const thisMonth = parseIntent("profit this month")!;
    expect(thisMonth.range?.label).toBe("this month");
    expect(thisMonth.range?.fromDate.endsWith("-01")).toBe(true);

    const lastMonth = parseIntent("revenue last month")!;
    expect(lastMonth.range?.label).toBe("last month");

    const ytd = parseIntent("ytd profit")!;
    expect(ytd.range?.label).toBe("this year");
  });

  it("falls back to howto for unmatched phrasing (KB executor decides if it recognises)", () => {
    // Nonsense still routes through howto — the executor returns
    // recognised:false when the KB has no match, so the end user still
    // sees a graceful "rephrase" prompt.
    expect(parseIntent("banana pancakes").kind).toBe("howto");
  });
});
