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

- **~~The five off-the-shelf rules become a peer dependency.~~ Retired.** All nine rules
  are ours, so there is no meta-package, no coupling to another package's rule names or
  version range, and every diagnostic appears under our own namespace.
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

## Rules we can migrate to off-the-shelf tooling

~~Five rules are covered by existing, maintained packages.~~ **Superseded.** All nine rules
are authored in-house; see [No third-party rule packages](#no-third-party-rule-packages).

What the earlier delegation plan established still has value, and is kept as requirements
on our own implementations rather than as an audit checklist:

| Rule | Requirement carried forward |
| --- | --- |
| `no-undefined-token` | Resolve candidates against the Tailwind v4 `@theme` design system, and put the typo candidate **in the message text** — suggestions do not render on the CLI. |
| `no-spectral-color` | Per-pattern messages naming the semantic replacement. The `replacement` map is read from `options` at runtime; the build step that would have regenerated `.oxlintrc` from policy is gone. |
| `no-opacity-modifier` | Only after a derived colour prefix — `text-sm/6` must not report. |
| `no-dark-variant` | Handle stacked variants (`md:dark:`) via segment parsing. |
| `no-raw-color` | Tailwind arbitrary values, while sparing `bg-[--my-var]`. |

Phase 0 verified all of these behaviours *in `oxlint-tailwindcss`*, which no longer tells
us they will work in our implementation — but it does tell us they are achievable, and it
leaves a working reference to compare against. Its verification of the **JS plugin API**
is unaffected and remains the basis for the whole approach.

---

## Rules with no off-the-shelf equivalent

**Five** rules must be written as a local Oxlint JS plugin. Four are JSX-shaped, which is
why they benefit most from the move to a real AST; the fifth was added by decision B4.

| # | Rule | Why nothing covers it |
| --- | --- | --- |
| 1 | `no-style-color` | Banning the `style` prop wholesale is possible (`react/forbid-dom-props`). Banning *specific CSS properties inside* the style object is not available anywhere. |
| 10 | `no-useless-hover` | No published equivalent found. `jsx-a11y/no-noninteractive-element-interactions` is adjacent but solves an accessibility problem, not a hover-affordance one. |
| 11 | `no-component-color-override` | [`eslint-plugin-primer-react`'s `no-system-props`](https://github.com/primer/eslint-plugin-primer-react/blob/main/docs/rules/no-system-props.md) is the closest published cousin, but it is Primer-specific. The generic form — discover components from a directory, flag color classes passed to them — does not exist as a package. |
| 5 | `token-constraints` | Prefix-scoped allow lists (`text-` may only use `*content*`/`*foreground*`) are more expressive than a flat deny list. Approximable with negative-lookahead regexes, but unreadable and unmaintainable as config. |
| 2* | raw colours in SVG attributes and string constants | Added by **B4**. A7's broad sweep does not cover it: the token rules ask *"is this a forbidden class?"*, and `#ff0000` is not a class. Needs a rule asking *"is this string a raw colour?"* — `<circle fill="#ff0000" />`, `const SERIES = ["#ff0000"]`. Owned by `no-raw-color`, which with the CSS surface deferred is now entirely a JS/TS rule and misnamed. |

### Design constraints for these five

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

Rework needed on the 72 that port: message-substring assertions become `messageId` + `data`;
line assertions move into the `errors` array; `ruleConfig` arguments become `options`.

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
application repo, which this repo is an extraction from. It is the only unverified
assumption left on the critical path.

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

### Phase 1 — Write the nine contracts

*No code.*

For each rule, a contract with three sections:

1. **Promises to catch** — the exhaustive set of syntactic forms expressing the forbidden thing.
2. **Deliberately allows** — near-misses that must stay quiet, so coverage isn't bought with false positives.
3. **Declared blind spots** — what is genuinely undecidable statically, written down as a
   known limit. `className={`bg-${x}`}` is the canonical case: flag all dynamic
   composition or don't, but decide.

Section 3 is what makes "sure it lints what it promises" achievable.

Open questions this phase must resolve:

- **Does `token-constraints` apply inside `cva()` / `tv()` variant maps?** Phase 0 forced
  this one, and A7 answered it: the broad sweep sees `cva()` base, variants and
  compoundVariants as ordinary strings, so the token rules cover it and
  `no-component-color-override` does not.
- **Do the rules cover color classes in `.ts` object-literal maps?** Phase 0 found
  answered by A7: the broad sweep sees them.
- Should `no-component-color-override` see through `cn(className, "bg-primary")` where
  `className` is a prop?
- Is excluding Storybook files intent, or convenience?
- Does `no-dark-variant` care about `.dark &` selectors and `prefers-color-scheme` blocks
  in CSS, or only the `dark:` utility?
- Is `group-hover:` / `peer-hover:` in scope for `no-useless-hover` and `token-constraints`?
- Per rule: **are false positives or false negatives worse?** The current implementation is
  conservative everywhere. Prioritising completeness pushes the other way — toward
  aggressive flagging with `oxlint-disable` as the escape hatch. This must be an explicit
  line in each contract, not an emergent property.
- For any rule offering suggestions: **what order are they in, and does the message text
  stand alone without them?** Both are consequences of Phase 0 findings, and both are
  cheaper to decide once here than nine times during implementation.

Contracts live in `docs/rules/<name>.md` — prose and test corpus in one file, with
`caught` / `allowed` / `blindspot` fenced blocks extracted and executed by the harness, so
declared blind spots are asserted rather than aspirational. See
[`no-style-color.md`](./rules/no-style-color.md) for the format.

#### Status: all nine drafted

All nine contracts exist at `status: draft`, with ~190 tagged case blocks between them.
None is `agreed` — each carries open questions that block it.

**Cross-rule questions must be reconciled before any contract is agreed.** They are marked
`[cross-rule]` in the contracts and cannot be settled inside a single one:

| Question | Contracts affected | State |
| --- | --- | --- |
| Does a `hover:` token policy bind `group-hover:` / `peer-hover:`? | `token-constraints`, `no-useless-hover` | **Contracts disagree.** Both agree variants must match by *segment*, not substring. They differ on whether `group-hover:bg-primary` must still satisfy `allowed["hover:"]`. Turns on whether the `-hover` suffix rule is about *this element's* hover state or about hover-triggered colour generally. |
| Do rules apply to `.ts` as well as `.tsx`? | All nine | Raised everywhere, settled nowhere. `no-style-color` and the JSX-scoped rules say `.tsx` only; the token rules say both. That may be correct — but it must be a decision. |
| Do rules apply to `.css`? | The four token rules, `no-raw-color` | Bound to the `@apply` regression above. |
| Are Storybook files excluded? | Several | Currently excluded wholesale by `isStorybookFile`. Intent or convenience, still unknown. |
| Is `light-dark(var(--a), var(--b))` a sanctioned theming mechanism? | `no-raw-color`, `no-dark-variant` | Same family as the `.dark &` / `prefers-color-scheme` question. |
| Does `cva()` fall inside each rule's scope? | `token-constraints`, `no-component-color-override`, the token rules | Forced by Phase 0: the off-the-shelf half already fires there. |

**Exit:** nine contracts reviewed and agreed.

### Phase 2 — Build the evasion corpus

For each contract, enumerate every syntactic route to the forbidden thing and write it as
a failing test *first*:

string literal · static template literal · dynamic template literal · `cn` / `clsx` /
`twMerge` / `cva` / `tv` · variable indirection · object lookup maps · array joins ·
string concatenation · props spread · multi-line JSX · `.ts` constants files · the CSS side

Then run the corpus against the **current** implementation. Every pass is coverage we
already have; every failure is a hole we now know about and can consciously close or
declare. This replaces the old-output snapshot as the safety net — and unlike a snapshot,
it points forward.

**Exit:** every corpus case has a pass/fail result and a decision attached.

### Phase 3 — Build the class-string extractor

*One component, its own test suite, tested independently of any rule.*

Four rules share one hard problem: **given a JSX element, which class strings can reach
it?** Every gap listed above is an extraction gap, not a rule-logic gap. The current code
solves this three separate times — brace-scanning in `no-component-color-override`, tag
extraction in `no-useless-hover`, line-wise literal scanning in `shared.js` — which is
exactly why coverage differs between rules.

Solve it once against the AST and the rules become thin predicates over a
trustworthy input.

**Phase 0b must have landed first.** The extractor is where an app-embedded assumption
would get baked in hardest: it takes paths and policy as arguments, derives nothing from
its own location, and touches the filesystem never. Building it before the config channel
is known risks an interface that only works in one repo.

**Exit:** extractor passes the extraction-shaped subset of the Phase 2 corpus, and its
public interface names every input it needs rather than discovering any.

### Phase 4 — ~~Audit the off-the-shelf rules~~ Retired

This phase existed to verify that `oxlint-tailwindcss` and
`stylelint-declaration-strict-value` satisfied our contracts before we deleted anything.
With all nine rules authored in-house there is nothing to audit: the contracts are the
specification and the harness checks them directly, which is a stronger guarantee than an
audit was ever going to give.

Three items it carried are not lost:

- **The behavioural requirements** it would have audited for are now requirements on our
  own implementations, listed under
  [Rules formerly delegated](#rules-we-can-migrate-to-off-the-shelf-tooling).
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

By now this is mechanical; the thinking happened in Phases 1–3.

0. **Verify editor/LSP integration** (~1 hour, in the app repo). Carried over from
   Phase 0, which could not run it. Confirm custom-rule diagnostics *and* suggestions
   appear in the editor. Suggestions are invisible on the CLI, so if the editor path is
   broken they are invisible everywhere — and step 4 below is built on them. Do this
   before writing rule code, not after.
1. Port the 72 tests to `RuleTester` against empty stubs. Watch them fail.
   Two Phase 0 gotchas govern this step:
   - `new RuleTester({ eslintCompat: true, languageOptions: { parserOptions: { lang: "tsx" } } })`
     is **mandatory**. Without `eslintCompat` columns are 0-based and all 72 ported column
     assertions are off by one; without the `tsx` lang, nothing parses.
   - `ruleTester.run()` must be called at **top level**. The port is therefore not
     find-and-replace over the existing `describe` / `it` nesting — budget for restructuring.
   - **Author the corpus ESLint-first.** Phase 0b found ESLint's `RuleTester` *requires*
     suggestion assertions where Oxlint's does not, so a corpus written against Oxlint
     will not port to ESLint, while one written against ESLint runs under both.
2. Add the Phase 2 corpus cases for all nine rules.
3. Implement in risk order. The three formerly-delegated token rules are small and share
   `/policy`, so they come early and de-risk the shared machinery before the intricate
   ones land on top of it:

   `no-style-color` (smallest, no config) → `no-dark-variant` → `no-opacity-modifier` →
   `no-spectral-color` → `no-undefined-token` (design-system resolution) →
   `no-raw-color` (JS/TS surface only) → `token-constraints` (most configurable) →
   `no-useless-hover` → `no-component-color-override` (import resolution).
4. Wire the spectral→semantic replacement map from `colors.json` into
   `context.report({ suggest })` — **and into the message text via `data`**. Suggestions
   do not render on the CLI, so a suggestion-only hint is strictly worse than today's
   console output. The upgrade is the editor quick-fix on top of the message, not instead
   of it. The map is a rule option read at load — `no-spectral-color` is ours, so there is
   no generated-config step and no question of whether it survives.
5. Package and publish: the `exports` map, the `recommended` and `minimal` presets built
   from today's `colors.json` contents, and the versioning policy that new rules ship
   disabled and join `recommended` only on a major. No lint dependencies — `oxlint` is the
   only peer.
6. Adopt it in one real application via `npm install` — not a path reference — and
   confirm green. Installing it the way a consumer would is the only test that the
   packaging works; a `file:` link would hide exactly the resolution problems Phase 0b
   exists to find.
7. Removal of the old system happens in Phase 6, not here — keep `lint-color/` on disk
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
| Index of the nine rules with their dispositions, and *why* each is custom or off-the-shelf | `docs/rules/README.md` |
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
