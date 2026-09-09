# Migration plan: `lint-color` → Oxlint

## Context

`lint-color/` is a standalone Node script that enforces nine color/design-token rules over
a Tailwind v4 + React codebase. It is **not yet used by any project**, which shapes every
decision below:

- The current implementation is **not** the specification. It is a sketch of nine
  intentions, and it has known blind spots (see [Known gaps](#known-gaps-in-the-current-implementation)).
- We do **not** need output compatibility with it. Differential testing against the old
  linter would actively lock in its holes.
- The acceptance criterion is: **each rule must catch everything it promises to catch.**
  A rule that promises less but delivers completely is acceptable. A rule that implies
  total coverage and has silent holes is not.

> **This document is disposable.** It exists to get from a proof of concept to a working
> linter, and it is deleted in [Phase 6](#phase-6--extract-and-delete) along with the PoC
> itself. Anything written here that should outlive the migration is listed in that
> phase's extraction table and must be moved to `README.md` or
> `docs/rules/README.md` before this file goes. Do not add durable knowledge here without
> adding it to that table.

---

## Migration target

**`oxlint` plus one JS plugin of our own, carrying all nine rules.**

| Component | Responsibility |
| --- | --- |
| `oxlint` | The runner |
| Our Oxlint JS plugin | All nine rules, authored in-house |

### Scope: JavaScript and TypeScript only

**The linter covers `.js`, `.jsx`, `.ts` and `.tsx`. It does not lint `.css` files.**

CSS support is **deferred, not abandoned** — planned work we have chosen not to do yet.
The distinction matters and the contracts keep it sharp: a *declared blind spot* is
something we decided not to catch; a *deferred surface* is something we decided not to
catch **yet**. Each affected contract carries a `Deferred: CSS surface` section describing
what it will cover when CSS lands, with inert case blocks the harness does not execute.

What this defers: raw colour values in stylesheets, `@apply` directives, `.dark &`
selectors, `@media (prefers-color-scheme: dark)` blocks, and `light-dark()` in CSS
declarations. The arbitrary-value class form `bg-[light-dark(...)]` is a class string in a
`.tsx` file and stays in scope — that is the one place the boundary runs through a single
rule.

**Token files remain an input.** `tokenFiles` is still a required option: the rules read
those stylesheets to derive the semantic token set and the Tailwind design system. Being
read is not the same as being linted.

### No third-party rule packages

Earlier revisions delegated five rules to `oxlint-tailwindcss` and the CSS surface to
`stylelint-declaration-strict-value`. Both are dropped; all nine rules are ours.

The cost is smaller than it looks, because decision **A7** had already taken back the hard
part: the class-string extractor lives in `/policy`, broad-sweep for the token rules and a
precise AST walk for the JSX rules. Extraction was most of what the third-party package
provided. What remains is class validation against the Tailwind design system, which the
proof of concept already did directly via `__unstable__loadDesignSystem`.

What we gain: every diagnostic under our own namespace rather than a foreign rule id, no
coupling to another package's rule names or version range, no meta-package indirection,
and no build step regenerating config from policy.

**The deliverable is a published package**, not configuration embedded in one
application — see [Distribution](#distribution). `lint-color/` is deleted at the end of
the migration.

`design-system/lint/colors.json` keeps its role as the designer-owned policy file, but
changes address: its *contents* become the package's default preset, and a consuming
project supplies its own equivalent. Rules read policy through `options` and `settings`
rather than by reading a path.

### Why Oxlint

- **Fast runner, modern engine** — Rust, ~300 built-in rules, ESLint v9-compatible plugin API.
- **Portable rules** — Oxlint's JS plugin API is deliberately ESLint-v9-shaped
  (`create(context)`, visitor keys, `context.report()`, `messageId`, fixes, suggestions).
  If the alpha API moves under us, the same rule files run under ESLint unchanged.
- **Testing stays put** — Oxlint ships a `RuleTester` (`oxlint/plugins-dev`) based on
  ESLint's, driven by Vitest, which the repo already uses.

### Why not the alternatives

- **Biome** — single binary, lints JS *and* CSS, but custom rules are GritQL-only.
  GritQL is pattern matching; it cannot express per-prefix allow lists with glob
  semantics, numeric range lookups, or filesystem-derived component sets. Revisit if
  Biome ships a JS plugin API.
- **Plain ESLint v9 + `@eslint/css`** — the safe fallback. One tool, both file types,
  mature custom-rule API. Slower. Was to be taken if the Oxlint alpha proved unstable in
  Phase 0; **Phase 0 returned GO, so this is no longer the active path.** Retained as the
  contingency if the alpha API breaks under us mid-migration.

### Known constraints

- **Oxlint JS plugins are JS/TS only.** No CSS, no Vue/Svelte/Astro parsers. This was the
  reason Stylelint was in the design; with the CSS surface deferred, the constraint and the
  scope now coincide. It becomes binding again when CSS returns.
- **No TypeScript type-awareness** in Oxlint plugins yet. None of our nine rules need it —
  all are syntactic.
- **JS plugins are alpha** and not semver-stable. Mitigated by the ESLint-compatible rule
  shape. Phase 0 found the API materially ESLint-shaped in practice: every verified name
  behaved as the ESLint docs for that name predict.
- **Version floors**, established from the Oxlint changelog rather than assumed:

  | Version | Date | What landed |
  | --- | --- | --- |
  | 1.17.0 | 2025-09-23 | `--experimental-js-plugins` renamed `--js-plugins` |
  | 1.19.0 | 2025-09-29 | JS plugin config moved to the **`jsPlugins`** key |
  | 1.24.0 | 2025-10-22 | fixed: JS plugin resolution failing when `extends` is used |
  | **1.44.0** | 2026-02-10 | **LSP runs JS plugins** — before this the language server ignored them (1.21.0 made that explicit) |
  | 1.52.0 | 2026-03-09 | `oxlint.config.ts` documented |
  | **1.55.0** | 2026-03-12 | **JS plugins promoted to alpha** |

  **Declare `oxlint >= 1.55.0` as the peer dependency floor.** It is the first release
  carrying all of the above, and the point the feature was declared fit for real projects.
  Latest at time of writing is 1.82.0; Phase 0 and 0b verified against 1.81.0.
- **`oxlint.config.ts` requires Node >= 22.18 or >= 24** — it executes TypeScript
  directly. The `.oxlintrc.json` path has no such requirement, which is a real reason to
  keep documenting it as a fallback rather than dropping it.
- **`oxlint.config.ts` is *not* marked experimental** in current documentation, contrary
  to what Phase 0b reported. Only `jsPlugins` carries the alpha caveat. The stacked
  "experimental on alpha" risk recorded earlier is therefore a single risk, not two.
- **The design-system entry point must be supplied by the consumer.** Our rules resolve
  classes against the Tailwind design system, so they need the stylesheet that declares
  `@theme`. It cannot ship in the preset — `settings` is not inherited through `extends` —
  so `tokenFiles` is a required option on the consumer's own config. Note the stylesheet is
  *read as an input*, not linted: the CSS surface is out of scope.
- **Suggestions are invisible in every CLI output format.** They surface only in the
  editor or via `oxlint --fix-suggestions`. Any information carried in a suggestion must
  *also* appear in the message text via `data`.

---

## Distribution

The linter is built to be adopted by other projects, not embedded in one application.
That is a constraint on the design, not a packaging step at the end: it decides where
policy lives, what the extractor may assume, and what a rule is allowed to read from disk.

### Mechanism ships; policy is supplied

The single organising principle. Almost everything in `colors.json` today is an opinion
that will not survive contact with a second project — the allow/deny lists, the
replacement map, the interactive component names, the components directory, even whether
`dark:` is banned at all.

So **rules carry mechanism and no policy.** The current `colors.json` contents become the
package's `recommended` preset: a project shaped like this one gets value immediately, and
a project shaped differently overrides without forking a rule.

### What a consumer writes

Verified in Phase 0b. The package exports a **factory** returning a complete config, which
the consumer spreads at top level — it cannot be an `extends`-able preset, for reasons
below.

```ts
// oxlint.config.ts — auto-discovered.
// .oxlintrc.json must NOT also exist; having both is a hard error.
import { defineConfig } from "oxlint";
import { designLint } from "@evil-martians/design-lint/preset";

export default defineConfig(
  designLint({
    tokenFiles: ["src/styles.css"],
    componentSources: ["@/components/ui/*"],
  }),
);
```

Three findings force this shape, and none is fixable by renaming keys:

- **`plugins` is reserved for Oxlint's built-in Rust plugins** and rejects a JS package
  outright. JS plugins load under **`jsPlugins`**.
- **`extends` in `.oxlintrc.json` is pure filesystem path resolution** — no `node_modules`
  lookup, no `exports` support. Oxlint states it does not support ESLint shared configs.
  Only a literal `./node_modules/…/recommended.json` path works.
- **`settings` is not inherited through `extends`** in either JSON or TS. A preset can
  therefore never ship the settings its own rules need — proven concretely:
  `settings.tailwindcss.entryPoint` inside a preset yields `entryPoint is required`, and
  works only when hoisted into the consumer's own config.

A JSON-only fallback exists but requires the consumer to restate every setting the preset
needs, so the factory is the supported path.

### Package shape

One package, several entry points. `/oxlint` and `/eslint` share `/policy`, so the same
rules run under either runner without a second implementation.

A `/stylelint` entry point was planned for the CSS surface and is **deferred with that
surface**. When CSS returns it joins this package rather than becoming a second one:
splitting them would invite version skew between the two halves of a single rule's
coverage, which is the worst failure mode available here.

```
@evil-martians/design-lint
├── /preset      the factory a consumer imports
├── /oxlint      plugin object, loaded via jsPlugins
├── /eslint      the same rules, ESLint v9 flat config
└── /policy      shared: config resolution, variant segmentation,
                 colour-prefix derivation, token parsing
```

Because rules are authored ESLint-v9-shaped, one rule module serves both runners. What
began as a portability hedge against the Oxlint alpha becomes a distribution feature: a
consumer on either runner installs the same package.

```
src/
  policy/          config resolution, variant parsing, prefix derivation
  extract/         class-string extractor, with its own test suite
  rules/           all nine rules
  presets/         recommended, minimal  ← today's colors.json lives here
docs/rules/        the nine contracts — shipped, meta.docs.url points at them
test/harness/      extracts caught/allowed/blindspot blocks, runs RuleTester
```

**The contracts ship with the package.** A consumer asking "what does this rule promise,
and where does it deliberately not look?" gets a real answer, and the declared blind spots
become a support document rather than an internal note. The harness runs in this
package's CI, never the consumer's.

But **`meta.docs.url` is dead under Oxlint** — absent from all six CLI formats, and SARIF
emits an empty `rules` array. This is structural, not a bug to wait out: Oxlint's
`registerPlugin()` reads only `fixable` / `hasSuggestions` / `schema` / `defaultOptions` /
`messages`, and `docs` appears nowhere else in its JS runtime. ESLint *does* surface it.
So a rule cannot link a developer to its own contract on the Oxlint path, and the
**message text is the only channel** — the same conclusion Phase 0 reached about
suggestions, now for a second reason.

### Consequences to design around

- **No third-party rule package, no meta-package.** `oxlint` itself remains a peer
  dependency; no *rule* package does. All nine rules are ours, so there is no
  coupling to another package's rule names or version range, and every diagnostic appears
  under our own namespace. The factory does not need `import.meta.resolve` to locate a
  peer package — the one genuinely fiddly part of the Phase 0b packaging design is gone.
- **New rules ship disabled.** Adding a rule to `recommended` breaks builds on
  `npm update`. New rules land off by default and join `recommended` only on a major.
- **`componentsDirectory` cannot stay a filesystem convention.** It was the shadcn
  assumption baked into `no-component-color-override`. **RESOLVED by A10:** the watched set
  now comes from matching the *import source* — `componentSources: ["@/components/ui/*"]` —
  so the rule reads no filesystem, derives no paths from its own location, and has nothing
  to keep in sync. It also closes the one-name-per-filename hole for free, since
  `CardHeader` is a named import like any other.
- **Rule options replace, they do not merge — and failure is silent.** A consumer writing
  `"design/no-component-color-override": "error"` to bump a severity **wipes the preset's
  options and produces zero diagnostics, exit 0.** The rule appears enabled and catches
  nothing. This diverges from ESLint flat config, so it will surprise people. Mitigate in
  three places: rules must fail loudly on absent required options rather than returning
  early, `defaultOptions` should carry a usable baseline, and the README must document the
  footgun explicitly.
- **The rule namespace comes from `plugin.meta.name`, not the package name.** Pick it
  deliberately and treat it as public API — it appears in every diagnostic and every
  `oxlint-disable` comment a consumer writes.
- **Nothing may derive paths from its own location.** The proof of concept sets
  `ROOT = join(__dirname, "../..")` and assumes it lives at `<app>/scripts/lint-color/`.
  Every path must arrive as input. This constrains Phase 3 most, which is why
  distribution is settled before it.
- **This repo is not runnable.** It is an extraction of two directories from a larger app.
  `src/`, `styles.css`, `src/components/ui`, and the `tailwindcss` dependency live in the
  app repo. All verification work happens there.

---

## Rule requirements

All nine rules are ours. Nothing is delegated, audited, or configured through another
package — see [No third-party rule packages](#no-third-party-rule-packages).

### Behaviours carried forward

The earlier delegation plan established these as acceptance criteria for third-party
packages. They survive as requirements on our own implementations:

| Rule | Requirement |
| --- | --- |
| `no-undefined-token` | Resolve candidates against the Tailwind v4 `@theme` design system, and put the typo candidate **in the message text** — suggestions do not render on the CLI. |
| `no-spectral-color` | Per-pattern messages naming the semantic replacement. The `replacement` map is read from `options` at runtime; the build step that would have regenerated `.oxlintrc` from policy is gone. |
| `no-opacity-modifier` | Only after a derived colour prefix — `text-sm/6` must not report. |
| `no-dark-variant` | Handle stacked variants (`md:dark:`) via segment parsing. |
| `no-raw-color` | Tailwind arbitrary values, while sparing `bg-[--my-var]`. |

Phase 0 verified all of these *in `oxlint-tailwindcss`*. That no longer tells us they will
work in our implementation, but it does tell us they are achievable, and it leaves a
working reference to compare against. Phase 0's verification of the **JS plugin API** is
unaffected and remains the basis for the whole approach.

### Rules that never had an equivalent

Recorded so nobody re-opens the search:

- **`no-style-color`** — banning the `style` prop wholesale is possible
  (`react/forbid-dom-props`); banning *specific CSS properties inside* the object is not
  available anywhere.
- **`no-useless-hover`** — no published equivalent.
  `jsx-a11y/no-noninteractive-element-interactions` is adjacent but solves an
  accessibility problem, not a hover-affordance one.
- **`no-component-color-override`** —
  [`eslint-plugin-primer-react`'s `no-system-props`](https://github.com/primer/eslint-plugin-primer-react/blob/main/docs/rules/no-system-props.md)
  is the closest published cousin, but it is Primer-specific.
- **`token-constraints`** — prefix-scoped allow lists are more expressive than a flat deny
  list. Approximable with negative-lookahead regexes, but unmaintainable as config.
- **Raw colours in SVG attributes and string constants** (**B4**) — A7's broad sweep does
  not cover it: the token rules ask *"is this a forbidden class?"*, and `#ff0000` is not a
  class. Needs a rule asking *"is this string a raw colour?"* — `<circle fill="#ff0000" />`,
  `const SERIES = ["#ff0000"]`. Owned by `no-raw-color`.

### Design constraints for all nine

- **All external data arrives via rule `options`** — token sets, component sources, the
  replacement map. Discovery (filesystem reads, Tailwind resolution) happens **once at
  plugin-module load**, never inside `create()`. This keeps `RuleTester` usable and avoids
  a per-file filesystem hit. It also preserves the property the current system has: adding
  a token to `styles.css` requires no manual sync. Phase 0 confirmed the plugin module is
  loaded exactly once across a 200-file run (9 ms), and that `meta.schema` is enforced.
- **Use plain `create`, not `createOnce`.** `createOnce` is Oxlint's faster alternative,
  but it requires `eslintCompatPlugin()` to run under ESLint — which weakens the
  portability mitigation that justifies this whole approach. Phase 0 measured no benefit
  worth that trade (200 files, 4 rules, both plugins: 0.10 s total).
- **`messageId` + `data`, never pre-formatted strings.** The entire `ansi` indirection
  layer (rules building ANSI escape codes, tests passing a no-op stub to strip them) is
  deleted. Oxlint owns formatting.
- **Anything carried in a suggestion must also be in the message text.** Suggestions do
  not render in any CLI format. A suggestion is an editor affordance, never the only
  channel for information the developer needs.
- **Suggestion order is load-bearing.** `oxlint --fix-suggestions` applies index 0 without
  prompting. Never list a destructive suggestion (e.g. "remove the class") first.
- **Suppression comes from the host.** `color-lint-ignore` is dropped in favour of
  `// oxlint-disable-next-line`. Phase 0 confirmed Oxlint
  also honours `eslint-disable-next-line`, so existing disables would survive the
  fallback path.

---

## Known gaps in the current implementation

**Per-rule detail now lives in each contract's *Deltas from the current implementation*
table**, written against the source rather than inferred. This section keeps only the
gaps that are *systemic* — shared machinery, affecting several rules at once, and
therefore load-bearing for the target design rather than for any single rule.

They are evidence for why the contracts come before code. They are not a bug backlog:
`lint-color/` is a proof of concept and none of these will be fixed in place.

- **Template literals are never extracted.** `extractStringLiterals`
  (`shared.js:91`) matches `"` and `'` only. Every class inside a backtick string —
  `` className={`bg-red-500 ${x}`} `` — is invisible to *all* token rules today. This is
  the single largest hole in the current implementation, and it is why the class-string
  extractor in Phase 3 is a component with its own test suite rather than a helper.
- **The colour-prefix list is hand-maintained and incomplete.**
  `TAILWIND_COLOR_PREFIXES` (`shared.js:11`) omits every per-side and per-axis border
  family (`border-t-`, `border-x-`, `border-inline-start-`) plus `inset-ring`,
  `inset-shadow`, and `text-shadow`. Any rule gating on the prefix list inherits the hole.
  Derive the set from Tailwind instead of maintaining a constant.
- **Token normalization splits on the last `:`.** `normalizeTwToken` mangles
  `bg-[image:var(--x)]` into `var(--x)]`. Variant parsing must be segment-aware, which is
  the same fix the `group-hover:` family needs.
- **`hover:` is matched as a substring, not a segment.** `str.indexOf("hover:")` in
  `no-useless-hover` and `rawTok.includes("hover:")` in `token-constraints` both match
  `group-hover:`, `peer-hover:`, and `[@media(hover:hover)]:`. `no-useless-hover`
  additionally scans *every* quoted string in the opening tag, so `title="hover: to
  preview"` reports too.
- **`no-undefined-token` fails silent, and gates another rule.** `index.js` builds the
  Tailwind resolver with `.catch(() => null)` and the rule returns `null` when it is
  absent — a load failure disables it with no output and no exit code. Because
  `token-constraints` returns early unless the class body is a known semantic token, a
  silent resolver failure quietly weakens two rules. The contracts make this a hard error.
- **Rules do not short-circuit, despite comments saying they do.** The `checkToken`
  headers claim a returned message "signals the orchestrator to stop checking this token
  further". It does not; every rule runs on every token, so `dark:bg-red-500/50` produces
  three reports. Report multiplicity per token needs to be a decision, not an accident.

### Coverage the new scope does not carry

- **Deferred with the CSS surface.** `@apply` in component stylesheets — `linter.js:154`
  runs the full token pipeline over `@apply` lines today, so `@apply bg-red-500`, `dark:`,
  `/50` and undefined tokens are all linted. Likewise raw colour values in stylesheets,
  `.dark &` selectors, `prefers-color-scheme` blocks, and `light-dark()` in declarations.
  Affects `token-constraints`, `no-spectral-color`, `no-opacity-modifier`,
  `no-undefined-token` and `no-raw-color`. Each carries a `Deferred: CSS surface`
  section naming what returns when CSS lands.
- **Colour classes in `.ts` object-literal maps** — **resolved by A7.** The broad sweep
  sees them.
- **SVG presentation attributes and `.ts` / `.tsx` string constants** — **resolved by B4.**
  A rule of ours covers them, and they are squarely inside the JS/TS scope.

Nothing here is silent. The deferred items are documented per-rule with inert case blocks;
the resolved items are covered.

---

## Existing tests

**160 Vitest cases across 10 files**, ~1,450 lines of test against ~1,320 lines of rule
code. Every test input is already a JSX snippet, and the
`describe("violations")` / `describe("non-violations")` split maps directly onto
`RuleTester`'s `invalid` / `valid`.

| Disposition | Cases | Detail |
| --- | --- | --- |
| Port to `RuleTester` | 122 | All nine rules are ours now, so the 50 cases previously slated for deletion with the delegated rules — `no-spectral-color` (19), `no-dark-variant` (11), `no-opacity-modifier` (11), `no-undefined-token` (9) — port too, minus any asserting behaviour the contracts have since changed. |
| ~~Delete with their rules~~ | 0 | Superseded: nothing is delegated, so nothing is deleted for being someone else's job. |
| Delete as orchestrator tests | 18 | `linter.test.ts` — rule gating, ignore comments, multi-rule dispatch. All now Oxlint's job. |
| Deferred with the CSS surface | 20 | `no-raw-color`'s `.css` cases. They return with that surface; the arbitrary-value and string-constant cases port now. |

Rework needed on the 122 that port: message-substring assertions become `messageId` +
`data`; line assertions move into the `errors` array; `ruleConfig` arguments become
`options`. (An earlier revision said 72 here and in Phase 5 step 2 — the pre-decision number,
from before the delegated rules came in-house. The table above is right: 72 + 50 = 122.)

**These tests are a starting corpus, not proof of coverage.** They were written against
the implementation, so they confirm known behavior rather than probe for holes. Phase 2
supersedes them as the coverage instrument.

---

## Revised phases

### Phase 0 — De-risk the alpha ✅ DONE — **GO**

*Executed as a throwaway spike. All eight required capabilities verified by execution,
with no workarounds.*

Versions proved against: `oxlint` 1.81.0 · `oxlint-tailwindcss` 1.10.2 (since dropped) ·
`tailwindcss` 4.3.3 · `vitest` 5.0.0 · node 24.18.0.

| Capability | Result |
| --- | --- |
| JSX AST traversal (`JSXOpeningElement` / `JSXAttribute`) | works, ESTree-shaped nodes |
| Rule `options` + `meta.schema` | works, schema enforced; `defaultOptions` deep-merged |
| `messageId` + `data` interpolation | works, in both CLI and `RuleTester` |
| Suggestions (`context.report({ suggest })`) | works — **invisible in CLI output** |
| Autofix + `oxlint --fix` | works |
| Module-load-once init | works — module loaded once for 200 files (9 ms) |
| `RuleTester` under Vitest | works — **columns 0-based without `eslintCompat: true`** |
| Inline disable directives | works, incl. `eslint-disable-next-line` |

**Not verified, and deferred to Phase 5:** editor/LSP integration. It needs the
application repo, which this repo is an extraction from. Phase 5 then
[skipped it deliberately](#phase-5--write-the-nine-rules-wire-the-suggestions-cut-over),
so it stays unverified through cutover; that step records what the decision costs.

**Exit criterion met** for the API question. The fallback to ESLint v9 + `@eslint/css` is
retired to a contingency.

### Phase 0b — De-risk distribution ✅ DONE — **GO WITH CHANGES**

A distributable package works, but the originally assumed consumer config was wrong in
three independent ways. The corrected config, and the design it forces, are in
[What a consumer writes](#what-a-consumer-writes).

| # | Question | Result |
| --- | --- | --- |
| 1 | `node_modules` resolution by package name and subpath export | **works** — under `jsPlugins`, not `plugins` |
| 2 | Package presets via `extends` | **partial** — JSON `extends` is path-only; the real mechanism is `oxlint.config.ts` importing the preset |
| 3 | `settings` reaching rules | **works from the consumer's own config, broken through `extends`** |
| 4 | Config discovery at module load | **works** — `cwd` is the invocation directory; find-up fine; loaded exactly once for 200 files |
| 5 | Options merging | **full replace, silently** — see the footgun in Distribution |
| 6 | Cross-package rule composition | **works**, given `import.meta.resolve` in the factory |
| 7 | Dual-runner from one package | **works** — identical line:column, messages and severities from both linters |
| 8 | `meta.docs.url` | **broken** under Oxlint, structurally. Works under ESLint |

Method note: verified with `npm pack` + tarball install, and that mattered — a `file:`
symlink install breaks the factory's `import.meta.resolve`, because the package then
resolves through a real path with no `node_modules`. A local-development caveat only;
registry installs are unaffected. Phase 5 must adopt via a real install, not a link.

**Open risks carried forward:** editor/LSP not yet exercised with this package's rules —
though the changelog shows the language server has run JS plugins since 1.44.0, so this is
now "unconfirmed" rather than "unknown"; pnpm and Yarn PnP untested, with the JSON
`./node_modules/…` extends path the fragile one; and nothing validates `settings`, so a
typo there fails silently.

Two risks recorded here have since been **retired**: `oxlint.config.ts` is not marked
experimental in current documentation, and LSP support for JS plugins is not missing but
shipped. Both came from reading the changelog rather than the spike.

### Phase 1 — Write the nine contracts ✅ DONE — **AGREED**

*No code.*

For each rule, a contract with three sections:

1. **Promises to catch** — the exhaustive set of syntactic forms expressing the forbidden thing.
2. **Deliberately allows** — near-misses that must stay quiet, so coverage isn't bought with false positives.
3. **Declared blind spots** — what is genuinely undecidable statically, written down as a
   known limit. `className={`bg-${x}`}` is the canonical case: flag all dynamic
   composition or don't, but decide.

Section 3 is what makes "sure it lints what it promises" achievable.

Contracts live in `docs/rules/<name>.md` — prose and test corpus in one file, with
`caught` / `allowed` / `blindspot` fenced blocks extracted and executed by the harness, so
declared blind spots are asserted rather than aspirational. See
[`no-style-color.md`](./rules/no-style-color.md) for the format.

#### Status: all nine agreed

All nine contracts are at `status: agreed`, carrying **205 tagged case blocks** between
them — 90 `caught`, 61 `allowed`, 40 `blindspot`, 14 `deferred`. Each declares its `bias`
and its `files` scope in frontmatter. No `Open questions` section and no `[cross-rule]`
marker survives in any of them.

The triage that got them there is [`open-questions.md`](./open-questions.md) — **18
decisions, none open**. It is scaffolding and is deleted in Phase 6; its decisions live in
the contracts and in the `recommended` preset.

**The cross-rule questions are settled.** Each was one question asked from several sides,
and each resolution is now text in the contracts rather than a row here:

| Question | Resolution |
| --- | --- |
| Does a `hover:` token policy bind `group-hover:` / `peer-hover:`? | **Both contracts were wrong, in opposite directions (A2, A3).** A config key ending in `:` names a variant *family*. `token-constraints` uses the `hover` family (`hover`, `group-hover`, `peer-hover`, `has-hover`); `no-useless-hover` uses a **self-hover** predicate (`hover`, `not-hover`, `[&:hover]`). Neither set contains the other, so one shared predicate cannot serve both. |
| Do rules apply to `.ts` as well as `.tsx`? | **Split by family (B1).** The six token rules take `.ts` `.tsx` `.js` `.jsx` — a class string outlives its element. The three JSX rules take `.tsx` `.jsx` only: a `style` prop or a JSX element cannot syntactically exist elsewhere, so scanning is pure cost. |
| Do rules apply to `.css`? | **Not yet — deferred, not abandoned.** See [Scope](#scope-javascript-and-typescript-only). Five contracts carry a `Deferred: CSS surface` section with inert case blocks the harness does not execute. |
| Are Storybook files excluded? | **Yes, by default, and configurably (C).** The question was unanswerable as stated because nobody remembers whether the original exclusion was intent or convenience; as a preset default with a glob it stops needing an answer. |
| Is `light-dark(var(--a), var(--b))` a sanctioned theming mechanism? | **No — banned outright, tokens or not (B5).** It is a second theming mechanism competing with custom properties, which is the argument that bans `dark:`. Owned by `no-dark-variant`; `no-raw-color` still inspects the arguments, so the literal form reports under both. |
| Does `cva()` fall inside each rule's scope? | **Yes for the token rules, no for `no-component-color-override` — by consequence, not by decision (B3).** A7's broad sweep sees `cva()` base, `variants` and `compoundVariants` as ordinary strings; A10 matches JSX elements by import source, and a `cva()` call is not a JSX element. |

Two decisions were refined after the triage was written, and the contracts are
authoritative over it: **A3**'s `not-hover:` exclusion is scoped to token policy, and
**A11**'s blind spot is scoped to declaration *values*. Two more were overtaken by the
scope change: the triage's B1 and B2 still describe `.css` as a linted surface and a
`/stylelint` entry point, both of which are now deferred.

**Exit met:** nine contracts reviewed and agreed.

### Phase 2 — Build the evasion corpus ✅ DONE

**The contracts are the corpus.** Phase 1 put prose and cases in one file precisely so
there is no second place for a test to live, and it left 205 tagged blocks behind. Phase 2
does not start a corpus; it makes that one *complete* and, for the first time, *executed*.

#### 1. Enumerate every route against every rule

For each contract, walk the route list and give every cell a disposition — a tagged case
block, or a recorded reason the route cannot reach that rule:

string literal · static template literal · dynamic template literal · `cn` / `clsx` /
`twMerge` / `cva` / `tv` · variable indirection · object lookup maps · array joins ·
string concatenation · props spread · multi-line JSX · `.ts` constants files

The routes are not equally interesting per family, and that asymmetry is the point. For the
six token rules most cells fall out of A7's broad sweep — every string literal and static
template-literal segment is seen regardless of context — so the work is confirming the
sweep's edges, not writing thirty near-identical blocks. For the three JSX rules every
route is a separate extraction question, because `<Button className={...}>` must be
resolved to an element before it means anything. That is where the corpus earns its cost.

A route that lands in *Deliberately allows* or *Declared blind spots* is as complete an
answer as one that lands in *Promises to catch*. What is not acceptable is a cell with no
block and no sentence.

The audit trail is [`evasion-matrix.md`](./evasion-matrix.md) — route × rule, one
disposition each, with the divergences between the two families explained rather than
tabulated. It is scaffolding and goes in Phase 6; the dispositions it records live in the
contracts as executed blocks.

#### 2. Build the harness

The corpus is prose until something runs it. The harness — `test/harness/`, listed in the
[package shape](#package-shape) but owned by no phase until now — extracts `caught` /
`allowed` / `blindspot` blocks from the contracts and drives `RuleTester`. It skips
`deferred` blocks, which describe work not yet done.

Built here against **empty rule stubs**, it produces exactly the failing-test baseline this
phase was always meant to produce: every `caught` block red, every `allowed` and
`blindspot` block green because a stub reports nothing. Phase 5 turns the first group green
without being allowed to turn the second red.

It also does the cheap checking that nothing currently does at all: every block parses as
`tsx`, every `count=` annotation is well-formed, and every rule named in frontmatter has a
contract and vice versa.

Two Phase 0 constraints govern it, and they are cheaper to honour now than to retrofit in
Phase 5: `new RuleTester({ eslintCompat: true, languageOptions: { parserOptions: { lang: "tsx" } } })`,
and `ruleTester.run()` at top level. **Author it ESLint-first** — ESLint's `RuleTester`
requires suggestion assertions where Oxlint's does not, so a corpus written against Oxlint
does not port back.

#### What this phase no longer does

Earlier revisions ran the corpus against the **current implementation**, counting every
pass as coverage we already had. That step is dropped, for two independent reasons:

- **It cannot run.** This repo is an extraction — no `package.json`, no `src/`, no
  `styles.css`, no `tailwindcss`. The PoC does not execute here, and standing it up in the
  application repo would cost more than the answer is worth.
- **The answer stopped being load-bearing.** Every contract already carries a *Deltas from
  the current implementation* table written against the source, so the holes are known and
  written down. Re-deriving them by execution would confirm what the contracts say and
  bind us, once more, to a proof of concept the plan has already declared non-authoritative.

The safety net it provided is now the harness plus the `blindspot` blocks: a hole is either
closed or asserted, and CI fails if a future change silently starts catching something we
declared we do not catch.

**Exit met.** Every route × rule cell carries a disposition; the harness runs the corpus
against stubs; **400 promises are unmet**, recorded per rule in
`test/harness/baseline.json`, and that is the number Phase 5 drives to zero.

| Rule | Promises unmet | Allowed | Blind spots |
| --- | --- | --- | --- |
| `token-constraints` | 69 | 60 | 13 |
| `no-component-color-override` | 68 | 25 | 15 |
| `no-spectral-color` | 53 | 17 | 5 |
| `no-raw-color` | 45 | 31 | 10 |
| `no-opacity-modifier` | 38 | 12 | 7 |
| `no-style-color` | 36 | 16 | 8 |
| `no-useless-hover` | 34 | 58 | 20 |
| `no-dark-variant` | 31 | 8 | 8 |
| `no-undefined-token` | 26 | 13 | 6 |
| **Total** | **400** | **240** | **92** |

The suite is green: 1,691 assertions, of which the 400 unmet promises run inverted while
their contracts are `status: agreed`. Fourteen `deferred` blocks are counted and not
executed — the size of the CSS deferral, visible rather than forgotten.

**What the build turned up**, none of it visible from reading the contracts:

- **Six cases contradicted themselves.** In `token-constraints`, the same class was
  asserted as caught in one section and allowed in another, because five blocks assumed a
  policy other than the baseline and said so *in italic prose*. The format now carries
  named `options=` fixtures, and `contracts.test.js` fails on any case that disagrees with
  itself under the same options.
- **The corpus needs a channel for the semantic token set**, not only for options. One
  block already varies it. This is a requirement on `/policy`'s interface in Phase 3: it
  must accept a resolved token set, not only a list of `tokenFiles` paths.
- **A rule with no `meta.schema` rejects options outright**, so even the stubs need one.
  Phase 0 recorded that the schema is enforced; that it is also *required* before options
  are accepted at all is the sharper form of the same fact.
- **Vitest collects `describe` callbacks eagerly and runs them late**, which defeats the
  obvious way of switching test behaviour around a `run()` call. Documented in
  [`test/harness/README.md`](../test/harness/README.md) so it is not rediscovered.

### Phase 3 — Build the class-string extractor ✅ DONE

*One component, its own test suite, tested independently of any rule.*

Four rules share one hard problem: **given a JSX element, which class strings can reach
it?** Every gap in the proof of concept is an extraction gap, not a rule-logic gap. It
solved this three separate times — brace-scanning in `no-component-color-override`, tag
extraction in `no-useless-hover`, line-wise literal scanning in `shared.js` — which is
exactly why coverage differed between rules.

Solved once against the AST, the rules become thin predicates over a trustworthy input.

**Two extractors, not one** (decision A7), because the rule families ask different questions
and want opposite failure modes:

| | Broad sweep | Precise walk |
| --- | --- | --- |
| For | the six token rules | the three JSX rules |
| Sees | every string literal and every static template segment, context-free | the `className` of one element |
| Follows | nothing — it does not parse the wrapper | composition helpers to any depth, conditionals, logical operators, arrays, object keys |
| Refuses | nothing | identifiers, member expressions, `+`, unknown calls (a runtime `.join()` included), spreads |
| Cost | strings that are not classes arrive too | a class the walk cannot attribute is invisible to it |

Both emit the same type, and it is the type that carries the phase's one real design
decision: a **class source** keeps the holes. `` `bg-${tone}-500` `` is neither a class name
nor nothing — it is the prefix `bg-` against an interpolation, which decision A7b makes a
violation — so extraction hands the rules the interpolation along with the text, and
`/policy`'s tokenizer turns that into a token that knows whether a hole falls between its
neighbours or inside itself. Every rule needs that distinction and none of them has to
derive it.

`/policy` also gained **variant parsing**, the other piece four rules would otherwise each
get slightly wrong: segments split on top-level colons only, so `bg-[image:var(--x)]`
survives; `!` in either position and a bracket-aware `/opacity` split; and family membership
(decision A3), where `"hover:"` governs `group-hover`, `peer-hover` and `has-hover`, but not
`[@media(hover:hover)]` or `not-hover`.

**Exit met.** 392 extraction assertions, of which 317 are the extraction-shaped subset of
the Phase 2 corpus: for every case the seven class-based rules promise to catch, at least
one class token reaches the extractor. A promise whose string never arrives would be a hole
in the extractor rather than in the rule, and this is where it would show — before any rule
exists to be blamed. The public interface names every input it needs: helper names arrive as
an option, and nothing reads a file, resolves a path, or derives anything from its own
location.

**What `/policy` still owed** — both since delivered in
[Phase 5 step 1](#phase-5--write-the-nine-rules-wire-the-suggestions-cut-over), neither
blocked on design:

- **Colour-prefix derivation** from the resolved Tailwind design system.
- **Token-set resolution** from `tokenFiles`. Phase 2 already found the interface
  requirement: `/policy` must accept a **resolved token set**, not only a list of paths, or
  the corpus cannot express a case that varies it.

**What they need is `tailwindcss`, not the consumer's stylesheet.** An earlier revision said
otherwise and it was wrong, in a way that would have stalled step 1 behind an unrelated
dependency, so the reasoning is recorded rather than just the correction.

Two separate things decide whether a class is colour-carrying, and only one of them is the
consumer's:

| What decides it | Where it comes from | Consumer-specific |
| --- | --- | --- |
| Which utilities exist, and what property each generates | Tailwind core, in the `tailwindcss` package | no |
| Which token *names* resolve — `bg-primary`, `text-danger-muted` | the consumer's `@theme` | yes |

Prefix derivation asks only the first question. `bg-*` generates `background-color` and
`text-sm` generates `font-size` whatever project you are in; `@import "tailwindcss";` on its
own loads the full default theme, which is a wider probe surface than a real stylesheet — a
project that narrows its `@theme` narrows what a probe can see. The consumer's stylesheet
supplies token *values*, which is a different question, asked by token-set resolution and
answered per-project at load.

The one genuinely consumer-specific input is a Tailwind **plugin** introducing new colour
prefixes, and the design already cut that dependency: `colorPrefixes` is an option that
*adds* to the derived set (`no-undefined-token`), so plugin prefixes arrive by config rather
than by derivation.

Note this is new work rather than a port. The proof of concept hardcoded a 17-entry
`TAILWIND_COLOR_PREFIXES` list and used the design system only as a boolean
"does this candidate resolve"; deriving the prefix set by probing is the thing that makes
`inset-ring-`, `text-shadow-` and the per-side border families arrive without a maintained
list.

Both land in Phase 5 step 1, before any rule that depends on them.

### Phase 4 — ~~Audit the off-the-shelf rules~~ Retired

This phase existed to verify that `oxlint-tailwindcss` and
`stylelint-declaration-strict-value` satisfied our contracts before we deleted anything.
With all nine rules authored in-house there is nothing to audit: the contracts are the
specification and the harness checks them directly, which is a stronger guarantee than an
audit was ever going to give.

Three items it carried are not lost:

- **The behavioural requirements** it would have audited for are now requirements on our
  own implementations, listed under
  [Behaviours carried forward](#behaviours-carried-forward).
- **`no-undefined-token`'s acceptance criterion** — the typo candidate must reach the
  message text, since suggestions do not render on the CLI — moves into that rule's
  contract as an ordinary promise.
- **The `replacement` map question is answered rather than deferred.** Owning
  `no-spectral-color` means reading the map from `options` at runtime. The build step that
  would have regenerated `.oxlintrc` from the policy file is gone.

The one question genuinely deferred is `no-raw-color`'s **one rule or two**, which now
depends on what returns with the CSS surface rather than on tool boundaries.

Phase numbering is unchanged so that references elsewhere still resolve.

### Phase 5 — Write the nine rules, wire the suggestions, cut over

By now this is mechanical; the thinking happened in Phases 1–3, and the corpus that
defines "done" is already written and already failing.

0. ~~**Verify editor/LSP integration**~~ **Skipped — deliberate, owner's decision.**
   Carried over from Phase 0, which could not run it; it stays unverified.

   **What this costs.** It was the only unverified assumption left on the critical path,
   and it is the one that decides whether suggestions are visible *anywhere*: they do not
   render in CLI output, so if the editor path is broken they reach no one. Step 5 is
   built on them.

   **Why the cost is bearable.** Every design decision that depended on this was already
   settled the pessimistic way, for independent reasons. Phase 0 found suggestions
   invisible on the CLI and Phase 0b found `meta.docs.url` dead under Oxlint, and between
   them they forced the same conclusion twice: **the message text is the only channel a
   rule can rely on.** So step 5 requires the replacement hint in `data` *and* the
   suggestion, never the suggestion alone, and no contract promises anything a plain CLI
   run cannot deliver. If the editor path turns out to be broken, the rules are no worse
   than the console output they replace — a quick-fix is lost, not a diagnostic.

   **What replaces it.** Nothing, on the critical path. Verification moves to first
   adoption (step 7), where the editor is exercised by whoever installs the package; a
   broken path is then a bug against Oxlint's LSP, not a reason to have designed the
   rules differently.
1. Finish `/policy`: colour-prefix derivation from the resolved Tailwind design system, and
   token-set resolution from `tokenFiles`. Both are inputs to rules rather than rules, so
   they come before rule code. `/policy` must accept an already-resolved token set as well
   as paths — the corpus needs it, and a rule that can only be handed a filename is a rule
   that cannot be tested.

   **Neither is gated on the application repo**, contrary to what earlier revisions of this
   plan said. Both need *a* stylesheet, not *the* stylesheet, and the distinction is the
   whole of the difference — see
   [What `/policy` still owes](#phase-3--build-the-class-string-extractor--done).

   ✅ **Both are built**, against the fixture design system in `test/fixtures/theme.css`.
   `src/policy/design-system.js` derives the colour-prefix set by probing (**51 prefixes**
   against the proof of concept's hand-written 17 — `inset-ring`, `text-shadow`,
   `drop-shadow`, `inset-shadow`, every per-side border family and the `mask-*-from` /
   `mask-*-to` families were all invisible to the old list) and answers the two per-class
   questions, `resolves` and `isColorClass`. `src/policy/tokens.js` resolves a token set
   from either stylesheet text or an already-resolved set. `src/policy/load.js` isolates the
   one filesystem read. 25 assertions.

   What is left of this step is wiring only — reading `tokenFiles` once at plugin-module
   load and handing rules the result — which lands with the first rule that needs it rather
   than before all of them.
2. ✅ **Port the surviving PoC tests into the contracts — done, and it moved nothing.**
   All 160 cases were decided individually and the record is in
   [`docs/poc-test-audit.md`](./poc-test-audit.md): **157 are already in the corpus**, 9 are
   `color-lint-ignore` tests the runner supersedes, 20 defer with the CSS surface, and one
   is a real gap. The corpus was built from the evasion matrix rather than from the proof of
   concept and turns out to subsume it — which this plan predicted in principle under
   [Existing tests](#existing-tests) without predicting it would be this complete.

   **The one gap is in the harness, not in a contract.** The corpus asserts counts and
   nothing else — `errors: c.count` — so across all 732 cases no case asserts a line or a
   column, and a rule reporting every violation on line 1 would be green. The proof of
   concept did assert report locations, because scanning braces by hand made getting them
   wrong a live failure mode. An AST rule gets locations right nearly by construction, and
   "nearly by construction" is the kind of claim the corpus exists to refuse. **Open
   decision**, because the contract format ships: a `line=` fence attribute the harness
   turns into `errors: [{ line }]`, or a few location assertions kept outside the corpus.
3. Drive the Phase 2 baseline to zero. The corpus is already in place and already red.
4. Implement in risk order. The three formerly-delegated token rules are small and share
   `/policy`, so they come early and de-risk the shared machinery before the intricate
   ones land on top of it:

   `no-style-color` (smallest, no config) → `no-dark-variant` → `no-opacity-modifier` →
   `no-spectral-color` → `no-undefined-token` (design-system resolution) →
   `no-raw-color` (JS/TS surface only) → `token-constraints` (most configurable) →
   `no-useless-hover` → `no-component-color-override` (import resolution).
5. Wire the spectral→semantic replacement map from `colors.json` into
   `context.report({ suggest })` — **and into the message text via `data`**. Suggestions
   do not render on the CLI, so a suggestion-only hint is strictly worse than today's
   console output. The upgrade is the editor quick-fix on top of the message, not instead
   of it. The map is a rule option read at load — `no-spectral-color` is ours, so there is
   no generated-config step and no question of whether it survives.
6. Package and publish: the `exports` map, the `recommended` and `minimal` presets built
   from today's `colors.json` contents, and the versioning policy that new rules ship
   disabled and join `recommended` only on a major. No lint dependencies — `oxlint` is the
   only peer.
7. Adopt it in one real application via `npm install` — not a path reference — and
   confirm green. Installing it the way a consumer would is the only test that the
   packaging works; a `file:` link would hide exactly the resolution problems Phase 0b
   exists to find.
8. Removal of the old system happens in Phase 6, not here — keep `lint-color/` on disk
   until the new rules have run against a real codebase at least once.

No parallel-run period is needed — nothing depends on the old output.

**Exit:** the package is published, installed from the registry by one real application,
and CI is green there. Contracts and corpus ship inside the package.

### Phase 6 — Extract and delete

`lint-color/` is an experimental proof of concept whose purpose was to demonstrate intent.
Once that intent lives in nine contracts and nine working rules, the PoC has no residual
value — and neither does this document. **Both are deleted, not archived.**

The only risk in deleting them is losing knowledge that is genuinely about the *new*
system and happens to be written down here. So this phase is extraction first, deletion
second.

#### 1. Extract what outlives the migration

Everything below is rewritten **as if the new system had always existed** — no mention of
a predecessor, a migration, a PoC, or a rule that "used to" do something. If a sentence
only makes sense as a comparison, it does not survive the move.

| What | Where it goes |
| --- | --- |
| The three-component architecture, and what each component owns | `README.md` |
| Installation, the `exports` map, the consumer config, the presets | `README.md` |
| Tool-choice rationale — why Oxlint, why not Biome, why Stylelint for CSS | `README.md` |
| Operational constraints — JS/TS-only plugins, no type-awareness, mandatory `settings.tailwindcss.entryPoint`, suggestions invisible in CLI output | `README.md` |
| Policy *values* are supplied by the consuming project; rule *semantics* live in contracts | `README.md` |
| The mechanism-ships-policy-is-supplied principle, and the versioning policy | `CONTRIBUTING.md` |
| Rule-authoring conventions — external data via `options` never filesystem reads in `create()`, plain `create` over `createOnce`, `messageId` + `data`, suggestions must duplicate into message text, never order a destructive suggestion first | `docs/rules/README.md` |
| `RuleTester` setup — `eslintCompat: true`, `parserOptions.lang: "tsx"`, top-level `run()` | `docs/rules/README.md` |
| The contract format — `caught` / `allowed` / `blindspot` blocks, frontmatter fields, how the harness extracts them | `docs/rules/README.md` |
| The options-replace-not-merge footgun, and the `jsPlugins` / factory config shape | `README.md` |
| Index of the nine rules, with what each covers and how they divide the surface | `docs/rules/README.md` |
| Any coverage gap accepted rather than closed — including the `.ts` object-literal question if it resolves that way | The affected contracts, as **Declared blind spots** |

Written this way, `README.md` and `docs/rules/README.md` are permanent
documentation of a linter, not residue of a migration.

#### 2. Strip the contracts of scaffolding

Every reference to the PoC is a comparison that stops being true once the comparison
target is gone. Per contract:

- Delete the **Deltas from the current implementation** section outright.
- Remove inline annotations in the case blocks describing old behavior —
  `// shorthand, currently missed` and similar. They are comments inside executed
  fixtures, so removal is safe, but they read as false claims once nothing is missing it.
- Rewrite **Open questions** phrased against the old implementation ("currently allowed
  and explicitly tested as allowed"). Resolved questions become prose decisions carrying
  their rationale; the section is deleted when empty.
- Drop the `legacy-id` frontmatter field and set `status: implemented`.

#### 3. Delete

- `lint-color/` in full.
- **This document.**
- `docs/open-questions.md` — the triage that got the contracts from `draft` to `agreed`.
  Its decisions live in the contracts and the `recommended` preset by then.
- `docs/evasion-matrix.md` — the Phase 2 audit trail. Every cell it records is a case block
  in a contract by then, and the contracts ship.
- The `scripts/lint-color/rules/` reference in `colors.schema.json`.
- Any `package.json` script, CI step, or hook invoking the old runner.
- Any `color-lint-ignore` comments left in the application codebase — they were converted
  to `oxlint-disable` in Phase 5 and are easy to strand.

**Verify by search, not by memory.** `lint-color`, `color-lint-ignore`, `migration`,
`legacy`, and the old rule id numbers should each return zero hits across both repos.

**Exit:** `lint-color/` and this plan are gone; `README.md` and
`docs/rules/README.md` stand on their own; every contract reads as a specification rather
than a comparison; searches are clean.

---

## Sequencing rationale

**Contracts → corpus → extractor → rules.** The temptation is to start writing Oxlint
rules in week one, because that is the interesting part and the API is new. Under this
framing the rules are the *cheapest* component; writing them first means re-deriving
intent from an implementation we have already decided is not authoritative.

Phase 0 is deliberately separate and throwaway: it answers a tooling question, and it
should not be entangled with a migration branch.
