import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { designSystemPolicy } from "../policy/design-system.js";
import { loadDesignSystem } from "../policy/load.js";
import { resolveTokenSet } from "../policy/tokens.js";
import { MINIMAL_RULE_IDS, RULE_IDS, severities } from "../presets/recommended.js";
import { publish } from "./resolved.js";

/**
 * The factory a consumer imports.
 *
 * ```ts
 * // oxlint.config.ts
 * import { defineConfig } from "oxlint";
 * import { designLint } from "@evil-martians/design-lint/preset";
 *
 * export default defineConfig(
 *   await designLint({
 *     tokenFiles: ["src/styles.css"],
 *     componentSources: ["@/components/ui/*"],
 *   }),
 * );
 * ```
 *
 * Two measured facts about Oxlint give this its shape, and neither is worked around:
 *
 * - **`jsPlugins` takes a specifier, never a plugin object.** Handing it a constructed
 *   plugin fails to parse, so this factory names the plugin rather than building it.
 * - **The config file and the plugin module share one process and one module registry**,
 *   with the config evaluated first. So the design system is resolved here, where the
 *   consumer's own paths sit relative to their own working directory, and handed over
 *   through `./resolved.js`. That is what lets the plugin read no config of its own, find
 *   nothing up the tree, and derive no path from where it was installed.
 *
 * It is `async` because building a Tailwind design system is. A consumer writes `await`,
 * and the one filesystem read this package performs happens here, once per lint run.
 */
export async function designLint({
  tokenFiles,
  componentSources,
  preset = "recommended",
  namespace = "design",
  severity = "error",
  base = process.cwd(),
} = {}) {
  if (!Array.isArray(tokenFiles) || tokenFiles.length === 0) {
    throw new Error(
      'design-lint: `tokenFiles` is required — the stylesheets your `--color-*` tokens are defined in, e.g. ["src/styles.css"]. Without them no rule can tell a token from a typo, and a rule that cannot tell reports nothing.',
    );
  }

  // `no-component-color-override` watches components by where they were imported from, so
  // it cannot run without being told where those live. Presence of the key is the decision:
  // a list turns the rule on, `[]` says this project has no design-system component library
  // and turns it off, and leaving it out at all is not a decision — it throws rather than
  // enabling a rule that fails on the first file, or quietly dropping one that was asked for.
  const wantsComponents = componentSources !== undefined;
  if (!wantsComponents && preset !== "minimal") {
    throw new Error(
      'design-lint: `componentSources` is required — the import globs your design-system components come from, e.g. ["@/components/ui/*"], which is how no-component-color-override knows which elements own their own colour. Pass `[]` if this project has no such library, or `preset: "minimal"` to run only the rules that need no project vocabulary.',
    );
  }

  const paths = tokenFiles.map((file) => (isAbsolute(file) ? file : join(base, file)));
  const css = paths.map((path) => readFileSync(path, "utf-8")).join("\n");

  // The design system is built from an entry that imports each token file by absolute
  // path, not from their text pasted together. Pasted, a token file's own
  // `@import "./tokens.css"` resolves from the working directory instead of from where the
  // file sits; imported, the engine resolves it the way the build does.
  const entry = paths.map((path) => `@import ${JSON.stringify(path)};`).join("\n");
  const designSystem = designSystemPolicy(await loadDesignSystem(entry, { base }));
  const tokens = resolveTokenSet({ css });

  publish({ designSystem, tokens });

  const watching = wantsComponents && componentSources.length > 0;
  const ids = (preset === "minimal" ? MINIMAL_RULE_IDS : RULE_IDS).filter(
    (id) => id !== "no-component-color-override" || watching,
  );
  const on = (id, options) => (ids.includes(id) ? { [`${namespace}/${id}`]: [severity, options] } : {});

  return {
    jsPlugins: ["@evil-martians/design-lint/oxlint"],
    rules: {
      ...severities(ids, { namespace, severity }),
      // The options a consumer's own layout decides. Everything else a rule needs is in its
      // `meta.defaultOptions`, which carries the recommended policy — so restating a
      // severity here, which replaces options wholesale, still lands on the right behaviour.
      ...on("no-component-color-override", { componentSources: componentSources ?? [] }),
      ...on("no-raw-color", { tokenFiles }),
      ...on("no-dark-variant", { tokenFiles }),
      ...on("no-spectral-color", { tokenFiles }),
      ...on("no-opacity-modifier", { tokenFiles }),
      ...on("no-undefined-token", { entryPoint: tokenFiles[0] }),
    },
  };
}
