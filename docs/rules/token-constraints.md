---
rule: token-constraints
legacy-id: 5
status: draft
disposition: custom
bias: false-positives
files: ["*.tsx", "*.ts", "*.css"]
---

# token-constraints

**A semantic color token may only be used where the design system says it may.**

A semantic token carries meaning, not just a value. `muted-foreground` means "de-emphasised
text on a muted surface"; it is not a fill. `border` means "the default hairline"; it is not
a text colour. Tailwind will happily compile `bg-muted-foreground` and `text-border`, and
both will render — wrongly, and consistently enough that nobody notices until the palette is
re-tuned and half the screens shift.

Every other colour rule in this system answers *is this a token at all?* This one answers
*is it the right token here?* It is the only rule whose policy is written by designers rather
than derived from the codebase: `design-system/lint/colors.json` holds a set of per-prefix
allow and deny lists, and this rule is the mechanism that enforces them. Policy *values* live
in that file and change often. Policy *semantics* — what an allow list means, how patterns
match, which of two conflicting lists wins — live here and must not change quietly.

The rule fires only on tokens the design system actually defines. A class whose colour part
is not a declared `--color-*` token is somebody else's problem; see
[Relationship to other rules](#relationship-to-other-rules).

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not. Because this rule is configuration-driven, every block also assumes a
> configuration — the **baseline** below unless the block says otherwise.

**Baseline configuration** assumed by every block that does not state its own:

```
allowed: { "text":   ["*foreground*", "primary", "link*"],
           "border": ["border*", "input", "ring"],
           "hover:": ["*-hover"] }
denied:  { "*": ["*-foreground"] }
```

**Baseline semantic tokens** (the `--color-*` names the design system declares):
`primary`, `primary-hover`, `primary-foreground`, `muted`, `muted-foreground`, `foreground`,
`border`, `input`, `ring`, `link`, `link-hover`, `warning`, `warning-foreground`, `danger`.

These are illustrative. The real values are policy and live in `colors.json`.

## Configuration semantics

The parts of this rule that are *not* policy, and that the implementation must honour
exactly.

### Keys

`allowed` and `denied` are objects keyed by:

- a **colour prefix** — `text`, `bg`, `border`, `ring-offset`, … — written without a trailing
  hyphen, naming the Tailwind utility family the policy governs;
- a **variant**, written *with* a trailing colon — `hover:`, `focus:` — naming a Tailwind
  variant the class must carry for the policy to apply;
- `"*"`, valid in `denied` only, the fallback for any prefix with no policy of its own.

The trailing colon is what distinguishes the two kinds of key. There is no `"*:"` variant
fallback: a variant is constrained only when it is named.

### Patterns

Within a list, each string is a pattern matched against the **colour part** of the class —
the token name left after the prefix, the variants, the `!` modifier and the `/opacity`
suffix have all been removed.

| Pattern | Semantics | Matches |
| --- | --- | --- |
| `*X*` | contains | `muted-foreground` for `*foreground*` |
| `*X` | endsWith | `primary-hover` for `*-hover` |
| `X*` | startsWith | `link-hover` for `link*` |
| `X` | exact | `input` for `input` |
| `*` | matches everything | any colour part |

`*` is the degenerate contains-empty-string case and is not special-cased. In `denied` it
bans every semantic token for that prefix; in `allowed` it permits every one. Both are
legitimate configurations. An empty pattern string (`""`) is an exact match against the
empty string and therefore never matches anything.

### Resolution

Exactly one policy governs a prefix, chosen by presence — not by content — in this order:

1. `allowed[prefix]`, if the key is present;
2. otherwise `denied[prefix]`, if the key is present;
3. otherwise `denied["*"]`, if present;
4. otherwise the prefix is unconstrained.

**Presence, not non-emptiness.** `allowed: { text: [] }` is a total ban on semantic `text-`
colours; `denied: { bg: [] }` exempts `bg-` from the `"*"` fallback entirely. Both are
deliberate and both are useful.

**An allow list shields its prefix from `denied["*"]`.** This is the asymmetry that makes the
whole configuration work: the fallback deny list exists to keep `-foreground` and `-content`
tokens off surfaces and fills, and `text-` is precisely the family where those tokens belong.
Without the shield, the single most common correct usage in the codebase would be reported.
See [Open questions](#open-questions) for the case where a prefix carries *both* an allow and
a deny list.

Then, independently of the prefix policy, **every variant policy whose variant the class
carries must also be satisfied.** A class may fail the prefix policy, a variant policy, or
both.

## Promises to catch

Any string that reads as a Tailwind colour utility, whose colour part is a declared semantic
token, and whose prefix or variant policy it fails.

A class is decomposed as `variant:variant:[!]prefix-colorPart[!][/opacity]`. All four
decorations are stripped before matching: leading and trailing `!`, the `/opacity` suffix,
and every variant segment. Variant segments are split on **top-level** colons only —
a colon inside `[…]` belongs to an arbitrary value or an arbitrary variant and is not a
segment boundary.

### Prefix allow-list failures

The prefix has an allow list and the colour part matches no pattern in it.

```tsx caught
<div className="text-muted" />

<div className="text-warning" />

<div className="text-border" />

<div className="border-primary" />

<div className="border-muted-foreground" />
```

### Prefix deny-list matches

The prefix has no allow list, and the colour part matches a pattern in its deny list — its
own, or the `"*"` fallback.

```tsx caught
<div className="bg-muted-foreground" />

<div className="bg-warning-foreground" />

<div className="fill-primary-foreground" />

<div className="shadow-warning-foreground" />

<div className="from-muted-foreground" />
```

A prefix-specific deny list replaces the fallback rather than adding to it. *Assumes
`denied: { "*": ["*-foreground"], text: ["warning"] }` and no `allowed`.*

```tsx caught
<div className="text-warning" />
```

An allow list containing only `*` permits everything; a deny list containing only `*` bans
everything. *Assumes `denied: { "*": ["*"] }` and no `allowed`.*

```tsx caught
<div className="bg-primary" />

<div className="text-muted" />
```

An empty allow list is a total ban for its prefix. *Assumes `allowed: { text: [] }`.*

```tsx caught
<div className="text-primary" />

<div className="text-foreground" />
```

### Variant policy failures

The class carries a variant that has a policy, and the colour part fails it. The prefix
policy and the variant policy are independent gates.

```tsx caught
<div className="hover:bg-primary" />

<div className="hover:bg-muted" />

<div className="hover:text-foreground" />

<div className="hover:fill-primary" />
```

Variant policies survive stacking, ordering, the `!` modifier and opacity.

```tsx caught
<div className="md:hover:bg-primary" />

<div className="hover:focus:bg-primary" />

<div className="dark:md:hover:bg-primary" />

<div className="hover:!bg-primary" />

<div className="hover:bg-primary/80" />

<div className="data-[state=open]:hover:bg-primary" />
```

The mechanism is general: any key ending in `:` is a variant policy, and `hover:` is not
special-cased. *Assumes the baseline plus `"focus:": ["*-focus"]` in `allowed`, and
`primary-focus` in the semantic token set.*

```tsx caught
<div className="focus:bg-primary" />

<div className="focus:hover:bg-primary" />
```

### The full colour-prefix surface

Every Tailwind utility family that takes a colour is in scope, including the per-side and
per-axis border families that share the `border-` stem. The prefix set is derived from the
resolved Tailwind design system, not hand-maintained — see
[Open questions](#open-questions).

```tsx caught
<div className="border-t-muted-foreground" />

<div className="border-x-muted-foreground" />

<div className="border-inline-start-muted-foreground" />

<div className="divide-muted-foreground" />

<div className="placeholder-muted-foreground" />

<div className="ring-offset-muted-foreground" />

<div className="decoration-muted-foreground" />

<div className="outline-muted-foreground" />

<div className="caret-muted-foreground" />

<div className="accent-muted-foreground" />

<div className="stroke-muted-foreground" />

<div className="via-muted-foreground" />

<div className="to-muted-foreground" />
```

### Syntactic surface

Class strings reach elements by many routes, and this rule follows all of them that are
statically visible. It is **not** scoped to JSX opening tags: every string literal and every
static template-literal segment in a `.ts` or `.tsx` file is scanned.

```tsx caught
<div className="text-muted" />

<div className='text-muted' />

<div className={`text-muted`} />

<div className={`text-muted ${extra}`} />

<div className={cn("text-muted", extra)} />

<div className={clsx(active && "text-muted")} />

<div className={twMerge("px-2", "text-muted")} />

<Badge className="text-muted" />

<div
  className="text-muted"
/>

<div className={cn(
  "text-muted",
)} />
```

`cva()` is fully covered — base, `variants`, and `compoundVariants` — matching what
`oxlint-tailwindcss` already does for the off-the-shelf half of the system.

```tsx caught count=3
const badge = cva("text-muted", {
  variants: { tone: { warn: "text-warning" } },
  compoundVariants: [{ tone: "warn", class: "border-primary" }],
});
```

Object-literal class maps in `.ts` constants files are covered. This is the surface where a
wrong token is most durable, because it is written once and read everywhere.

```tsx caught count=2
const toneClass = {
  warn: "text-warning",
  bad: "bg-muted-foreground",
};
```

A bare string constant is covered too. Under `bias: false-positives` this rule does not
require a string to be attached to a `className` before judging it — a string that reads as a
policy-violating colour class is reported wherever it appears.

```tsx caught
const cls = "text-muted";

const CLASSES = ["text-muted", "p-2"];

export const dangerText = "bg-muted-foreground";
```

### Every occurrence reports

There is **one report per class token per occurrence**. A class that fails both its prefix
policy and a variant policy reports once, against the first failure in resolution order
(prefix, then variants left to right); fixing it surfaces the second.

```tsx caught count=2
<div className="text-muted bg-warning-foreground" />
```

```tsx caught count=2
<div className="text-muted text-muted" />
```

```tsx caught count=1
<div className="hover:text-muted" />
```

### `@apply` in CSS

`@apply` is a class-string surface like any other, and a policy violation there is
indistinguishable from one in JSX. The promise is the same; the ownership of the
implementation is not settled — see [Open questions](#open-questions), which blocks
`status: agreed`. Files listed in `colorTokenFiles` are exempt: they define the tokens.

The block below is untagged and therefore not executed by the harness, which runs TSX only.

```css
.card-label {
  @apply text-muted;        /* caught — text allow-list failure */
}

.card-surface {
  @apply bg-muted-foreground; /* caught — deny-list match */
}
```

## Deliberately allows

### Tokens their policy permits

```tsx allowed
<div className="text-primary" />

<div className="text-foreground" />

<div className="text-muted-foreground" />

<div className="text-primary-foreground" />

<div className="text-link" />

<div className="text-link-hover" />

<div className="border-border" />

<div className="border-input" />

<div className="border-ring" />
```

### Prefixes with no policy

`bg-` has no allow list, so only the `"*"` deny list applies to it; `fill-` likewise.

```tsx allowed
<div className="bg-primary" />

<div className="bg-muted" />

<div className="bg-danger" />

<div className="fill-muted" />

<div className="stroke-primary" />
```

An empty deny list opts a prefix out of the fallback. *Assumes
`denied: { "*": ["*-foreground"], bg: [] }` and no `allowed`.*

```tsx allowed
<div className="bg-muted-foreground" />
```

### The allow-list shield

A prefix with an allow list is governed by that list alone. `text-muted-foreground` matches
`*foreground*` and is therefore permitted even though `*-foreground` is in the fallback deny
list. This is the point of the asymmetry, not an accident of it.

```tsx allowed
<div className="text-muted-foreground" />

<div className="text-primary-foreground" />

<div className="text-warning-foreground" />
```

### Variants that satisfy their policy, and variants with no policy

```tsx allowed
<div className="hover:bg-primary-hover" />

<div className="hover:text-link-hover" />

<div className="md:hover:bg-primary-hover" />

<div className="hover:bg-primary-hover/80" />

<div className="focus:bg-primary" />

<div className="active:bg-primary" />

<div className="disabled:bg-muted" />

<div className="dark:bg-primary" />

<div className="md:bg-primary" />

<div className="aria-expanded:bg-primary" />

<div className="data-[state=open]:bg-primary" />

<div className="[&>*]:bg-primary" />
```

### Variant names are matched exactly

`group-hover:` and `peer-hover:` are distinct variants from `hover:`. They describe a
*parent's* or a *sibling's* interaction state, and a colour that responds to one is not
required to be named as this element's hover colour. The `hover:` policy does not reach them.
Neither does `focus-visible:` fall under a `focus:` policy, nor `not-hover:` under `hover:`.
If designers want these constrained, the configuration can name them — that is what the
generalised variant key is for.

```tsx allowed
<div className="group-hover:bg-primary" />

<div className="peer-hover:bg-primary" />

<div className="group-hover/item:bg-primary" />

<div className="not-hover:bg-primary" />

<div className="focus-visible:bg-primary" />
```

### Classes whose colour part is not a semantic token

Out of scope by construction. These belong to other rules.

```tsx allowed
<div className="bg-red-500" />

<div className="hover:bg-red-500" />

<div className="text-white" />

<div className="bg-[#ff0000]" />

<div className="text-[var(--color-primary)]" />

<div className="text-[color:var(--brand)]" />

<div className="bg-[--color-brand]" />
```

### Not colour utilities at all

```tsx allowed
<div className="rounded-md" />

<div className="flex items-center p-4" />

<div className="bg-cover bg-center" />

<div className="border-2 border-solid" />

<div className="text-sm font-medium" />

<div className="from-0% to-100%" />
```

`bg-cover`, `border-2`, `text-sm` and `from-0%` all parse as `prefix-something`, but
`cover`, `2`, `sm` and `0%` are not declared `--color-*` tokens, so the rule stops.

### Strings that are not class names

The colour part must still be a declared token *and* sit behind a colour prefix, which makes
an accidental match on prose or an import path essentially impossible.

```tsx allowed
import { Badge } from "./components/text-primary";

const label = "Muted text";

const url = "https://example.com/border-primary";

<Badge tone="muted" />
```

## Declared blind spots

Not caught, by decision. Each is either statically undecidable or belongs to a different
rule. Listing them here means a future change that *starts* catching one will fail its
assertion and force this document to be updated.

### Composed class names

The class does not exist as a literal anywhere. Static segments of a template literal *are*
checked, but a segment that is interrupted by an interpolation is not reassembled.

```tsx blindspot
<div className={`text-${tone}`} />

<div className={"text-" + tone} />

<div className={`${prefix}-muted-foreground`} />

<div className={`text-${"mu"}${"ted"}`} />
```

### Indirection through values

Resolving these requires dataflow analysis this rule does not attempt. Note that an object
map whose *values* are literals is caught (see [Syntactic surface](#syntactic-surface)); what
is missed is a class assembled from parts, or arriving from outside the file's literals.

```tsx blindspot
<div className={styles.mutedLabel} />

<div className={props.className} />

<div className={tokens[key]} />

<div {...rest} />
```

### Arbitrary variants that express a constrained state

`[&:hover]:` is a hover in effect but not a `hover:` variant segment. Recognising it would
mean parsing arbitrary-variant selectors, and the prefix policy still applies normally.

```tsx blindspot
<div className="[&:hover]:bg-primary" />

<div className="[&:focus-within]:bg-primary" />

<div className="[@media(hover:hover)]:bg-primary" />
```

### Semantics beyond the token's name

A variant policy such as `*-hover` is a naming convention, not a semantic check. A token
named `primary-hover` satisfies it whatever its value, and a correctly-chosen token that
happens not to carry the suffix does not.

```tsx blindspot
<div className="hover:bg-primary-hover" />
```

### Class strings outside `.ts`, `.tsx` and CSS `@apply`

Markup in `.mdx` and `.html`, and markup strings rendered through
`dangerouslySetInnerHTML` — the class is inside an HTML fragment, not a class-list string,
so whitespace splitting never yields a bare utility.

```tsx blindspot
<div dangerouslySetInnerHTML={{ __html: '<p class="text-muted"></p>' }} />

const row = '<td class="bg-muted-foreground"></td>';
```

Imperative class manipulation is *not* a blind spot: the argument is an ordinary string
literal and is caught like any other.

```tsx caught
element.classList.add("text-muted");
```

## Relationship to other rules

The scope boundary is a single line of code in intent: **this rule only speaks about colour
parts that are declared semantic tokens** — names derived from the `--color-*` declarations
in `colorTokenFiles`. Everything else falls to a rule that owns it.

- **`no-undefined-token`** owns colour classes whose token does not exist
  (`text-mutd`). This rule is silent on them, so a typo produces one report, not two.
- **`no-spectral-color`** owns palette classes (`bg-red-500`). Their colour part is not a
  semantic token, so this rule never sees them — including under a `hover:` variant, where
  `hover:bg-red-500` is reported by that rule alone.
- **`no-raw-css-color`** owns arbitrary values (`bg-[#ff0000]`, `text-[color:var(--x)]`).
  Same boundary, same reason.
- **`no-opacity-modifier`** owns the `/50` suffix. This rule strips it before matching, so
  `text-muted/50` reports once from each rule: the modifier from that rule, the token choice
  from this one. Both are true.
- **`no-dark-variant`** bans the `dark:` variant outright. This rule treats `dark:` as an
  ordinary variant with no policy unless one is configured. `dark:bg-muted-foreground`
  reports twice, correctly.
- **`no-useless-hover`** asks whether *this element* should have a hover affordance at all.
  This rule asks which token a hover colour may use. They are orthogonal and may both fire on
  one class. They share the variant-matching decision — see
  [Open questions](#open-questions).
- **`no-component-color-override`** governs whether a colour class may be passed to a design
  system component at all. This rule governs which token that class may name. A
  `<Button className="text-muted">` can violate both.
- **`no-style-color`** governs the `style` prop, a channel this rule cannot see.

## Message

Three diagnostics, one per policy kind.

```
messageId: prefixNotAllowed
data:      { className, colorPart, prefix, allowed, suggestion }
text:      "{{className}} — {{colorPart}} is not allowed after {{prefix}}-
            (allowed: {{allowed}}){{suggestion}}"
```

```
messageId: prefixDenied
data:      { className, colorPart, prefix, pattern }
text:      "{{className}} — {{colorPart}} matches the forbidden pattern {{pattern}}
            for {{prefix}}- (see token-constraints in colors.json)"
```

```
messageId: variantNotAllowed
data:      { className, colorPart, variant, allowed, suggestion }
text:      "{{className}} — a {{variant}} colour must use a token matching
            {{allowed}}{{suggestion}}"
```

`allowed` renders the pattern list verbatim, because the patterns are the policy and a
developer who has just been told "not allowed" needs to see what is.

**Suggestions.** For each `*-suffix` pattern in the failing list, `prefix-colorPart-suffix`
is a candidate token. A candidate is offered **only if it is in the semantic token set** —
otherwise the suggestion is a guess that will not compile, and this rule already has a rule
next door (`no-undefined-token`) that would report the result. Surviving candidates become
`suggest` entries in pattern order and are also interpolated into `{{suggestion}}`, because
suggestions do not render in any CLI output format. No suggestion is destructive, so
suggestion ordering carries no `--fix-suggestions` hazard.

No autofix. Where more than one token satisfies the policy, choosing between them is design
intent the rule cannot infer; where exactly one does, the suggestion already covers it
without committing the edit.

## Open questions

Each blocks `status: agreed`.

1. **What happens when a prefix appears in both `allowed` and `denied`?** Today `denied` is
   silently ignored for that prefix. The alternative is intersection semantics: the token
   must match the allow list *and* miss the deny list.
   *Recommendation: make it a configuration error, rejected by `colors.schema.json`.*
   Intersection is more expressive but a prefix's policy should be readable in one place, and
   silently ignoring a list a designer wrote is the worst of the three options. If
   intersection is wanted later it can be added without breaking any existing config.

2. **Should the variant mechanism generalise beyond `hover:`, as this contract promises?**
   The configuration has exactly one variant key today. Generalising means any key ending in
   `:` becomes a variant policy, which is a larger configuration surface for designers and a
   schema change (`allowed` and `denied` currently document `"hover:"` by name).
   *Recommendation: generalise.* The mechanism is identical, it removes a special case from
   the implementation, and `focus:` / `active:` / `disabled:` are the obvious next requests.
   If the answer is no, `hover:` stays a named special case and the
   [variant policy block](#variant-policy-failures) loses its generalisation cases.

3. **[cross-rule] Are `group-hover:` and `peer-hover:` covered by a `hover:` policy?**
   The current code tests `rawTok.includes("hover:")`, which matches both — and also
   `md:hover:` (correctly) and nothing else in the repo, since neither string appears
   anywhere in it, tests included.
   *Recommendation: no — variant segments match exactly.* `group-hover:bg-primary` on a
   child of an interactive parent is the correct Tailwind idiom and the colour it applies is
   the *parent's* hover affordance; demanding this element name it `-hover` is a category
   error. Under question 2's generalisation, a designer who disagrees can add a
   `"group-hover:"` key and get the constraint deliberately.
   **This decision must match `no-useless-hover`**, which has the identical substring bug
   from the identical cause. Whatever is agreed, both contracts state it and both
   implementations share one variant-parsing helper.

4. **[cross-rule] Does this rule apply to `.ts` files, and to string literals not attached
   to a `className`?** Phase 0 found `oxlint-tailwindcss` does not see colour classes in
   `.ts` object-literal maps while the current scanner does, making this the rule where the
   gap bites hardest — a `const toneClass = { bad: "bg-muted-foreground" }` is exactly the
   kind of durable mistake this rule exists for.
   *Recommendation: yes to both, `.ts` and `.tsx`, every string literal.* This rule is
   custom, so it is not constrained by the extractor `oxlint-tailwindcss` uses, and the
   two-part gate (declared colour prefix **and** declared semantic token) makes an accidental
   match on a non-class string vanishingly unlikely. The file-scope half of this question is
   project-wide and should be settled once across all nine contracts.

5. **[cross-rule] Who enforces `@apply` after the migration?** The current runner checks
   `@apply` lines in `.css` files and this contract promises to keep doing so. But Oxlint JS
   plugins are JS/TS only, and the Stylelint half of the target architecture is
   `stylelint-declaration-strict-value`, which checks declaration *values* and knows nothing
   about Tailwind class policy. Under the plan as written this coverage disappears silently,
   which the plan's own standard forbids. The same loss applies to `no-spectral-color`,
   `no-opacity-modifier` and `no-undefined-token`.
   *Recommendation: a thin Stylelint plugin that extracts `@apply` arguments and delegates to
   the same policy module the Oxlint rule uses.* The policy logic is pure and configuration
   driven; only the extraction differs. If that is rejected, this contract must be narrowed
   to `.ts`/`.tsx` and the loss recorded as a declared blind spot in four contracts.

6. **Should the colour-prefix set be derived rather than hand-maintained?** The current list
   is a 16-entry constant that omits every per-side border family, so `border-t-primary`,
   `border-x-primary` and `border-inline-start-primary` pass through untouched today.
   *Recommendation: derive it from the resolved Tailwind design system at plugin-module
   load*, the same mechanism `no-undefined-token` already needs. A hand-maintained list is a
   permanent source of silent holes, and this contract promises the full surface.

7. **[cross-rule] Are Storybook files excluded?** The current runner skips them wholesale via
   `isStorybookFile`. For this rule the argument for exclusion is weaker than for most:
   stories demonstrate components to designers, so a story using the wrong semantic token
   teaches the wrong token.
   *Recommendation: include them.* But the decision is project-wide.

8. **Does `denied` need a variant fallback key?** `"*"` is a prefix fallback only. A
   `"*:"` key meaning "every variant" has no current use case.
   *Recommendation: no.* Adding it later is compatible; adding it now is speculative.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

For migration reference. The current rule is `checkToken` in
`lint-color/rules/token-constraints.js`, fed by `runTokenRuleOnSource` /
`linter.lintTailwindSource`, which extracts quoted string literals line by line.

| Case | Today | Under this contract |
| --- | --- | --- |
| `` className={`text-muted`} `` (template literal) | missed | caught |
| `` className={`text-muted ${x}`} `` | missed | caught |
| `border-t-muted-foreground` (per-side border) | missed | caught |
| `border-x-`, `border-inline-start-` | missed | caught |
| `group-hover:bg-primary` | caught | allowed |
| `peer-hover:bg-primary` | caught | allowed |
| `not-hover:bg-primary` | caught | allowed |
| `[&:hover]:bg-primary` (hover policy) | missed | declared blind spot |
| `md:hover:bg-primary` | caught | caught |
| `focus:bg-primary` with a `"focus:"` policy | not supported | caught |
| `hover:!bg-primary`, `hover:bg-primary/80` | caught | caught |
| `text-muted` in a `.ts` object map | caught | caught |
| `cva()` base / variants / compoundVariants | caught | caught |
| `@apply text-muted` in CSS | caught | caught — pending OQ 5 |
| Prefix in both `allowed` and `denied` | deny silently ignored | config error |
| `allowed: { text: [] }` | bans all `text-` | bans all `text-` |
| `denied: { bg: [] }` | exempts `bg-` from `"*"` | exempts `bg-` from `"*"` |
| Suffix hint naming a non-existent token | emitted anyway | suppressed |
| Class failing prefix *and* variant policy | 1 report | 1 report |

Three details of the current implementation are worth recording because they are load-bearing
and undocumented:

- `allowed` is tested with `in` but `denied` with `?? … .length`, which is why an empty allow
  list bans everything while an empty deny list bans nothing. This contract keeps both
  behaviours and restates them as one rule ("presence, not non-emptiness").
- `checkToken` returns on the first failure, so a token never produces two messages. That is
  retained deliberately rather than inherited.
- `normalizeTwToken` splits variants with `lastIndexOf(":")`, which is correct for the class
  part but cannot enumerate variant segments and mis-splits arbitrary values containing a
  colon. The generalised variant mechanism requires bracket-aware, top-level splitting.
