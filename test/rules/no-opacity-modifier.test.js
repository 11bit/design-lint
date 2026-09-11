import { fileURLToPath } from "node:url";

import { RuleTester } from "oxlint/plugins-dev";
import { describe, expect, it } from "vitest";

import { bindResolved } from "../../src/plugin.js";
import { designSystemPolicy } from "../../src/policy/design-system.js";
import { loadDesignSystem } from "../../src/policy/load.js";
import rule from "../../src/rules/no-opacity-modifier.js";
import { designSystem } from "../harness/options.js";

/**
 * The two ways this rule refuses to run.
 *
 * Neither can be written as a contract case: the corpus asserts what a rule reports, and a
 * rule that throws reports nothing at all — which is exactly the failure mode being
 * guarded against. A missing design system or an option whose machinery does not exist
 * must be indistinguishable from a broken build, never from a clean codebase.
 */
const create = (options) => rule.create({ options: [options] });

describe("refusing to run", () => {
  it("throws without a resolved design system, rather than reporting nothing", () => {
    expect(() => create({})).toThrow(/designSystem is required/);
    expect(() => rule.create({ options: [] })).toThrow(/designSystem is required/);
  });

  it("throws on an ignoreGlobs it would silently ignore", () => {
    expect(() => create({ designSystem, ignoreGlobs: ["**/*.stories.tsx"] })).toThrow(
      /ignoreGlobs is not implemented/,
    );
  });

  it("accepts the empty exclusion the option defaults to", () => {
    expect(() => create({ designSystem, ignoreGlobs: [] })).not.toThrow();
  });
});

/**
 * The rule under `@theme inline`, which is what shadcn/ui writes.
 *
 * Every corpus case runs against a plain `@theme` fixture, where a theme colour is referenced
 * as `var(--color-*)` and every colour test works. Under inline the value is substituted, and
 * `ring-primary/50`, `shadow-primary/20` and the gradient stops went unreported — the corpus
 * could not see it, because it never ran against a stylesheet shaped like that. This can.
 */
const inline = designSystemPolicy(
  await loadDesignSystem(
    [
      '@import "tailwindcss";',
      ":root { --primary: oklch(0.62 0.19 259); }",
      "@theme inline {",
      "  --color-primary: var(--primary);",
      "}",
    ].join("\n"),
    { base: fileURLToPath(new URL("../..", import.meta.url)) },
  ),
);

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ eslintCompat: true, languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "under @theme inline",
  bindResolved(rule, { designSystem: inline }),
  {
    valid: [
      // No modifier, and a modifier that is not an opacity on a colour.
      '<div className="ring-primary shadow-primary from-primary" />',
      '<div className="text-sm/6" />',
    ],
    invalid: [
      { code: '<div className="bg-primary/50" />', errors: 1 },
      { code: '<div className="ring-primary/50 ring-offset-primary/50" />', errors: 2 },
      { code: '<div className="from-primary/10 via-primary/20 to-primary/30" />', errors: 3 },
      {
        code: '<div className="shadow-primary/20 inset-shadow-primary/40 drop-shadow-primary/30 text-shadow-primary/30" />',
        errors: 4,
      },
      { code: '<div className="inset-ring-primary/40" />', errors: 1 },
    ],
  },
);
