/**
 * Loading a design system, which is the one thing in `/policy` that touches a filesystem.
 *
 * It is isolated here for the reason the whole package is shaped the way it is: a rule
 * must never read a file, resolve a path, or derive anything from its own location. The
 * consumer supplies `tokenFiles`; the plugin module loads them **once**, at load, and
 * hands rules the resolved result. That is the one deliberate exception, and this is where
 * it happens.
 *
 * `tailwindcss` is a peer of the consumer's project, not a dependency of a rule. It is
 * imported dynamically so that the module graph a rule sits in does not require it.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Build a Tailwind design system from a stylesheet.
 *
 * @param {string} entryCss The stylesheet's contents — not its path. A caller that has a
 *   path reads it; a caller that has the text (a test, the corpus) is not forced to invent
 *   a file for it. Phase 2 found this requirement the hard way: a policy that can only be
 *   handed a filename cannot be varied per case, and a corpus that cannot vary it cannot
 *   express the cases that matter.
 * @param {{ base?: string }} [options] Directory `@import` is resolved against.
 * @returns {Promise<object>} The resolved design system.
 */
export async function loadDesignSystem(entryCss, { base = process.cwd() } = {}) {
  const { __unstable__loadDesignSystem } = await import("tailwindcss");
  const require_ = createRequire(join(base, "noop.js"));

  return __unstable__loadDesignSystem(entryCss, {
    base,

    // `@import "tailwindcss"` is a package specifier, and `@import "./tokens.css"` is a
    // path. Tailwind hands both to the same hook, so both resolutions live here: relative
    // first, because a project file named like a package should still be the project file.
    loadStylesheet: async (id, from) => {
      try {
        const local = isAbsolute(id) ? id : join(from, id);
        return { content: readFileSync(local, "utf-8"), base: dirname(local) };
      } catch {}

      const packageDir = dirname(require_.resolve(`${id}/package.json`, { paths: [from, base] }));
      const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf-8"));
      const stylesheet = join(packageDir, manifest.style ?? "index.css");
      return { content: readFileSync(stylesheet, "utf-8"), base: dirname(stylesheet) };
    },

    // `@plugin` and `@config`. A project that has them keeps working; a project whose
    // plugin fails to load gets a design system missing that plugin's utilities rather
    // than no design system at all — and any colour prefix lost that way is exactly what
    // the `colorPrefixes` option exists to put back.
    loadModule: async (id, from) => {
      try {
        let resolved;
        try {
          resolved = require_.resolve(id, { paths: [from, base] });
        } catch {
          resolved = join(from, id);
        }
        const module = await import(pathToFileURL(resolved).href);
        return { module: module.default ?? module, base: dirname(resolved) };
      } catch {
        return { module: {}, base: from };
      }
    },
  });
}

/**
 * Read the stylesheets named by `tokenFiles` and concatenate them into one entry.
 *
 * @param {string[]} tokenFiles
 * @param {{ base?: string }} [options]
 * @returns {string}
 */
export function readTokenFiles(tokenFiles, { base = process.cwd() } = {}) {
  return tokenFiles
    .map((file) => readFileSync(isAbsolute(file) ? file : join(base, file), "utf-8"))
    .join("\n");
}
