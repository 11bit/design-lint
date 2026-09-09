import { describe, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { executable, label, loadContracts } from "./contracts.js";

/**
 * Every executed case must parse.
 *
 * This runs the whole corpus through a rule that never reports, as `valid`. That is the
 * point: under a no-op rule a case can only fail by failing to parse, so this file stays
 * green for the life of the project while the rules themselves come and go.
 *
 * It is not redundant with `corpus.test.js`. There, `caught` cases are expected to fail
 * while their rule is a stub — which means a case with a syntax error would *also* fail,
 * and look exactly like progress. Here it looks like what it is.
 */
const noop = {
  meta: {
    type: "problem",
    schema: [{ type: "object", additionalProperties: true }],
    docs: { description: "Parses the corpus" },
    messages: {},
  },
  create() {
    return {};
  },
};

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
});

for (const contract of loadContracts()) {
  tester.run(`${contract.rule} — every case parses`, noop, {
    valid: executable(contract).map((c) => ({
      name: label(contract, c),
      code: c.source,
      options: c.resolved,
    })),
    invalid: [],
  });
}
