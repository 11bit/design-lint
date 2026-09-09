import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { optionsFor } from "./options.js";

const CONTRACT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../docs/rules");

/** Tags the harness executes. Everything else in a contract is prose or illustration. */
export const EXECUTED = ["caught", "allowed", "blindspot"];

/**
 * `deferred` blocks describe a surface we have decided not to lint yet — the CSS surface,
 * today. They are inert by design: executing them would assert behaviour nobody has
 * promised. They are counted, so the size of the deferral stays visible.
 */
export const DEFERRED = "deferred";

const HEADING = /^(#{2,4})\s+(.*)$/;

/**
 * A fence line is a language, then space-separated attributes: a bare word is the tag
 * (`caught`, `allowed`, `blindspot`, `deferred`, `preamble`), and `key=value` pairs carry
 * `count` and `options`. Anything unrecognised makes the block prose, which is how an
 * ordinary ```tsx illustration stays out of the corpus.
 */
function parseFence(line) {
  if (!line.startsWith("```")) return null;
  const [lang, ...attrs] = line.slice(3).trim().split(/[ \t]+/).filter(Boolean);
  if (!lang) return null;

  const fence = { lang, tag: null, count: null, options: null };
  for (const attr of attrs) {
    const eq = attr.indexOf("=");
    if (eq === -1) fence.tag ??= attr;
    else if (attr.slice(0, eq) === "count") fence.count = Number(attr.slice(eq + 1));
    else if (attr.slice(0, eq) === "options") fence.options = attr.slice(eq + 1);
  }
  return fence;
}

/**
 * Cases within one fenced block are separated by blank lines. The convention is stated in
 * every contract; it exists so a block can group related forms without each one needing
 * its own fence.
 */
function splitCases(body, firstLine) {
  const cases = [];
  let current = [];
  let start = firstLine;

  const flush = () => {
    if (current.some((l) => l.trim())) cases.push({ code: current.join("\n"), line: start });
    current = [];
  };

  body.forEach((line, i) => {
    if (line.trim()) {
      if (!current.length) start = firstLine + i;
      current.push(line);
    } else {
      flush();
    }
  });
  flush();
  return cases;
}

function parseFrontmatter(lines) {
  if (lines[0] !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end === -1) return null;
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const at = line.indexOf(":");
    if (at === -1) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if (value.startsWith("[")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
    fields[key] = value;
  }
  return { fields, body: lines.slice(end + 1) };
}

/**
 * One contract, parsed. `preamble` is prepended to every case in the file — the shape
 * `no-component-color-override` needs, because a component is watched by where it was
 * imported from and a bare JSX element would watch nothing.
 */
function parseContract(file) {
  const lines = readFileSync(join(CONTRACT_DIR, file), "utf8").split("\n");
  const front = parseFrontmatter(lines);
  if (!front) throw new Error(`${file}: no frontmatter`);

  const offset = lines.length - front.body.length;
  const cases = [];
  const blocks = [];
  let preamble = "";
  let heading = "";
  const fixtures = {};

  for (let i = 0; i < front.body.length; i++) {
    const h = HEADING.exec(front.body[i]);
    if (h) heading = h[2].trim();

    const fence = parseFence(front.body[i]);
    if (!fence || (!fence.tag && !fence.options)) continue;

    const { lang, tag, count, options: optionsName } = fence;
    const body = [];
    let j = i + 1;
    while (j < front.body.length && !front.body[j].startsWith("```")) body.push(front.body[j++]);

    const line = offset + i + 1;
    blocks.push({ lang, tag, count, heading, line });

    if (tag === "preamble") {
      preamble = body.join("\n");
    } else if (!tag && optionsName) {
      // A named options fixture: `json options=deny-all`. Blocks reference it by name.
      fixtures[optionsName] = JSON.parse(body.join("\n"));
    } else if (EXECUTED.includes(tag)) {
      for (const c of splitCases(body, line + 1)) {
        cases.push({
          ...c,
          tag,
          heading,
          count: count ?? 1,
          block: line,
          options: optionsName ?? (fixtures.baseline ? "baseline" : null),
        });
      }
    }
    i = j;
  }

  return {
    file,
    fixtures,
    rule: front.fields.rule,
    status: front.fields.status,
    bias: front.fields.bias,
    files: front.fields.files,
    preamble,
    blocks,
    cases,
  };
}

export function loadContracts() {
  return readdirSync(CONTRACT_DIR)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort()
    .map(parseContract);
}

/** The code actually handed to the linter: the file's preamble, then the case. */
export function source(contract, testCase) {
  return contract.preamble ? `${contract.preamble}\n\n${testCase.code}` : testCase.code;
}

/** A stable, greppable name so a failure points at a line in a contract. */
export function label(contract, testCase) {
  const first = testCase.code.trim().split("\n")[0];
  return `${contract.file}:${testCase.line} ${testCase.heading} — ${first}`;
}

/**
 * Options a case runs under: the harness fixture map for the rule, with the contract's own
 * named fixture layered on top. Fixtures replace keys rather than merging into them, which
 * is what the rules themselves do with consumer options — the corpus should not be able to
 * express a configuration a consumer cannot.
 */
export function resolveOptions(contract, testCase) {
  const base = optionsFor(contract.rule);
  const fixture = testCase.options ? contract.fixtures[testCase.options] : null;
  if (!fixture) return base;
  return [{ ...(base[0] ?? {}), ...fixture }];
}

/**
 * The executable corpus for one contract: every case, with its code and options resolved,
 * and exact duplicates collapsed.
 *
 * A class worth demonstrating in two sections is documentation, not a defect, but
 * `RuleTester` rejects a repeated (code, options) pair outright. Collapsing them here keeps
 * the contracts readable. A repeat that *disagrees* with itself is a different matter and
 * is caught by `contracts.test.js`.
 */
export function executable(contract) {
  const seen = new Set();
  return contract.cases
    .map((c) => ({ ...c, source: source(contract, c), resolved: resolveOptions(contract, c) }))
    .filter((c) => {
      const key = JSON.stringify([c.source, c.resolved]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
