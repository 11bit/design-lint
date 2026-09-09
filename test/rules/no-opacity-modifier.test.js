import { describe, expect, it } from "vitest";

import rule from "../../src/rules/no-opacity-modifier.js";
import { designSystem } from "../harness/options.js";

/**
 * The two ways this rule refuses to run.
 *
 * Neither can be written as a contract case: the corpus asserts what a rule reports, and a
 * rule that throws reports nothing at all — which is exactly the failure mode being
 * guarded against. A missing design system or an option whose machinery does not exist
 * must be indistinguishable from a broken build, never from a clean codebase.
 */
const create = (options) => rule.create({ options: [options] });

describe("refusing to run", () => {
  it("throws without a resolved design system, rather than reporting nothing", () => {
    expect(() => create({})).toThrow(/designSystem is required/);
    expect(() => rule.create({ options: [] })).toThrow(/designSystem is required/);
  });

  it("throws on an ignoreGlobs it would silently ignore", () => {
    expect(() => create({ designSystem, ignoreGlobs: ["**/*.stories.tsx"] })).toThrow(
      /ignoreGlobs is not implemented/,
    );
  });

  it("accepts the empty exclusion the option defaults to", () => {
    expect(() => create({ designSystem, ignoreGlobs: [] })).not.toThrow();
  });
});
