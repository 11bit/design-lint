/**
 * Is this string a list of classes, or is it prose?
 *
 * The broad sweep hands a rule every string literal in the file, which is what buys the
 * `.ts` constants surface and costs nothing on the surfaces the sweep exists for — except
 * one. A sentence containing a hyphenated word under a colour prefix tokenises into
 * something that looks exactly like a class:
 *
 * ```
 * "text-heavy layouts"    → "text-heavy" is a colour prefix against an undefined name
 * ```
 *
 * For a rule that says *"this class is forbidden"* that is a nuisance. For
 * `no-undefined-token`, whose claim is *"this class does nothing"*, it is the rule
 * confidently calling working prose broken — the exact failure its `bias: false-negatives`
 * exists to prevent.
 *
 * The mitigation is an **all-segments test**, and it lives here rather than in the rule
 * because "is this string a class list" is a question about classes, not about undefined
 * tokens: a string is treated as a class list only when *every* whitespace-separated
 * segment is class-shaped.
 *
 * ```
 * "text-heavy layouts"     → "layouts" is not class-shaped → not a class list → silent
 * "bg-primary text-white"  → every segment class-shaped    → class list      → checked
 * "text-heavy"             → single class-shaped segment   → class list      → reported
 * ```
 *
 * The residual — a single word that is class-shaped and undefined, with no sentence around
 * it — is indistinguishable from a real typo by construction, and reporting it is correct
 * rather than a false positive.
 *
 * ## What makes a segment class-shaped
 *
 * Two ways, and both are answers the design system already has:
 *
 * - **It generates CSS.** `layouts` does not, `flex` does, and nothing but Tailwind can
 *   tell those two plain words apart. A hand-written pattern over "looks like a class"
 *   cannot: every English word is a candidate class name.
 * - **It sits under a colour-carrying prefix with something after it.** This is what keeps
 *   the undefined half of the surface — `text-secondary` generates nothing and is still
 *   evidently a class. The "something after it" matters: `"bg-"` is what a `+`
 *   concatenation leaves behind, and a prefix with no colour part names no token.
 */

import { parseClass } from "./variants.js";

/**
 * The colour-carrying prefix a class sits under, and the token name that follows it.
 *
 * The **longest** matching prefix wins, so `border-t-outline` is `outline` under
 * `border-t` rather than `t-outline` under `border` — the token name is what a message
 * asks the author to define, and the wrong split names a token nobody could add.
 *
 * @param {string} base A class with variants, `!` and the opacity modifier already stripped.
 * @param {Set<string>} colorPrefixes
 * @returns {{ prefix: string, token: string } | null}
 */
export function colorPrefixOf(base, colorPrefixes) {
  let found = null;
  for (const prefix of colorPrefixes) {
    if (!base.startsWith(`${prefix}-`)) continue;
    if (base.length === prefix.length + 1) continue; // `bg-` names nothing.
    if (!found || prefix.length > found.prefix.length) {
      found = { prefix, token: base.slice(prefix.length + 1) };
    }
  }
  return found;
}

/**
 * Could this whitespace-delimited segment be a class?
 *
 * @param {string} base A stripped class body — see {@link colorPrefixOf}.
 * @param {import("./design-system.js").DesignSystemPolicy} designSystem
 * @param {Set<string>} colorPrefixes The derived set, plus whatever the consumer added.
 * @returns {boolean}
 */
export function classShaped(base, designSystem, colorPrefixes) {
  if (!base) return false;
  return colorPrefixOf(base, colorPrefixes) !== null || designSystem.resolves(base);
}

/**
 * Is every token in this string class-shaped?
 *
 * A **dynamic** token counts as class-shaped: half of it is missing, so there is nothing to
 * judge, and letting an interpolation veto the whole string would silence
 * `` `text-secondary ${extra}` `` — a case this sweep's contracts promise to catch.
 *
 * @param {import("./tokenize.js").ClassToken[]} tokens Every token of one class source.
 * @param {import("./design-system.js").DesignSystemPolicy} designSystem
 * @param {Set<string>} colorPrefixes
 * @returns {boolean}
 */
export function isClassList(tokens, designSystem, colorPrefixes) {
  if (tokens.length === 0) return false;
  return tokens.every(
    (token) =>
      token.dynamic || classShaped(parseClass(token.text).base, designSystem, colorPrefixes),
  );
}
