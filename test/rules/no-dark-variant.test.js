import { describe, expect, it } from "vitest";

import rule from "../../src/rules/no-dark-variant.js";
import { designSystem } from "../harness/options.js";

/**
 * The one way this rule refuses to run, and the one way it must not.
 *
 * Neither can be written as a contract case: the corpus asserts what a rule reports, and a
 * rule that throws reports nothing at all — which is the failure mode being guarded
 * against. The asymmetry is the point. `flagNonColorUtilities: false` narrows reporting to
 * classes that carry a colour, a question only the resolved design system can answer, so
 * without it the rule would fall silent in exactly the configuration a project chose to
 * make it quieter — indistinguishable from a clean codebase. The default reading needs no
 * such answer, and demanding one there would make a rule that works fine refuse to start.
 */
const create = (options) => rule.create({ options: [options], filename: "a.tsx" });

describe("refusing to run", () => {
  it("throws when narrowed to colour utilities without a resolved design system", () => {
    expect(() => create({ flagNonColorUtilities: false })).toThrow(/needs the resolved design system/);
  });

  it("throws when the design system arrived as a JSON husk with its methods gone", () => {
    expect(() =>
      create({ flagNonColorUtilities: false, designSystem: JSON.parse('{"colorPrefixes":{}}') }),
    ).toThrow(/needs the resolved design system/);
  });

  it("starts on the widest reading with nothing bound, because it asks Tailwind nothing", () => {
    expect(() => rule.create({ options: [], filename: "a.tsx" })).not.toThrow();
  });

  it("starts when narrowed and the design system is bound", () => {
    expect(() => create({ flagNonColorUtilities: false, designSystem })).not.toThrow();
  });
});
