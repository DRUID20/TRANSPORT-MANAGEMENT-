import { describe, expect, it } from "vitest";
import { renderTemplate } from "./notifications";

describe("renderTemplate", () => {
  it("substitutes flat keys", () => {
    expect(renderTemplate("Hello {{name}}", { name: "Esther" })).toBe("Hello Esther");
  });

  it("renders missing keys as empty string", () => {
    expect(renderTemplate("Hi {{missing}}!", {})).toBe("Hi !");
  });

  it("supports nested keys via dot notation", () => {
    expect(
      renderTemplate("{{employee.fullName}}", { employee: { fullName: "Faith Njeri" } }),
    ).toBe("Faith Njeri");
  });

  it("ignores whitespace inside braces", () => {
    expect(renderTemplate("{{  key  }}", { key: 7 })).toBe("7");
  });

  it("renders numbers and booleans as strings", () => {
    expect(renderTemplate("{{n}}/{{b}}", { n: 42, b: true })).toBe("42/true");
  });

  it("returns empty for null / undefined values", () => {
    expect(renderTemplate("{{a}}-{{b}}", { a: null, b: undefined })).toBe("-");
  });
});
