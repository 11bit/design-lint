import { sweepVisitors } from "../extract/index.js";
import { DEFAULT_IGNORED_VALUES, firstRawColor, wholeValueColor } from "../policy/color.js";
import { IGNORE_GLOBS_SCHEMA, ignoredFile, STORY_GLOBS } from "../policy/ignore.js";
import { colorProperty } from "../policy/properties.js";
import { classTokens } from "../policy/tokenize.js";
import { parseClass } from "../policy/variants.js";

/**
 * no-raw-color — a colour must never be written as a literal value.
 *
 * The specification is `docs/rules/no-raw-color.md`, whose `caught` / `allowed` /
 * `blindspot` blocks the harness executes against this object.
 *
 * The rule's subject is the **value**, wherever it is written, which is the mirror image of
 * `no-style-color`: that rule flags `color:` appearing in a `style` prop whatever it is set
 * to, and this one flags `#f00` whatever channel applies it. `style={{ color: "#f00" }}`
 * reports under both, and that is correct — the mechanism and the literal are independently
 * wrong, and fixing one leaves a real defect behind.
 *
 * ## Two enforcement models, because each covers the other's hole
 *
 * **Context-scoped.** Every channel that is known to carry a colour must resolve it through
 * a token: a colour-carrying SVG presentation attribute, a colour-carrying `style`
 * property, the bracket of a colour-carrying Tailwind utility. Inside a delimited context
 * like these, a bare `red` is unambiguously a colour, which is the only way the 148 named
 * colours can be enforced at all — matching them as bare words anywhere would flag
 * `<div id="red" />` and `"animate-fadeToRed"`.
 *
 * **Value-scoped.** A string that is *entirely* an unambiguous literal — hex, or a colour
 * function — is caught wherever a constant is written, with no context to scope to. This is
 * what reaches `const SERIES = ["#ff0000"]`, which belongs to no attribute and no utility
 * prefix and would otherwise be the easiest place in the codebase to hide a colour.
 *
 * Neither alone is enough. The attribute and property lists are hand-maintained and a
 * free-standing constant has no context; the value-scoped half cannot see `red`. Both run
 * by default, and turning the backstop off is a documented option rather than a debate.
 *
 * ## Where each surface's strings come from
 *
 * The class surface uses `sweepVisitors` — every string literal and every static template
 * segment in the file (decision **A7**). Breadth is the point: a `cn()` argument, a `cva()`
 * variant map and a `.ts` object-literal constants file are one string each, and the
 * object-literal map was the known coverage regression the migration plan recorded.
 *
 * The backstop does **not** use the sweep, and the difference is the two blind spots at the
 * bottom of the contract. `canvas.fillStyle = "#ff0000"` and
 * `element.style.setProperty("--brand", "#ff0000")` are whole-string literals that a sweep
 * would report, and the contract declares both unreported: they are colours being *applied*
 * through a runtime channel, not colours written down as data. So the backstop is driven by
 * the positions where a constant lives — a declarator's initialiser, an object property's
 * value, an array element — and the two blind spots fall out of that shape rather than
 * needing a carve-out to exclude them.
 *
 * ## Reporting granularity
 *
 * One report per offending *thing*: per class token, per JSX attribute, per style property,
 * per string literal. `"bg-[#f00] text-[#0f0]"` is two and `<rect fill="#f00" stroke="#0f0" />`
 * is two, while `boxShadow: "0 0 4px #f00, 0 0 8px #00f"` is one — one value, however many
 * literals it contains. A style property claims its own value so the backstop cannot report
 * it a second time; nothing else needs claiming, because a class string never parses as a
 * whole-string colour and a JSX attribute value is in none of the backstop's positions.
 *
 * ## Where its inputs come from
 *
 * `tokenFiles`, `namedColors`, `valueScopedBackstop`, `ignoreValues` and `ignoreGlobs` are JSON
 * a consumer writes; `tokenFiles` only names the file in the message. `designSystem` and
 * `tokens` are not JSON — they cross a JSON boundary as husks with every method gone — so
 * `designLint()` builds them once from its own `tokenFiles`, and the plugin module binds them
 * around `create` with `bindResolved` in [`src/plugin.js`](../plugin.js). Both are read from
 * `context.options[0]` and the rule cannot tell the difference.
 *
 * ## No suggestion yet, and why
 *
 * The contract asks for a suggestion where a literal is *exactly* equal to a defined
 * token's computed value — `#e5484d` → `var(--color-danger)` — offered on exact match only.
 * That needs the tokens' **values**, and the resolved inputs a rule is handed carry only
 * their *names*: `tokens` is a `Set` of names and the design-system policy view exposes
 * `colorPrefixes`, `colorNames`, `resolves` and `isColorClass`, none of which will answer
 * what `--color-danger` resolves to. Adding a name→value map is a change to
 * `src/policy/design-system.js`, which other rules share. So the suggestion is not offered
 * here rather than being offered on a guess, which the contract forbids outright: nothing
 * is worse than an automatic fix that silently changes a rendered colour. The message
 * carries the whole diagnostic in the meantime, which it must anyway — suggestions do not
 * render in any CLI output.
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Colors must be written as tokens, never as literal values.",
    },
    messages: {
      rawColorValue:
        "raw color {{value}} in {{surface}} — colors must resolve through a var(--color-*) token. Add one to {{tokenFile}} if none fits.",
    },

    // The JSON half only. `designSystem` and `tokens` are bound around `create` rather than
    // written in a config, so they never reach the validator — and a consumer who tries to
    // write one by hand should be told it is not theirs to write.
    schema: [
      {
        type: "object",
        properties: {
          tokenFiles: { type: "array", items: { type: "string" } },
          namedColors: { type: "boolean" },
          valueScopedBackstop: { type: "boolean" },
          ignoreValues: { type: "array", items: { type: "string" } },
          ignoreGlobs: IGNORE_GLOBS_SCHEMA,
        },
        additionalProperties: false,
      },
    ],

    // The recommended policy. Every option here is a boolean or an array, both of which
    // Oxlint replaces whole — the deep merge that forces `no-spectral-color` to apply its
    // replacement map inside `create` instead would bite an object-valued option, and there
    // is none.
    //
    // `tokenFiles` is the value a consumer who wipes the preset's options by writing
    // `"design/no-raw-color": "error"` lands on: the message then names `src/styles.css`
    // rather than their file, and nothing else changes. The throw below is reachable only
    // where `defaultOptions` is not applied.
    defaultOptions: [
      {
        tokenFiles: ["src/styles.css"],
        namedColors: true,
        valueScopedBackstop: true,
        ignoreValues: [...DEFAULT_IGNORED_VALUES],
        ignoreGlobs: [...STORY_GLOBS],
      },
    ],
  },

  create(context) {
    const {
      designSystem,
      tokens,
      tokenFiles,
      namedColors = true,
      valueScopedBackstop = true,
      ignoreValues = DEFAULT_IGNORED_VALUES,
      ignoreGlobs = STORY_GLOBS,
    } = context.options[0] ?? {};

    // Silence is indistinguishable from a clean codebase, so a rule that cannot do its job
    // says so rather than reporting nothing. These two are the load step's output, not a
    // consumer's typing: their absence means the plugin bound nothing, and the shape they
    // arrive in says which mistake it was — an empty object is exactly what one looks like
    // after a trip through `JSON.stringify`.
    const colorPrefixes = requiredSet(designSystem?.colorPrefixes, "designSystem.colorPrefixes");
    requiredSet(tokens, "tokens");

    // Under Oxlint this is never absent: `defaultOptions` supplies a path, deep-merged under
    // whatever the consumer wrote. It can be absent where `defaultOptions` is not applied —
    // `RuleTester`, a direct `create` call — and there the rule refuses rather than guessing
    // at a file to name.
    if (!Array.isArray(tokenFiles)) {
      throw new Error(
        'no-raw-color: `tokenFiles` is required and must be an array of paths — e.g. ["src/styles.css"]. It names the file the message tells the developer to add a token to; the design system itself comes from designLint()\'s `tokenFiles`. Under Oxlint the rule\'s defaultOptions supply it, so this is a rule created outside the plugin.',
      );
    }

    if (ignoredFile(context.filename, ignoreGlobs)) return {};

    // An empty list is a consumer who has tokens but no file to name — the message degrades
    // rather than pointing at a path this package invented.
    const tokenFile = tokenFiles[0] ?? "your token file";
    const matching = { namedColors, ignoreValues };

    const report = (at, value, surface) =>
      context.report({ ...at, messageId: "rawColorValue", data: { value, surface, tokenFile } });

    /**
     * Style-property values this rule has already judged.
     *
     * A `style` prop's properties are `Property` nodes, which is one of the positions the
     * backstop watches, so without this `style={{ backgroundColor: "#f00" }}` would report
     * twice for one literal. The claim is made whether or not the property reports, because
     * "already judged" is the fact that matters — `backgroundImage: "url('/img.png#a')"` is
     * a value this rule has decided is clean, and the backstop must not reopen it.
     *
     * A JSX attribute is always visited before the object inside it, so the claim is always
     * in place before the backstop looks.
     */
    const claimed = new WeakSet();

    /** The value-scoped backstop, applied to one expression in a constant position. */
    const backstop = (node) => {
      if (!valueScopedBackstop) return;
      const value = staticString(node);
      if (value === null) return;

      const found = wholeValueColor(value, { ignoreValues });
      if (found) report({ node }, found, "a string literal");
    };

    /** Every colour-carrying property of a `style` prop's object. */
    const styleProperties = (attribute) => {
      const object =
        attribute.value?.type === "JSXExpressionContainer" ? attribute.value.expression : null;
      if (object?.type !== "ObjectExpression") return;

      for (const property of object.properties) {
        // A `SpreadElement` carries no key to judge, and its value is not written here.
        if (property.type !== "Property") continue;

        const name = keyName(property);
        if (name === null || !colorProperty(name)) continue;
        claimed.add(property);

        const value = staticString(property.value);
        if (value === null) continue;

        // One report per property, however many literals the value holds: the author wrote
        // one value and has one edit to make.
        const found = firstRawColor(value, matching);
        if (found) report({ node: property }, found, "a style prop");
      }
    };

    return {
      // The class surface. Context-free by design, so a class string is judged the same
      // whether it reaches an element, a `cva()` variant or a constants file.
      ...sweepVisitors((source) => {

        for (const token of classTokens(source)) {
          // Every token advances the cursor, reported or not, so a class written twice in
          // one string is located twice rather than at its first occurrence both times.
          const range = token.range;

          // `` `bg-[hsl(${hue},100%,50%)]` `` is a declared blind spot: the literal is not
          // written down, and the colour prefix against a hole belongs to the token rules.
          if (token.dynamic) continue;

          const value = arbitraryValue(token.text, colorPrefixes);
          if (value === null) continue;

          const found = firstRawColor(value, matching);
          if (!found) continue;

          const at = range ? { loc: spanOf(context, range) } : { node: source.node };
          report(at, found, "an arbitrary value");
        }
      }),

      JSXAttribute(node) {
        const name = attributeName(node.name);
        if (name === null) return;

        if (name === "style") {
          styleProperties(node);
          return;
        }

        // SVG presentation attributes, in either spelling — `stopColor` and `stop-color`
        // are the same attribute and `normalizeProperty` inside `colorProperty` knows it.
        // Only the colour-*only* reading applies here: an attribute named `mask` or `src`
        // takes an address rather than a colour, and the shorthand half of that list is a
        // fact about `style` properties rather than about SVG.
        if (colorProperty(name) !== "color") return;

        const value = staticString(attributeValue(node));
        if (value === null) return;

        // One report per attribute, at the attribute: `fill="#f00" stroke="#0f0"` is two
        // spans, and the whole element is neither of them.
        const found = firstRawColor(value, matching);
        if (found) report({ node }, found, "an SVG attribute");
      },

      // The backstop's three positions — what it means for a colour to be written down as a
      // constant rather than applied through a channel.
      VariableDeclarator(node) {
        backstop(node.init);
      },
      Property(node) {
        if (!claimed.has(node)) backstop(node.value);
      },
      ArrayExpression(node) {
        for (const element of node.elements ?? []) backstop(element);
      },
    };
  },
};

