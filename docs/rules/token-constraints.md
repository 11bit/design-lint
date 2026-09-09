---
rule: token-constraints
legacy-id: 5
status: agreed
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
than derived from the codebase: a set of per-prefix and per-variant allow and deny lists,
supplied as rule **options**, which this rule is the mechanism for enforcing.

Mechanism ships; policy is supplied. The *contents* of `allowed` and `denied` are policy, not
part of this rule's semantics — they arrive from the consumer's configuration, and the
`recommended` preset's values are documented in [Configuration](#configuration). Policy
*semantics* — what an allow list means, how patterns match, which of two conflicting lists
wins — live here and must not change quietly.

The rule fires only on tokens the design system actually defines. A class whose colour part
is not a declared `--color-*` token is somebody else's problem; see
[Relationship to other rules](#relationship-to-other-rules).

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not. Because this rule is configuration-driven, every block also assumes a
> configuration — the **baseline** below unless the block says otherwise.

**Baseline options** assumed by every block that does not state its own:

```
allowed: { "text":   ["*foreground*", "primary", "link*"],
           "border": ["border*", "input", "ring"],
           "hover:": ["*-hover"] }
denied:  { "*": ["*-foreground"] }
```

**Baseline semantic tokens** (the `--color-*` names the design system declares):
`primary`, `primary-hover`, `primary-foreground`, `muted`, `muted-foreground`, `foreground`,
`border`, `input`, `ring`, `link`, `link-hover`, `warning`, `warning-foreground`, `danger`.

These are illustrative, and deliberately smaller than what the `recommended` preset ships.
The real values are policy — see [Configuration](#configuration).

## Configuration semantics

The parts of this rule that are *not* policy, and that the implementation must honour
exactly.

### Keys

`allowed` and `denied` are objects keyed by:

- a **colour prefix** — `text`, `bg`, `border`, `ring-offset`, … — written without a trailing
  hyphen, naming the Tailwind utility family the policy governs;
- a **variant family**, written *with* a trailing colon — `hover:`, `focus:` — naming a
  family of Tailwind variant segments the class must carry for the policy to apply;
- `"*"`, valid in `denied` only, the fallback for any prefix with no policy of its own.

The trailing colon is what distinguishes the two kinds of key, and the mechanism is general:
**any key ending in `:` is a variant policy.** `hover:` is not special-cased, and `"focus:"`
works with no new code.

There is no `"*:"` variant fallback, and one should not be added speculatively. `"*"` works
as a *prefix* fallback because a single pattern is meaningful across prefixes — `*-foreground`
is wrong after `bg-` and after `ring-` alike. Variant families do not share that property:
each one's correct pattern differs (`*-hover` versus `*-focus`), so a single fallback could
not say anything true about all of them. One fallback axis also keeps resolution readable.
Adding the key later is compatible; removing it would not be.

### Variant families

A variant key names a **family**, not one exact segment. A variant segment belongs to the
`hover` family when it **is** `hover` or **ends in** `-hover`. One `"hover:"` policy therefore
covers `hover:`, `group-hover:`, `peer-hover:` and `group-hover/nav:`.

This is the point of the constraint, not a convenience: the policy governs *which token a
hover-triggered colour may name*. Which element is hovered — this one, an ancestor group, a
sibling peer — does not change the answer. `group-hover:bg-primary` paints **this** element
when the group is hovered, so the token it names is still this element's hover colour and is
still required to be named as one.

Segment parsing lives in `/policy` and is shared by every rule that reads variants. It:

- splits on **top-level** colons only, so a colon inside `[…]` is not a segment boundary;
- strips a named-group suffix before testing membership, so `group-hover/nav` is tested as
  `group-hover`;
- tests **every** segment of a stacked variant, so `md:group-hover:` carries the `hover`
  family;
- evaluates each family **once** per class, however many of its segments join it.

Two kinds of segment stay outside every family, and the exclusions are the only carve-outs:

- **An arbitrary variant** — anything in `[…]` — never joins a family. For
  `[@media(hover:hover)]:` that is the right answer on the merits: it names a *device
  capability*, not an element state, and the token a capability query applies is a different
  question from the one this rule asks. For `[&:hover]:` it is a limitation rather than a
  decision, and is recorded under [Declared blind spots](#arbitrary-variants-that-express-a-constrained-state).
- **An inverse** — `not-hover:` ends in `-hover` textually but means the *absence* of hover,
  where a `*-hover` token reads backwards.

Families are **additive**. A class joining two families must satisfy both policies, so a
narrower key can only ever tighten a broader one — `"group-hover:"` beside `"hover:"` adds a
second gate to `group-hover:` classes rather than replacing the first. Exempting a sub-family
from its parent is not expressible, deliberately: if it is ever needed it wants a new
construct, not a new key.

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

There is exactly **one fallback axis**, and exactly one policy governs a prefix, chosen by
presence — not by content — in this order:

    allowed[prefix] → denied[prefix] → denied["*"] → unconstrained

1. `allowed[prefix]`, if the key is present;
2. otherwise `denied[prefix]`, if the key is present;
3. otherwise `denied["*"]`, if present;
4. otherwise the prefix is unconstrained.

The chain stops at the first key that is present. Nothing further down is consulted, and no
step is skipped for being empty.

**Presence, not non-emptiness.** `allowed: { text: [] }` is a total ban on semantic `text-`
colours; `denied: { bg: [] }` exempts `bg-` from the `"*"` fallback entirely. Both are
deliberate and both are useful.

**An allow list shields its prefix from `denied["*"]`.** This is the asymmetry that makes the
whole configuration work: the fallback deny list exists to keep `-foreground` and `-content`
tokens off surfaces and fills, and `text-` is precisely the family where those tokens belong.
Without the shield, the single most common correct usage in the codebase would be reported.

**A key may appear in `allowed` or in `denied`, never both.** A configuration carrying the
same prefix or the same variant family in both is a **validation error**, rejected by
`colors.schema.json` when the configuration loads — it is not a runtime precedence question.
An allow list already denies everything not on it, so a deny list beside it is either
redundant or contradictory; both are bugs in the policy rather than expressions of intent,
and the designer should hear about it at config-load time. Silently discarding one of the two
lists, which is what the current implementation does, is the worst of the three available
options. Intersection semantics — the token must match the allow list *and* miss the deny
list — is more expressive and can be added later without breaking any configuration that
validates today. The check is textual and per key: `"hover:"` in `allowed` beside
`"group-hover:"` in `denied` is two distinct keys and validates, and both apply, per
[Variant families](#variant-families).

Then, independently of the prefix policy, **every variant policy whose family the class joins
must also be satisfied.** A class may fail the prefix policy, a variant policy, or both.

## Configuration

Everything this rule reads arrives through `options` and `settings`. **The rule performs no
filesystem access and resolves no path relative to its own module.** The semantic-token set
and the colour-prefix set are resolved once by `/policy` — the tokens from the
consumer-supplied `tokenFiles`, the prefixes from the resolved Tailwind design system — and
handed to the rule already parsed. Paths are the consumer's, interpreted relative to the
consumer's project, never to the package.

| Option | Type | `recommended` default |
| --- | --- | --- |
| `tokenFiles` | `string[]` | supplied by the consumer through the preset factory; no built-in default |
| `allowed` | `{ [prefix or variant]: string[] }` | below |
| `denied` | `{ [prefix or variant]: string[] }` | below |
| `exclude` | `string[]` of globs | `["**/*.stories.tsx", "**/*.stories.ts"]` |

The `recommended` preset ships this policy — a project shaped like the one this linter grew
in gets value on install:

```
allowed: { "text":   ["*foreground*", "*content*", "primary", "link*"],
           "border": ["border*", "input", "ring"],
           "hover:": ["*-hover"] }
denied:  { "*": ["*-foreground", "*-content"] }
```

These values are **policy, not semantics**. A project whose tokens are named differently
replaces them wholesale and gets a correct rule; nobody forks the mechanism to change a
pattern. The semantics of the patterns themselves — contains, endsWith, startsWith, exact —
and the resolution order are fixed by this contract and are not configurable.

**Overriding replaces; it does not merge.** Supplying `allowed` replaces the preset's
`allowed` entirely — there is no per-prefix merge, and a prefix the preset constrained is
unconstrained the moment the replacement omits it. That is the intended behaviour: an allow
list is only readable if it is complete in one place.

**The options-replace footgun bites this rule hardest.** Under Oxlint, rule options replace
rather than merge, so a consumer writing

```jsonc
"design/token-constraints": "error"    // just bumping the severity
```

wipes the preset's options and the rule reports **nothing**, at exit 0, while appearing
enabled. This rule is the most option-dependent of the nine and therefore the most exposed.
Two mitigations belong to the rule itself:

- **`defaultOptions` carries the `recommended` policy**, so a severity-only override degrades
  to that policy rather than to nothing. This covers `allowed`, `denied` and `exclude`, which
  all have defensible defaults.
- **Fail loudly on `tokenFiles`.** It has no defensible default — it is the one option only
  the consumer can supply — so its absence raises a configuration error rather than an early
  return. Without it there is no semantic-token set, the rule's first gate always fails, and
  the rule would report nothing while appearing to work. Silence is exactly the failure mode
  this rule cannot afford, since a rule that finds no violations looks identical to a codebase
  with none.

**Storybook and other excluded files.** `exclude` is a glob list, and the preset excludes
stories by default. This rule has the weakest case of the nine for that default — a story
demonstrates a component to a designer, so a story using the wrong semantic token teaches the
wrong token — which is exactly why it is a configurable glob rather than a hardcoded
`isStorybookFile` check. A project that wants its stories linted empties the list.

**The colour-prefix set is derived, not configurable.** It comes from the resolved Tailwind
design system, so every utility family that takes a colour is covered as the design system
defines it. A hand-maintained list is a permanent source of silent holes: the current 16-entry
constant omits every per-side border family, `inset-ring`, `inset-shadow` and `text-shadow`.

## Promises to catch

Any string that reads as a Tailwind colour utility, whose colour part is a declared semantic
token, and whose prefix or variant policy it fails.

**Extraction is the broad sweep.** This rule is context-free: it asks "is this string a
forbidden class?" and never needs to know which element the class lands on. `/policy` hands it
every string literal and every static template literal in the file, regardless of context.
False-positive protection comes from the rule's own two gates — a declared colour prefix and a
colour part that is a declared `--color-*` token — not from extraction precision, which is the
argument behind `bias: false-positives`. `cva()` and `cn()` arguments and `.ts` object-literal
maps therefore fall in for free, with no special-case plumbing, because the strings are simply
there.

A class is decomposed as `variant:variant:[!]prefix-colorPart[!][/opacity]`. All four
decorations are stripped before matching: leading and trailing `!`, the `/opacity` suffix,
and every variant segment. Variant segments are split on **top-level** colons only —
a colon inside `[…]` belongs to an arbitrary value or an arbitrary variant and is not a
segment boundary. The segmentation is `/policy`'s, shared with every other rule that reads
variants, so `bg-[image:var(--x)]` survives it intact.

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

The class carries a variant segment belonging to a family that has a policy, and the colour
part fails it. The prefix policy and the variant policy are independent gates.

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

A `hover:` policy names the **hover family**, so it reaches every segment that is `hover` or
ends in `-hover` — on this element, on a group, or on a peer. Named-group suffixes are
stripped before the test.

```tsx caught
<div className="group-hover:bg-primary" />

<div className="peer-hover:bg-primary" />

<div className="group-hover/nav:bg-primary" />

<div className="peer-hover/input:text-foreground" />

<div className="md:group-hover:bg-primary" />

<div className="group-hover:hover:bg-primary" />
```

The mechanism is general: any key ending in `:` is a variant policy, and `hover:` is not
special-cased. The same family test applies, so one `"focus:"` key covers `focus`,
`group-focus` and `peer-focus` with no new code. *Assumes the baseline plus
`"focus:": ["*-focus"]` in `allowed`, and `primary-focus` in the semantic token set.*

```tsx caught
<div className="focus:bg-primary" />

<div className="focus:hover:bg-primary" />

<div className="group-focus:bg-primary" />

<div className="peer-focus:bg-primary" />
```

### The full colour-prefix surface

Every Tailwind utility family that takes a colour is in scope, including the per-side and
per-axis border families that share the `border-` stem. The prefix set is derived from the
resolved Tailwind design system, not hand-maintained — see
[Configuration](#configuration).

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
static template-literal segment in a `.tsx`, `.ts` or `.css` file is scanned. A `className`
attribute cannot exist in a `.ts` file, but a class *string* can, which is why the token
family scans it and the JSX rules do not.

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

### Dynamically interpolated class names

A colour prefix immediately followed by an interpolation is a violation, **even though the
value is unknowable**. This is the one hole the token system cannot tolerate: a class name
assembled at runtime defeats every static guarantee the system offers, and no rule downstream
can recover the check. The report is against the prefix, not against a token — there is no
token to name — so it is the one diagnostic this rule emits without its second gate.

```tsx caught
<div className={`text-${tone}`} />

<div className={`bg-${tone}-500`} />

<div className={`hover:bg-${tone}`} />

<div className={`px-2 text-${tone}`} />

<div className={`text-${"mu"}${"ted"}`} />
```

The last case shows the rule does **not** attempt to reassemble an interpolation whose parts
happen to be static; it reports the prefix and stops.

The message must name the escape hatch rather than only reporting the violation: a lookup of
**complete** class names, statically visible to the linter — which the broad sweep then lints
like any other string — or a `--color-*` custom property.

```tsx allowed
const TONE_CLASSES = { danger: "bg-danger", ok: "bg-primary" };

<div className={TONE_CLASSES[tone]} />

<div className={`p-${size}`} />

<div className={`gap-${n} rounded-md`} />
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
indistinguishable from one in JSX. The promise is the same, and so is the policy: the
package's **`/stylelint` entry point owns the CSS surface**, extracting `@apply` arguments and
handing them to the same `/policy` module the Oxlint rule uses. Only the extraction differs;
the resolution order, the pattern semantics and the variant families are one implementation,
so the two surfaces cannot drift. That is why `/oxlint` and `/stylelint` ship in one package
rather than two — version skew between the two halves of one rule's coverage is the worst
failure mode available here.

Without this, `@apply` coverage would have disappeared silently in the migration, since
`stylelint-declaration-strict-value` checks declaration *values* and knows nothing about
Tailwind class policy. Files listed in `tokenFiles` are exempt: they define the tokens.

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

<div className="group-hover:bg-primary-hover" />

<div className="peer-hover:text-link-hover" />

<div className="group-hover/nav:bg-primary-hover" />

<div className="focus:bg-primary" />

<div className="active:bg-primary" />

<div className="disabled:bg-muted" />

<div className="dark:bg-primary" />

<div className="md:bg-primary" />

<div className="aria-expanded:bg-primary" />

<div className="data-[state=open]:bg-primary" />

<div className="[&>*]:bg-primary" />
```

### Segments outside the family

A `hover:` policy covers the hover *family* — see
[Variant policy failures](#variant-policy-failures) for what it catches. Three kinds of
segment stay outside it, and the exclusions are deliberate:

- `not-hover:` ends in `-hover` but denotes the *inverse*; a `*-hover` token applied when the
  element is **not** hovered reads backwards, so constraining it would be enforcing the wrong
  thing.
- `[@media(hover:hover)]:` is a device-capability query, not an element state. The colon
  inside the brackets is not a segment boundary, and no bracketed segment joins a family.
- `focus-visible:` starts with `focus-` rather than ending in `-focus`, so it is not in the
  `focus` family. Family membership is a suffix test, not a prefix one, precisely because
  `group-`/`peer-` prefixes are the productive direction in Tailwind and `-visible`,
  `-within` and friends name genuinely different states.

A designer who wants any of these constrained names it as its own key.

```tsx allowed
<div className="not-hover:bg-primary" />

<div className="focus-visible:bg-primary" />

<div className="[@media(hover:hover)]:bg-primary" />
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

### Composed class names with no visible prefix

The class does not exist as a literal anywhere, *and* no colour prefix sits immediately before
the interpolation, so the check in
[Dynamically interpolated class names](#dynamically-interpolated-class-names) has nothing to
fire on. Static segments of a template literal are checked; a segment interrupted by an
interpolation is never reassembled.

```tsx blindspot
<div className={`${prefix}-muted-foreground`} />

<div className={`${tone}:bg-primary-hover`} />
```

String concatenation is a blind spot even in the prefix-adjacent form. The dynamic-prefix
check reads a template literal's interpolation points, which the extractor surfaces; a binary
expression is a different shape and is not a class string. Extending the check to it later is
compatible — the boundary is drawn where the extractor's is, not on a claim that the two cases
differ in kind.

```tsx blindspot
<div className={"text-" + tone} />

<div className={"bg-" + tone + "-500"} />
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

`[&:hover]:` is a hover in effect but not a hover-family segment. Recognising it would mean
parsing arbitrary-variant selectors. The prefix policy still applies normally.

This is the one place where "no bracketed segment joins a family" costs something. It is
distinct from `[@media(hover:hover)]:`, which is
[deliberately outside the family](#segments-outside-the-family) rather than missed: that one
names a device capability, this one names the state the policy is about.

```tsx blindspot
<div className="[&:hover]:bg-primary" />

<div className="[&:focus-within]:bg-primary" />

<div className="[&:hover]:bg-muted" />
```

### Semantics beyond the token's name

A variant policy such as `*-hover` is a naming convention, not a semantic check. A token
named `primary-hover` satisfies it whatever its value, and a correctly-chosen token that
happens not to carry the suffix does not.

```tsx blindspot
<div className="hover:bg-primary-hover" />
```

### Class strings outside `.tsx`, `.ts` and CSS `@apply`

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
in `tokenFiles`. Everything else falls to a rule that owns it. The one exception is the
dynamic-prefix diagnostic, which by construction has no token to inspect.

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
  one class. They share `/policy`'s variant segmentation and the same family definition, so
  `group-hover:` means one thing across the plugin — but they draw opposite conclusions from
  it, and correctly: this rule constrains a group-triggered colour, while that rule treats the
  hovered *ancestor* as the thing that must be interactive.
- **The dynamic-prefix check lives in `/policy`**, so the escape hatch its message names is
  worded identically wherever the token family reports it, and the definition of "a colour
  prefix immediately before an interpolation" cannot drift between rules.
- **`no-component-color-override`** governs whether a colour class may be passed to a design
  system component at all. This rule governs which token that class may name. A
  `<Button className="text-muted">` can violate both.
- **`no-style-color`** governs the `style` prop, a channel this rule cannot see.

## Message

Four diagnostics: one per policy kind, plus the dynamic prefix.

**The message text is the only channel.** `meta.docs.url` is inert under Oxlint — absent from
every CLI format — so a message cannot link a developer to this contract, and suggestions do
not render either. Everything a developer needs to act must be in the text.

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
            for {{prefix}}- (token-constraints policy)"
```

```
messageId: variantNotAllowed
data:      { className, colorPart, variant, family, allowed, suggestion }
text:      "{{className}} — a {{family}} colour must use a token matching
            {{allowed}}{{suggestion}}"
```

```
messageId: dynamicColorClass
data:      { prefix }
text:      "{{prefix}}- is built from an interpolated value, so no rule can check which
            token it names. Map to complete class names instead — e.g.
            const CLASSES = { danger: \"bg-danger\" } — or use a --color-* custom property."
```

`allowed` renders the pattern list verbatim, because the patterns are the policy and a
developer who has just been told "not allowed" needs to see what is.

`variantNotAllowed` carries both `variant` — the segment actually written, `group-hover` —
and `family` — the policy key that caught it, `hover`. A developer who wrote `group-hover:`
and is told a "hover colour" is constrained needs to see why the two connect; naming only one
of them makes the diagnostic look like a bug.

`dynamicColorClass` **must name the escape hatch**, not merely report the violation. It is the
one diagnostic with no correct token to suggest, so without the alternative in the text it
reads as "you may not do this" with no way forward.

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
| `` className={`text-${tone}`} `` | missed | caught (dynamic prefix) |
| `` className={"text-" + tone} `` | missed | declared blind spot |
| `group-hover:bg-primary` | caught, by substring accident | caught, by family membership |
| `peer-hover:bg-primary` | caught, by substring accident | caught, by family membership |
| `group-hover/nav:bg-primary` | missed | caught |
| `not-hover:bg-primary` | caught | allowed |
| `[@media(hover:hover)]:bg-primary` | caught | allowed — outside every family |
| `[&:hover]:bg-primary` (hover policy) | missed | declared blind spot |
| `md:hover:bg-primary` | caught | caught |
| `focus:bg-primary` with a `"focus:"` policy | not supported | caught |
| `group-focus:bg-primary` with a `"focus:"` policy | not supported | caught |
| `hover:!bg-primary`, `hover:bg-primary/80` | caught | caught |
| `bg-[image:var(--x)]` | mis-split by `lastIndexOf(":")` | parsed correctly |
| `text-muted` in a `.ts` object map | caught | caught |
| `cva()` base / variants / compoundVariants | caught | caught |
| `@apply text-muted` in CSS | caught | caught, via `/stylelint` |
| Storybook files | skipped by a hardcoded check | skipped by a configurable glob |
| Prefix or variant key in both `allowed` and `denied` | deny silently ignored | config error |
| Severity-only override wipes options | n/a | `defaultOptions` restores the policy |
| `tokenFiles` absent | config file always present | configuration error, not silence |
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

Two migration notes on configuration:

- **`colors.json` becomes rule options.** Its `rules["token-constraints"].allowed` / `denied`
  move into the `recommended` preset verbatim; there is no config file for the rule to find,
  and the rule reads nothing from disk.
- **`tokenFiles` is named `tokenFiles`** in the package, matching the key the preset
  factory takes from the consumer. Same meaning, consumer-relative paths, no default.
