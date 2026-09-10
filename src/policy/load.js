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

import { existsSync, readFileSync } from "node:fs";
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

      const stylesheet = resolvePackageStylesheet(id, [from, base]);
      if (!stylesheet) {
        throw new Error(
          `design-lint: cannot resolve the stylesheet \`@import "${id}"\` from ${from}. If it is a package, check that it is installed; if it is a file, check the path.`,
        );
      }
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

/**
 * Where a package keeps the stylesheet it publishes.
 *
 * A CSS package declares it under the **`style` condition** of its export map —
 * `"exports": { ".": { "style": "./dist/tw-animate.css" } }` — which is the Tailwind v4
 * convention and what both `tailwindcss` and `tw-animate-css` do.
 *
 * The package directory is found by walking `node_modules` rather than by resolving
 * `<id>/package.json`, which is the obvious trick and the wrong one: a package with an
 * export map need not export its own manifest, and `tw-animate-css` does not. Asking for it
 * throws `ERR_PACKAGE_PATH_NOT_EXPORTED` and takes the whole lint run with it — for a
 * stylesheet that is sitting right there, correctly declared.
 */
function resolvePackageStylesheet(id, starts) {
  const [name, subpath] = splitSpecifier(id);
  const dir = packageDirectory(name, starts);
  if (!dir) return null;

  const manifest = readManifest(join(dir, "package.json"));
  const declared = styleOf(manifest?.exports, subpath ? `./${subpath}` : ".");

  if (declared) return join(dir, declared);
  // A subpath nobody declared is still an ordinary file inside the package.
  if (subpath) return join(dir, subpath);
  return join(dir, manifest?.style ?? "index.css");
}

/** `@scope/name/sub/path.css` → `["@scope/name", "sub/path.css"]`. */
function splitSpecifier(id) {
  const parts = id.split("/");
  const take = id.startsWith("@") ? 2 : 1;
  return [parts.slice(0, take).join("/"), parts.slice(take).join("/")];
}

/**
 * The first `node_modules/<name>` above any of the starting directories. Plain filesystem
 * lookup, so an export map cannot hide the package from us, and a symlinked layout — pnpm's
 * — resolves the same way the package manager laid it out.
 */
function packageDirectory(name, starts) {
  for (const start of starts) {
    let dir = start;
    for (;;) {
      const candidate = join(dir, "node_modules", name);
      if (existsSync(join(candidate, "package.json"))) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

function readManifest(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * The `style` target for one export key, through however many condition objects it is
 * nested in. `default` is accepted after it, since a CSS-only package may publish its
 * stylesheet as the plain default.
 */
function styleOf(exports, key) {
  if (!exports || typeof exports !== "object") return null;
  const entry = exports[key];
  return conditionTarget(entry);
}

function conditionTarget(entry) {
  if (typeof entry === "string") return entry.endsWith(".css") ? entry : null;
  if (!entry || typeof entry !== "object") return null;
  for (const condition of ["style", "default"]) {
    const target = conditionTarget(entry[condition]);
    if (target) return target;
  }
  return null;
}
