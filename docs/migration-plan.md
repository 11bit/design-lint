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
> phase's extraction table and must be moved to `docs/linting.md` or
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

**`design-system/lint/colors.json` survives unchanged** as the designer-owned source of
truth. It stops feeding a custom loader and starts feeding rule `options`.
`lint-color/` is deleted at the end of the migration.

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
- **JS plugins are alpha** (March 2026) and not semver-stable. Mitigated by the
  ESLint-compatible rule shape. Phase 0 found the API materially ESLint-shaped in
  practice: every verified name behaved as the ESLint docs for that name predict.
- **`settings.tailwindcss.entryPoint` is mandatory** for `oxlint-tailwindcss` since its
  v1.0.0 — entry-point auto-detection was removed. `colorTokenFiles[0]` in `colors.json`
  already holds `src/styles.css` and can feed both this setting and Stylelint's
  `ignoreFiles`.
- **Suggestions are invisible in every CLI output format.** They surface only in the
  editor or via `oxlint --fix-suggestions`. Any information carried in a suggestion must
  *also* appear in the message text via `data`.
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

Found in a brief review. Each is a case where a rule's stated intent and its actual
behavior diverge, **with no test in either direction**. These are listed here as evidence
for why the contracts in Phase 1 come before any code — not as a bug backlog.

- **`no-style-color` checks exactly two properties.** The regex is
  `\b(color|backgroundColor)\s*:`. The stated promise is "no color in `style=`", but
  `background`, `borderColor`, `outlineColor`, `caretColor`, `textDecorationColor`,
  `fill`, `stroke`, and `boxShadow` pass through untouched.
- **`no-style-color` misses ES6 shorthand.** The regex requires a trailing colon, so
  `style={{ color }}` is invisible.
- **`no-useless-hover` false-positives on `group-hover:`.** It does
  `str.indexOf("hover:")`, which matches `group-hover:` and `peer-hover:`. A
  non-interactive `<div className="group-hover:bg-primary">` inside an interactive parent
  is the correct Tailwind idiom, and this rule reports it. `token-constraints` has the
  identical bug via `rawTok.includes("hover:")`. Neither string appears anywhere in the
  repo, tests included.
- **`cva()` is untested across all nine rules.** Behavior differs by rule family: token
  rules scan every string literal in the file (so they would catch it), JSX-scoped rules
  only scan opening tags (so they would not). That split is arguably correct intent —
  variant maps are where colors are *defined*, not overridden — but it is currently an
  accident rather than a decision.

Working as intended, for the record: `@apply` directives in CSS **are** handled, and
`cn()` / `clsx()` string arguments **are** caught.

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

**Exit:** extractor passes the extraction-shaped subset of the Phase 2 corpus.

### Phase 4 — Audit the off-the-shelf rules against the contracts

Verify each replacement in the [migration table](#rules-we-can-migrate-to-off-the-shelf-tooling)
against *our* contract — including `cva` handling and dynamic classes — before deleting
anything. Where an off-the-shelf rule covers 90% of a contract, the honest options are to
narrow the contract or keep a custom rule. Not to quietly ship the gap.

Phase 0 already established the baseline: all four restricted-class patterns work,
`@theme` resolution works, and `cva()` is covered. Two items carry into this phase:

- **The `.ts` object-literal gap** — resolve it under the standard above. This is the one
  known regression against the current implementation.
- **Three omitted rules to evaluate** — `no-hardcoded-colors`, `no-arbitrary-value`,
  `prefer-theme-tokens`. `no-hardcoded-colors` may subsume the hand-written
  arbitrary-value regex for rule 2; if so, rule 2 shrinks to Stylelint config alone.

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
2. Add the Phase 2 corpus cases for these four rules.
3. Implement in risk order: `no-style-color` (smallest, no config) → `token-constraints` →
   `no-useless-hover` → `no-component-color-override` (needs component discovery).
4. Wire the spectral→semantic replacement map from `colors.json` into
   `context.report({ suggest })` — **and into the message text via `data`**. Suggestions
   do not render on the CLI, so a suggestion-only hint is strictly worse than today's
   console output. The upgrade is the editor quick-fix on top of the message, not instead
   of it. If Phase 4 confirms `oxlint-tailwindcss` cannot carry the replacement map, this
   is where a thin custom `no-spectral-color` comes back to hold it.
5. Switch CI to the new linters and confirm green. Removal of the old system happens in
   Phase 6, not here — keep `lint-color/` on disk until the new rules have run against
   the real codebase at least once.

No parallel-run period is needed — nothing depends on the old output.

**Exit:** CI green on the new linters, contracts and corpus in the repo next to the rules.

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
| The three-component architecture, and what each component owns | `docs/linting.md` |
| Tool-choice rationale — why Oxlint, why not Biome, why Stylelint for CSS | `docs/linting.md` |
| Operational constraints — JS/TS-only plugins, no type-awareness, mandatory `settings.tailwindcss.entryPoint`, suggestions invisible in CLI output | `docs/linting.md` |
| `colors.json` as the designer-owned policy file, and the rule that policy *values* live there while rule *semantics* live in contracts | `docs/linting.md` |
| Rule-authoring conventions — external data via `options` never filesystem reads in `create()`, plain `create` over `createOnce`, `messageId` + `data`, suggestions must duplicate into message text, never order a destructive suggestion first | `docs/rules/README.md` |
| `RuleTester` setup — `eslintCompat: true`, `parserOptions.lang: "tsx"`, top-level `run()` | `docs/rules/README.md` |
| The contract format — `caught` / `allowed` / `blindspot` blocks, frontmatter fields, how the harness extracts them | `docs/rules/README.md` |
| Index of the nine rules with their dispositions, and *why* each is custom or off-the-shelf | `docs/rules/README.md` |
| Any coverage gap accepted rather than closed — including the `.ts` object-literal question if it resolves that way | The affected contracts, as **Declared blind spots** |

Written this way, `docs/linting.md` and `docs/rules/README.md` are permanent
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

**Exit:** `lint-color/` and this plan are gone; `docs/linting.md` and
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
