import { bindResolved } from "./plugin.js";
import { consume } from "./preset/resolved.js";
import { RESOLVED_INPUTS } from "./rules/inputs.js";
import { rules } from "./rules/index.js";

/**
 * The plugin, as `jsPlugins` loads it.
 *
 * Everything expensive happened in the factory: this reads what it resolved and binds it to
 * the rules that take it. Binding rather than configuring is not a preference — Oxlint hands
 * a plugin its options as JSON, so a design system passed as an option arrives with its
 * methods gone and its `Set`s empty, and no rule would notice until it silently reported
 * nothing.
 */
const resolved = consume();

export default {
  meta: { name: "design" },
  rules: Object.fromEntries(
    Object.entries(rules).map(([id, rule]) => [
      id,
      bindResolved(rule, RESOLVED_INPUTS[id]?.(resolved)),
    ]),
  ),
};
