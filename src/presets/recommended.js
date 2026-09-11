/**
 * The `recommended` preset: every rule on, at `error`.
 *
 * These are severities, not semantics. What each rule *means* lives in its contract and in
 * the rule itself, which carries the recommended policy — in `meta.defaultOptions`, or for
 * `token-constraints` in `create`, when neither `allowed` nor `denied` is written — so that
 * a consumer who wipes a rule's options by restating its severity lands on the right
 * behaviour rather than on nothing. This file only says which rules run and how loudly.
 *
 * **Versioning.** A new rule ships **disabled** and joins `recommended` only in a major
 * release. Adding one here turns a patch upgrade into a failing build for every consumer,
 * which teaches people to pin — and a linter nobody upgrades is a linter that stops
 * matching the design system it was written for.
 */
export const RULE_IDS = [
  "no-component-color-override",
  "no-dark-variant",
  "no-opacity-modifier",
  "no-raw-color",
  "no-spectral-color",
  "no-style-color",
  "no-undefined-token",
  "no-useless-hover",
  "token-constraints",
];

/**
 * The subset a project adopts first. Each one reports something that is wrong on its own
 * terms — an inline colour, a literal, a palette class — without needing the project to
 * have finished naming its semantic tokens. The four left out (`no-undefined-token`,
 * `token-constraints`, `no-useless-hover`, `no-component-color-override`) all judge a class
 * against a token vocabulary or a component boundary the project has to have settled first.
 */
export const MINIMAL_RULE_IDS = [
  "no-style-color",
  "no-raw-color",
  "no-spectral-color",
  "no-dark-variant",
  "no-opacity-modifier",
];

/** `{ "design/<id>": severity }` for the given ids. */
export function severities(ids, { namespace = "design", severity = "error" } = {}) {
  return Object.fromEntries(ids.map((id) => [`${namespace}/${id}`, severity]));
}
