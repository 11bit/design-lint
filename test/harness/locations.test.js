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
  "no-opacity-modifier": [
    {
      name: "each offending class, at the class and not at the string that holds it",
      code: [
        'const overlay = cva("fixed inset-0", {',
        '  variants: { tone: { dim: "bg-black/50", dimmer: "bg-black/70" } },',
        "});",
        "<div",
        '  className={cn("rounded-md bg-primary/50 text-foreground/75", className)}',
        "/>;",
        '<svg><path className="fill-primary/50 stroke-primary/50" /></svg>;',
      ].join("\n"),
      errors: [
        { messageId: "opacityModifierOnColor", line: 2, column: 29, endLine: 2, endColumn: 40 },
        { messageId: "opacityModifierOnColor", line: 2, column: 52, endLine: 2, endColumn: 63 },
        { messageId: "opacityModifierOnColor", line: 5, column: 29, endLine: 5, endColumn: 42 },
        { messageId: "opacityModifierOnColor", line: 5, column: 43, endLine: 5, endColumn: 61 },
        { messageId: "opacityModifierOnColor", line: 7, column: 23, endLine: 7, endColumn: 38 },
        { messageId: "opacityModifierOnColor", line: 7, column: 39, endLine: 7, endColumn: 56 },
      ],
    },
  ],
  "token-constraints": [
    {
      name: "each offending class, at the class and not at the string that carries it",
      options: [
        {
          ...optionsFor("token-constraints")[0],
          allowed: {
            text: ["*foreground*", "primary", "link*"],
            border: ["border*", "input", "ring"],
            "hover:": ["*-hover"],
          },
          denied: { "*": ["*-foreground"] },
        },
      ],
      code: [
        'const base = "rounded-md p-2";',
        'const tone = { warn: "text-warning" };',
        '<div className="text-muted bg-muted-foreground" />;',
        "<div",
        '  className="hover:bg-primary"',
        "/>;",
      ].join("\n"),
      errors: [
        { messageId: "prefixNotAllowed", line: 2, column: 23, endLine: 2, endColumn: 35 },
        { messageId: "prefixNotAllowed", line: 3, column: 17, endLine: 3, endColumn: 27 },
        { messageId: "prefixDenied", line: 3, column: 28, endLine: 3, endColumn: 47 },
        { messageId: "variantNotAllowed", line: 5, column: 14, endLine: 5, endColumn: 30 },
      ],
    },
  ],
  "no-spectral-color": [
    {
      name: "each class where it was written, not the string that carries it",
      code: [
        'const tone = "p-2";',
        "const badge = {",
        '  danger: "bg-red-500 text-white",',
        '  info: "hover:border-x-slate-200",',
        "};",
        "<div className={`text-${kind}`} />;",
      ].join("\n"),
      errors: [
        // Two classes in one string literal, and they are two spans. The rule that reported
        // the literal would put both of these at column 11 and be none the wiser.
        {
          messageId: "spectralColorWithReplacement",
          line: 3,
          column: 12,
          endLine: 3,
          endColumn: 22,
          // The span is also what the suggestion rewrites, so asserting it here is the only
          // place that promise becomes an assertion — the corpus checks counts, not fixes.
          suggestions: [
            {
              messageId: "useReplacement",
              output: [
                'const tone = "p-2";',
                "const badge = {",
                '  danger: "bg-danger text-white",',
                '  info: "hover:border-x-slate-200",',
                "};",
                "<div className={`text-${kind}`} />;",
              ].join("\n"),
            },
          ],
        },
        { messageId: "spectralColor", line: 3, column: 23, endLine: 3, endColumn: 33 },
        // The variant is part of the class the author has to edit, so it is part of the span.
        { messageId: "spectralColor", line: 4, column: 10, endLine: 4, endColumn: 34 },
        // The dynamic case points at the prefix standing against the hole — the half of the
        // class that is actually there.
        { messageId: "dynamicColorClass", line: 6, column: 18, endLine: 6, endColumn: 23 },
      ],
    },
  ],
  "no-useless-hover": [
    {
      name: "the offending class, at the class and not at the element that carries it",
      code: [
        'const label = "Save";',
        '<div className="rounded-md hover:bg-primary" />;',
        '<button className="hover:bg-primary">',
        '  <span className="hover:underline">{label}</span>',
        "</button>;",
        '<li className={cn("p-2", "not-hover:text-muted")} />;',
        '<svg><path className="fill-primary [&:hover]:fill-link" /></svg>;',
        '<tr className="hover:bg-muted" />;',
      ].join("\n"),
      errors: [
        // The span is the class, not the string that holds it: `rounded-md` shares the
        // literal and is nobody's business here.
        { messageId: "hoverOnNonInteractive", line: 2, column: 28, endLine: 2, endColumn: 44 },
        // Lines 3-5 are the two silences that matter most, asserted by their absence: the
        // `<button>` is interactive by tag, and the `<span>` inside it is exempt because the
        // pointer is over the button too.
        { messageId: "hoverOnNonInteractive", line: 6, column: 27, endLine: 6, endColumn: 47 },
        // Through a `cn()` argument and in the arbitrary spelling, each still located in the
        // source text the author wrote rather than at the attribute.
        { messageId: "hoverOnNonInteractive", line: 7, column: 36, endLine: 7, endColumn: 55 },
        // Line 8 is silent too — `tr` is on the `recommended` preset's `interactiveElements`.
      ],
    },
  ],
  "no-component-color-override": [
    {
      name: "each offending class, at the class and not at the attribute or the element",
      code: [
        'import { Button } from "@/components/ui/button";',
        'import { Card, CardHeader } from "@/components/ui/card";',
        "",
        '<Card className="rounded-lg border-primary bg-transparent">',
        "  <CardHeader className={cn(\"p-4\", `text-${tone}`)} />",
        '  <Button className="hover:bg-red-500/80" />',
        '  <div className="bg-primary" />',
        "</Card>;",
      ].join("\n"),
      errors: [
        // Two colour classes in one string, either side of a non-colour one: three spans
        // are available and the rule has to pick the right two.
        { messageId: "colorOnComponent", line: 4, column: 29, endLine: 4, endColumn: 43 },
        { messageId: "colorOnComponent", line: 4, column: 44, endLine: 4, endColumn: 58 },
        // The interpolated case points at the prefix standing against the hole — the half
        // of the class that is actually there — inside the template, not at the `cn()` call
        // or the attribute wrapping it.
        { messageId: "dynamicColorOnComponent", line: 5, column: 37, endLine: 5, endColumn: 42 },
        // The variant and the opacity modifier are part of the class the author has to
        // edit, so they are part of the span.
        { messageId: "colorOnComponent", line: 6, column: 22, endLine: 6, endColumn: 41 },
        // Line 7 is the same colour class on a `<div>`, which no import binds. Nothing is
        // reported there, and a rule that watched names rather than bindings would.
      ],
    },
  ],
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
  "no-dark-variant": [
    {
      name: "each theme fork, at the class and not at the string or the element that carries it",
      code: [
        'const label = "Save";',
        'const panel = cva("rounded-md", {',
        '  variants: { tone: { night: "dark:bg-card dark:text-muted" } },',
        "});",
        '<div className={cn("p-2", "not-dark:border-border")} />;',
        '<div className="bg-[light-dark(#000,#fff)]" />;',
        "<div",
        "  className={`md:dark:${utility}`}",
        "/>;",
      ].join("\n"),
      errors: [
        // Two forks in one `cva()` variant string, and they are two spans. A rule that
        // reported the literal would put both at column 30 and be none the wiser.
        { messageId: "darkVariant", line: 3, column: 31, endLine: 3, endColumn: 43 },
        { messageId: "darkVariant", line: 3, column: 44, endLine: 3, endColumn: 59 },
        // Through a `cn()` argument, and in the negated spelling the old regex missed: the
        // span is the whole class the author has to edit, variant included.
        { messageId: "darkVariant", line: 5, column: 28, endLine: 5, endColumn: 50 },
        // `light-dark()` is a different message with a different fix, located at the class
        // rather than at the call inside it — the call is not what gets deleted alone.
        { messageId: "lightDarkFunction", line: 6, column: 17, endLine: 6, endColumn: 43 },
        // The interpolated case points at the half of the class that was written down —
        // inside the template, not at the attribute or the element spanning lines 7-9.
        { messageId: "darkVariant", line: 8, column: 15, endLine: 8, endColumn: 23 },
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
