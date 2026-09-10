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

/**
 * Ranges, which every rule needs and none should recover for itself.
 *
 * These fixtures give segments offsets the way `sources.js` does — the text starts one
 * character past the node, after the quote or the backtick — so the arithmetic is tested
 * here and the parser's part of it in `test/extract`.
 */
describe("range", () => {
  const at = (start, text, { exact = true, hole = false } = {}) => ({
    text,
    followedByExpression: hole,
    start,
    exact,
  });
  const rangesOf = (segments) => classTokens({ node: {}, segments }).map((t) => t.range);

  it("spans the class, not the string that holds it", () => {
    // `"bg-red-500 text-sm"` with the quote at offset 10.
    expect(rangesOf([at(11, "bg-red-500 text-sm")])).toEqual([
      [11, 21],
      [22, 29],
    ]);
  });

  it("gives a repeated class two distinct spans", () => {
    // The case a cursor walk over raw text exists to handle, and the case it gets wrong.
    expect(rangesOf([at(11, "p-2 p-2")])).toEqual([
      [11, 14],
      [15, 18],
    ]);
  });

  it("spans the hole a dynamic class is written around", () => {
    // `` `bg-${tone}-500` `` — the class as written is the whole thing, hole included.
    expect(rangesOf([at(11, "bg-", { hole: true }), at(21, "-500")])).toEqual([[11, 25]]);
  });

  it("carries no range when an escape moved every offset after it", () => {
    // The tab is one raw escape and one cooked character, so both classes around it would
    // be reported a character out. Every token of the segment loses its range, not just the
    // ones after the escape — the segment is what is untrustworthy.
    expect(rangesOf([at(11, "a\tbg-red-500", { exact: false })])).toEqual([null, null]);
  });

  it("carries no range for a segment that never had offsets", () => {
    expect(classTokens(literal("bg-red-500"))[0].range).toBeNull();
  });
});
