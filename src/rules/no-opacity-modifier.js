import { sweepVisitors } from "../extract/index.js";
import { classTokens } from "../policy/tokenize.js";
import { parseClass } from "../policy/variants.js";

/**
 * no-opacity-modifier — a colour class must not carry an opacity modifier.
 *
 * The specification is `docs/rules/no-opacity-modifier.md`, whose `caught` / `allowed` /
 * `blindspot` blocks the harness executes against this object.
 *
 * The rule is **context-free**: `bg-primary/50` is derived at the call site wherever it is
 * written, so which element the string reaches is not a question it has to ask. That is why
 * it runs over `sweepVisitors` — every string literal and every static template segment in
 * the file — and gets `cn()` arguments, `cva()` variant maps and `.ts` constants for free,
 * without parsing a single wrapper.
 *
 * The breadth is only safe because the *decision* is narrow, and all of it comes from
 * `/policy` rather than from where the string was found:
 *
 * 1. **A modifier is present**, split off with bracket depth respected, so the slash in
 *    `bg-[url(a/b.png)]` is not one and neither is the one in `group-hover/nav:`.
 * 2. **It is opacity syntax** — a bare number or a bracketed value. `bg-primary/auto` is
 *    meaningless rather than translucent, and belongs to `no-undefined-token`.
 * 3. **The utility sits under a derived colour prefix**, so `w-1/2` and `aspect-16/9` are
 *    never looked at twice.
 * 4. **The body is not a resolvable non-colour.** This is the gate that separates
 *    `text-primary/50` from `text-sm/6` — the same shape, opposite verdicts, and the one
 *    false positive the proof of concept had. See {@link isColorBody} for why the test is
 *    written as a double negative rather than as `isColorClass` alone.
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Color classes must not carry an opacity modifier.",
    },
    messages: {
      opacityModifierOnColor:
        "{{className}} — opacity modifier on a color class; define a token for {{base}} at {{modifier}} instead of deriving it here",
    },
    schema: [
      {
        type: "object",
        properties: {
          // The resolved policy view from `designSystemPolicy()`. Required: the two gates
          // that keep the sweep quiet are both questions only Tailwind can answer.
          designSystem: { type: "object" },
          allowFullOpacity: { type: "boolean" },
          colorPrefixes: { type: "array", items: { type: "string" } },
          // An input consumed at plugin-module load, where the design system is built.
          // Accepted here so the preset can carry it, never read by the rule.
          tokenFiles: { type: "array", items: { type: "string" } },
          ignoreGlobs: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowFullOpacity: false }],
  },

  create(context) {
    const { designSystem, allowFullOpacity = false, colorPrefixes = [], ignoreGlobs = [] } =
      context.options[0] ?? {};

    // Without the design system there is no colour test, and without a colour test this
    // rule is either `text-sm/6` reported or nothing reported. A quiet degraded mode would
    // be indistinguishable from a clean codebase, so it says so instead.
    if (!designSystem) {
      throw new Error(
        "no-opacity-modifier: options.designSystem is required — the plugin module builds it once at load from tokenFiles and hands rules the resolved policy view.",
      );
    }

    // File exclusion has no mechanism yet: matching `**/*.stories.@(ts|tsx)` needs a glob
    // matcher this package does not depend on, and which of the three spellings in the nine
    // contracts survives is an open decision (`docs/evasion-matrix.md`). Until it lands,
    // exclusion is a preset-level `overrides` glob and this option is inert — loudly.
    if (ignoreGlobs.length > 0) {
      throw new Error(
        "no-opacity-modifier: ignoreGlobs is not implemented — exclude files with a preset-level `overrides` glob until the one mechanism is chosen (see docs/evasion-matrix.md).",
      );
    }

    // A Tailwind plugin can introduce a colour utility that `getClassList()` never
    // enumerates, so the option *adds* to the derived set. It never replaces it:
    // hand-maintaining that set is the bug the derivation exists to avoid.
    const prefixes =
      colorPrefixes.length === 0
        ? designSystem.colorPrefixes
        : new Set([...designSystem.colorPrefixes, ...colorPrefixes]);

    /** The class carries an opacity modifier on a colour, or it does not. */
    const violationIn = (written, dynamic) => {
      const { base, opacity } = parseClass(written);
      if (opacity === null || base === "") return null;

      // A modifier interrupted by an interpolation is unknowable, and the contract says so:
      // whatever `` `bg-primary/${alpha}` `` resolves to, a call site is choosing an opacity
      // nobody designed. The syntax gate can only be applied to a modifier we can read.
      if (!dynamic) {
        if (!OPACITY_MODIFIER.test(opacity)) return null;
        if (allowFullOpacity && isFullOpacity(opacity)) return null;
      }

      const root = designSystem.parseRoot(base);
      if (!root || !prefixes.has(root)) return null;
      if (!isColorBody(designSystem, base)) return null;

      // The hole falls after whatever the head spelled out, so `` `bg-primary/5${x}` ``
      // reads back as `5${…}` rather than the other way round.
      return { base, modifier: dynamic ? `${opacity}${INTERPOLATION}` : opacity };
    };

    return sweepVisitors((source) => {
      const text = context.sourceCode.getText(source.node);
      const [start] = context.sourceCode.getRange(source.node);

      // Tokens arrive in source order, so one cursor walks the raw text alongside them and
      // a class that occurs twice in one string still lands on its own occurrence.
      let cursor = 0;

      for (const token of classTokens(source)) {
        // A dynamic token is judged on its static head: the text before the first hole is
        // the only part of it that is a class at all.
        const written = token.dynamic ? token.head : token.text;
        const at = text.indexOf(written, cursor);
        if (at !== -1) cursor = at + written.length;

        const violation = violationIn(written, token.dynamic);
        if (!violation) continue;

        context.report({
          // The class token, not the string that contains it: four offending classes in one
          // `className` are four separate spans. A raw text search cannot place a class
          // written with an escape, and the literal is the honest fallback when it fails.
          node: at === -1 ? source.node : { range: [start + at, start + at + written.length] },
          messageId: "opacityModifierOnColor",
          data: {
            className: token.dynamic ? `${written}${INTERPOLATION}${token.tail}` : written,
            base: violation.base,
            modifier: violation.modifier,
          },
        });
      }
    });
  },
};

/**
 * Every spelling of an opacity modifier: a bare number, and any bracketed value —
 * `/[0.5]`, `/[50%]`, `/[var(--overlay-alpha)]`. All four mean the same thing.
 *
 * What it excludes is the point. `bg-primary/auto` is not translucent, it is meaningless,
 * and reporting it here would say the wrong thing about it — `no-undefined-token` owns a
 * class that resolves to nothing.
 */
const OPACITY_MODIFIER = /^(?:\d+(?:\.\d+)?|\[[^\]]*\])$/;

/** How an interpolation is written back into the message, since its value is unknowable. */
const INTERPOLATION = "${…}";

/**
 * Is `/100` — or `/[100%]`, or `/[1]` — the same no-op alpha under a different spelling?
 *
 * Tailwind reads a bare number as a percentage and a bracketed decimal as a fraction, so
 * "fully opaque" is `100`, `[100%]` and `[1]`. `allowFullOpacity` turns off a no-op alpha,
 * not one particular way of typing it.
 */
function isFullOpacity(modifier) {
  if (!modifier.startsWith("[")) return Number(modifier) === 100;
  const value = modifier.slice(1, -1);
  if (value.endsWith("%")) return Number(value.slice(0, -1)) === 100;
  return Number(value) === 1;
}

/**
 * Does the body of this class name a colour?
 *
 * The obvious spelling — `isColorClass(base)` — is *too* narrow, because it answers "no"
 * to two different questions at once: `text-sm` is not a colour, and `border-input` is not
 * a colour *here*, in a design system whose stylesheet never defined `--color-input`. The
 * first is the near-miss this rule must stay off; the second is a colour class whose token
 * is missing, which is `no-undefined-token`'s subject and not a reason to let the modifier
 * through. Deriving `bg-nonesuch/50` at a call site is wrong twice over, and the contract
 * says both rules report it.
 *
 * So the test is the double negative: under a colour prefix, a class is *not* a colour only
 * when the design system resolves it to something else. `text-sm` generates a `font-size`
 * declaration and is excluded; `border-input` generates nothing and is not.
 */
function isColorBody(designSystem, base) {
  return !designSystem.resolves(base) || designSystem.isColorClass(base);
}
