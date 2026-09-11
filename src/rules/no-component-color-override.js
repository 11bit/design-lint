import { classSourcesOfElement } from "../extract/index.js";
import { globToRegExp } from "../policy/ignore.js";
import { classTokens } from "../policy/tokenize.js";
import { parseClass, splitVariants, stripImportant } from "../policy/variants.js";

/**
 * no-component-color-override — design-system components own their colour.
 *
 * The specification is `docs/rules/no-component-color-override.md`, whose `caught` /
 * `allowed` / `blindspot` blocks the harness executes against this object.
 *
 * The rule is the most **context-dependent** of the nine. `bg-primary` is a perfectly good
 * class; it is only a defect because of *where* it lands — on the `className` of a
 * component the design system owns, where it creates an appearance that exists in one file
 * and appears in no variant map. So this rule cannot use the broad sweep the token rules
 * get: it needs `classSourcesOfElement`, which resolves `className` on one element and
 * unwraps `cn()` / `clsx()` / `twMerge()` to any depth.
 *
 * ## Two questions, and neither one is the component's name
 *
 * **Is this element watched?** A component is watched because of *where it was imported
 * from*, never because of what it is called. The rule collects the local bindings of every
 * import whose source matches a `componentSources` glob, and a JSX tag is watched when its
 * root identifier is one of them. Three holes close at once: `CardHeader` is a named import
 * like any other, so compound members need no special case; `import { Button as Btn }` is
 * still watched, because the binding is what matters and not the spelling; and a locally
 * declared `const Button = styled.div` is not watched, because it was never imported. The
 * relative-import escape valve inside a component library — `./button` matches no alias
 * pattern — falls out of the same mechanism rather than being an exemption anyone
 * maintains.
 *
 * **Is this class a colour?** Its utility prefix has to be one the design system generates
 * colours for — derived by probing Tailwind, so `border-s`, `inset-ring` and `text-shadow`
 * arrive without a hand-written list — and its value has to be a colour: a name in the
 * theme's `--color` namespace (`primary` and `red-500` alike), one of the colour keywords
 * Tailwind ships outside that namespace, or an arbitrary value holding a raw colour literal
 * or a `--color-*` custom property. `text-sm`, `border-2`, `shadow-md`, `divide-y` and
 * `from-0%` all sit under a colour prefix and are none of the rule's business, which is why
 * the value half cannot be skipped.
 *
 * Variants are stripped and then ignored. Unlike `token-constraints` and
 * `no-useless-hover`, this rule never asks *which* variant: a colour reaching a watched
 * component's `className` is the defect regardless of the condition attached to it.
 *
 * ## The interpolated case, which is the reason for the second message
 *
 * `` `bg-${tone}` `` names no class this rule could quote back, but the channel is plain:
 * a colour is being applied to a component that owns its colour, and the value is
 * unknowable to every static check downstream. It reports under `dynamicColorOnComponent`,
 * whose text names the sanctioned repair — a lookup of complete class names, or a
 * `--color-*` custom property — because a message is the only channel this rule has:
 * suggestions do not render in CLI output and `meta.docs.url` is dead under Oxlint.
 *
 * ## Where its inputs come from
 *
 * `componentSources` and `ownedUtilities` are JSON a consumer writes. `designSystem` is
 * not — it crosses a JSON boundary as a husk with every method gone — so the plugin module
 * builds it once at load from `settings.tailwindcss.entryPoint` and binds it around
 * `create` with `bindResolved` in [`src/plugin.js`](../plugin.js). Both are read from
 * `context.options[0]` and the rule cannot tell the difference.
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Color classes must not be imposed on a design-system component from outside.",
    },
    messages: {
      colorOnComponent:
        "{{token}} overrides color on <{{component}}> — design-system components own their color; use an existing variant, or add one",
      dynamicColorOnComponent:
        '{{prefix}}-* is interpolated into className on <{{component}}> — a computed color class cannot be checked or found later; move the choice into a variant, or select between complete class names ({ danger: "text-danger" }) or --color-* custom properties',
    },

    // The JSON half only. `designSystem` is bound around `create` rather than written in a
    // config, so it never reaches the validator — and a consumer who tries to write one by
    // hand should be told it is not theirs to write.
    schema: [
      {
        type: "object",
        properties: {
          componentSources: { type: "array", items: { type: "string" } },
          ownedUtilities: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],

    // The recommended policy. `ownedUtilities` is an array, which Oxlint replaces whole
    // rather than merging into — the deep merge that forces `no-spectral-color` to apply its
    // map inside `create` does not bite here.
    //
    // `componentSources` has no default, deliberately. Any default is a guess at an alias,
    // and one folder can be reached through several: a tsconfig may map `@/*` and `#/*` to
    // the same `./src/*`. A consumer who wiped the preset's options by restating a severity
    // would land on the guess, and in a project importing through the other alias the rule
    // would watch nothing and report nothing — the silence the throw below exists to prevent.
    defaultOptions: [{ ownedUtilities: [] }],
  },

  create(context) {
    const { designSystem, componentSources, ownedUtilities = [] } = context.options[0] ?? {};

    // Silence is indistinguishable from a clean codebase. These two are the load step's
    // output, not a consumer's typing: their absence means the plugin bound nothing, and an
    // empty object is exactly what one looks like after a trip through `JSON.stringify`.
    const colorPrefixes = requiredSet(designSystem?.colorPrefixes, "designSystem.colorPrefixes");
    const colorNames = requiredSet(designSystem?.colorNames, "designSystem.colorNames");

    // Oxlint *replaces* rule options rather than merging them, so a consumer bumping a
    // severity — `"design/no-component-color-override": "error"` — wipes the preset's
    // options and leaves this absent. A rule that returned early there would appear
    // enabled, report nothing and exit 0: a total, silent loss of coverage that looks
    // exactly like success. Failing loudly is the whole mitigation available here.
    if (!Array.isArray(componentSources) || componentSources.length === 0) {
      throw new Error(
        'no-component-color-override: `componentSources` is required and must be a non-empty array of glob patterns matched against each import source exactly as written — if your code imports "#/components/ui/button", that is ["#/components/ui/*"], even when another alias points at the same folder; a shadcn project records it as `aliases.ui` in components.json. Oxlint replaces rule options rather than merging them, so a severity bump written on its own wipes the preset\'s; re-pass the options alongside it.',
      );
    }

    const sourcePatterns = componentSources.map((pattern) => globToRegExp(pattern));
    const owned = new Set(ownedUtilities);

    /** Local bindings introduced by an import this configuration watches. */
    const watched = new Set();

    return {
      ImportDeclaration(node) {
        const source = node.source?.value;
        if (typeof source !== "string") return;
        if (!sourcePatterns.some((pattern) => pattern.test(source))) return;

        // Every specifier, in all three spellings. A namespace import binds one name that a
        // member-expression tag then reaches through, which is the same shape as `Card` and
        // `<Card.Header>` and is resolved the same way below.
        for (const specifier of node.specifiers ?? []) {
          if (specifier.local?.name) watched.add(specifier.local.name);
        }
      },

      JSXOpeningElement(node) {
        const component = componentName(node.name);
        if (!component || !watched.has(rootIdentifier(node.name))) return;

        for (const source of classSourcesOfElement(node)) {

          for (const token of classTokens(source)) {
            // Every token advances the cursor, reported or not, so a class written twice in
            // one string is located twice rather than at its first occurrence both times.
            const range = token.range;
            const at = range ? { loc: spanOf(context, range) } : { node: source.node };

            if (token.dynamic) {
              const prefix = danglingColorPrefix(token.head, colorPrefixes, owned);
              if (prefix) {
                context.report({
                  ...at,
                  messageId: "dynamicColorOnComponent",
                  data: { prefix, component },
                });
              }
              continue;
            }

            if (!appliesColor(token.text, colorPrefixes, colorNames, owned)) continue;
            context.report({
              ...at,
              messageId: "colorOnComponent",
              data: { token: token.text, component },
            });
          }
        }
      },
    };
  },
};

