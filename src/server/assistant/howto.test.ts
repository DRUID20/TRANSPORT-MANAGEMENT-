import { describe, expect, it } from "vitest";
import { answerHowto } from "./executor";
import { HOWTO_KB } from "./kb";

/**
 * Asserts that a question routes to a specific KB entry id.
 *
 * Built so we catch regressions when keywords or scoring tweak — if a real
 * operator question stops landing on the right answer, this fails before
 * production does.
 */
function expectKbHit(question: string, entryId: string) {
  const a = answerHowto(question);
  expect(a.recognised, `question "${question}" was not recognised`).toBe(true);
  const target = HOWTO_KB.find((e) => e.id === entryId);
  expect(target).toBeDefined();
  expect(
    a.text.includes(target!.question),
    `expected the answer for "${question}" to come from KB entry "${entryId}" (${target!.question}), got: ${a.text.slice(0, 120)}…`,
  ).toBe(true);
}

describe("answerHowto", () => {
  it("answers 'how do I create a booking' from the bookings entry", () => {
    expectKbHit("How do I create a booking?", "create-booking");
  });

  it("answers fuel-logging questions correctly", () => {
    expectKbHit("How do I log a fuel entry?", "log-fuel");
    expectKbHit("how to log fuel from uganda", "fuel-foreign-currency");
  });

  it("answers trip-flow questions correctly", () => {
    expectKbHit("How do I close a trip?", "close-trip");
    expectKbHit("how do I capture the discharged volume", "capture-discharge");
    expectKbHit("How do I reopen a closed trip?", "reopen-trip");
  });

  it("answers invoice / payment questions correctly", () => {
    expectKbHit("How do I send an invoice?", "send-invoice");
    expectKbHit("How do I record a customer payment?", "record-customer-payment");
    expectKbHit("How do I see who owes us money?", "aged-ar");
  });

  it("answers admin questions correctly", () => {
    expectKbHit("How do I create a new user?", "create-user");
    expectKbHit("How do I reset a user's password?", "resend-password");
    expectKbHit("How do I see what was changed in the system?", "audit-log");
  });

  it("answers asset-register questions correctly", () => {
    expectKbHit("How do I register a fixed asset?", "register-asset");
    expectKbHit("How do I run monthly depreciation?", "run-depreciation");
    expectKbHit("How do I dispose an asset?", "dispose-asset");
  });

  it("returns not-recognised for total nonsense", () => {
    const a = answerHowto("zebra socks marmalade");
    expect(a.recognised).toBe(false);
  });

  it("returns not-recognised for empty input", () => {
    const a = answerHowto("");
    expect(a.recognised).toBe(false);
  });

  it("attaches a deep link when the entry has one", () => {
    const a = answerHowto("how do I create a new user");
    expect(a.href).toBe("/admin/users");
  });
});
