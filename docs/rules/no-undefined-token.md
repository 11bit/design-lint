---
rule: no-undefined-token
legacy-id: 12
status: draft
disposition: off-the-shelf
bias: false-negatives
files: ["*.tsx", "*.ts", "*.css"]
---

# no-undefined-token

**A colour class must resolve to CSS.**

`text-warning-foreground` looks exactly like a design token. It is spelled like one, it
reads like one in review, and if `--color-warning-foreground` has never been defined it
produces no declaration at all — the element simply inherits, and nobody notices until the
one state that needed the emphasis ships without it. Tailwind does not warn: an
unrecognised candidate generates nothing and is discarded silently.

This is the only rule in the set that reports the *absence* of styling rather than the wrong
kind of it, and it is the one that keeps the others honest. `token-constraints` can only
constrain tokens that exist; `no-spectral-color` can only redirect you to a token that
exists. Without this rule, a typo is indistinguishable from compliance.

The rule is unusual in one further respect: its verdict comes from resolving the class
against the project's actual Tailwind design system, so it is only as correct as that
resolution. That is why its bias runs the other way from every other contract here — see
[Open questions](#open-questions).

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## Promises to catch

A class under a colour-carrying prefix that the Tailwind design system built from
`colorTokenFiles` generates no CSS for. Variants, the important modifier and the opacity
modifier are stripped before resolution: they change when a declaration applies, not whether
one exists.

### Token names that were never defined

```tsx caught
<div className="text-warning-foreground" />

<div className="bg-danger-muted" />

<div className="text-secondary" />

<div className="border-outline" />
```

### A defined stem with an undefined suffix

The most dangerous shape, because the stem being real makes the whole class look real.

```tsx caught
<div className="text-warning-typo" />

<div className="bg-primary-subtle" />
```

### Misspellings

```tsx caught
<div className="bg-primry" />

<div className="text-forground" />
```

### Under variants, important and opacity modifiers

The class is resolved with all three removed, so none of them hides an undefined token.

```tsx caught
<div className="hover:text-secondary" />

<div className="md:dark:bg-danger-muted" />

<div className="!bg-danger-muted" />

<div className="bg-danger-muted!" />

<div className="bg-danger-muted/50" />
```

### Wherever class strings are authored

```tsx caught
<div className={cn("text-secondary", className)} />
```

```tsx caught count=2
const alert = cva("p-2", {
  variants: { tone: { warn: "bg-warning-subtle", bad: "bg-danger-muted" } },
});
```

```tsx caught
const badgeColor = { danger: "bg-danger-muted", ok: "bg-success-muted" };
```

```css caught
.alert {
  @apply bg-danger-muted;
}
```

### Every offending class reports separately

```tsx caught count=2
<div className="text-secondary bg-danger-muted" />
```

## Deliberately allows

### Tokens that resolve

```tsx allowed
<div className="text-warning bg-primary border-input" />

<div className="text-success-content" />
```

### Palette classes

They resolve, so this rule is silent on them. Wanting them gone is `no-spectral-color`'s
job, and the two must not both report the same class — "this does not exist" and "this
exists and is forbidden" cannot both be true.

```tsx allowed
<div className="bg-red-500 text-slate-50" />
```

### Non-colour utilities that resolve

The gate is "generates CSS", not "is a colour". `bg-cover` and `text-sm` are perfectly real.

```tsx allowed
<div className="bg-cover bg-no-repeat" />

<div className="text-sm text-center" />

<div className="border-2 ring-2 shadow-lg" />
```

### Classes with no colour-carrying prefix

Out of scope. A rule that reported every unresolved class in the project is a different,
much larger rule.

```tsx allowed
<div className="rounded-warning" />

<div className="gap-4 flex" />
```

### Arbitrary values

`bg-[--color-brand]` resolves to `var(--color-brand)` whether or not that property is
defined — no static check can tell. Raw literals inside brackets belong to
`no-raw-css-color`.

```tsx allowed
<div className="bg-[#ff0000]" />

<div className="bg-[--color-brand]" />

<div className="text-[var(--color-brand)]" />
```

### Non-class strings

With AST-based extraction the rule only sees strings that can reach a `className`.

```tsx allowed
<img src="/bg-hero.png" />

<Chart palette="text-secondary" />
```

## Declared blind spots

Not caught, by decision.

### Dynamic composition

The class does not exist in the source, so there is nothing to resolve.

```tsx blindspot
<div className={`text-${tone}`} />

<div className={"bg-" + tone + "-muted"} />
```

### Indirection through a variable

```tsx blindspot
const tone = "text-secondary";
<div className={tone} />;
```

### Undefined variants

`hovr:bg-primary` generates nothing either, but variants are stripped before resolution and
this is a rule about colour *tokens*. Unknown variants are a separate concern with a
separate diagnostic.

```tsx blindspot
<div className="hovr:bg-primary" />

<div className="darkk:bg-primary" />
```

### Tokens defined outside the resolver's reach

A `--color-*` added by a Tailwind plugin, or in a stylesheet not reachable from
`colorTokenFiles[0]`'s import graph, resolves as undefined and would be a false positive.
The rule's contract is "no CSS from *this* entry point"; keeping the entry point complete is
a configuration responsibility, not something the rule can detect.

### Failure to build the design system

If the design system cannot be loaded, the rule must **error out**, not fall silent. A rule
that reports nothing looks identical to a codebase with no violations, and this is the one
rule in the set whose entire output depends on an external resolution step succeeding. This
is a promise about the failure mode rather than a case, and it is stated here because the
current implementation does the opposite.

## Relationship to other rules

This rule shares a surface with three others, and the boundaries are what keep any given
class from being reported twice for contradictory reasons.

- **`no-spectral-color`** — the two **partition** the set of classes under a colour prefix.
  Every such class is undefined (this rule), or defined and spectral (that rule), or defined
  and semantic (neither). `bg-red-500` resolves, so this rule is quiet; `bg-danger-muted`
  does not resolve, so that rule finds no palette family and is quiet. The partition is a
  design property, not a coincidence, and a change to either rule that breaks it produces a
  class reported as both nonexistent and forbidden.
- **`token-constraints`** — strictly downstream. That rule returns immediately unless the
  class body is a *known* semantic token, so an undefined token never reaches a constraint
  check. This rule is the gate: without it, `text-warning-typo` passes `token-constraints`
  cleanly by virtue of not being a token at all.
- **`no-raw-css-color`** — owns everything inside `[…]`, which this rule skips. The two
  never see the same class body.
- **`no-opacity-modifier`** and **`no-dark-variant`** — orthogonal. They inspect the
  modifier, this rule the class it modifies. `dark:bg-danger-muted/50` reports from all
  three, and each report names a different, independently fixable defect.

Ordering matters for the reader, not for the engine: all rules run, and the diagnostics are
independent. But a `bg-danger-muted` that gets one report from here and one from
`token-constraints` would be a bug in the partition, not thoroughness.

## Message

```
messageId: undefinedColorToken
data:      { className, token, tokenFile }
text:      "{{className}} generates no CSS — {{token}} is not defined; check the spelling,
            or add --color-{{token}} to {{tokenFile}}"
```

No autofix. A suggestion per near-miss token is offered where the design system provides
typo candidates, ordered by edit distance; none of them is destructive, so any may sit at
index 0. Because suggestions do not render in CLI output, the closest candidate must also
appear in the message text — see [Open questions](#open-questions).

## Open questions

Each blocks `status: agreed`.

1. **Why is this the one rule biased toward false negatives?**
   Because its claim is unusually strong. Every other rule here says "this class is
   forbidden", which the reader can verify by looking at it. This one says "this class does
   nothing", which the reader cannot verify without running Tailwind. A false positive is
   therefore not noise — it is the rule confidently asserting something false about working
   code, and one of those does more damage to the rule's credibility than ten missed typos.
   *Recommendation: keep `bias: false-negatives`*, and prefer silence wherever resolution is
   uncertain — arbitrary values, unresolved variants, classes from plugins.

2. **Does the message assume the class is a token when it may be a typo'd utility?**
   `text-smm` generates no CSS, matches a colour prefix, and gets "add `--color-smm`", which
   is wrong advice for a font-size typo. Options: one message that leads with spelling
   (above), or two message ids split by a heuristic on whether the body looks token-shaped.
   *Recommendation: one message, leading with "check the spelling".* A heuristic that
   guesses whether `smm` was meant to be a token will be wrong often enough to be worse than
   a slightly over-general second clause, and the first half of the message is correct in
   both cases.

3. **Should the typo candidate be in the message text?**
   `oxlint-tailwindcss`'s `no-unknown-classes` provides suggestions natively, and Phase 0
   established that suggestions are invisible in every CLI format. If the package emits its
   candidate only as a suggestion, the CLI experience is *worse* than today's, which prints
   the token name and the `--color-*` hint inline. *Recommendation: this is a Phase 4
   acceptance criterion, not a preference.* If the message text cannot be made to carry the
   candidate, record `adopted-with-narrowed-contract` and say so explicitly.

4. **Does the rule apply to `.css` files at all after the migration?** **[cross-rule]**
   The `@apply bg-danger-muted` case above is promised and nothing in the planned
   architecture covers it. See open question 3 in `no-spectral-color`.

5. **Do the rules cover colour classes in `.ts` object-literal maps?** **[cross-rule]**
   The `badgeColor` case above is promised and `oxlint-tailwindcss` does not see it. See
   open question 4 in `no-spectral-color`. This rule has the strongest claim on the `.ts`
   surface of the four: a constants file is where a token name is written once, far from the
   element it styles, and where a typo survives longest.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

The current rule finds a prefix from `TAILWIND_COLOR_PREFIXES`, skips class bodies starting
with `[`, and asks `ds.candidatesToCss([tok])` whether the class produces output. The design
system is built once at startup from `colorTokenFiles[0]`.

| Case | Today | Under this contract |
| --- | --- | --- |
| `text-warning-foreground`, `bg-danger-muted` | caught | caught |
| `hover:` / `md:dark:` / `!` / `/50` forms | caught (all stripped before resolution) | caught |
| `bg-red-500`, `bg-cover`, `text-sm` | allowed | allowed |
| `rounded-warning` (no colour prefix) | allowed | allowed |
| `bg-[#ff0000]`, `bg-[--color-brand]` | allowed | allowed |
| `inset-ring-nonesuch` | missed — prefix absent from `TAILWIND_COLOR_PREFIXES` | caught |
| `` className={`text-${tone}`} `` | missed — template literals are never extracted | blind spot, explicitly |
| `bg-[image:var(--x)]` | resolved as `var(--x)]` — `normalizeTwToken` splits on the last `:` | allowed, explicitly |
| **Design system fails to load** | **rule silently no-ops; every undefined token passes** | hard error |

The silent no-op is the most consequential gap in the current implementation. `index.js`
builds the resolver with `.catch(() => null)` and the rule returns `null` when
`isValidTailwindCandidate` is absent. A missing dependency, an unresolvable `@import`, or a
Tailwind upgrade therefore turns the rule off with no output and no exit code — and because
it is the gate for `token-constraints`, it turns off part of that rule's coverage too.
