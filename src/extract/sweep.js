import { sourceOf } from "./sources.js";

/**
 * The broad sweep: every string literal and every static template-literal segment in the
 * file, context-free (decision **A7**).
 *
 * The six token rules are context-free themselves — they ask "is this string a forbidden
 * class?" and never need to know which element it lands on — so extraction precision buys
 * them nothing and costs them the surfaces that matter most. A `cn()` argument, a `cva()`
 * variant, an object-literal map in a `.ts` constants file and a class on a JSX element are
 * one string literal each here, with no special-case plumbing, because the sweep does not
 * parse the wrapper.
 *
 * False-positive protection is the rules' own job: a declared colour prefix, and a colour
 * part that is a declared token. A random string cannot accidentally match both.
 *
 * Visitor keys are used rather than a tree walk of our own, so the linter's traversal is
 * the only traversal and a node cannot be visited twice. A `Literal` inside a template's
 * expression — `` `text-${"muted"}` `` — arrives as its own source, which is correct: no
 * rule reassembles an interpolation whose parts happen to be static.
 */
export function sweepVisitors(onSource) {
  return {
    Literal(node) {
      const source = sourceOf(node);
      if (source) onSource(source);
    },
    TemplateLiteral(node) {
      onSource(sourceOf(node));
    },
  };
}
