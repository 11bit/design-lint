import { RuleTester } from "oxlint/plugins-dev";
import { describe, expect, it } from "vitest";

import { ruleFor } from "../harness/options.js";
import { rules } from "../../src/rules/index.js";
import { contracts, lineOffset, runnable, sourceOf } from "./index.js";
import { optionsOf } from "./oxlint.js";

/**
 * The contracts, run through Oxlint.
 *
 * A `caught` case must produce exactly its `reports`, message id and span alike. `allowed`
 * and `blindspot` cases must stay silent — a blind spot that starts reporting fails here,
 * which is the reason blind spots are written as cases at all.
 */

RuleTester.describe = describe;
RuleTester.it = it;

const config = { eslintCompat: true, languageOptions: { parserOptions: { lang: "tsx" } } };

const nameOf = (testCase) => `${testCase.kind}: ${testCase.group} — ${testCase.code.trim().split("\n")[0]}`;

describe("the contracts", () => {
  it("cover every rule, and only rules that exist", () => {
    expect(contracts.map((c) => c.rule).sort()).toEqual(Object.keys(rules).sort());
  });

  it.each(contracts)("$rule promises to catch something, and to stay quiet about something", (contract) => {
    const cases = runnable(contract);
    expect(cases.some((c) => c.kind === "caught")).toBe(true);
    expect(cases.some((c) => c.kind !== "caught")).toBe(true);
  });

  it.each(contracts)("$rule gives every caught case its reports, and no other case any", (contract) => {
    for (const c of contract.cases) {
      expect(["caught", "allowed", "blindspot", "deferred"]).toContain(c.kind);
      if (c.kind === "caught") expect(c.reports?.length, nameOf(c)).toBeGreaterThan(0);
      else expect(c.reports, nameOf(c)).toBeUndefined();
    }
  });

  it.each(contracts)("$rule never asserts one case both ways", (contract) => {
    const verdicts = new Map();
    for (const c of runnable(contract)) {
      const key = JSON.stringify([c.code, c.options ?? null]);
      const verdict = c.kind === "caught";
      expect(verdicts.get(key) ?? verdict, nameOf(c)).toBe(verdict);
      verdicts.set(key, verdict);
    }
  });
});

for (const contract of contracts) {
  const cases = runnable(contract);
  const offset = lineOffset(contract);

  new RuleTester(config).run(contract.rule, ruleFor(contract.rule), {
    valid: cases
      .filter((c) => c.kind !== "caught")
      .map((c) => ({ name: nameOf(c), code: sourceOf(contract, c), options: optionsOf(contract, c) })),
    invalid: cases
      .filter((c) => c.kind === "caught")
      .map((c) => ({
        name: nameOf(c),
        code: sourceOf(contract, c),
        options: optionsOf(contract, c),
        errors: c.reports.map((r) => ({
          messageId: r.id,
          line: r.line + offset,
          column: r.column,
          endLine: r.endLine + offset,
          endColumn: r.endColumn,
        })),
      })),
  });
}
