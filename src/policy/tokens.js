/**
 * The semantic token set — which `--color-*` names this project defines.
 *
 * Two rules need it for something other than resolution. `no-raw-color` matches a raw
 * value against the tokens that could replace it, and names the token file in its message;
 * `no-undefined-token` builds its typo candidates from it. Both need *names*, which is a
 * different question from "does this class generate CSS" and is why it is not simply read
 * off the design system's resolution path.
 *
 * ## Resolved sets, not just paths
 *
 * Phase 2 found the interface requirement before any rule existed to need it: a case in
 * the corpus that varies the token set cannot be written if the only way to supply one is
 * a filename. So `resolveTokenSet` accepts either — paths to read, or a set already
 * resolved — and every rule takes the resolved set. A rule that can only be handed a
 * filename is a rule that cannot be tested.
 */

/**
 * `--color-<name>:` in a declaration position.
 *
 * Deliberately a scan rather than a parse. The token set is a set of *names*, and the
 * design system is already the authority on whether any of them resolve — a second parser
 * here would be a second thing to be wrong. What it must not do is match a `var(--color-x)`
 * *reference*, which is why the colon is required.
 */
const COLOR_DECLARATION = /--color-([\w-]+)\s*:/g;

/**
 * Extract the `--color-*` names a stylesheet defines.
 *
 * @param {string} css
 * @returns {string[]}
 */
export function colorTokenNames(css) {
  return [...css.matchAll(COLOR_DECLARATION)].map((match) => match[1]);
}

/**
 * Resolve a token set from whatever the caller has.
 *
 * @param {{ tokens?: Iterable<string>, css?: string }} source
 *   `tokens` is an already-resolved set and wins outright — the corpus supplies one per
 *   case, and the preset may supply one that never had a file. `css` is stylesheet text,
 *   which the plugin module reads from `tokenFiles` once at load.
 * @returns {Set<string>}
 */
export function resolveTokenSet({ tokens, css } = {}) {
  if (tokens) return new Set(tokens);
  if (css) return new Set(colorTokenNames(css));
  return new Set();
}
