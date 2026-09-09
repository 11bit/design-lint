/**
 * Class-string extraction.
 *
 * Four of the nine rules share one hard problem — which class strings are there, and for
 * three of them, which ones reach *this* element — and the proof of concept solved it three
 * separate times, which is exactly why its coverage differed from rule to rule. It is
 * solved once here, so the rules become thin predicates over a trustworthy input.
 *
 * There are two extractors rather than one, because the rule families ask different
 * questions and want opposite failure modes (decision **A7**):
 *
 * - {@link sweepVisitors} — context-free, for the six token rules. Every string literal and
 *   every static template segment in the file. Breadth is the point: `cn()` arguments,
 *   `cva()` variants and `.ts` object-literal maps are simply *there*.
 * - {@link classSourcesOfElement} — context-dependent, for the three JSX rules. Resolves
 *   `className` on one element, unwrapping composition helpers to any depth, and refuses to
 *   guess past the point where the literal stops being present.
 *
 * Everything this module needs arrives as an argument. It reads no files, resolves no path,
 * and derives nothing from its own location — the constraint that lets the package be
 * installed by a project shaped nothing like the one it grew in.
 */

export { classSourcesOfElement, DEFAULT_HELPERS } from "./element.js";
export { sweepVisitors } from "./sweep.js";
export { sourceOf } from "./sources.js";
