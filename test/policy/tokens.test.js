import { describe, expect, it } from "vitest";

import { colorTokenNames, resolveTokenSet } from "../../src/policy/tokens.js";

describe("colorTokenNames", () => {
  it("reads the names a stylesheet defines", () => {
    expect(colorTokenNames(`@theme {
      --color-primary: oklch(0.62 0.19 259);
      --color-danger-muted: oklch(0.7 0.1 25);
    }`)).toEqual(["primary", "danger-muted"]);
  });

  // The distinction the colon exists to draw: a definition names a token, a reference uses
  // one. A scan that missed this would report every token any rule mentioned as defined.
  it("does not mistake a reference for a definition", () => {
    expect(colorTokenNames(`.a { color: var(--color-primary); }`)).toEqual([]);
  });

  it("ignores custom properties outside the colour namespace", () => {
    expect(colorTokenNames(`@theme {
      --text-sm: 0.875rem;
      --spacing: 0.25rem;
      --color-card: white;
    }`)).toEqual(["card"]);
  });

  it("finds nothing in a stylesheet that defines nothing", () => {
    expect(colorTokenNames(`@import "tailwindcss";`)).toEqual([]);
  });
});

describe("resolveTokenSet", () => {
  it("takes an already-resolved set", () => {
    expect(resolveTokenSet({ tokens: ["primary", "card"] })).toEqual(new Set(["primary", "card"]));
  });

  it("takes stylesheet text", () => {
    expect(resolveTokenSet({ css: `@theme { --color-primary: red; }` })).toEqual(new Set(["primary"]));
  });

  // Phase 2's interface requirement, stated as a test: a corpus case that varies the token
  // set must be able to hand one over without inventing a file for it.
  it("prefers a resolved set over stylesheet text", () => {
    const set = resolveTokenSet({ tokens: ["only-this"], css: `@theme { --color-primary: red; }` });
    expect(set).toEqual(new Set(["only-this"]));
  });

  it("is empty when given nothing", () => {
    expect(resolveTokenSet()).toEqual(new Set());
    expect(resolveTokenSet({})).toEqual(new Set());
  });
});