/**
 * Colour keywords Tailwind ships that are *not* theme colours.
 *
 * `white` and `black` live in the `--color` namespace and need no listing; these three are
 * CSS-wide values Tailwind handles itself, so nothing in the design system can be probed
 * for them. They are the one hand-written set here, and they are hand-written because CSS
 * defines them rather than because any project does.
 */
const COLOR_KEYWORDS = new Set(["transparent", "current", "inherit"]);

/**
 * A raw colour literal, or a reference into the theme's colour namespace.
 *
 * The test for the arbitrary half of "is this value a colour", and the reason
 * `shadow-[0_0_4px_#000]` and `shadow-[0_0_4px_var(--spacing-1)]` land on opposite sides:
 * the prefix and the shape are identical and only the value differs. Named CSS colours
 * (`text-[red]`) are deliberately absent — the 148-name matcher is `no-raw-color`'s, and
 * duplicating a partial copy of it here would be a second thing to be wrong.
 */
const COLOR_VALUE =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(|--color-/;

/**
 * A required resolved input, which is always a live `Set`.
 *
 * The `Set` check is not pedantry: an empty object is what one of these looks like after a
 * trip through `JSON.stringify`, so the failure it catches is the plumbing mistake of
 * passing a resolved input as an option instead of binding it.
 */
function requiredSet(value, name) {
  if (!(value instanceof Set)) {
    throw new Error(
      `no-component-color-override: \`${name}\` is missing or is not a Set — the plugin module resolves the design system from \`settings.tailwindcss.entryPoint\` at load and binds it around \`create\`; it cannot be passed as a JSON option.`,
    );
  }
  return value;
}

/** The identifier a JSX tag is rooted in: `Button`, and `Card` for `<Card.Header>`. */
function rootIdentifier(name) {
  if (!name) return null;
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") return rootIdentifier(name.object);
  // `<svg:rect>` — a namespaced tag is never a component.
  return null;
}

/** The tag as the author wrote it, which is what the message names. */
function componentName(name) {
  if (!name) return null;
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") {
    const object = componentName(name.object);
    return object ? `${object}.${name.property.name}` : null;
  }
  return null;
}

