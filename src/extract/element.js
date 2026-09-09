import { sourceOf } from "./sources.js";

/**
 * Composition helpers whose arguments are class strings. Nesting is followed to any depth,
 * and an argument may appear in any position.
 *
 * `cva` and `tv` are deliberately absent. They are where a component *declares* its
 * variants, which is the behaviour `no-component-color-override` pushes people toward, and
 * a `cva()` call is not a JSX element in any case. The token rules still see every string
 * inside one, through the sweep — what is out of scope here is the claim that those strings
 * land on *this* element.
 */
export const DEFAULT_HELPERS = ["cn", "clsx", "classNames", "cx", "twMerge", "twJoin", "tw"];

/**
 * The precise walk: given a JSX element, which class strings statically reach it?
 *
 * The three JSX-scoped rules are context-dependent — a class on `<Button>` means something
 * different from the same class on `<div>` — so they cannot use the sweep. This resolves
 * the `className` attribute of one element and follows the shapes a class string is
 * actually written in.
 *
 * What it follows: string and template literals, the recognised composition helpers in any
 * position and to any depth, conditionals, logical operators, array elements, and object
 * keys (the `cn({ "hover:bg-primary": isOpen })` idiom).
 *
 * What it refuses to follow, deliberately: identifiers, member expressions, `+`
 * concatenation, calls to anything not in the helper list — a runtime `.join()` included —
 * and spread attributes. Each is a declared blind spot in the contracts rather than an
 * oversight. Resolving them means dataflow analysis, where "how many levels, which scopes"
 * has no non-arbitrary answer; the line is *literal present or not*, and it is the same
 * line the token family draws.
 *
 * `class` is not inspected. It is not a React prop.
 *
 * @param {object} openingElement a `JSXOpeningElement` node
 * @param {{ helpers?: string[] }} [options] helper names, so a project with its own
 *   `cn`-alike names it rather than forking the extractor
 * @returns {import("./sources.js").ClassSource[]}
 */
export function classSourcesOfElement(openingElement, options = {}) {
  const helpers = new Set(options.helpers ?? DEFAULT_HELPERS);
  const attribute = classNameAttribute(openingElement);
  if (!attribute) return [];

  const sources = [];
  collect(valueExpression(attribute), helpers, sources, new Set());
  return sources;
}

function classNameAttribute(openingElement) {
  return (
    openingElement.attributes?.find(
      (attr) => attr.type === "JSXAttribute" && attr.name?.name === "className",
    ) ?? null
  );
}

/** `className="x"` gives a literal; `className={…}` gives whatever is in the container. */
function valueExpression(attribute) {
  const value = attribute.value;
  if (!value) return null;
  return value.type === "JSXExpressionContainer" ? value.expression : value;
}

function collect(node, helpers, out, seen) {
  if (!node || seen.has(node)) return;
  seen.add(node);

  const source = sourceOf(node);
  if (source) {
    out.push(source);
    // A template's expressions may themselves hold class strings — `cn()` inside an
    // interpolation is still a call this walk understands.
    if (node.type === "TemplateLiteral") {
      for (const expression of node.expressions) collect(expression, helpers, out, seen);
    }
    return;
  }

  switch (node.type) {
    case "CallExpression":
      if (node.callee?.type === "Identifier" && helpers.has(node.callee.name)) {
        for (const argument of node.arguments) collect(argument, helpers, out, seen);
      }
      return;
    case "ConditionalExpression":
      collect(node.consequent, helpers, out, seen);
      collect(node.alternate, helpers, out, seen);
      return;
    case "LogicalExpression":
      collect(node.left, helpers, out, seen);
      collect(node.right, helpers, out, seen);
      return;
    case "ArrayExpression":
      for (const element of node.elements) collect(element, helpers, out, seen);
      return;
    case "ObjectExpression":
      for (const property of node.properties) {
        if (property.type !== "Property" || property.computed) continue;
        const key = sourceOf(property.key);
        if (key) out.push(key);
      }
      return;
    default:
      // Identifiers, member expressions, `+`, unknown calls, spreads: the literal is not
      // here, so neither is the answer.
      return;
  }
}