/**
 * A required resolved input, which is always a live `Set`.
 *
 * The `Set` check is not pedantry: an empty object is exactly what one of these looks like
 * after a trip through `JSON.stringify`, so the failure this catches is the plumbing
 * mistake of passing a resolved input as an option instead of binding it. Nothing is
 * defaulted — a rule that shrugged would report nothing and look like a clean codebase.
 */
function requiredSet(value, name) {
  if (!(value instanceof Set)) {
    throw new Error(
      `no-raw-color: \`${name}\` is missing or is not a Set — designLint() builds it from its \`tokenFiles\` and the plugin module binds it around \`create\`; it cannot be passed as a JSON option.`,
    );
  }
  return value;
}

/**
 * The CSS inside a colour-carrying utility's arbitrary value, or `null`.
 *
 * Two gates, and both are needed. The **prefix** has to be one the design system generates
 * colours for, which is what keeps `w-[calc(100%-2rem)]` and `animate-[fadeToRed_2s]` out
 * without a list anybody maintains. The **value** then has to hold a colour, which is what
 * separates `text-[red]` from `text-[13px]` under the same prefix — `text-` carries a
 * colour and a font size, so the prefix alone decides nothing.
 *
 * Note what this does *not* use: `designSystem.isColorClass`. That asks Tailwind which
 * property the value lands in, and answers `false` for `shadow-[0_0_4px_#f00]`, whose
 * declaration is `--tw-shadow` rather than a colour property. The contract wants that one
 * caught, so the gate here is the prefix and the literal rather than the generated property.
 */