/**
 * Does this class apply a colour to whatever it lands on?
 *
 * Variants, the important modifier and the opacity modifier are stripped first: all three
 * decide *when* a colour applies and never *whether* one does. What is left has to be a
 * declared colour prefix carrying a colour value — or any prefix the project listed in
 * `ownedUtilities`, which is the option's whole purpose: a project that has decided
 * `rounded` is the system's business wants `rounded-full` reported, and `full` is not a
 * colour by anybody's definition.
 *
 * @returns {boolean}
 */
function appliesColor(className, colorPrefixes, colorNames, owned) {
  const { base } = parseClass(className);
  if (!base) return false;

  if (startsWithPrefix(base, owned)) return true;

  // An arbitrary value is one opaque blob that may contain `-` and `:` and its own
  // brackets, so it is split off by the bracket rather than by the segment scan below.
  const bracket = base.indexOf("[");
  if (bracket !== -1) {
    const prefix = base.slice(0, bracket).replace(/-$/, "");
    if (!prefix || !startsWithPrefix(prefix, colorPrefixes)) return false;
    return COLOR_VALUE.test(base.slice(bracket));
  }

  // Longest colour name first, so `border-t-primary` splits as `primary` under `border-t`
  // rather than as nothing at all. Both halves have to hold at the same split point — a
  // name the theme knows, and a colour-carrying utility standing in front of it — which is
  // why this is a scan and not a parse of a fixed prefix.
  const segments = base.split("-");
  for (let k = 1; k < segments.length; k++) {
    const value = segments.slice(k).join("-");
    if (!colorNames.has(value) && !COLOR_KEYWORDS.has(value)) continue;
    if (startsWithPrefix(segments.slice(0, k).join("-"), colorPrefixes)) return true;
  }

  return false;
}

/**
 * The colour prefix standing immediately against an interpolation, or `null`.
 *
 * The gate is the prefix, not the backtick: `` `p-${size}` `` is ordinary code and
 * `` `bg-${tone}` `` is a colour being applied through a channel the component owns.
 * "Immediately" is meant literally — the static text has to end at the `-` that would have
 * joined the value on, which is what leaves `` `${prefix}-primary` `` a blind spot: no
 * prefix survives there to identify a channel.
 *
 * The returned prefix is the static text as written, minus that trailing `-`, so
 * `` `bg-red-${shade}` `` is answered with `bg-red` — the text the author has to edit,
 * rather than the utility root underneath it.
 */
function danglingColorPrefix(head, colorPrefixes, owned) {
  const { base: decorated } = splitVariants(head);
  const { base } = stripImportant(decorated);
  if (!base.endsWith("-")) return null;

  const prefix = base.slice(0, -1);
  if (!prefix) return null;
  if (startsWithPrefix(prefix, owned)) return prefix;
  return startsWithPrefix(prefix, colorPrefixes) ? prefix : null;
}

/**
 * Does this text begin with one of these utility prefixes?
 *
 * Asked twice — of the derived colour prefixes, and of `ownedUtilities` — and the match has
 * to land on a segment boundary either way, or `bordering-red-500` would pass on the
 * strength of `border`.
 */
function startsWithPrefix(text, prefixes) {
  for (const candidate of prefixes) {
    if (text === candidate || text.startsWith(`${candidate}-`)) return true;
  }
  return false;
}

/** A source range as the report API wants it. */
function spanOf(context, [start, end]) {
  return {
    start: context.sourceCode.getLocFromIndex(start),
    end: context.sourceCode.getLocFromIndex(end),
  };
}
