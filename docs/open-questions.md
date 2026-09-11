# Open-question triage

> **Migration scaffolding — delete in Phase 6.** This file exists to get the nine
> contracts from `draft` to `agreed`. Its decisions land in the contracts and in the
> `recommended` preset; nothing here outlives them.

> **Status: complete.** All nine contracts are `status: agreed`. Two decisions were refined
> during the contract pass and the refinements are authoritative over the text below:
>
> - **A3's `not-hover:` exclusion is scoped to token policy.** It was reasoned from token
>   naming ("a `-hover` token reads backwards"), which does not transfer to the rules that
>   ask whether styling is hover-dependent. `token-constraints` uses the `hover` **family**
>   (`hover`, `group-hover`, `peer-hover`, `has-hover`); `no-useless-hover` uses a
>   **self-hover** predicate (`hover`, `not-hover`, `[&:hover]`). Neither set contains the
>   other, so one shared predicate cannot serve both. `no-dark-variant` resolves the
>   identical question the same way, catching `not-dark:`.
> - **A11's blind spot is scoped to declaration *values*.** A raw colour in an ordinary
>   styling declaration inside a token file is unlinted; the exemption is whole-file, which
>   is what the mechanism actually provides.
> - **The CSS surface is deferred, and the scope narrowed to JS/TS.** Everything below that
>   treats `.css` as a linted surface, names a `/stylelint` entry point, or delegates rules
>   to a third-party package is superseded — see the plan's
>   [Scope](./migration-plan.md#scope-javascript-and-typescript-only) and
>   [No third-party rule packages](./migration-plan.md#no-third-party-rule-packages).
>   This lands hardest on **B1**, whose file table still lists `.css`, and **B2**, whose
>   whole answer was the `/stylelint` entry point. All nine rules are ours, so **D**'s
>   references to Phase 4 and to `off-the-shelf` dispositions are dead too: Phase 4 is
>   retired.

The nine contracts raise **50 open questions**. The `[cross-rule]` ones are the same
question asked from several sides, so they collapse to **30 distinct**.

They are not equally urgent. The distribution decision — mechanism ships, policy is
supplied — changed what most of them *mean*:

| Class | Count | Who decides | Blocks |
| --- | --- | --- | --- |
| **Mechanism** | 11 → **0 left** ✅ | You, now | Phase 3 (the extractor and `/policy`) |
| **Scope** | 6 → **0 left** ✅ | You, now | Phase 2 (the corpus) |
| **Policy** | 11 | Nobody — becomes a preset default | Nothing |
| **Settled or deferred** | 2 | Already answered | Nothing |

**You need to answer 17, not 50.** Every one carries a recommendation.

**Progress: 18 resolved, 0 open.** ✅ Every mechanism and scope question is answered, the
policy questions are preset defaults, and all nine contracts are `agreed`. A1, A6 and B2
were already settled by the plan's own package shape. Resolved questions keep their
heading and are marked **ANSWERED**.

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

**ANSWERED — already settled by the plan.** The package shape lists *variant segmentation*
as a `/policy` responsibility. Segment-aware parsing lives there and every rule consumes
it. Parsing must strip named-group suffixes (`group-hover/sidebar` → `group-hover`) and
respect bracket depth so `[@media(hover:hover)]:` is one segment.

### A2. Does a `hover:` policy bind `group-hover:` / `peer-hover:`?

*The contracts disagree: `token-constraints` says no, `no-useless-hover` says the token
should still need a `-hover` suffix.*

**ANSWERED — both contracts were wrong, in opposite directions.** `group-hover:` **is**
covered by a `hover:` policy, and not by shipping a second key: `hover:` names a *family*.
See A3. The constraint is about which token a hover-triggered colour may use; *which*
element is hovered is irrelevant to that. Both contracts need rewriting.

### A3. Generalise the variant mechanism beyond `hover:`

*Contract: `token-constraints` 2.*

Today `hover:` is a hardcoded special case. The proposal: any config key ending in `:` is a
variant policy, `hover:` stops being special.

**ANSWERED — yes, and by variant *family*, not exact segment.** A config key ending in `:`
names a family. A variant segment joins the `hover` family when it is `hover` or ends in
`-hover`; named-group suffixes are stripped first; stacked variants are tested per segment.

```
"hover:": ["*-hover"]

✓ hover:bg-primary-hover          ✗ hover:bg-primary
✓ group-hover:bg-primary-hover    ✗ group-hover:bg-primary
✓ peer-hover:bg-primary-hover
✓ group-hover/nav:bg-primary-hover
✓ md:group-hover:bg-primary-hover

— [@media(hover:hover)]:flex      ignored: device capability, not an element state
— not-hover:bg-primary            ignored: the inverse; a -hover token reads backwards
```

This generalises with no new code — `"focus:"` would cover `focus`, `group-focus`,
`peer-focus`. The two exclusions are the only carve-outs and both are deliberate.

### A4. A prefix appearing in both `allowed` and `denied`

*Contract: `token-constraints` 1. Today the deny list is silently discarded.*

**ANSWERED — a `colors.schema.json` validation error.** A prefix may appear in `allowed`
or `denied`, never both. An allow list already denies everything not on it, so a deny list
beside it is either redundant or contradictory — both are bugs in the policy, not intent,
and the designer should hear about it at config-load time.

### A5. Does `denied` need a variant fallback key?

*Contract: `token-constraints` 8. `"*"` is a prefix fallback only; there is no `"*:"`.*

**ANSWERED — no.** Variant keys are explicit only. `"*"` works as a *prefix* fallback
because the same pattern is meaningful across prefixes (`*-foreground` is wrong on `bg-`
and `ring-` alike); variants do not share that property, since each one's correct pattern
differs (`*-hover` vs `*-focus`). One fallback axis keeps resolution readable:

    allowed[prefix] → denied[prefix] → denied["*"]

Add a variant fallback only if a real policy needs it. Adding later is easy; removing is
not.

### A6. Derive the colour-prefix set instead of hand-maintaining it

*Contracts: `token-constraints` 6, `no-opacity-modifier` 1.*

`TAILWIND_COLOR_PREFIXES` already omits every per-side border family, `inset-ring`,
`inset-shadow`, and `text-shadow`. It also causes a live false positive: `text-sm/6` is
reported as an opacity modifier because `text-sm` starts with `text-`.

**ANSWERED — already settled by the plan.** The package shape lists *colour-prefix
derivation* as a `/policy` responsibility. Deriving from the Tailwind design system fixes
both the missing prefix families and the live `text-sm/6` false positive.

### A7. What must the class-string extractor see?

*This is Phase 3's specification. Contracts: everywhere.*

Today: `"` and `'` string literals only — **template literals are entirely invisible**, so
`` className={`bg-red-500 ${x}`} `` is unlinted by every token rule.

**ANSWERED — two extractors, not one.** The rule families ask different questions and want
opposite failure modes, so `/policy` provides both:

**Broad sweep — the five token rules.** `no-spectral-color`, `no-opacity-modifier`,
`no-dark-variant`, `no-undefined-token`, `token-constraints` are *context-free*: they ask
"is this string a forbidden class?" and never need to know which element it lands on. They
get every string literal and every static template literal in the file, regardless of
context. False-positive protection comes from the rules' own gates — a declared colour
prefix plus a declared `--color-*` token body — not from extraction precision. A random
string cannot accidentally match.

**Precise AST walk — the two JSX rules.** `no-component-color-override` and
`no-useless-hover` are *context-dependent*: a class on `<Button>` means something different
from the same class on `<div>`. They resolve `className` on a specific element, unwrapping
`cn()` / `clsx()` / `twMerge()` arguments in any position.

Consequences:

- **Template literals are fixed for the token family** — the largest hole in the PoC.
- **`cva()`, `cn()` arguments and `.ts` object-literal maps fall in for free** for the token
  rules. No special-case plumbing, because the strings are simply there. This settles half
  of B3 and the whole `.ts` object-literal regression.
- **Today's breadth is preserved.** A single precise walk would have been a *regression*:
  `cn("p-2", "bg-red-500")` and `const m = { danger: "bg-red-500" }` are caught today
  precisely because the current scanner does not care where a string lives.

### A7b. Dynamically interpolated class names

**ANSWERED — flag the prefix.** A colour prefix immediately preceding an interpolation is a
violation even though the value is unknowable. Dynamically assembled class names defeat
every static guarantee the token system offers, so this is the one hole it cannot tolerate.

```
✗ className={`bg-${tone}-500`}     ✓ className={`p-${size}`}   (not a colour prefix)
✗ className={`text-${x}`}

✓ const CLASSES = { danger: "bg-danger", ok: "bg-success" };
  className={CLASSES[tone]}         ← the sanctioned pattern: full class names,
                                      statically visible to the linter
```

The message must name that escape hatch — a lookup of complete class names, or a
`--color-*` custom property — rather than only reporting the violation.

**Reversed 2026-09-11 — no rule checks an interpolated class.** Flagging the prefix could
not be done well. `text-`, `border-`, `shadow-`, `ring-` and `outline-` take sizes as well
as colours, so `` `text-${size}` `` reported as a computed colour; `no-spectral-color` and
`no-component-color-override` both reported the same hole on a component; and five rules
judged a partial class by its static head while three skipped it. The rule is now one line
for every rule: a class token that contains an interpolation is never judged, and complete
classes in the same template still are (`` `bg-red-500 ${extra}` `` is caught). This gives
up `` `dark:${utility}` `` and `` `bg-primary/${alpha}` ``, where the offending part is
visible, in exchange for one rule every contract states the same way. The sanctioned
pattern above — a lookup of complete class names — is what gets checked. The reason is
usability: a linter whose reports are sometimes wrong, and inconsistent between rules, is
one people turn off.

### A8. Should one level of variable indirection be resolved?

*Contract: `no-style-color` 3 — `const s = {color:"red"}; <div style={s} />`.*

**ANSWERED — no, a declared blind spot.** `style={s}` and `className={s}` stay unresolved.
Documented under *Declared blind spots* and asserted by the harness, so if a future change
starts catching them CI fails and forces the doc to be updated. Bounded and honest beats
the slide toward dataflow analysis, where every answer to "how many levels, which scopes"
is arbitrary and gets re-argued in review. Revisit only if it shows up in practice.

### A9. Does an interactive JSX ancestor exempt its descendants?

*Contract: `no-useless-hover` 3.*

**ANSWERED — yes, within the same expression, at any depth.** Walk up the JSX tree; if any
ancestor is interactive, stay silent. `<button><span className="hover:text-primary">` is a
common and correct pattern, and flagging it would buy simplicity with noise.

The residual false positive — a wrapper component that renders a `<button>`, where the
ancestor is not visible in the expression — remains, and is documented rather than fixed.
That is consistent with this rule's `false-negatives` bias.

### A10. How is the watched component set derived?

*Contract: `no-component-color-override` 2. **Distribution forces this one.***

Today: one PascalCase name per filename, so `CardHeader`, `DialogFooter`, and `Card.Header`
are all unwatched — the rule's largest live hole. The contract recommends exported
identifiers, read recursively.

But *Consequences to design around* now says `componentsDirectory` cannot survive as a
filesystem convention, and *nothing may derive paths from its own location*.

**ANSWERED — match the import source.** A JSX element is watched when its identifier was
imported from a path matching a configured pattern. This replaces the triage's original
recommendation (scan the directory for exported identifiers), which still read the
filesystem and still assumed a directory convention.

```
config:  componentSources: ["@/components/ui/*"]

import { Card, CardHeader } from "@/components/ui/card";

✗ <CardHeader className="bg-primary" />     ✗ <Card className="text-danger" />

— <Card /> imported from elsewhere: not watched
— dynamic import(): declared blind spot
```

Why it wins on every distribution constraint at once:

- **No filesystem access** and **no path derived from the plugin's own location** — the
  information is already in the file being linted.
- **Nothing to keep in sync.** An explicit name list drifts silently the moment someone
  adds a component; a directory scan needs the consumer to have that directory.
- **Compound members are free.** `CardHeader` is a named import like any other, which
  closes the rule's largest live hole (one PascalCase name per filename) without special
  handling.
- Precedent: `eslint-plugin-primer-react` resolves components the same way.

### A11. Is the definition-scoped token-file exemption achievable?

*Contract: `no-raw-color` 2.*

The contract *requires* definition-scoped (a literal in a `--color-*` declaration is
allowed; an ordinary styling declaration in the same file is caught). Stylelint's
`ignoreFiles` only gives whole-file.

**ANSWERED — whole-file, and declared as a blind spot.** The exemption matches what
Stylelint's `ignoreFiles` actually provides. A raw colour anywhere in a token file is
unlinted, including in an ordinary styling rule.

```css
/* src/styles.css — exempt in full */
@theme { --color-primary: oklch(0.7 0.15 250); }   ✓ the definition
.some-component { color: #ff0000; }                 ✓ also allowed — the blind spot
```

This **reverses the contract's requirement**, which asked for definition-scoped exemption.
`no-raw-color` must move that from *Promises to catch* into *Declared blind spots*,
where the harness asserts it — so if a future change starts catching it, CI fails and the
doc is updated rather than the behaviour drifting silently.

Chosen over letting Phase 4 discover it: the capability is already known to be absent, so
promising it would be promising something we expect to fail. Declaring the limit is the
honest form of the same information.

---

## B. Scope — decide now, cheap

One decision each. They determine what Phase 4 audits and what the `/stylelint` entry
point must carry.

### B1. Do rules apply to `.ts` as well as `.tsx`?

*Five contracts. Currently inconsistent: JSX-scoped rules say `.tsx`, token rules say both.*

**ANSWERED — split by rule family.** The contracts already had this split; it is now a
decision rather than four agents each guessing.

| Family | Files | Rules |
| --- | --- | --- |
| Token | `.tsx` `.ts` `.css` | `no-spectral-color`, `no-opacity-modifier`, `no-dark-variant`, `no-undefined-token`, `token-constraints`, `no-raw-color` |
| JSX | `.tsx` only | `no-style-color`, `no-useless-hover`, `no-component-color-override` |

Class strings appear in all three file types, and A7's broad sweep exists precisely to
catch `const m = { danger: "bg-red-500" }` in a constants file. A `style` prop or a JSX
element cannot syntactically exist outside `.tsx`, so scanning `.ts` with a JSX rule is
pure cost — nothing can match.

### B2. Do rules apply to `.css`, and who enforces `@apply`?

*Six contracts. **Your package-shape change appears to have answered this.***

The plan's *Regressions* section still says nothing in the target can carry `@apply` — but
the new package shape lists `/stylelint` as "the CSS surface (`@apply`, raw values)". That
section is now stale and contradicts the design above it.

**ANSWERED — already settled by the plan.** The package shape scopes `/stylelint` to
"the CSS surface (`@apply`, raw values)", reading the same `/policy` module so one policy
governs both surfaces. This closes the largest coverage regression in the migration. The
plan's *Regressions* section is stale and must be corrected.

### B3. Are `cva()` / `tv()` variant maps in scope, per rule?

*Forced by Phase 0: `oxlint-tailwindcss` already fires inside `cva()`.*

**ANSWERED — by consequence of A7 and A10, no separate decision needed.**

- **In scope for the token rules, free.** A7's broad sweep sees `cva()` base, variants and
  compoundVariants as ordinary strings. Correct: defining a variant with a spectral colour
  is as wrong as using one inline.
- **Out of scope for `no-component-color-override`, structurally.** A10 matches JSX
  elements by import source; a `cva()` call is not a JSX element. This is also the right
  answer on the merits — `cva()` is where a component defines its variants, which is what
  that rule tells people to do instead of overriding.

### B4. Do SVG presentation attributes and string constants have an owner?

*Contract: `no-raw-color` 4. Promised, caught today, covered by nothing planned.*

**ANSWERED — keep the promise; budget a thin custom rule.** Nothing off-the-shelf covers
this: `stylelint-declaration-strict-value` only sees `.css`, and `oxlint-tailwindcss` only
inspects class strings, so `fill="#ff0000"` is invisible to both.

A7 helps but does not close it. The broad sweep hands the token rules every string in the
file, but those rules ask *"is this a forbidden Tailwind class?"* — `#ff0000` is not a
class, so it passes through. Catching it needs a rule that asks *"is this string a raw
colour?"*

```tsx
✗ <circle fill="#ff0000" />        ✓ <circle fill="currentColor" />
✗ <path stroke="rgb(0,255,0)" />   ✓ <circle fill="var(--color-brand)" />
✗ const SERIES = ["#ff0000"];
```

The implementation is small — the raw-colour matcher the CSS surface already needs, applied
to the broad sweep's output. SVG fills are a real place brand colours get hardcoded and
then never updated when the palette changes.

**This raises the custom-rule count from four to five**, and the plan's rule-disposition
tables need updating to match.

### B5. Does `light-dark(var(--a), var(--b))` violate anything?

*Contracts: `no-raw-color` 3, `no-dark-variant` 2.*

**ANSWERED — banned outright, tokens or not.** `light-dark()` is a second theming mechanism
competing with CSS custom properties, which is the same argument that bans `dark:`.

```css
✗ light-dark(var(--color-fg), var(--color-fg-dark))   /* even with tokens */
✗ light-dark(#000, #fff)
```

A `--color-*` token already resolves per theme, so `light-dark()` does that job a second
time, in a place the token file cannot see — which is precisely the property that makes
theme changes safe. One theming mechanism, enforced.

This reverses the triage's recommendation, which would have allowed the all-tokens form.
Ownership sits with **`no-dark-variant`** (an unsanctioned theming mechanism), not with
`no-raw-color` (which continues to inspect the arguments, so the literal form reports
under both — consistent with the property-versus-value division of labour those two
contracts already document).

### B6. Does `no-component-color-override` run inside `componentsDirectory` itself?

*Contract: `no-component-color-override` 4.*

**ANSWERED — yes, the rule applies everywhere, with no library exemption.** A design-system
component composing another one is held to the same standard as any consumer: add a
variant rather than pass a colour class.

```tsx
// src/components/ui/alert.tsx
<Card className="bg-danger-weak" />   ✗ flagged, same as anywhere else
```

This reverses the triage's recommendation. The cost is real and should be expected:
`oxlint-disable` comments will cluster in library files doing legitimate internal
composition. The benefit is that the library cannot quietly exempt itself from the
constraint it exports, and every internal override becomes a visible decision rather than
an invisible one.

Note A10 already removes part of the surface — a relative import (`./button`) does not
match a `@/components/ui/*` pattern — so this decision bites on alias and package-name
imports within the library.

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
| Is the full 148-name CSS colour set enforced? | `no-raw-color` 5 | Yes, generated not hand-typed |
| Is the value-scoped backstop worth its noise? | `no-raw-color` 8 | Yes |
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
- **One rule or two for `no-raw-color`?** Deferred to Phase 4 by that contract's own
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
