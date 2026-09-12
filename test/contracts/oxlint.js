import { optionsFor } from "../harness/options.js";

/**
 * What the Oxlint adapter adds to a case: the options it runs under.
 *
 * A case's `options` are written over the rule's own — the harness stand-in for the load
 * step supplies the bound design system and token set, and the case adds only what it is
 * about. That is how a consumer's config reaches the rule too.
 */
export function optionsOf(contract, testCase) {
  const base = optionsFor(contract.rule);
  return testCase.options ? [{ ...(base[0] ?? {}), ...testCase.options }] : base;
}