function arbitraryValue(className, colorPrefixes) {
  const { base } = parseClass(className);
  if (!base) return null;

  const open = base.indexOf("[");
  if (open === -1) return null;

  // An unclosed bracket is `className={"bg-[#" + hex + "]"}` — a declared blind spot, where
  // the literal is assembled at runtime and is not there to report.
  const close = base.lastIndexOf("]");
  if (close <= open) return null;

  const prefix = base.slice(0, open).replace(/-$/, "");
  if (!prefix || !startsWithPrefix(prefix, colorPrefixes)) return null;

  return unescapeArbitrary(base.slice(open + 1, close));
}

/**
 * A Tailwind arbitrary value, spelled as the CSS it stands for.
 *
 * Tailwind writes a space as `_`, since a class name cannot contain one, and `\_` for a
 * literal underscore. Undoing that here rather than teaching the colour matcher about it
 * keeps the matcher a matcher over CSS: `_` is Tailwind's grammar, not colour policy, and
 * `no-style-color` will ask the same matcher about values that never went through a class.
 */
function unescapeArbitrary(value) {
  return value.replace(/\\?_/g, (match) => (match === "\\_" ? "_" : " "));
}

/**
 * Does this text begin with one of the design system's colour-carrying utilities?
 *
 * The match has to land on a segment boundary, or `bordering-[#f00]` would pass on the
 * strength of `border`.
 */
