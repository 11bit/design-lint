import { describe, expect, it } from "vitest";

import { DEFERRED, EXECUTED, loadContracts, source } from "./contracts.js";
import { optionsFor } from "./options.js";
import { rules } from "../../src/rules/index.js";

const contracts = loadContracts();

/**
 * Structural checks on the contracts themselves.
 *
 * A contract is a specification and a test corpus in one file, which makes it possible for
 * the two halves to drift apart — a rule with no contract, a block whose `count` cannot be
 * what it says, a case asserted as caught in one section and allowed in another. None of
 * those show up as a failing rule test; they show up here.
 */

describe("every rule has a contract, and every contract a rule", () => {
  it("the two sets are identical", () => {
    expect(contracts.map((c) => c.rule).sort()).toEqual(Object.keys(rules).sort());
  });

  it.each(contracts)("$file names its rule after its filename", (contract) => {
    expect(`${contract.rule}.md`).toBe(contract.file);
  });
});

describe("frontmatter", () => {
  it.each(contracts)("$rule declares status, bias and file scope", (contract) => {
    expect(contract.status).toMatch(/^(draft|agreed|implemented)$/);
    expect(contract.bias).toMatch(/^(false-positives|false-negatives)$/);
    expect(contract.files.length).toBeGreaterThan(0);
  });
});

describe("case blocks", () => {
  it.each(contracts)("$rule tags every fenced block it means to execute", (contract) => {
    const unknown = contract.blocks
      .filter((b) => b.tag && ![...EXECUTED, DEFERRED, "preamble"].includes(b.tag))
      .map((b) => `${contract.file}:${b.line} ${b.tag}`);
    expect(unknown).toEqual([]);
  });

  it.each(contracts)("$rule uses count= only where a case reports more than once", (contract) => {
    const wrong = contract.cases
      .filter((c) => c.count < 1 || !Number.isInteger(c.count))
      .map((c) => `${contract.file}:${c.line}`);
    expect(wrong).toEqual([]);
  });

  it.each(contracts)("$rule names an options fixture that exists", (contract) => {
    const missing = contract.cases
      .filter((c) => c.options && !contract.fixtures[c.options])
      .map((c) => `${contract.file}:${c.line} options=${c.options}`);
    expect(missing).toEqual([]);
  });
});

/**
 * The check the fences cannot make for themselves. Two sections may demonstrate the same
 * class — that is documentation, not a defect — but if one says it reports and the other
 * says it does not, the contract contradicts itself and no implementation can satisfy it.
 */
describe("no case contradicts itself", () => {
  it.each(contracts)("$rule", (contract) => {
    const byCode = new Map();
    for (const c of contract.cases) {
      const key = JSON.stringify([source(contract, c), c.options ?? null]);
      const entry = byCode.get(key) ?? { silent: [], reports: [] };
      (c.tag === "caught" ? entry.reports : entry.silent).push(`${c.tag}:${c.line} ${c.heading}`);
      byCode.set(key, entry);
    }

    const conflicts = [...byCode.values()]
      .filter((e) => e.reports.length && e.silent.length)
      .map((e) => `${e.reports[0]} vs ${e.silent[0]}`);
    expect(conflicts).toEqual([]);
  });
});

describe("options fixtures", () => {
  it.each(contracts.filter((c) => Object.keys(c.fixtures).length))(
    "$rule defines a baseline the other fixtures vary from",
    (contract) => {
      expect(Object.keys(contract.fixtures)).toContain("baseline");
    },
  );

  it("a rule whose corpus needs options gets them from one place", () => {
    // `optionsFor` is the harness's own fixture map. It exists so a contract never has to
    // name a path — `tokenFiles` and the resolved design system arrive with `/policy` in
    // Phase 3, and this map is where they will be wired.
    expect(optionsFor("no-component-color-override")[0].componentSources).toEqual([
      "@/components/ui/*",
    ]);
  });
});
