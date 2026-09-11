import { describe, expect, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import rule from "../../src/rules/no-undefined-token.js";
import { ruleFor, sparseDesignSystem } from "../harness/options.js";

/**
 * The two promises this rule's contract makes that its corpus cannot express.
 *
 * The corpus asserts what a rule reports, which leaves both of these out of reach: a rule
 * that throws reports nothing at all, and a case counts reports without ever reading one.
 * Both are promises about the rule that reports an *absence*, where a report and its
 * message are the only evidence anything ran.
 */

const create = (options) => rule.create({ options: [options] });

describe("refusing to run", () => {
  /**
   * The failure mode the proof of concept had backwards. It built its resolver with
   * `.catch(() => null)` and returned early, so a missing dependency or an unresolvable
   * `@import` turned the rule off with no output and exit code 0 — indistinguishable from a
   * codebase with no violations, and quietly weakening `token-constraints` with it.
   *
   * The design system is bound rather than passed as an option, so a severity-only
   * override cannot remove it; what reaches this check is the rule run outside the plugin.
   * `entryPoint` names a file in the message and builds nothing, so supplying it alone
   * changes nothing here.
   */
  it("throws without a resolved design system, rather than reporting nothing", () => {
    expect(() => rule.create({ options: [] })).toThrow(/designSystem/);
    expect(() => create({})).toThrow(/designSystem/);
    expect(() => create({ entryPoint: "src/styles.css" })).toThrow(/designSystem/);
  });

  /**
   * A design system passed as an option instead of bound arrives as a husk — every method
   * gone, `colorPrefixes` an empty object — which would otherwise resolve nothing, report
   * everything, and look like a rule that had simply gone mad.
   */
  it("throws on a design system that did not survive JSON", () => {
    const husk = JSON.parse(JSON.stringify({ designSystem: sparseDesignSystem }));
    expect(() => create(husk)).toThrow(/designSystem/);
  });

  /**
   * The spelling hint is not the diagnostic. Without a token set the rule still answers its
   * own question, so it runs; refusing here would trade a real report for a nicety.
   */
  it("runs without a token set, which only costs it the candidates", () => {
    expect(() => create({ designSystem: sparseDesignSystem })).not.toThrow();
  });
});

/**
 * Suggestions do not render in any CLI output format and `meta.docs.url` is dead under
 * Oxlint, so the message text is the only channel this rule has. The retired Phase 4 left
 * behind one acceptance criterion — the typo candidate must reach that text — and this is
 * where it is checked: `locations.test.js` asserts the suggestion payload, which is the
 * half a terminal never sees.
 */
RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
}).run("no-undefined-token — the message a terminal prints", ruleFor("no-undefined-token"), {
  valid: [],
  invalid: [
    {
      name: "names the candidate, the token and the file to add it to",
      code: '<div className="bg-primry" />;',
      errors: [
        {
          message:
            "bg-primry generates no CSS — primry is not defined; check the spelling — did you mean bg-primary? — or add --color-primry to src/styles.css",
        },
      ],
    },
    {
      name: "leads with the spelling when the design system has no candidate to offer",
      code: '<div className="text-secondary" />;',
      errors: [
        {
          message:
            "text-secondary generates no CSS — secondary is not defined; check the spelling, or add --color-secondary to src/styles.css",
        },
      ],
    },
  ],
});
