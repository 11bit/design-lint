# Open-question triage

> **Migration scaffolding — delete in Phase 6.** This file exists to get the nine
> contracts from `draft` to `agreed`. Its decisions land in the contracts and in the
> `recommended` preset; nothing here outlives them.

The nine contracts raise **50 open questions**. The `[cross-rule]` ones are the same
question asked from several sides, so they collapse to **30 distinct**.

They are not equally urgent. The distribution decision — mechanism ships, policy is
supplied — changed what most of them *mean*:

| Class | Count | Who decides | Blocks |
| --- | --- | --- | --- |
| **Mechanism** | 11 | You, now | Phase 3 (the extractor and `/policy`) |
| **Scope** | 6 | You, now | Phase 4 |
| **Policy** | 11 | Nobody — becomes a preset default | Nothing |
| **Settled or deferred** | 2 | Already answered | Nothing |

**You need to answer 17, not 50.** Every one carries a recommendation.

---

## A. Mechanism — decide now

These change code in the shared `/policy` module or in the class-string extractor. Phase 3
cannot start without them, and getting them wrong is expensive because four rules share
the machinery.

### A1. Variants match by segment, not substring

*Contracts: `token-constraints` 3, `no-useless-hover` 1 — the one place two contracts
currently disagree.*

`hover:` is matched today with `indexOf` / `includes`, so it also matches `group-hover:`,
`peer-hover:`, and `[@media(hover:hover)]:`. `normalizeTwToken` separately splits on the
**last** `:`, mangling `bg-[image:var(--x)]`. One fix, four symptoms.

**Recommendation: segment-aware variant parsing in `/policy`, used by every rule.** This
part is not really contestable — the disagreement between the two contracts is *not*
about this, it is about A2.

### A2. Does a `hover:` policy bind `group-hover:` / `peer-hover:`?

*The contracts disagree: `token-constraints` says no, `no-useless-hover` says the token
should still need a `-hover` suffix.*

**Recommendation: the disagreement dissolves — reclassify as policy.** `token-constraints`
generalises the config so *any key ending in `:` is a variant policy* (A3). Under that
mechanism, whether `group-hover:bg-primary` must satisfy a `-hover` suffix rule is simply
whether the preset ships a `group-hover:` key. Ship it without one; a project that wants it
adds the key. Confirm this and both contracts become consistent without either conceding.

### A3. Generalise the variant mechanism beyond `hover:`

*Contract: `token-constraints` 2.*

Today `hover:` is a hardcoded special case. The proposal: any config key ending in `:` is a
variant policy, `hover:` stops being special.

**Recommendation: yes.** It is what makes A2 dissolve, and it costs nothing — the current
behaviour is the same config with one key.

### A4. A prefix appearing in both `allowed` and `denied`

*Contract: `token-constraints` 1. Today the deny list is silently discarded.*

**Recommendation: `colors.schema.json` validation error.** Silently discarding half a
policy is the worst option; picking a winner invites a rule nobody can predict.

### A5. Does `denied` need a variant fallback key?

*Contract: `token-constraints` 8. `"*"` is a prefix fallback only; there is no `"*:"`.*

**Recommendation: no.** Add it when a real policy needs it. Two fallback axes interacting
is a rule nobody will be able to reason about.

### A6. Derive the colour-prefix set instead of hand-maintaining it

*Contracts: `token-constraints` 6, `no-opacity-modifier` 1.*

`TAILWIND_COLOR_PREFIXES` already omits every per-side border family, `inset-ring`,
`inset-shadow`, and `text-shadow`. It also causes a live false positive: `text-sm/6` is
reported as an opacity modifier because `text-sm` starts with `text-`.

**Recommendation: derive from the Tailwind design system.** A hand-maintained constant is
a permanent source of silent holes in every token-shaped rule, and Phase 0 already proved
the resolver loads once per run at negligible cost.

### A7. What must the class-string extractor see?

*This is Phase 3's specification. Contracts: everywhere.*

Today: `"` and `'` string literals only — **template literals are entirely invisible**, so
`` className={`bg-red-500 ${x}`} `` is unlinted by every token rule.

**Recommendation — the extractor sees all of:** string literals, static template literals,
`cn()` / `clsx()` / `twMerge()` arguments in any position (today only the first is
scanned), `cva()` base + variants + compoundVariants, and `.ts` object-literal maps.
Dynamic interpolation is a declared blind spot. *What the extractor can see* is mechanism;
*which of those surfaces each rule opts into* is B1–B3.

### A8. Should one level of variable indirection be resolved?

*Contract: `no-style-color` 3 — `const s = {color:"red"}; <div style={s} />`.*

**Recommendation: no, keep as a declared blind spot.** Bounded and declared beats the slide
toward general dataflow analysis. Revisit only if it shows up in practice.

### A9. Does an interactive JSX ancestor exempt its descendants?

*Contract: `no-useless-hover` 3.*

**Recommendation: yes, within the same expression.** It is the common correct pattern. The
residual false positive — a wrapper component that renders a button — is documented and
accepted, which is consistent with that rule's `false-negatives` bias.

### A10. How is the watched component set derived?

*Contract: `no-component-color-override` 2. **Distribution forces this one.***

Today: one PascalCase name per filename, so `CardHeader`, `DialogFooter`, and `Card.Header`
are all unwatched — the rule's largest live hole. The contract recommends exported
identifiers, read recursively.

But *Consequences to design around* now says `componentsDirectory` cannot survive as a
filesystem convention, and *nothing may derive paths from its own location*.

**Recommendation: exported identifiers, with an explicit list or glob as the configured
alternative.** The directory scan becomes one strategy the preset defaults to, not the
mechanism.

