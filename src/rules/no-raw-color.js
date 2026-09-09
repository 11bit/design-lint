/**
 * no-raw-color — stub.
 *
 * The specification is `docs/rules/no-raw-color.md`, whose `caught` / `allowed` /
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
    docs: { description: "See docs/rules/no-raw-color.md" },
    messages: {},
  },
  create() {
    return {};
  },
};
