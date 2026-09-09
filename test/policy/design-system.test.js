import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { designSystemPolicy } from "../../src/policy/design-system.js";
import { loadDesignSystem } from "../../src/policy/load.js";

const FIXTURE = fileURLToPath(new URL("../fixtures/theme.css", import.meta.url));
const BASE = fileURLToPath(new URL("../..", import.meta.url));

/** @type {import("../../src/policy/design-system.js").DesignSystemPolicy} */
let policy;
/** The design system itself, for the one test that builds a second policy over it. */
let designSystem;

beforeAll(async () => {
  designSystem = await loadDesignSystem(readFileSync(FIXTURE, "utf-8"), { base: BASE });
  policy = designSystemPolicy(designSystem);
});

describe("colorPrefixes", () => {
  it("derives the prefixes the proof of concept hardcoded", () => {
    // The seventeen names in `lint-color/shared.js`. Deriving must not lose any of them.
    for (const prefix of [
      "bg", "text", "border", "ring-offset", "ring", "fill", "stroke",
      "from", "to", "via", "divide", "placeholder",
      "caret", "accent", "outline", "decoration", "shadow",
    ]) {
      expect(policy.colorPrefixes).toContain(prefix);
    }
  });

  // The reason the derivation exists at all: these are the families a hand-written list
  // silently misses, and every one of them is a colour a rule would never have looked at.
  it("derives the prefixes the hardcoded list missed", () => {
    for (const prefix of ["inset-ring", "inset-shadow", "text-shadow", "drop-shadow"]) {
      expect(policy.colorPrefixes).toContain(prefix);
    }
  });

  it("derives every per-side border family", () => {
    for (const side of ["t", "r", "b", "l", "x", "y", "s", "e"]) {
      expect(policy.colorPrefixes).toContain(`border-${side}`);
    }
  });

  it("does not admit a prefix that never carries a colour", () => {
    for (const prefix of ["p", "m", "w", "flex", "font", "aspect", "grid-cols"]) {
      expect(policy.colorPrefixes).not.toContain(prefix);
    }
  });

  it("adds plugin prefixes from options without replacing the derived set", () => {
    const withPlugin = designSystemPolicy(designSystem, { extraPrefixes: ["brand-glow"] });
    expect(withPlugin.colorPrefixes).toContain("brand-glow");
    expect(withPlugin.colorPrefixes).toContain("bg");
  });
});

describe("resolves", () => {
  it("accepts palette and semantic tokens alike", () => {
    expect(policy.resolves("bg-red-500")).toBe(true);
    expect(policy.resolves("text-primary")).toBe(true);
    expect(policy.resolves("bg-danger-muted")).toBe(true);
  });

  it("rejects a token that was never defined", () => {
    expect(policy.resolves("text-nonexistent")).toBe(false);
    expect(policy.resolves("bg-primaryy")).toBe(false);
  });

  it("treats an empty expansion as unresolved", () => {
    // Tailwind answers an unknown value under a known root with no declarations rather
    // than a null. Both mean the same thing to a rule.
    expect(policy.resolves("ring-2/50")).toBe(false);
    expect(policy.resolves("border-2/50")).toBe(false);
  });

  it("is not a class test — a string that is not a class simply does not resolve", () => {
    expect(policy.resolves("Hello world")).toBe(false);
    expect(policy.resolves("")).toBe(false);
  });
});

describe("isColorClass", () => {
  it("accepts a semantic token", () => {
    expect(policy.isColorClass("text-primary")).toBe(true);
    expect(policy.isColorClass("bg-danger-muted")).toBe(true);
    expect(policy.isColorClass("bg-card")).toBe(true);
  });

  it("accepts a palette class, opacity modifier or not", () => {
    expect(policy.isColorClass("bg-red-500")).toBe(true);
    // The reference survives the `color-mix()` wrapper the modifier puts around it.
    expect(policy.isColorClass("bg-primary/50")).toBe(true);
  });

  // The near-miss that makes prefix matching alone unusable. Same shape, opposite verdicts.
  it("separates text-<size> from text-<color>", () => {
    expect(policy.isColorClass("text-sm/6")).toBe(false);
    expect(policy.isColorClass("text-lg")).toBe(false);
    expect(policy.isColorClass("text-primary/50")).toBe(true);
  });

  it("accepts an arbitrary colour value", () => {
    expect(policy.isColorClass("text-[#fff]")).toBe(true);
    expect(policy.isColorClass("text-[red]")).toBe(true);
    expect(policy.isColorClass("bg-[var(--color-brand)]")).toBe(true);
  });

  it("rejects an arbitrary value that is not a colour", () => {
    // `bg` carries colours, but the `image:` type hint sends this to `background-image`.
    expect(policy.isColorClass("bg-[image:var(--x)]")).toBe(false);
    expect(policy.isColorClass("bg-[url(a/b.png)]")).toBe(false);
  });

  // A default that happens to contain a literal colour is not a colour the author chose.
  // `shadow-sm/50` resolves and expands to `rgb(0 0 0 / 0.1)`; its body is `sm`.
  it("rejects a non-colour body under a colour prefix", () => {
    expect(policy.isColorClass("shadow-sm/50")).toBe(false);
    expect(policy.isColorClass("shadow-sm")).toBe(false);
    expect(policy.isColorClass("drop-shadow-sm")).toBe(false);
  });

  it("rejects a gradient stop position under a colour prefix", () => {
    // `from` carries colours, and `from-50%` emits an `@property` block whose descriptor
    // says `syntax: "<color>"`. A colour test that walked at-rules would report it.
    expect(policy.isColorClass("from-50%")).toBe(false);
    expect(policy.isColorClass("mask-t-from-50%")).toBe(false);
  });

  it("rejects a class that does not resolve", () => {
    expect(policy.isColorClass("text-nonexistent")).toBe(false);
  });
});
