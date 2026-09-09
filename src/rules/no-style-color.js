import { colorProperty } from "../policy/properties.js";

/**
 * no-style-color — colour must not be applied through the React `style` prop.
 *
 * The specification is `docs/rules/no-style-color.md`, whose `caught` / `allowed` /
 * `blindspot` blocks the harness executes against this object.
 *
 * The rule's subject is the **property**, never the value: `color: "red"` and
 * `color: computeColor()` are the same violation, because it is the inline channel that
 * defeats the token system, not the literal inside it. That is what makes this the
 * smallest of the nine — it needs no token set, no design-system resolution and no
 * required option, since which properties apply a colour is a fact about CSS rather than
 * about any project.
 *
 * Everything it declines to follow — `style={s}`, `{...spread}`, `element.style.color` —
 * is a declared blind spot in the contract rather than an oversight, and each is asserted
 * there as a case that must keep going unreported.
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Color must not be applied through the React `style` prop.",
    },
    messages: {
      colorInStyleProp:
        "{{property}} in style= — inline color bypasses the token system; use a color class, or set a --color-* custom property instead",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowTokenValues: { type: "boolean" },
          shorthandProperties: { enum: ["key", "value"] },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowTokenValues: false, shorthandProperties: "key" }],
  },

  create(context) {
    const { allowTokenValues = false, shorthandProperties = "key" } = context.options[0] ?? {};

    // Value inspection needs the answer to "does this string carry a colour?", which is
    // `no-raw-color`'s generated matcher — the 148 named colours included, without which
    // `border: "1px solid red"` would slip through the very mode chosen to be quieter.
    // Failing loudly beats a mode that silently under-reports; it is wired up when that
    // matcher lands.
    if (shorthandProperties === "value") {
      throw new Error(
        'no-style-color: shorthandProperties: "value" is not available yet — it needs the color matcher that ships with no-raw-color. Use "key" (the default).',
      );
    }

    return {
      JSXAttribute(node) {
        if (node.name?.name !== "style") return;
        if (node.value?.type !== "JSXExpressionContainer") return;

        const object = node.value.expression;
        if (object?.type !== "ObjectExpression") return;

        for (const property of object.properties) {
          // A `SpreadElement` carries no key to judge — the indirect-value blind spot.
          if (property.type !== "Property") continue;

          const name = keyName(property);
          if (name === null || !colorProperty(name)) continue;
          if (allowTokenValues && isTokenReference(property.value)) continue;

          context.report({
            node: property,
            messageId: "colorInStyleProp",
            data: { property: name },
          });
        }
      },
    };
  },
};

/**
 * The property's name, however it was written: `color`, `{ color }`, `"color"`,
 * `['color']`. A computed key that is not a static string — `{ [k]: v }` — has no name to
 * report and returns `null`.
 */
function keyName(property) {
  const { key } = property;
  if (property.computed) return staticString(key);
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return typeof key.value === "string" ? key.value : null;
  return null;
}

/** A string this rule can read at lint time, in either spelling of a literal. */
function staticString(node) {
  if (node?.type === "Literal") return typeof node.value === "string" ? node.value : null;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

/**
 * `var(--color-primary)` — a token, and still a violation by default: it cannot carry a
 * variant and it still beats every class in the cascade. `allowTokenValues` is for a
 * project that has weighed that and disagrees.
 */
function isTokenReference(node) {
  const value = staticString(node);
  return value !== null && /var\(\s*--/.test(value);
}
