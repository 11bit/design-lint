import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import { ruleFor } from "../harness/options.js";

/**
 * A replacement is named only when the project defines it.
 *
 * The contract corpus asserts how many reports a case produces, not which message — so the
 * difference between "use bg-danger instead" and a plain report cannot be a contract case.
 * The fixture stylesheet defines `danger-muted` but no `danger`, which is exactly the
 * project the default map is wrong for.
 */
RuleTester.describe = describe;
RuleTester.it = it;

const config = { eslintCompat: true, languageOptions: { parserOptions: { lang: "tsx" } } };

new RuleTester(config).run("no-spectral-color — replacements", ruleFor("no-spectral-color"), {
  valid: [],
  invalid: [
    {
      name: "a default replacement the project does not define is not suggested",
      code: '<div className="bg-red-500" />',
      errors: [{ messageId: "spectralColor" }],
    },
    {
      name: "a replacement the project defines is named, and offered as a suggestion",
      code: '<div className="bg-red-500" />',
      options: [{ replacement: { bg: [{ "red-400...600": "danger-muted" }] } }],
      errors: [
        {
          messageId: "spectralColorWithReplacement",
          suggestions: [{ messageId: "useReplacement", output: '<div className="bg-danger-muted" />' }],
        },
      ],
    },
    {
      name: "a consumer's map naming a missing token is not suggested either",
      code: '<div className="bg-red-500" />',
      options: [{ replacement: { bg: [{ "red-400...600": "nonesuch" }] } }],
      errors: [{ messageId: "spectralColor" }],
    },
  ],
});
