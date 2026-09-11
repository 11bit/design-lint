import { sweepVisitors } from "../extract/index.js";
import { IGNORE_GLOBS_SCHEMA, ignoredFile, STORY_GLOBS } from "../policy/ignore.js";
import { classTokens } from "../policy/tokenize.js";
import { parseClass, stripGroupName } from "../policy/variants.js";

/**
 * no-dark-variant — theming happens in the token file, and nowhere else.
 *
 * The specification is `docs/rules/no-dark-variant.md`, whose `caught` / `allowed` /
 * `blindspot` blocks the harness executes against this object.
 *
 * Two forms of the same defect, a second theming mechanism:
 *
 * - the `dark:` variant, which re-decides the theme at one element, and
 * - `light-dark()` in an arbitrary value, which re-decides it inside one declaration.
 *
 * Both are caught wherever a class string is written, because the rule is **context-free**:
 * `dark:bg-card` is a theme fork in a `cva()` variant map and in a `.ts` constants file
 * exactly as much as on a `className`, and none of those need parsing to see it. That is
 * why it runs over `sweepVisitors` — every string literal and every static template segment
 * in the file — and gets every wrapper on the evasion matrix for free.
 *
 * ## Why segmentation rather than a regex
 *
 * The proof of concept tested the raw class against `/(?:^|:)dark:/`, which is right for
 * the wrong reason: it allows `bg-dark-muted` because a `-` precedes `dark:`, and misses
 * `not-dark:` for the same reason. Here `dark` is matched as a **variant segment** — split
 * on `:` at bracket depth zero by `/policy`, group name stripped — so `bg-dark-muted` is a
 * utility body, `[@media(prefers-color-scheme:dark)]:` is one arbitrary segment, and
 * position in `md:dark:hover:` is irrelevant by construction rather than by luck.
 *
 * The one segment this rule adds to `/policy`'s family predicate is the negation.
 * `inFamily` excludes `not-` deliberately, because a `not-hover:` colour would name a
 * `-hover` token backwards; there is no such reading for a theme. `not-dark:` depends on
 * the same `.dark` root class this design system does not use, so it is the same fork seen
 * from the other side — which is why the predicate is local here rather than a change to
 * the shared one.
 *
 * ## The one thing it declines to call a violation
 *
 * `` `dark:${utility}` `` reports and `"dark:" + utility` does not, and the difference is
 * not the operator. A template literal is one class token whose static half spells out the
 * variant and whose hole is the utility — the fork is fully visible. A `+` hands the sweep
 * the string `"dark:"` on its own: a prefix with no class attached, which is a fragment
 * rather than a defect. So a static token whose utility is empty is left alone, and the
 * contract records it as a blind spot.
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "The `dark:` variant and `light-dark()` must not appear in application code.",
    },
    messages: {
      darkVariant:
        "{{className}} — dark: variant not allowed; theming is resolved by the --color-* tokens in {{tokenFile}}, so use a semantic token for {{utility}}",
      lightDarkFunction:
        "{{source}} — light-dark() is a second theming mechanism; a --color-* token already resolves per theme, so give the property both values in {{tokenFile}} and reference the token here",
    },
    // The JSON half only. `designSystem` is bound around `create` rather than written in a
    // config, so it never reaches the validator — and a consumer who tries to write one by
    // hand should be told it is not theirs to write.
    schema: [
      {
        type: "object",
        properties: {
          flagNonColorUtilities: { type: "boolean" },
          flagLightDark: { type: "boolean" },
          // Named in messages only. The design system is built by `designLint()` from its own
          // `tokenFiles` argument, which it also passes here; this copy builds nothing. Where
          // the tokens live is the consuming project's decision, never a string baked in here.
          tokenFiles: { type: "array", items: { type: "string" } },
          ignoreGlobs: IGNORE_GLOBS_SCHEMA,
        },
        additionalProperties: false,
      },
    ],

    // The recommended policy. Every value is a boolean or a list, which Oxlint's deep
    // `defaultOptions` merge replaces whole rather than unioning — so carrying them here is
    // safe, and a consumer who wipes the preset's options by writing
    // `"design/no-dark-variant": "error"` lands on the recommended behaviour rather than on
    // nothing. The same values are the destructuring defaults in `create`, because
    // `RuleTester` does not apply `defaultOptions`.
    defaultOptions: [
      {
        flagNonColorUtilities: true,
        flagLightDark: true,
        tokenFiles: ["src/styles.css"],
        ignoreGlobs: [...STORY_GLOBS],
      },
    ],
  },

  create(context) {
    const {
      designSystem,
      flagNonColorUtilities = true,
      flagLightDark = true,
      tokenFiles = ["src/styles.css"],
      ignoreGlobs = STORY_GLOBS,
    } = context.options[0] ?? {};

    // The default reading needs no design system: `dark:` is a theme fork whatever it
    // modifies, and segmentation answers that on its own. Narrowing to colour-carrying
    // classes is the one mode that has to ask Tailwind a question, so it is the one mode
    // that requires the bound policy view — loudly, because a narrowed rule that silently
    // reported nothing would be indistinguishable from a clean codebase.
    if (!flagNonColorUtilities && !designSystem?.isColorClass) {
      throw new Error(
        "no-dark-variant: flagNonColorUtilities: false needs the resolved design system — `designLint()` builds it from its tokenFiles and the plugin binds it around `create` at load; it cannot be passed as a JSON option. Load the plugin through `designLint()`.",
      );
    }

    if (ignoredFile(context.filename, ignoreGlobs)) return {};

    // Named, never hardcoded: the consuming project decides where its tokens live. The
    // wholesale exemption `tokenFiles` is meant to carry — `light-dark()` and `.dark &` are
    // legitimate in the file that gives a `--color-*` property its per-theme value — is not
    // implemented: nothing needs it while `.css` is out of scope, and it lands with the CSS
    // surface.
    const tokenFile = tokenFiles.join(", ") || "the token files";

    /**
     * Is there a defect here to point at?
     *
     * Two gates, and they fail in opposite directions on purpose. A token with no utility
     * is the bare `"dark:"` a `+` concatenation leaves behind — a fragment, and the
     * contract's blind spot. `flagNonColorUtilities: false` is the opposite: a project that
     * has weighed the asset-swap idiom and wants the narrower boundary, where `dark:hidden`
     * is out and `dark:bg-card` stays in.
     */
    const reportable = (base) => {
      if (base === "") return false;
      if (flagNonColorUtilities) return true;
      return designSystem.isColorClass(base);
    };

    return sweepVisitors((source) => {
      for (const token of classTokens(source)) {
        // A class with an interpolation in it is never judged, by this rule or any other:
        // what it becomes is unknowable, and guessing from half a class is where rules
        // start to disagree. Complete classes around it in the same template still are.
        if (token.dynamic) continue;
        const className = token.text;

        // The class token, not the string that contains it: two offending classes in one
        // `className` are two separate spans. A token whose offsets cannot be trusted —
        // written with an escape — carries no range, and the literal is the honest fallback.
        const node = spanOf(token, source);

        const { variants, base } = parseClass(className);

        if (variants.some(isDarkVariant) && reportable(base)) {
          context.report({
            node,
            messageId: "darkVariant",
            data: { className, utility: base, tokenFile },
          });
        }

        if (flagLightDark && className.includes(LIGHT_DARK)) {
          context.report({
            node,
            messageId: "lightDarkFunction",
            data: { source: className, tokenFile },
          });
        }
      }
    });
  },
};


/** The call, matched with its open paren so the bare word `light-dark` is not a match. */
const LIGHT_DARK = "light-dark(";

/**
 * Does this variant segment branch on the theme?
 *
 * An **arbitrary variant** never does, whatever it spells inside the brackets:
 * `[.dark_&]:` and `[@media(prefers-color-scheme:dark)]:` reconstruct the fork out of a
 * selector this rule declines to model, and both are declared blind spots. Everything else
 * is the segment's own name with any group name stripped, so `group-hover/nav:dark:` is two
 * segments of which the second matches.
 */
function isDarkVariant(segment) {
  if (segment.startsWith("[")) return false;
  const name = stripGroupName(segment);
  return name === "dark" || name === "not-dark";
}

/**
 * Where to report: the class itself when the tokenizer could place it, the string that
 * holds it when it could not.
 */
function spanOf(token, source) {
  return token.range ? { range: token.range } : source.node;
}
