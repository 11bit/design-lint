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

Three components replace one bespoke runner:

| Component | Responsibility |
| --- | --- |
| `oxlint` + [`oxlint-tailwindcss`](https://oxlint-tailwindcss.pages.dev/) | 5 of 9 rules, as configuration only |
| Local Oxlint JS plugin (4 rules) | The rules no off-the-shelf tool provides |
| `stylelint` + [`stylelint-declaration-strict-value`](https://github.com/AndyOGo/stylelint-declaration-strict-value) | Raw color values in `.css` files |

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

- **Oxlint JS plugins are JS/TS only.** No CSS, no Vue/Svelte/Astro parsers. This is why
  Stylelint is in the design.
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
- **`settings.tailwindcss.entryPoint` is mandatory** for `oxlint-tailwindcss` since its
  v1.0.0 — entry-point auto-detection was removed. `colorTokenFiles[0]` in `colors.json`
  already holds `src/styles.css` and can feed both this setting and Stylelint's
  `ignoreFiles`.
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
    componentsDirectory: "src/components/ui",
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

One package, several entry points. Not three packages — `/oxlint` and `/stylelint` share
`/policy`, and splitting them invites version skew between the two halves of a single
rule's coverage, which is the worst failure mode available here.

```
@evil-martians/design-lint
├── /preset      the factory a consumer imports
├── /oxlint      plugin object, loaded via jsPlugins
├── /eslint      the same rules, ESLint v9 flat config
├── /stylelint   the CSS surface (@apply, raw values)
└── /policy      shared: config resolution, variant segmentation,
                 colour-prefix derivation, token parsing
```

**The factory resolves its own peer specifiers with `import.meta.resolve`.** Bare
specifiers inside an *imported* config object resolve relative to the consumer's config,
not the package — so without this, a nested `oxlint-tailwindcss` fails to load. With it,
`oxlint-tailwindcss` becomes a plain dependency the consumer never names.

Because rules are authored ESLint-v9-shaped, one rule module serves both runners. What
began as a portability hedge against the Oxlint alpha becomes a distribution feature: a
consumer on either runner installs the same package.

```
src/
  policy/          config resolution, variant parsing, prefix derivation
  extract/         class-string extractor, with its own test suite
  rules/           the four custom rules
  presets/         recommended, minimal  ← today's colors.json lives here
  stylelint/
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

- **The five off-the-shelf rules become a peer dependency.** The `recommended` preset
  configures `oxlint-tailwindcss` on the consumer's behalf, which makes this a
  meta-package. Cost: coupling to that package's rule names and version range, and its
  diagnostics appear under its rule ids rather than ours. Accepted — reimplementing five
  working rules is worse — but it must be a stated dependency, not a surprise.
- **New rules ship disabled.** Adding a rule to `recommended` breaks builds on
  `npm update`. New rules land off by default and join `recommended` only on a major.
- **`componentsDirectory` cannot stay a filesystem convention.** It is the shadcn
  assumption baked into `no-component-color-override`. Distribution needs a fallback — an
  explicit component list, or a glob — for projects without that directory.
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

Five rules are covered by existing, maintained packages. **These must be audited against
their contract before deletion, not adopted on faith** (see Phase 4).

| # | Current rule | Replacement |
| --- | --- | --- |
| 12 | `no-undefined-token` | `oxlint-tailwindcss` → `no-unknown-classes`. Resolves candidates against the Tailwind v4 `@theme` design system — the same approach as our `__unstable__loadDesignSystem` bridge, but native and with typo suggestions. |
| 4 | `no-spectral-color` | `oxlint-tailwindcss` restricted-classes, regex per palette family. **Caveat:** loses the spectral→semantic replacement map. See Phase 5. |
| 3 | `no-opacity-modifier` | Restricted-classes regex on `/\d+$` after a color prefix. |
| 9 | `no-dark-variant` | Restricted-classes regex on the `dark:` variant. |
| 2 | `no-raw-css-color` | Split: the `.css` half → `stylelint-declaration-strict-value` (`"scale-unlimited/declaration-strict-value": ["/color/", { ignoreValues: ["transparent", "inherit", "currentColor"] }]`, with `colorTokenFiles` as `ignoreFiles`). The Tailwind arbitrary-value half (`bg-[#ff0000]`) → restricted-classes regex. |

All five replacements were **verified working in Phase 0** against a Tailwind v4 `@theme`
file, including per-pattern custom messages, `hover:`-variant spectral classes,
`md:dark:` compound variants, and `bg-[--my-var]` correctly *not* being treated as a raw
arbitrary color.

Additional coverage we gain for free from `oxlint-tailwindcss` (24 rules): conflicting
classes, deprecated classes, duplicate classes, concatenated classes, canonical class
names, class ordering. **Do not enable these during the migration** — adopt them
afterwards as a separate, deliberate decision, or they will bury the signal in Phase 4.
Three exceptions are directly relevant and must be evaluated *in* Phase 4:
`no-hardcoded-colors`, `no-arbitrary-value`, `prefer-theme-tokens`. The first may subsume
the hand-written arbitrary-value regex for rule 2 entirely.

### Coverage regression to resolve

`oxlint-tailwindcss` **fully extracts `cva()`** — base, variants, and compoundVariants —
which is better than assumed. But it does **not** see color classes in object-literal maps
in `.ts` constants files:

```ts
const badgeColor = { danger: "bg-red-500", ok: "bg-green-500" };
```

The current line-wise scanner catches these because it extracts every string literal in
the file. This is a real coverage loss, not a wash. It needs a Phase 4 verdict under this
plan's own "do not quietly ship the gap" standard — narrow the contract, or keep a thin
custom rule for the `.ts` surface.

---

## Rules with no off-the-shelf equivalent

Four rules must be written as a local Oxlint JS plugin. All four are JSX-shaped, which is
why they benefit most from the move to a real AST.

| # | Rule | Why nothing covers it |
| --- | --- | --- |
| 1 | `no-style-color` | Banning the `style` prop wholesale is possible (`react/forbid-dom-props`). Banning *specific CSS properties inside* the style object is not available anywhere. |
| 10 | `no-useless-hover` | No published equivalent found. `jsx-a11y/no-noninteractive-element-interactions` is adjacent but solves an accessibility problem, not a hover-affordance one. |
| 11 | `no-component-color-override` | [`eslint-plugin-primer-react`'s `no-system-props`](https://github.com/primer/eslint-plugin-primer-react/blob/main/docs/rules/no-system-props.md) is the closest published cousin, but it is Primer-specific. The generic form — discover components from a directory, flag color classes passed to them — does not exist as a package. |
| 5 | `token-constraints` | Prefix-scoped allow lists (`text-` may only use `*content*`/`*foreground*`) are more expressive than a flat deny list. Approximable with negative-lookahead regexes, but unreadable and unmaintainable as config. |

### Design constraints for these four

- **All external data arrives via rule `options`** — token sets, `uiComponents`, the
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
  `// oxlint-disable-next-line` and `/* stylelint-disable */`. Phase 0 confirmed Oxlint
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

### Regressions the target architecture would introduce

Found independently by three of the four contract authors. These are **not** current
bugs — they are things that work today and that nothing in the three-component design
covers. Each needs a Phase 4 verdict under this plan's own "do not quietly ship the gap"
standard.

- **`@apply` in component stylesheets.** `linter.js:154` runs the full token pipeline over
  `@apply` lines, so `@apply bg-red-500`, `dark:`, `/50`, and undefined tokens are all
  linted today. Nothing in the target can carry this: Oxlint JS plugins are JS/TS only,
  and `stylelint-declaration-strict-value` inspects declaration *values*, not Tailwind
  class lists. Affects `token-constraints`, `no-spectral-color`, `no-opacity-modifier`,
  and `no-undefined-token` identically. The contracts keep the `.css` promise and
  recommend a small Stylelint rule reading the same policy module; if that is rejected,
  the promise must be explicitly demoted to a declared blind spot in all four.
- **Colour classes in `.ts` object-literal maps.** Covered above under
  [Coverage regression to resolve](#coverage-regression-to-resolve).
- **SVG presentation attributes and `.ts` / `.tsx` string constants.** Promised by
  `no-raw-css-color`, caught today, covered by nothing in the replacement. Its contract
  recommends keeping the promise and budgeting a thin custom rule.

---

## Existing tests

**160 Vitest cases across 10 files**, ~1,450 lines of test against ~1,320 lines of rule
code. Every test input is already a JSX snippet, and the
`describe("violations")` / `describe("non-violations")` split maps directly onto
`RuleTester`'s `invalid` / `valid`.

| Disposition | Cases | Detail |
| --- | --- | --- |
| Port to `RuleTester` | 72 | `token-constraints` (23), `no-useless-hover` (20), `no-component-color-override` (17), `no-style-color` (12) — the four custom rules |
| Delete with their rules | 50 | `no-spectral-color` (19), `no-dark-variant` (11), `no-opacity-modifier` (11), `no-undefined-token` (9) |
| Delete as orchestrator tests | 18 | `linter.test.ts` — rule gating, ignore comments, multi-rule dispatch. All now Oxlint's job. |
| Becomes config | 20 | `no-raw-css-color`. Keep 2–3 as a smoke test that Stylelint is wired correctly. |

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

Versions proved against: `oxlint` 1.81.0 · `oxlint-tailwindcss` 1.10.2 ·
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
  this one: `oxlint-tailwindcss` *does* extract `cva()`, so the off-the-shelf half already
  fires there. The only remaining choice is whether the custom rules match that behavior
  or deliberately diverge. It can no longer be deferred.
- **Do the rules cover color classes in `.ts` object-literal maps?** Phase 0 found
  `oxlint-tailwindcss` does not see them, while the current scanner does. Deciding this at
  contract time determines whether Phase 4 records a narrowed contract or a custom rule.
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
| Do rules apply to `.css`? | The four token rules, `no-raw-css-color` | Bound to the `@apply` regression above. |
| Are Storybook files excluded? | Several | Currently excluded wholesale by `isStorybookFile`. Intent or convenience, still unknown. |
| Is `light-dark(var(--a), var(--b))` a sanctioned theming mechanism? | `no-raw-css-color`, `no-dark-variant` | Same family as the `.dark &` / `prefers-color-scheme` question. |
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

Solve it once against the AST and the four rules become thin predicates over a
trustworthy input.

**Phase 0b must have landed first.** The extractor is where an app-embedded assumption
would get baked in hardest: it takes paths and policy as arguments, derives nothing from
its own location, and touches the filesystem never. Building it before the config channel
is known risks an interface that only works in one repo.

**Exit:** extractor passes the extraction-shaped subset of the Phase 2 corpus, and its
public interface names every input it needs rather than discovering any.

### Phase 4 — Audit the off-the-shelf rules against the contracts

Verify each replacement in the [migration table](#rules-we-can-migrate-to-off-the-shelf-tooling)
against *our* contract — including `cva` handling and dynamic classes — before deleting
anything. Where an off-the-shelf rule covers 90% of a contract, the honest options are to
narrow the contract or keep a custom rule. Not to quietly ship the gap.

Phase 0 already established the baseline: all four restricted-class patterns work,
`@theme` resolution works, and `cva()` is covered. Two items carry into this phase:

- **Three coverage regressions to resolve** — the `.ts` object-literal gap, `@apply` in
  component stylesheets, and SVG attributes / string constants. See
  [Regressions the target architecture would introduce](#regressions-the-target-architecture-would-introduce).
  Each ends in one of: covered by a small Stylelint rule, covered by a thin custom rule,
  or explicitly demoted to a declared blind spot in every affected contract. Silence is
  not an option.
- **Three omitted rules to evaluate** — `no-hardcoded-colors`, `no-arbitrary-value`,
  `prefer-theme-tokens`. `no-hardcoded-colors` may subsume the hand-written
  arbitrary-value regex for rule 2; if so, rule 2 shrinks to Stylelint config alone.
- **Does `oxlint-tailwindcss` put its typo candidate in the message text?**
  `no-undefined-token`'s contract records this as an *acceptance criterion*, not a
  preference: suggestions do not render on the CLI, so a suggestion-only candidate makes
  the terminal experience worse than today's.
- **Can the `replacement` map survive as generated config?** `no-spectral-color`'s contract
  argues `off-the-shelf` still stands — the map is 27 entries expanding mechanically to 27
  restricted-class patterns, and Phase 0 proved per-pattern custom messages work. The
  trade is a build step regenerating `.oxlintrc` from `colors.json`, replacing today's
  read-at-runtime. Decide the trade, not the disposition.

Enable only the five rules being replaced, plus any of the three above that survive
evaluation. Nothing else from `oxlint-tailwindcss` yet.

**Exit:** each of the five has a documented verdict — adopted /
adopted-with-narrowed-contract / kept custom — and the `.ts` gap has a decision.

### Phase 5 — Write the four rules, wire the suggestions, cut over

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
2. Add the Phase 2 corpus cases for these four rules.
3. Implement in risk order: `no-style-color` (smallest, no config) → `token-constraints` →
   `no-useless-hover` → `no-component-color-override` (needs component discovery).
4. Wire the spectral→semantic replacement map from `colors.json` into
   `context.report({ suggest })` — **and into the message text via `data`**. Suggestions
   do not render on the CLI, so a suggestion-only hint is strictly worse than today's
   console output. The upgrade is the editor quick-fix on top of the message, not instead
   of it. If Phase 4 confirms `oxlint-tailwindcss` cannot carry the replacement map, this
   is where a thin custom `no-spectral-color` comes back to hold it.
5. Package and publish: the `exports` map, the `recommended` and `minimal` presets built
   from today's `colors.json` contents, `oxlint-tailwindcss` declared as a peer
   dependency, and the versioning policy that new rules ship disabled and join
   `recommended` only on a major.
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
- The `scripts/lint-color/rules/` reference in `colors.schema.json`.
- Any `package.json` script, CI step, or hook invoking the old runner.
- Any `color-lint-ignore` comments left in the application codebase — they were converted
  to `oxlint-disable` / `stylelint-disable` in Phase 5 and are easy to strand.

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
