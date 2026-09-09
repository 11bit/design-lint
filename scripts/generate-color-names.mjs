#!/usr/bin/env node
/**
 * Generate `src/policy/color-names.js` from Tailwind's CSS colour-keyword table.
 *
 * ```
 * node scripts/generate-color-names.mjs
 * ```
 *
 * The `no-raw-color` contract requires the 148-name CSS colour set to be **generated, not
 * hand-typed**: a partial list is a silent hole, and the hole is invisible — nobody notices
 * that `darkslategrey` was never enforced until someone ships it. So the list is produced
 * from a machine-readable source and committed as static data, which is also what keeps the
 * rule free of a runtime dependency on that source.
 *
 * ## Why Tailwind is the source
 *
 * It is the only machine-readable copy of the set already installed. Tailwind needs the
 * names for its own arbitrary-value type inference — deciding that `text-[red]` is a colour
 * and `text-[13px]` is a size — which is very nearly the question this plugin asks, so the
 * set is maintained for the same reason we need it. The alternative was a new dependency
 * (`color-name` and friends are not installed) or transcription, and transcription is the
 * thing the contract forbids.
 *
 * The table is a bundler-internal `new Set([...])` rather than an export, so this reads it
 * out of the built chunk textually. That is fragile by nature, which is exactly why it runs
 * **here** and not at lint time: a Tailwind upgrade that moves the table breaks a script
 * somebody runs deliberately, with the assertions below to say what went wrong, instead of
 * breaking a rule in a consumer's CI. The committed output is what ships.
 *
 * ## The two sets
 *
 * Tailwind stores one flat table in CSS's own order: the sixteen basic colours, then the
 * extended set, then `transparent` and `currentcolor`, then the system colours. The split
 * is taken at `transparent`, because that is the boundary CSS itself draws — everything
 * before it is a `<named-color>`, everything after is a `<system-color>` — and the rule
 * needs them apart: both are raw colours, but only the named half is what the
 * `namedColors` option turns off.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "node_modules/tailwindcss/dist");
const OUT = join(ROOT, "src/policy/color-names.js");

/**
 * Names that prove we found the right array rather than some other string table.
 * `rebeccapurple` is the newest named colour and `canvastext` a system one, so an array
 * holding both is the combined keyword table and nothing else.
 */
const MARKERS = ["aliceblue", "rebeccapurple", "transparent", "currentcolor", "canvastext"];

/** The counts CSS defines. A source that disagrees is a source we have misread. */
const EXPECTED = { named: 148, system: 19 };

/** The array literal enclosing `index`, parsed. */
function arrayAround(text, index) {
  const open = text.lastIndexOf("[", index);
  const close = text.indexOf("]", index);
  if (open === -1 || close === -1) return null;
  try {
    return JSON.parse(text.slice(open, close + 1));
  } catch {
    return null;
  }
}

/** Tailwind's colour-keyword table, found by scanning its built chunks. */
function keywordTable() {
  for (const file of readdirSync(DIST)) {
    if (!file.endsWith(".mjs") && !file.endsWith(".js")) continue;
    const text = readFileSync(join(DIST, file), "utf8");

    let at = text.indexOf('"rebeccapurple"');
    while (at !== -1) {
      const array = arrayAround(text, at);
      if (array && MARKERS.every((marker) => array.includes(marker))) {
        return { array, file };
      }
      at = text.indexOf('"rebeccapurple"', at + 1);
    }
  }
  throw new Error(
    `no colour-keyword table found in ${DIST} — Tailwind's build layout changed. Find the array holding ${MARKERS.join(", ")} and update this script; do not transcribe the list by hand.`,
  );
}

const { array, file } = keywordTable();

// The table repeats the sixteen basic colours inside the extended list, which is harmless
// in a `Set` and would be a lie in a count.
const boundary = array.indexOf("transparent");
const named = [...new Set(array.slice(0, boundary))].sort();
const system = [...new Set(array.slice(boundary))]
  .filter((name) => name !== "transparent" && name !== "currentcolor")
  .sort();

for (const [kind, list] of Object.entries({ named, system })) {
  if (list.length !== EXPECTED[kind]) {
    throw new Error(
      `expected ${EXPECTED[kind]} ${kind} colours, found ${list.length} — the source moved or the split at "transparent" is no longer the boundary. Fix this script rather than the expectation.`,
    );
  }
}

/** One name per line would be 167 lines; wrapped, it stays readable as data. */
function block(names) {
  const lines = [];
  let line = " ";
  for (const name of names) {
    const next = ` "${name}",`;
    if (line.length + next.length > 98) {
      lines.push(line);
      line = " ";
    }
    line += next;
  }
  if (line.trim()) lines.push(line);
  return lines.join("\n");
}

writeFileSync(
  OUT,
  `/**
 * The CSS colour keywords, as data.
 *
 * **Generated — do not edit.** Run \`node scripts/generate-color-names.mjs\` to rebuild it
 * from Tailwind's own keyword table; that script explains why the list is generated rather
 * than typed, and why Tailwind is the source. \`test/policy/color.test.js\` asserts the two
 * counts, so a regeneration that silently loses half the set fails.
 *
 * Both sets are lowercase, because CSS keywords are case-insensitive and every caller
 * lowercases before asking. Neither contains \`transparent\` or \`currentcolor\`: those name
 * the absence of a colour and a reference to one, and they belong to the rule's
 * \`ignoreValues\` rather than to either set here.
 */

/** The ${named.length} CSS \`<named-color>\` keywords. */
export const NAMED_COLORS = new Set([
${block(named)}
]);

/** The ${system.length} CSS \`<system-color>\` keywords. */
export const SYSTEM_COLORS = new Set([
${block(system)}
]);
`,
  "utf8",
);

console.log(`wrote ${OUT}\n  ${named.length} named, ${system.length} system, from dist/${file}`);
