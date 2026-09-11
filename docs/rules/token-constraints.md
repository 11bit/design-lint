---
rule: token-constraints
legacy-id: 5
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
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
`recommended` values are documented in [Configuration](#configuration). Policy
*semantics* — what an allow list means, how patterns match, which of two conflicting lists
wins — live here and must not change quietly.

The rule fires only on tokens the design system actually defines. A class whose colour part
is not a declared `--color-*` token is somebody else's problem; see
[Relationship to other rules](#relationship-to-other-rules).

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not. Because this rule is configuration-driven, every block also assumes a
> configuration — the **baseline** below unless the block says otherwise.

**Baseline options** assumed by every block that does not name its own. A block that needs
different policy names a fixture defined the same way — `options=deny-all`, and so on — so
the configuration a case runs under is executed rather than described.

A fixture is the **whole** configuration, exactly as a consumer's `options` are: a fixture that
names only `denied` leaves every prefix without an allow list. See
[Configuration](#configuration) for why the `recommended` policy does not leak into one.

```json options=baseline
{
  "allowed": {
    "text": ["*foreground*", "primary", "link*"],
    "border": ["border*", "input", "ring"],
    "hover:": ["*-hover"]
  },
  "denied": { "*": ["*-foreground"] }
}
```

**Baseline semantic tokens** (the `--color-*` names the design system declares):
`primary`, `primary-hover`, `primary-foreground`, `muted`, `muted-foreground`, `foreground`,
`border`, `input`, `ring`, `link`, `link-hover`, `warning`, `warning-foreground`, `danger`.

These are illustrative, and deliberately smaller than the `recommended` policy.
The real values are policy — see [Configuration](#configuration).

## Configuration semantics

The parts of this rule that are *not* policy, and that no configuration changes.

### Keys

`allowed` and `denied` are objects keyed by:

- a **colour prefix** — `text`, `bg`, `border`, `ring-offset`, … — written without a trailing
  hyphen, naming the Tailwind utility family the policy governs. `border` also governs every
  side of a border — `border-t`, `border-x`, `border-s`, and the rest — unless that side has
  a key of its own (see [Resolution](#resolution));
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

Every rule that reads variants splits them into segments the same way. Splitting:

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

**One side of a border is the `border` decision made for one edge.** For `border-t`,
`border-r`, `border-b`, `border-l`, `border-x`, `border-y`, `border-s`, `border-e`,
`border-bs` and `border-be`, "prefix" in the chain means the side's own key if either list has
one, and `border` otherwise. So a policy that allows `border-` only `border*` tokens allows the
same on every side, and a key written for one side gives that edge a list of its own. No other
prefix borrows a key this way: `ring-offset` is a different colour from `ring`, not one edge
of it.

**Presence, not non-emptiness.** `allowed: { text: [] }` is a total ban on semantic `text-`
colours; `denied: { bg: [] }` exempts `bg-` from the `"*"` fallback entirely. Both are
deliberate and both are useful.

**An allow list shields its prefix from `denied["*"]`.** This is the asymmetry that makes the
whole configuration work: the fallback deny list exists to keep `-foreground` and `-content`
tokens off surfaces and fills, and `text-` is precisely the family where those tokens belong.
Without the shield, the single most common correct usage in the codebase would be reported.

**A key may appear in `allowed` or in `denied`, never both.** A configuration carrying the
same prefix or the same variant family in both is a **configuration error**: the linter
reports it, naming the key, rather than choosing one list — it is not a precedence question.
An allow list already
denies everything not on it, so a deny list beside it is either redundant or contradictory;
both are bugs in the policy rather than expressions of intent, and the designer should hear
about it before a single class is judged. Silently discarding one of the two lists is the
worst of the three available options. Intersection semantics — the token must match the allow list *and* miss the deny
list — is more expressive and can be added later without breaking any configuration that
validates today. The check is textual and per key: `"hover:"` in `allowed` beside
`"group-hover:"` in `denied` is two distinct keys and validates, and both apply, per
[Variant families](#variant-families). `"*"` in `allowed` is a configuration error the same
way: it is the fallback for prefixes with no policy of their own, and valid in `denied` only.

Then, independently of the prefix policy, **every variant policy whose family the class joins
must also be satisfied.** A class may fail the prefix policy, a variant policy, or both.

## Configuration

This rule has no file options. The tokens it knows are the ones in your token stylesheets —
the CSS files that define your `--color-*` tokens, which you name once when you
[set up the linter](../../README.md). The linter reads your token stylesheets once, at
startup, with the same Tailwind engine your build uses, and every rule works from what it
found: which colour tokens you define, and which utilities take a colour. Neither list is
written in this rule's options, and neither is maintained by hand.

**Your token stylesheets are read, not linted.** CSS files are not linted yet, so this rule
never reports on them — but it depends on them more than any other rule, because its first
gate is "is the colour part a declared token?". Without token stylesheets the linter refuses
to start, rather than run rules that can't tell a token from a typo.

| Option | Type | `recommended` default |
| --- | --- | --- |
| `allowed` | `{ [prefix or variant]: string[] }` | below |
| `denied` | `{ [prefix or variant]: string[] }` | below |
| `ignoreGlobs` | `string[]` of globs | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` |

The rule ships this `recommended` policy and applies it when no policy is written — a project
shaped like the one this linter grew in gets value on install:

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

**Overriding replaces; it does not merge.** Writing either `allowed` or `denied` replaces the
whole `recommended` policy — both lists, not only the one written, so `allowed` alone leaves
no deny fallback at all. There is no per-prefix merge either: a prefix the recommended policy
constrained is unconstrained the moment the replacement omits it. That is the intended
behaviour: an allow list is only readable if it is complete in one place.

**Changing only this rule's severity keeps its behaviour.** Writing

```jsonc
"design/token-constraints": "error"    // just bumping the severity
```

leaves `allowed` and `denied` unwritten, and the `recommended` policy applies whenever you
write neither. That matters more here than anywhere: this is the most policy-dependent rule
of the nine, and one that read no policy as an empty one would report **nothing**, at exit 0,
while appearing enabled — which looks identical to a codebase with no violations.
`ignoreGlobs` is not part of the policy: it says which files to read rather than what to
allow in them, so it defaults on its own, and writing only `ignoreGlobs: []` leaves the
recommended policy in force.

The recommended policy is a default for the whole policy, not for each key inside it: once
you write `allowed` or `denied`, nothing from the recommended lists is mixed back in.
Mixed in, `allowed: { text: [] }` would come out carrying the recommended `border` and
`hover:` keys as well — the per-prefix merge *Overriding replaces* above rules out, since an
allow list is only readable if it is complete in one place.

**Storybook and other excluded files.** `ignoreGlobs` is a glob list, and like every rule in
the package this one skips stories by default. This rule has the weakest case of the nine for
that default — a story demonstrates a component to a designer, so a story using the wrong
semantic token teaches the wrong token — which is exactly why it is a configurable glob
rather than fixed. A project that wants its stories linted empties the list.

**The colour-prefix set is derived, not configurable.** It comes from what Tailwind reports
when the linter reads your token stylesheets, so every utility family that takes a colour is
covered as your Tailwind setup defines it. A hand-maintained list is a permanent source of
silent holes: a 16-entry list misses every per-side border family, `inset-ring`,
`inset-shadow` and `text-shadow`.

## Promises to catch

Any string that reads as a Tailwind colour utility, whose colour part is a declared semantic
token, and whose prefix or variant policy it fails.

**Every string in the file is read.** This rule is context-free: it asks "is this string a
forbidden class?" and never needs to know which element the class lands on. It reads every
string literal and the static text of every template literal in the file, regardless of
context. False-positive protection comes from the rule's own two gates — a declared colour
prefix and a colour part that is a declared `--color-*` token — not from where the string
sits, which is the argument behind `bias: false-positives`. `cva()` and `cn()` arguments and `.ts` object-literal
maps therefore fall in for free, with no special-case plumbing, because the strings are simply
there.

A class is decomposed as `variant:variant:[!]prefix-colorPart[!][/opacity]`. All four
decorations are stripped before matching: leading and trailing `!`, the `/opacity` suffix,
and every variant segment. Variant segments are split on **top-level** colons only —
a colon inside `[…]` belongs to an arbitrary value or an arbitrary variant and is not a
segment boundary. Every rule that reads variants splits them this way, and
`bg-[image:var(--x)]` survives intact.

### Prefix allow-list failures

The prefix has an allow list and the colour part matches no pattern in it.

```tsx caught
<div className="text-muted" />

<div className="text-warning" />

<div className="text-border" />

<div className="border-primary" />

<div className="border-muted-foreground" />
```

Every side of a border is held to the `border` list.

```tsx caught
<div className="border-t-primary" />

<div className="border-x-primary" />

<div className="border-s-primary" />

<div className="border-be-muted" />
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

A prefix-specific deny list replaces the fallback rather than adding to it.

```json options=deny-text-warning
{ "denied": { "*": ["*-foreground"], "text": ["warning"] } }
```

```tsx caught options=deny-text-warning
<div className="text-warning" />
```

An allow list containing only `*` permits everything; a deny list containing only `*` bans
everything.

```json options=deny-all
{ "denied": { "*": ["*"] } }
```

```tsx caught options=deny-all
<div className="bg-primary" />

<div className="text-muted" />
```

An empty allow list is a total ban for its prefix.

```json options=empty-text-allow
{ "allowed": { "text": [] } }
```

```tsx caught options=empty-text-allow
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
`group-focus` and `peer-focus` with nothing else to configure. The example also assumes your token
stylesheets define `--color-primary-focus` — tokens come from there, not from this rule's
options; see [Configuration](#configuration).

```json options=focus-policy
{
  "allowed": {
    "text": ["*foreground*", "primary", "link*"],
    "border": ["border*", "input", "ring"],
    "hover:": ["*-hover"],
    "focus:": ["*-focus"]
  },
  "denied": { "*": ["*-foreground"] }
}
```

```tsx caught options=focus-policy
<div className="focus:bg-primary" />

<div className="focus:hover:bg-primary" />

<div className="group-focus:bg-primary" />

<div className="peer-focus:bg-primary" />
```

### The full colour-prefix surface

Every Tailwind utility family that takes a colour is in scope, including the per-side, per-axis
and logical-side border families that share the `border-` stem. The prefix set is derived from
the resolved Tailwind design system, not hand-maintained — see
[Configuration](#configuration).

The logical-side family is spelled `border-s-` / `border-e-` (and `border-bs-` / `border-be-`),
which is what Tailwind generates; `border-inline-start-` is the CSS property's name and not a
utility, so it splits as the `border-` prefix against the colour part
`inline-start-muted-foreground`, which no design system declares. Naming it here would have
asserted a catch the derived prefix set cannot make — and should not, since the class does not
exist.

```tsx caught
<div className="border-t-muted-foreground" />

<div className="border-x-muted-foreground" />

<div className="border-s-muted-foreground" />

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
static template-literal segment in a `.tsx` or `.ts` file is scanned. A `className`
attribute cannot exist in a `.ts` file, but a class *string* can, which is why the token
family scans it and the JSX rules do not. CSS is not a linted surface today — see
[Deferred: CSS surface](#deferred-css-surface).

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

`cva()` is fully covered — base, `variants`, and `compoundVariants` — and every rule in the
package that reads class names sees these strings the same way.

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

Three more wrappers need no special handling — a `tv()` slot, an array joined at runtime,
and a props object spread onto an element. Each holds an ordinary string literal, which is
read like any other.

```tsx caught
<div className={tv({ base: "text-muted" })} />

const joined = ["text-muted", "p-2"].join(" ");

const spreadProps = { className: "text-muted" };
<div {...spreadProps} />;
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

An empty deny list opts a prefix out of the fallback.

```json options=bg-opt-out
{ "denied": { "*": ["*-foreground"], "bg": [] } }
```

```tsx allowed options=bg-opt-out
<div className="bg-muted-foreground" />
```

A key written for one side of a border replaces the `border` list for that side only.

```json options=border-top-own-list
{ "allowed": { "border": ["border*"], "border-t": ["primary"] } }
```

```tsx allowed options=border-top-own-list
<div className="border-t-primary" />
```

```tsx caught options=border-top-own-list
<div className="border-b-primary" />

<div className="border-primary" />
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

### Dynamically interpolated class names

A class with an interpolation in it — `` `text-${tone}` ``, `` `hover:bg-${tone}` `` — is
not checked, because the rule can't know what it becomes. Complete classes in the same
template are: `` `bg-muted-foreground ${extra}` `` is still caught. Every rule in this package
draws the line in the same place, so none of the cases below is reported by any rule.

```tsx blindspot
<div className={`text-${tone}`} />

<div className={`bg-${tone}-500`} />

<div className={`hover:bg-${tone}`} />

<div className={`px-2 text-${tone}`} />

<div className={`text-${"mu"}${"ted"}`} />
```

The last case holds even though its parts happen to be static: no rule reassembles an
interpolation.

```tsx caught
<div className={`bg-muted-foreground ${extra}`} />
```

To have a dynamic choice checked, choose between complete class names:
`{ danger: "text-danger", ok: "text-success" }[tone]`. Complete names are statically visible,
so this rule reads them like any other string and the token choice is still constrained.

```tsx allowed
const TONE_CLASSES = { danger: "bg-danger", ok: "bg-primary" };

<div className={TONE_CLASSES[tone]} />

<div className={`p-${size}`} />

<div className={`gap-${n} rounded-md`} />
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

The class does not exist as a literal anywhere, so this rule has no colour part to test, and
no other rule reports it either — see
[Dynamically interpolated class names](#dynamically-interpolated-class-names). Complete
classes in a template literal are checked; a class interrupted by an interpolation is never
reassembled.

```tsx blindspot
<div className={`${prefix}-muted-foreground`} />

<div className={`${tone}:bg-primary-hover`} />
```

String concatenation is a blind spot for the same reason: a `+` concatenation is not read as
a class string at all, just as a class with an interpolation in it is not checked.

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

### Class strings outside `.tsx` and `.ts`

These are blind spots by decision, and distinct from CSS, which is deferred rather than
abandoned — see [Deferred: CSS surface](#deferred-css-surface).

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

## Deferred: CSS surface

**Not a blind spot.** Everything in [Declared blind spots](#declared-blind-spots) is something
we decided not to catch. This is something we decided not to catch *yet*: the linter currently
handles `.js`, `.ts`, `.jsx` and `.tsx` only, and the CSS surface is planned work that has not
landed. Nothing below is enforced today, and no assertion in this document depends on it.

`@apply` is a class-string surface like any other, and a policy violation there is
indistinguishable from one in JSX. When CSS lands, this rule will cover it with exactly the
same policy — the same resolution order, pattern semantics and variant families — so a class
means the same thing in `@apply` as in JSX. How CSS linting will be set up is still open; the
one thing already settled is that it does not get its own copy of the policy.

Your token stylesheets will be exempt when that happens — they define the tokens. They are
already read rather than linted, and the linter needs them whatever happens to CSS (see
[Configuration](#configuration)).

Until then, `@apply text-muted` in a stylesheet is unreported. That is a known, accepted gap
for the current phase, not a claim that the usage is acceptable.

The block below is **illustrative only**. It carries no `caught`, `allowed` or `blindspot`
tag, so it is not run against the rule — it describes a promise we are not yet keeping, and
tagging it would assert behaviour that does not exist.

```css deferred
/* Illustrative — not executed, not enforced today. */
.card-label {
  @apply text-muted;        /* will be reported: text allow-list failure */
}

.card-surface {
  @apply bg-muted-foreground; /* will be reported: deny-list match */
}
```

## Relationship to other rules

The scope boundary is one line: **this rule only speaks about colour parts that are declared
semantic tokens** — names from the `--color-*` declarations in your token stylesheets. Everything else falls to a rule that owns it, with no exceptions — a colour
part this rule cannot resolve to a declared token is not this rule's business.

- **`no-undefined-token`** owns colour classes whose token does not exist
  (`text-mutd`). This rule is silent on them, so a typo produces one report, not two.
- **`no-spectral-color`** owns palette classes (`bg-red-500`). Their colour part is not a
  semantic token, so this rule never sees them — including under a `hover:` variant, where
  `hover:bg-red-500` is reported by that rule alone. A class with an interpolation in it,
  `` `text-${tone}` ``, is reported by neither — see
  [Dynamically interpolated class names](#dynamically-interpolated-class-names).
- **`no-raw-color`** owns arbitrary values (`bg-[#ff0000]`, `text-[color:var(--x)]`).
  Same boundary, same reason.
- **`no-opacity-modifier`** owns the `/50` suffix. This rule strips it before matching, so
  `text-muted/50` reports once from each rule: the modifier from that rule, the token choice
  from this one. Both are true.
- **`no-dark-variant`** bans the `dark:` variant outright. This rule treats `dark:` as an
  ordinary variant with no policy unless one is configured. `dark:bg-muted-foreground`
  reports twice, correctly.
- **`no-useless-hover`** asks whether *this element* should have a hover affordance at all.
  This rule asks which token a hover colour may use. They are orthogonal and may both fire on
  one class. They split variants the same way and share the family definition, so
  `group-hover:` means one thing across the plugin — but they draw opposite conclusions from
  it, and correctly: this rule constrains a group-triggered colour, while that rule treats the
  hovered *ancestor* as the thing that must be interactive.
- **Every rule skips a class with an interpolation in it**, so where the line falls cannot
  differ between rules: complete classes in a template are checked, and a class interrupted
  by an interpolation never is.
- **`no-component-color-override`** governs whether a colour class may be passed to a design
  system component at all. This rule governs which token that class may name. A
  `<Button className="text-muted">` can violate both.
- **`no-style-color`** governs the `style` prop, a channel this rule cannot see.

## Message

Four diagnostics, one per policy kind. All of them are this plugin's own — the ids below are
the ones a developer sees, under our namespace, with no foreign rule id anywhere in the
output.

There are four rather than three because there are four kinds: a prefix key and a variant key
may each sit in `allowed` or in `denied`, and [Resolution](#resolution) says so explicitly —
`"hover:"` in `allowed` beside `"group-hover:"` in `denied` validates, and both apply. A
denied variant family needs its own diagnostic, or it would be enforced silently.

**The message text is the only channel.** Oxlint shows no link to a rule's documentation in
any output format, so a message cannot point a developer to this page, and suggestions do not
show in CLI output either. Everything a developer needs to act must be in the text.

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
messageId: variantDenied
data:      { className, colorPart, variant, family, pattern }
text:      "{{className}} — {{colorPart}} matches the forbidden pattern {{pattern}}
            for a {{family}} colour (token-constraints policy)"
```

`allowed` renders the pattern list verbatim, because the patterns are the policy and a
developer who has just been told "not allowed" needs to see what is.

`variantNotAllowed` carries both `variant` — the segment actually written, `group-hover` —
and `family` — the policy key that caught it, `hover`. A developer who wrote `group-hover:`
and is told a "hover colour" is constrained needs to see why the two connect; naming only one
of them makes the diagnostic look like a bug.

Every diagnostic this rule emits has a correct token to point at, because the second gate
guarantees one exists.

**Suggestions.** For each `*-suffix` pattern in the failing list, `prefix-colorPart-suffix`
is a candidate token. A candidate is offered **only if it is in the semantic token set** —
otherwise the suggestion is a guess that will not compile, and this rule already has a rule
next door (`no-undefined-token`) that would report the result. Surviving candidates are
offered as editor suggestions in pattern order, and are also written into the message as
`{{suggestion}}`, because suggestions do not show in CLI output. No suggestion is
destructive, so accepting them with `--fix-suggestions` is safe.

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
| `border-t-primary` under a `border` allow list | missed | caught — a side is held to the `border` list |
| `border-x-`, `border-s-` (logical side) | missed | caught |
| `` className={`text-${tone}`} `` | missed | missed — no rule checks a class with an interpolation in it |
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
| `@apply text-muted` in CSS | caught | deferred — CSS is not a linted surface yet; a regression against today's linter, and a tracked one |
| Storybook files | skipped by a hardcoded check | skipped by a configurable glob |
| Prefix or variant key in both `allowed` and `denied` | deny silently ignored | config error |
| Severity-only override wipes options | n/a | the `recommended` policy is the default configuration |
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
