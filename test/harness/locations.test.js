import { describe, expect, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { loadContracts } from "./contracts.js";
import { optionsFor, ruleFor } from "./options.js";

/**
 * Where a rule points.
 *
 * The corpus asserts counts and nothing else — `errors: c.count` — so a rule that reported
 * every violation on line 1 would be green across all 732 cases. Locations are asserted
 * here instead of in the contracts, for four reasons that are properties of Oxlint's
 * `RuleTester` rather than preferences:
 *
 * 1. An expectation carrying a location must also carry a `messageId` or a `message`;
 *    `errors: [{ line }]` is rejected outright. Putting locations in the contracts would
 *    therefore put message ids in them too, and a contract is a specification that ships —
 *    message ids are rule internals.
 * 2. Expectations are positional, so a `count=3` case would need three ordered entries and
 *    a defined report order to match them against.
 * 3. Most cases in the corpus are one line long, where a line assertion says nothing. The
 *    risk lives in the cases that span lines or report more than once.
 * 4. Contracts with a `preamble` have it prepended to every case, so any line number
 *    written in one would be an offset into harness plumbing rather than into the case.
 *
 * The weakness of keeping them outside is that nothing makes anyone write them. The meta
 * test at the bottom is that obligation: a rule whose contract says `status: implemented`
 * must have a fixture here, and the fixture must be one no line-1 rule could satisfy.
 */

/**
 * One entry per implemented rule. The code is deliberately not minimal: the first
 * violation is never on line 1, and there is more than one of them on more than one line,
 * so a rule that collapses its reports to the top of the file or to a single span fails.
 *
 * Columns are 1-based here — that is what `eslintCompat: true` buys, and without it they
 * would silently be 0-based.
 */
export const FIXTURES = {
  "no-style-color": [
    {
      name: "each offending property, at the property and not at the prop or the element",
      code: [
        "const theme = getTheme();",
        "<div",
        "  style={{",
        '    fontWeight: "bold",',
        "    color: theme.accent,",
        "  }}",
        "/>;",
        "<svg>",
        '  <rect style={{ fill: "red", stroke: "blue" }} />',
        "</svg>;",
      ].join("\n"),
      errors: [
        { messageId: "colorInStyleProp", line: 5, column: 5, endLine: 5, endColumn: 24 },
        { messageId: "colorInStyleProp", line: 9, column: 18, endLine: 9, endColumn: 29 },
        { messageId: "colorInStyleProp", line: 9, column: 31, endLine: 9, endColumn: 45 },
      ],
    },
  ],
};

RuleTester.describe = describe;
RuleTester.it = it;

const config = {
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
};

for (const [ruleName, fixtures] of Object.entries(FIXTURES)) {
  new RuleTester(config).run(`${ruleName} — report locations`, ruleFor(ruleName), {
    valid: [],
    invalid: fixtures.map((f) => ({
      name: f.name,
      code: f.code,
      options: f.options ?? optionsFor(ruleName),
      errors: f.errors,
    })),
  });
}

describe("the location fixtures", () => {
  it("exists for every rule whose contract says it is implemented", () => {
    const missing = loadContracts()
      .filter((c) => c.status === "implemented")
      .filter((c) => !FIXTURES[c.rule]?.length)
      .map((c) => c.rule);
    expect(missing).toEqual([]);
  });

  it.each(Object.entries(FIXTURES))("%s pins a span a lazy rule could not hit", (rule, fixtures) => {
    for (const fixture of fixtures) {
      const lines = fixture.errors.map((e) => e.line);

      // Every expectation is a full span, not a line: an endpoint is as easy to get wrong
      // as a start, and reporting a whole statement where a property was meant is the
      // mistake this file exists to catch.
      for (const error of fixture.errors) {
        expect(error).toMatchObject({
          messageId: expect.any(String),
          line: expect.any(Number),
          column: expect.any(Number),
          endLine: expect.any(Number),
          endColumn: expect.any(Number),
        });
      }

      // A rule that reports everything at the top of the file satisfies any fixture whose
      // violations start on line 1, and a rule that reports one span per file satisfies any
      // fixture that expects one line. Neither is allowed to be written here.
      expect(lines).not.toContain(1);
      expect(new Set(lines).size).toBeGreaterThan(1);
    }
  });
});
