import { RuleTester } from "oxlint/plugins-dev";
import { describe, expect, it } from "vitest";

import { rules } from "../../src/rules/index.js";
import { executable, loadContracts } from "../harness/contracts.js";
import { ruleFor } from "../harness/options.js";

/**
 * Story files, across all nine rules.
 *
 * A story file was once reported by four rules and skipped by five, under two option names
 * and three default globs, and one rule threw when handed the option at all. The contracts
 * cannot say so themselves — a contract case has no filename — so it is asserted here, once
 * per rule, with each contract's own first `caught` case as the probe: code the rule is
 * already known to report anywhere else.
 */

const STORY = "/repo/src/ui/Button.stories.tsx";
const COMPONENT = "/repo/src/ui/Button.tsx";

RuleTester.describe = describe;
RuleTester.it = it;

const config = { eslintCompat: true, languageOptions: { parserOptions: { lang: "tsx" } } };

describe("one option, under one name", () => {
  it.each(Object.keys(rules))("%s accepts ignoreGlobs", (id) => {
    expect(rules[id].meta.schema[0].properties).toHaveProperty("ignoreGlobs");
  });
});

for (const contract of loadContracts()) {
  const probe = executable(contract).find((c) => c.tag === "caught");

  // Written on top of whatever the corpus already runs the probe under, so the only thing
  // that differs between the cases below is the glob list and the filename.
  const withGlobs = (ignoreGlobs) => [{ ...(probe.resolved[0] ?? {}), ignoreGlobs }];

  new RuleTester(config).run(`${contract.rule} — story files`, ruleFor(contract.rule), {
    valid: [
      { name: "skipped by default", code: probe.source, options: probe.resolved, filename: STORY },
      {
        name: "skipped by a glob the consumer wrote",
        code: probe.source,
        options: withGlobs(["**/ui/*"]),
        filename: COMPONENT,
      },
    ],
    invalid: [
      {
        // For `token-constraints` this is also the case that writing only `ignoreGlobs` leaves
        // the recommended policy in force, rather than replacing it with no policy at all.
        name: "linted once the list is emptied",
        code: probe.source,
        options: withGlobs([]),
        filename: STORY,
        errors: probe.count,
      },
      {
        name: "the component beside it is linted",
        code: probe.source,
        options: probe.resolved,
        filename: COMPONENT,
        errors: probe.count,
      },
    ],
  });
}
