import { DEFAULT_HELPERS } from "./element.js";

/**
 * Helpers whose arguments are class strings, for {@link inClassPosition}: the precise walk's
 * list plus `cva` and `tv`. The walk leaves those two out because a variant declaration does
 * not land on the element it is walking; here the only question is whether a string is a
 * class list, and every string in a variant declaration is one.
 */
export const CLASS_POSITION_HELPERS = Object.freeze([...DEFAULT_HELPERS, "cva", "tv"]);

const HELPERS = new Set(CLASS_POSITION_HELPERS);
const CLASS_KEYS = new Set(["className", "class"]);

/**
 * Does this string sit where a class list is written?
 *
 * True inside a `className` or `class` JSX attribute, inside the value of a `className` or
 * `class` property (a props object spread onto an element, `cva`'s `compoundVariants`), and
 * anywhere among the arguments of a class helper, to any depth — an object key in
 * `cn({ "bg-primary": isOpen })` and a variant value in `cva()` included.
 *
 * It reads the syntax around the string and never the string itself, so it is not a guess
 * about content. A string anywhere else — a constant, an object map, an SVG attribute, a
 * test title — is outside, whatever it holds.
 *
 * The walk ends at the first JSX attribute it meets: inside an attribute, its name is the
 * whole answer.
 *
 * @param {object} node a `Literal` or `TemplateLiteral`, with `parent` links
 */
export function inClassPosition(node) {
  for (let child = node, parent = node.parent; parent; child = parent, parent = parent.parent) {
    switch (parent.type) {
      case "JSXAttribute":
        return CLASS_KEYS.has(parent.name?.name);
      case "Property":
        if (parent.value === child && !parent.computed && CLASS_KEYS.has(keyName(parent.key))) {
          return true;
        }
        break;
      case "CallExpression":
        if (parent.callee !== child && parent.callee?.type === "Identifier" && HELPERS.has(parent.callee.name)) {
          return true;
        }
        break;
    }
  }
  return false;
}

/** A non-computed property key as a string: `className` and `"className"` alike. */
function keyName(key) {
  if (key?.type === "Identifier") return key.name;
  if (key?.type === "Literal") return key.value;
  return undefined;
}
