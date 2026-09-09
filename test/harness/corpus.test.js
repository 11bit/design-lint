import { describe, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { executable, label, loadContracts } from "./contracts.js";
import { rules } from "../../src/rules/index.js";

/**
 * The corpus, executed.
 *
 * `allowed` and `blindspot` cases are ordinary assertions: the rule must stay silent, and
 * it must keep staying silent as the rule grows. A blind spot that quietly starts
 * reporting fails here, which is the whole reason blind spots are written as cases rather
 * than as prose.
 *
 * `caught` cases are assertions the rule cannot satisfy yet. While its contract is
 * `status: agreed` they run inverted — the test passes because the stub reports nothing,
 * and the count of them is the size of the work remaining. When Phase 5 implements a rule
 * its contract becomes `status: implemented`, the inversion goes away, and every `caught`
 * case has to hold for real. Nothing has to be remembered or re-tagged: the contract's own
 * status is the switch.
 */

/**
 * Vitest runs a `describe` callback when it collects the file, not when `run()` is called,
 * so swapping `RuleTester.it` around each `run()` does not work — by collection time it
 * holds whatever was assigned last. The switch therefore travels with the test case, in its
 * name, and one dispatcher reads it.
 */
const PENDING = " — pending implementation";

RuleTester.describe = describe;
RuleTester.it = (name, fn) => (name.endsWith(PENDING) ? it.fails(name, fn) : it(name, fn));

const config = {
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
};

export const baseline = [];

for (const contract of loadContracts()) {
  const rule = rules[contract.rule];
  const implemented = contract.status === "implemented";

  const cases = executable(contract);
  const silent = cases.filter((c) => c.tag !== "caught");
  const reports = cases.filter((c) => c.tag === "caught");

  baseline.push({ rule: contract.rule, implemented, silent: silent.length, reports: reports.length });

  new RuleTester(config).run(`${contract.rule} — allows and blind spots`, rule, {
    valid: silent.map((c) => ({
      name: label(contract, c),
      code: c.source,
      options: c.resolved,
    })),
    invalid: [],
  });

  new RuleTester(config).run(`${contract.rule} — promises to catch`, rule, {
    valid: [],
    invalid: reports.map((c) => ({
      name: label(contract, c) + (implemented ? "" : PENDING),
      code: c.source,
      options: c.resolved,
      errors: c.count,
    })),
  });
}