### A11. Is the definition-scoped token-file exemption achievable?

*Contract: `no-raw-css-color` 2.*

The contract *requires* definition-scoped (a literal in a `--color-*` declaration is
allowed; an ordinary styling declaration in the same file is caught). Stylelint's
`ignoreFiles` only gives whole-file.

**Recommendation: keep the requirement and let Phase 4 answer it.** The contract's `caught`
block is executed, so if the tool cannot do it the test fails loudly rather than the gap
passing unnoticed. That is the mechanism working as designed.

---

## B. Scope — decide now, cheap

One decision each. They determine what Phase 4 audits and what the `/stylelint` entry
point must carry.

### B1. Do rules apply to `.ts` as well as `.tsx`?

*Five contracts. Currently inconsistent: JSX-scoped rules say `.tsx`, token rules say both.*

**Recommendation: keep the split — but as a decision.** A `style` prop or a JSX element
cannot exist in `.ts`, so `no-style-color`, `no-useless-hover`, and
`no-component-color-override` are `.tsx` only. The five token rules take both, because
`const c = { danger: "bg-red-500" }` in a constants file is exactly the case worth
catching.

### B2. Do rules apply to `.css`, and who enforces `@apply`?

*Six contracts. **Your package-shape change appears to have answered this.***

The plan's *Regressions* section still says nothing in the target can carry `@apply` — but
the new package shape lists `/stylelint` as "the CSS surface (`@apply`, raw values)". That
section is now stale and contradicts the design above it.

**Recommendation: confirm `/stylelint` owns `@apply`,** reading the same `/policy` module
so one policy governs both surfaces, and fix the stale text. This closes the largest
coverage regression in the migration.

### B3. Are `cva()` / `tv()` variant maps in scope, per rule?

*Forced by Phase 0: `oxlint-tailwindcss` already fires inside `cva()`.*

**Recommendation: in scope for the token rules, out of scope for
`no-component-color-override`.** A `cva()` call is where a component *defines* its
variants — the thing that rule tells people to do instead of overriding. Flagging it would
punish the fix.

### B4. Do SVG presentation attributes and string constants have an owner?

*Contract: `no-raw-css-color` 4. Promised, caught today, covered by nothing planned.*

**Recommendation: keep the promise, budget a thin custom rule** in the same plugin. It is
small and it is the difference between a stated blind spot and a silent one.

### B5. Does `light-dark(var(--a), var(--b))` violate anything?

*Contracts: `no-raw-css-color` 3, `no-dark-variant` 2.*

**Recommendation: allowed when both arguments are tokens, caught otherwise.** It is a
theming mechanism, not a raw colour — but `light-dark(#fff, #000)` is two raw colours.

### B6. Does `no-component-color-override` run inside `componentsDirectory` itself?

*Contract: `no-component-color-override` 4.*

**Recommendation: no.** Inside the directory, a component composing another component is
how the library is built.

---

## C. Policy — do not decide, convert

Under *mechanism ships, policy is supplied*, these stop being questions about what is true
and become **`recommended` preset defaults plus a documented option**. A project that
disagrees overrides; nobody forks a rule. Each needs a rewrite from an Open Question into
a configured default — not a debate.

| Question | Contract | Proposed preset default |
| --- | --- | --- |
| Are `black` / `white` violations? | `no-spectral-color` 1 | Yes — separately configurable, flagged as the noisiest line |
| Is `dark:` on a non-colour utility a violation? | `no-dark-variant` 1 | Yes |
| Is `style={{ color: "var(--color-primary)" }}` a violation? | `no-style-color` 1 | Yes |
| Do colour-capable shorthands flag on the key alone? | `no-style-color` 2 | Yes |
| Are non-colour classes on a watched component flagged? | `no-component-color-override` 1 | No |
| Is a `/100` modifier a violation? | `no-opacity-modifier` 2 | Yes |
| Is the full 148-name CSS colour set enforced? | `no-raw-css-color` 5 | Yes, generated not hand-typed |
| Is the value-scoped backstop worth its noise? | `no-raw-css-color` 8 | Yes |
| Are unrecognised PascalCase components flagged? | `no-useless-hover` 2 | No |
| Should `interactiveElements` accept component names? | `no-useless-hover` 4 | Yes — config *shape* is mechanism, contents are policy |
| Are Storybook files excluded? | Five contracts | Excluded, via a configurable glob |

**Note the last one.** "Are Storybook files excluded?" has been unanswerable all along
because nobody remembers whether it was intent or convenience. As a preset default with a
glob, it stops needing an answer.

---

## D. Settled or already deferred

- **Is the replacement map essential to `no-spectral-color`?** Answered: no. It covers 9
  palette families of 22 and `text`/`bg` only, and expands mechanically to 27
  restricted-class patterns with per-pattern messages. `off-the-shelf` stands; the open
  item is the build-step trade, which belongs to Phase 4.
- **One rule or two for `no-raw-css-color`?** Deferred to Phase 4 by that contract's own
  recommendation — the audit needs both halves in one document to answer.
- **Should the typo candidate reach the message text?** Recorded as a Phase 4 *acceptance
  criterion*, not a preference, because suggestions do not render on the CLI.

---

## Recommended order

1. Answer **A1–A11** and **B1–B6** — 17 decisions, all with recommendations above.
2. I rewrite the **C** questions into preset defaults across the nine contracts, and do the
   distribution pass at the same time (several contracts still assume a single application
   and a filesystem convention).
3. Contracts move to `status: agreed`; the `recommended` preset's contents fall out as a
   by-product, which Phases 4 and 5 both need.
