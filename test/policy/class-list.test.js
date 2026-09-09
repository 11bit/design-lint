import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { classShaped, colorPrefixOf, isClassList } from "../../src/policy/class-list.js";
import { designSystemPolicy } from "../../src/policy/design-system.js";
import { loadDesignSystem } from "../../src/policy/load.js";
import { classTokens } from "../../src/policy/tokenize.js";

const FIXTURE = fileURLToPath(new URL("../fixtures/theme.css", import.meta.url));
const BASE = fileURLToPath(new URL("../..", import.meta.url));

/** @type {import("../../src/policy/design-system.js").DesignSystemPolicy} */
let policy;

beforeAll(async () => {
  policy = designSystemPolicy(await loadDesignSystem(readFileSync(FIXTURE, "utf-8"), { base: BASE }));
});

/** A class source in the shape the sweep produces, without going through a parser. */
const literal = (text) => ({
  node: {},
  segments: [{ text, followedByExpression: false }],
});

const classList = (text) => isClassList(classTokens(literal(text)), policy, policy.colorPrefixes);

describe("colorPrefixOf", () => {
  it("finds the prefix and the token name after it", () => {
    expect(colorPrefixOf("bg-primary", policy.colorPrefixes)).toEqual({
      prefix: "bg",
      token: "primary",
    });
  });

  // The token name is what a message asks the author to define, so the wrong split names a
  // token nobody could add: `--color-t-outline` is not a thing.
  it("takes the longest prefix, so a per-side family keeps its side", () => {
    expect(colorPrefixOf("border-t-outline", policy.colorPrefixes)).toEqual({
      prefix: "border-t",
      token: "outline",
    });
  });

  it("finds nothing under a prefix that carries no colour", () => {
    expect(colorPrefixOf("rounded-warning", policy.colorPrefixes)).toBeNull();
  });

  // What a `"bg-" + tone` concatenation leaves in the file. A prefix with no colour part
  // names no token, and treating it as one would report the blind spot every contract on
  // this sweep declares.
  it("finds nothing in a bare prefix", () => {
    expect(colorPrefixOf("bg-", policy.colorPrefixes)).toBeNull();
  });
});

describe("classShaped", () => {
  it("accepts a class that generates CSS", () => {
    expect(classShaped("flex", policy, policy.colorPrefixes)).toBe(true);
    expect(classShaped("text-sm", policy, policy.colorPrefixes)).toBe(true);
  });

  // The half that matters: an undefined colour class generates nothing and is still
  // evidently a class, or the rule that reports them would disqualify its own subject.
  it("accepts an undefined class under a colour prefix", () => {
    expect(classShaped("text-secondary", policy, policy.colorPrefixes)).toBe(true);
  });

  it("rejects a word that is neither", () => {
    expect(classShaped("layouts", policy, policy.colorPrefixes)).toBe(false);
    expect(classShaped("", policy, policy.colorPrefixes)).toBe(false);
  });
});

describe("isClassList", () => {
  it("accepts a string whose every segment is class-shaped", () => {
    expect(classList("bg-primary text-secondary")).toBe(true);
  });

  // The prose shape, which is the reason this module exists. One segment that could not be
  // a class is enough to say the string is a sentence.
  it("rejects a sentence containing a class-shaped word", () => {
    expect(classList("text-heavy layouts")).toBe(false);
  });

  it("accepts the residual — one class-shaped word, alone", () => {
    expect(classList("text-heavy")).toBe(true);
  });

  it("rejects a path, which no prefix matches", () => {
    expect(classList("/bg-hero.png")).toBe(false);
    expect(classList("/api/border-radius")).toBe(false);
  });

  it("rejects a string with no tokens at all", () => {
    expect(classList("")).toBe(false);
    expect(classList("   ")).toBe(false);
  });

  // An interpolation is half a class, so there is nothing to judge — and letting it veto
  // the string would silence the static classes standing beside it.
  it("lets an interpolated token pass without vetoing its neighbours", () => {
    const source = {
      node: {},
      segments: [
        { text: "text-secondary ", followedByExpression: true },
        { text: "", followedByExpression: false },
      ],
    };
    expect(isClassList(classTokens(source), policy, policy.colorPrefixes)).toBe(true);
  });
});
