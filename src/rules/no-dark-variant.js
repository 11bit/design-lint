/**
 * no-dark-variant — stub.
 *
 * The specification is `docs/rules/no-dark-variant.md`, whose `caught` / `allowed` /
 * `blindspot` blocks the harness executes against this object. A stub reports nothing,
 * so every `caught` case fails and every `allowed` and `blindspot` case passes: the
 * red baseline Phase 5 drives to zero.
 */
export default {
  meta: {
    type: "problem",
    // Permissive while this is a stub: the corpus passes options through, and Oxlint
    // rejects options for a rule with no schema. Phase 5 replaces it with a real one.
    schema: [{ type: "object", additionalProperties: true }],
    docs: { description: "See docs/rules/no-dark-variant.md" },
    messages: {},
  },
  create() {
    return {};
  },
};
