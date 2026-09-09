import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { bindResolved } from "../../src/plugin.js";
import { designSystemPolicy } from "../../src/policy/design-system.js";
import { loadDesignSystem } from "../../src/policy/load.js";
import { resolveTokenSet } from "../../src/policy/tokens.js";
import { rules } from "../../src/rules/index.js";

/**
 * Rule options the corpus is written against.
 *
 * These are fixtures, not the `recommended` preset. The preset is built in Phase 5 from
 * the contents of `design-system/lint/colors.json`, and at that point this file becomes a
 * thin override layer over it rather than a hand-written map.
 *
 * ## Resolved inputs, not paths
 *
 * Five of the nine rules need a design system or a semantic token set. Their contracts
 * configure that as `tokenFiles` or `entryPoint` — *paths*, because that is what a consumer
 * has — but no rule may read a file: paths are resolved once at plugin-module load and the
 * rules are handed the result. The corpus is that load step's stand-in, so it supplies the
 * resolved forms under the two keys a rule actually reads:
 *
 * | Option | What a rule gets |
 * | --- | --- |
 * | `designSystem` | the policy view from `designSystemPolicy()` — `colorPrefixes`, `resolves`, `isColorClass` |
 * | `tokens` | a `Set` of semantic token names, `--color-` prefix already stripped |
 *
 * Neither of those can travel through `options`: they cross a JSON boundary and arrive as
 * husks with every method gone. They are *bound* to the rule instead — see {@link ruleFor},
 * which is the corpus's stand-in for the plugin module's load step. `optionsFor` describes
 * the other half, the JSON a consumer actually writes.
 *
 * Which means the corpus can vary either one per case without inventing a stylesheet per
 * variation — the requirement Phase 2 found the hard way — and `RuleTester` never touches a
 * filesystem.
 */

const FIXTURE = fileURLToPath(new URL("../fixtures/theme.css", import.meta.url));
const BASE = fileURLToPath(new URL("../..", import.meta.url));

const css = readFileSync(FIXTURE, "utf-8");

/**
 * Loaded once for the whole corpus. Building a Tailwind design system is the most expensive
 * thing the test suite does, and it is the same design system for every case — which is
 * also true of the plugin this stands in for, where the cost is paid once per lint run
 * rather than once per file.
 */
export const designSystem = designSystemPolicy(await loadDesignSystem(css, { base: BASE }));

/** The semantic token names the fixture stylesheet defines. */
export const tokens = resolveTokenSet({ css });

/**
 * Only options the corpus actually depends on are listed. A contract that needs to vary one
 * of these per case defines its own `options=` fixture block, which is layered on top.
 */
const OPTIONS = {
  "no-component-color-override": [{ componentSources: ["@/components/ui/*"] }],
};

/**
 * The half no consumer could type. Listed per rule, because which rules need a design
 * system is a fact about the rules rather than about the fixture.
 */
const RESOLVED = {
  "no-dark-variant": { designSystem },
  "no-opacity-modifier": { designSystem },
  "no-raw-color": { designSystem, tokens },
  "no-spectral-color": { designSystem, tokens },
  "no-undefined-token": { designSystem },
  "token-constraints": { designSystem, tokens },
};

/** The JSON options a case runs under — what a consumer writes in their config. */
export function optionsFor(rule) {
  return OPTIONS[rule] ?? [];
}

/**
 * The rule as the plugin module would have built it: bound to the inputs that cannot
 * survive JSON. Every test that runs a rule takes it from here rather than from
 * `src/rules/index.js`, so no test can accidentally exercise an unbound rule — which looks
 * like a rule whose design system has no methods, and fails a long way from the cause.
 */
export function ruleFor(rule) {
  return bindResolved(rules[rule], RESOLVED[rule]);
}
