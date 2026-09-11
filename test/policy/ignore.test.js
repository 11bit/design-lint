import { describe, expect, it } from "vitest";

import { globToRegExp, ignoredFile, STORY_GLOBS } from "../../src/policy/ignore.js";

/**
 * `ignoreGlobs`, away from any rule.
 *
 * Every rule carries the option and every one of them defaults to the same pattern, so what
 * matters is that the pattern means what the contracts say it means — including on the
 * absolute paths Oxlint actually reports, which is the case a naive `**` gets wrong.
 */

describe("the default story pattern", () => {
  it("matches a story wherever it sits, in every language the rules lint", () => {
    expect(ignoredFile("/repo/src/ui/Button.stories.tsx", STORY_GLOBS)).toBe(true);
    expect(ignoredFile("/repo/src/ui/Button.stories.ts", STORY_GLOBS)).toBe(true);
    expect(ignoredFile("/repo/src/ui/Button.stories.jsx", STORY_GLOBS)).toBe(true);
    expect(ignoredFile("/repo/src/ui/Button.stories.js", STORY_GLOBS)).toBe(true);
    expect(ignoredFile("Button.stories.tsx", STORY_GLOBS)).toBe(true);
    expect(ignoredFile("C:\\repo\\src\\Button.stories.tsx", STORY_GLOBS)).toBe(true);
  });

  it("leaves the component alone", () => {
    expect(ignoredFile("/repo/src/ui/Button.tsx", STORY_GLOBS)).toBe(false);
    expect(ignoredFile("/repo/src/ui/Button.stories.css", STORY_GLOBS)).toBe(false);
    expect(ignoredFile("/repo/src/ui/Button.stories.mdx", STORY_GLOBS)).toBe(false);
    expect(ignoredFile("/repo/src/stories/Button.tsx", STORY_GLOBS)).toBe(false);
  });

  it("cannot be changed by the rule that borrowed it", () => {
    expect(Object.isFrozen(STORY_GLOBS)).toBe(true);
  });
});

describe("the syntax the contracts use", () => {
  it("keeps a single star inside one segment", () => {
    expect(globToRegExp("src/*.tsx").test("src/a.tsx")).toBe(true);
    expect(globToRegExp("src/*.tsx").test("src/nested/a.tsx")).toBe(false);
  });

  it("lets a trailing double star span the rest", () => {
    expect(globToRegExp("src/**").test("src/a/b/c.tsx")).toBe(true);
  });

  it("reads brace alternation and extglobs as alternatives", () => {
    expect(globToRegExp("a.{ts,tsx}").test("a.tsx")).toBe(true);
    expect(globToRegExp("a.@(ts|tsx)").test("a.ts")).toBe(true);
    expect(globToRegExp("a.@(ts|tsx)").test("a.js")).toBe(false);
    expect(globToRegExp("a?(.d).ts").test("a.d.ts")).toBe(true);
    expect(globToRegExp("a?(.d).ts").test("a.ts")).toBe(true);
  });

  it("treats a dot as a dot rather than as any character", () => {
    expect(globToRegExp("a.ts").test("axts")).toBe(false);
  });
});

describe("nothing to match", () => {
  it("ignores no file when the list is empty or the name is unknown", () => {
    expect(ignoredFile("/repo/a.stories.tsx", [])).toBe(false);
    expect(ignoredFile(undefined, STORY_GLOBS)).toBe(false);
  });
});

/**
 * A pattern that quietly fails to ignore a file is the least visible way a configuration can
 * be wrong, so the one construct that cannot be translated honestly says so.
 */
describe("a pattern this cannot honour", () => {
  it("throws rather than matching nothing", () => {
    expect(() => globToRegExp("!(*.test).ts")).toThrow(/not supported/);
  });
});
