import { describe, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { ruleFor } from "../harness/options.js";

/**
 * The path a real install takes, which no contract case does.
 *
 * Every block in the contract names a policy fixture, so the corpus always hands this rule
 * a policy. A consumer using the preset hands it none: the factory sets a severity and
 * nothing else, and the rule is meant to fall back to its recommended policy. Once the
 * plugin module bound `designSystem` and `tokens` into `options[0]`, that fallback — keyed
 * on `options[0]` being absent — stopped happening, and the rule enforced nothing while the
 * whole corpus stayed green. These run the rule exactly as the plugin builds it: bound.
 */

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
});

tester.run("token-constraints — the recommended policy", ruleFor("token-constraints"), {
  valid: [
    // Recommended allows a `-foreground` token on `text-`, which is where it belongs.
    { code: '<div className="text-primary-foreground" />;' },
    // A policy the consumer writes replaces the recommended one; it is not merged into it.
    // This one says nothing about `-foreground`, so nothing is denied.
    { code: '<div className="bg-primary-foreground" />;', options: [{ denied: { "*": ["*-content"] } }] },
  ],
  invalid: [
    // No options at all: what the preset produces.
    { code: '<div className="bg-primary-foreground" />;', errors: [{ messageId: "prefixDenied" }] },
    // An empty object is a consumer writing nothing, not a consumer writing an empty policy.
    { code: '<div className="bg-muted-foreground" />;', options: [{}], errors: [{ messageId: "prefixDenied" }] },
  ],
});