function startsWithPrefix(text, prefixes) {
  for (const candidate of prefixes) {
    if (text === candidate || text.startsWith(`${candidate}-`)) return true;
  }
  return false;
}

/** The attribute's name, or `null` for `<svg:rect>`-style namespaced spellings. */
function attributeName(name) {
  return name?.type === "JSXIdentifier" ? name.name : null;
}

/** What an attribute is set to, through the expression container if there is one. */
function attributeValue(attribute) {
  const { value } = attribute;
  if (!value) return null;
  return value.type === "JSXExpressionContainer" ? value.expression : value;
}

/**
 * The property's name, however it was written: `color`, `{ color }`, `"color"`,
 * `['color']`. A computed key that is not a static string — `{ [k]: v }` — has no name to
 * judge and returns `null`.
 */
function keyName(property) {
  const { key } = property;
  if (property.computed) return staticString(key);
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return typeof key.value === "string" ? key.value : null;
  return null;
}

/**
 * A string this rule can read at lint time, in either spelling of a literal.
 *
 * The line every rule in this repo draws: the literal is present, or it is not. A template
 * with a hole in it is not a value anybody can check, which is what makes
 * `style={{ color: computeColor(theme) }}` a blind spot rather than an omission.
 */
function staticString(node) {
  if (node?.type === "Literal") return typeof node.value === "string" ? node.value : null;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0].value.cooked ?? null;
  }
  return null;
}

/** A source range as the report API wants it. */
function spanOf(context, [start, end]) {
  return {
    start: context.sourceCode.getLocFromIndex(start),
    end: context.sourceCode.getLocFromIndex(end),
  };
}
