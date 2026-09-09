/**
 * A **class source** is one string-producing expression, kept in the shape the rules need
 * rather than the shape the parser produced.
 *
 * A string literal has one segment. A template literal has one segment per quasi, and a
 * segment records whether an interpolation follows it — which is the whole reason this
 * type exists. `` `bg-${tone}-500` `` is not a class name and not nothing: it is the prefix
 * `bg-` against a hole, and decision A7b makes that a violation. A rule can only say so if
 * extraction hands it the hole along with the text.
 *
 * @typedef {{ text: string, followedByExpression: boolean }} Segment
 * @typedef {{ node: object, segments: Segment[] }} ClassSource
 */

/** @returns {ClassSource | null} */
export function sourceOfLiteral(node) {
  if (typeof node.value !== "string") return null;
  return { node, segments: [{ text: node.value, followedByExpression: false }] };
}

/** @returns {ClassSource} */
export function sourceOfTemplate(node) {
  return {
    node,
    segments: node.quasis.map((quasi, i) => ({
      // `cooked` is null for a template with an invalid escape. The raw text is not a class
      // name in any useful sense, so treat it as empty rather than guessing.
      text: quasi.value.cooked ?? "",
      followedByExpression: i < node.expressions.length,
    })),
  };
}

/**
 * The source for any expression that *is* a string, or `null` for one that merely might be.
 * The distinction is the line every rule in this repo draws: a literal is present, or it is
 * not.
 *
 * @returns {ClassSource | null}
 */
export function sourceOf(node) {
  if (!node) return null;
  if (node.type === "Literal") return sourceOfLiteral(node);
  if (node.type === "TemplateLiteral") return sourceOfTemplate(node);
  return null;
}
