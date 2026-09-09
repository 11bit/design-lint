import { describe, expect, it } from "vitest";

import { classTokens } from "../../src/policy/tokenize.js";

/**
 * Tokenization, away from the parser.
 *
 * The extractor tests cover this through real source code; these cover the boundary rules
 * directly, because that is where the behaviour is subtle: whether a hole ends a token or
 * sits inside one decides whether a rule sees a class, a prefix, or nothing.
 */

const literal = (text) => ({ node: {}, segments: [{ text, followedByExpression: false }] });

/** A template, written the way it reads: `template("bg-", "-500")` is `` `bg-${x}-500` ``. */
const template = (...texts) => ({
  node: {},
  segments: texts.map((text, i) => ({ text, followedByExpression: i < texts.length - 1 })),
});

const render = (tokens) => tokens.map((t) => (t.dynamic ? `${t.head}|${t.tail}` : t.text));

describe("static strings", () => {
  it("splits on whitespace", () => {
    expect(render(classTokens(literal("p-2 bg-primary")))).toEqual(["p-2", "bg-primary"]);
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(render(classTokens(literal("  p-2   bg-primary \n")))).toEqual(["p-2", "bg-primary"]);
  });

  it("finds nothing in whitespace alone", () => {
    expect(classTokens(literal("   "))).toEqual([]);
    expect(classTokens(literal(""))).toEqual([]);
  });
});

describe("a hole between tokens", () => {
  it("is a boundary when whitespace separates it", () => {
    expect(render(classTokens(template("rounded ", " text-blue-200")))).toEqual([
      "rounded",
      "text-blue-200",
    ]);
  });

  it("leaves a complete class complete", () => {
    expect(render(classTokens(template("bg-primary ", "")))).toEqual(["bg-primary"]);
  });

  it("yields nothing when it stands alone", () => {
    expect(classTokens(template("", ""))).toEqual([]);
    expect(classTokens(template("", " ", ""))).toEqual([]);
  });
});

describe("a hole inside a token", () => {
  it("keeps the static prefix, which is what a rule tests", () => {
    const [token] = classTokens(template("text-", ""));
    expect(token).toMatchObject({ dynamic: true, head: "text-", tail: "", text: null });
  });

  it("keeps the text after the last hole", () => {
    expect(render(classTokens(template("bg-", "-500")))).toEqual(["bg-|-500"]);
  });

  it("survives several holes in one token", () => {
    const [token] = classTokens(template("bg-", "-", "-500"));
    expect(token).toMatchObject({ dynamic: true, head: "bg-", tail: "-500" });
  });

  it("does not leak into the neighbouring token", () => {
    expect(render(classTokens(template("p-2 bg-", "-500 rounded")))).toEqual([
      "p-2",
      "bg-|-500",
      "rounded",
    ]);
  });

  it("marks an opacity modifier against a hole", () => {
    expect(render(classTokens(template("bg-primary/", "")))).toEqual(["bg-primary/|"]);
  });

  it("marks a variant against a hole", () => {
    expect(render(classTokens(template("dark:", "")))).toEqual(["dark:|"]);
  });
});
