/**
 * Rule options the corpus is written against.
 *
 * These are fixtures, not the `recommended` preset. The preset is built in Phase 5 from
 * the contents of `design-system/lint/colors.json`, and at that point this file becomes a
 * thin override layer over it rather than a hand-written map.
 *
 * Only options the corpus actually depends on today are listed. `componentSources` is the
 * one that is load-bearing right now: `no-component-color-override` watches a component
 * because of where it was imported from, so its cases mean nothing without it.
 */
const OPTIONS = {
  "no-component-color-override": [{ componentSources: ["@/components/ui/*"] }],
};

export function optionsFor(rule) {
  return OPTIONS[rule] ?? [];
}
