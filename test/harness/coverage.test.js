import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { executable, loadContracts } from "./contracts.js";

/**
 * How much of the corpus is still unmet.
 *
 * `corpus.test.js` runs every `caught` case inverted while its rule is a stub, which keeps
 * CI honest but hides the size of the work: a green run says nothing about whether there
 * are four cases left or four hundred. This file is the number.
 *
 * It fails when a count moves in either direction. Downward means a rule started catching
 * something and `baseline.json` should record it. Upward — or a count that vanishes —
 * means the corpus itself changed, which is fine when intended and worth noticing when not.
 */
const baseline = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "baseline.json"), "utf8"),
);

const contracts = loadContracts();

describe("the corpus", () => {
  it.each(contracts)("$rule promises to catch something, and to stay quiet about something", (contract) => {
    const cases = executable(contract);
    expect(cases.filter((c) => c.tag === "caught").length).toBeGreaterThan(0);
    expect(cases.filter((c) => c.tag !== "caught").length).toBeGreaterThan(0);
  });

  it("matches the recorded baseline", () => {
    const pending = Object.fromEntries(
      contracts.map((c) => [
        c.rule,
        c.status === "implemented" ? 0 : executable(c).filter((x) => x.tag === "caught").length,
      ]),
    );
    expect(pending).toEqual(baseline.pending);
  });
});
