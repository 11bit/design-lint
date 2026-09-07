---
rule: no-opacity-modifier
legacy-id: 3
status: draft
disposition: off-the-shelf
bias: false-positives
files: ["*.tsx", "*.ts", "*.css"]
---

# no-opacity-modifier

**Colour classes must not carry an opacity modifier.**

`bg-primary/50` is a colour the design system has never seen. It is derived at the call
site, so no designer chose it, no contrast check covers it, and nothing keeps two components
that both wanted "primary, but softer" from landing on `/50` and `/60`. Because the
modifier composes with the token rather than replacing it, the result also drifts silently
whenever `--color-primary` changes — the alpha is fixed while the colour underneath moves.

Where a translucent colour is genuinely needed, it is a token: `--color-primary-muted`,
`--color-overlay`. Defining it once puts the value back under the design system's control
and gives it a name that says what it is for.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## Promises to catch

A `/`-suffixed opacity modifier on a class that sets a **colour**. The colour's origin does
not matter — semantic token, palette class or arbitrary value are all equally derived at the
call site.

### On semantic tokens

```tsx caught
<div className="bg-primary/50" />

<div className="text-foreground/75" />

<div className="border-input/20" />

<div className="ring-primary/10" />

<div className="from-primary/40 to-accent/0" />

<div className="divide-border/30" />

<div className="placeholder-muted/60" />

<div className="shadow-primary/25" />

<svg><path className="fill-primary/50 stroke-primary/50" /></svg>

<div className="outline-ring/50 decoration-link/40 caret-primary/80 accent-primary/70" />

<div className="inset-ring-primary/30" />
```

### On spectral and arbitrary colours

Both also violate another rule. Both still violate this one — the modifier is a separate
defect from the colour it modifies.

```tsx caught
<div className="bg-red-500/50" />

<div className="bg-[#ff0000]/50" />

<div className="bg-[--color-brand]/50" />
```

### Every modifier syntax

Tailwind accepts a bare number, a bracketed decimal, a bracketed percentage and a bracketed
variable. All four are the same thing.

```tsx caught
<div className="bg-primary/5" />

<div className="bg-primary/[0.5]" />

<div className="bg-primary/[50%]" />

<div className="bg-primary/[var(--overlay-alpha)]" />
```

### With variants and important

```tsx caught
<div className="hover:bg-primary/50" />

<div className="md:dark:focus-visible:ring-primary/40" />

<div className="!bg-primary/50" />

<div className="bg-primary/50!" />
```

### Wherever class strings are authored

```tsx caught
<div className={cn("bg-primary/50", className)} />
```

```tsx caught count=2
const overlay = cva("fixed", {
  variants: { tone: { dim: "bg-black/50", dimmer: "bg-black/70" } },
});
```

```tsx caught
const scrimClass = { light: "bg-white/60", dark: "bg-black/60" };
```

```css caught
.scrim {
  @apply bg-primary/50;
}
```

### Every offending class reports separately

```tsx caught count=4
<div className="bg-primary/50 text-foreground/75 border-input/20 ring-primary/10" />
```

## Deliberately allows

### The same colour without a modifier

```tsx allowed
<div className="bg-primary text-foreground border-input" />

<div className="bg-primary-muted" />
```

### Fractions on non-colour utilities

The `/` in a Tailwind class is not always an opacity modifier. Sizing, positioning and
aspect-ratio utilities use it for a fraction, and none of them touches colour.

```tsx allowed
<div className="w-1/2 h-1/3 basis-2/3 top-1/4" />

<div className="translate-x-1/2 -translate-y-1/2" />

<div className="aspect-16/9" />
```

### `text-<size>/<leading>`

The one genuinely dangerous near-miss. `text-` is a colour prefix *and* a font-size prefix,
and `text-sm/6` is the font-size / line-height shorthand — an extremely common class with no
colour in it at all. Deciding this correctly requires knowing whether the class body names a
colour, not just whether the prefix can carry one.

```tsx allowed
<div className="text-sm/6 text-lg/7 text-base/loose" />

<div className="text-[14px]/[1.4]" />
```

### Non-numeric slash suffixes

Not valid opacity syntax, so not this rule's business. If the class is meaningless it will
be reported by `no-undefined-token`.

```tsx allowed
<div className="bg-primary/auto" />
```

### Opacity applied to the element rather than the colour

`opacity-50` fades everything, including text and children. It is a different effect with
different consequences, and banning it belongs to a rule about layering, not tokens.

```tsx allowed
<div className="opacity-50" />

<div className="bg-primary opacity-50" />
```

### The token-definition files

A translucent token has to be defined somewhere, and `colorTokenFiles` is where.

```css allowed
@theme {
  --color-scrim: color-mix(in oklab, var(--color-neutral-950) 50%, transparent);
}
```

## Declared blind spots

Not caught, by decision.

### Dynamic composition

```tsx blindspot
<div className={`bg-primary/${alpha}`} />

<div className={"bg-primary/" + alpha} />
```

### Indirection through a variable

```tsx blindspot
const scrim = "bg-black/50";
<div className={scrim} />;
```

### Alpha reached by another mechanism

The same result, arrived at without a modifier. Each belongs to a different rule or to none.

```tsx blindspot
<div className="bg-[color-mix(in_oklab,var(--color-primary)_50%,transparent)]" />

<div className="[--tw-bg-opacity:0.5] bg-primary" />

<div style={{ backgroundColor: "rgb(0 0 0 / 50%)" }} />
```

## Relationship to other rules

- **`no-spectral-color`** is orthogonal. This rule inspects the modifier, that one the
  colour. `bg-red-500/50` reports from both, which is correct — the palette class and the
  ad-hoc alpha are independently wrong.
- **`no-raw-css-color`** owns the value inside `bg-[#ff0000]/50`; this rule owns the `/50`.
  Two reports, two different fixes.
- **`no-undefined-token`** evaluates the class with the modifier stripped, so
  `bg-nonesuch/50` reports from both: the token does not exist *and* it should not have been
  faded. Neither rule suppresses the other.
- **`token-constraints`** constrains which token may pair with which prefix. It is
  indifferent to the modifier, so a class can violate both.

## Message

```
messageId: opacityModifierOnColor
data:      { className, base, modifier }
text:      "{{className}} — opacity modifier on a color class; define a token for
            {{base}} at {{modifier}} instead of deriving it here"
```

No autofix and no suggestion: the replacement is a token that does not exist yet, and the
rule cannot invent its name or its value. The message's job is to make the fix — add a token
— the obvious next step rather than to perform it.

## Open questions

Each blocks `status: agreed`.

1. **How is "is this class a colour?" decided?**
   Prefix matching alone is wrong: it flags `text-sm/6`. Two options. (a) Resolve the class
   through the Tailwind design system and check whether the generated declaration is a
   colour property — exact, and the machinery already exists for `no-undefined-token`. (b)
   Prefix matching plus a deny list of known non-colour `text-` bodies (`xs`…`9xl`,
   `[…px]`). *Recommendation: (a) where the resolver is available, (b) as the fallback.* An
   off-the-shelf restricted-classes regex can only express (b), so this is the first thing
   Phase 4 must probe: a pattern of the shape `/(bg|border|ring|…)-[^\s\/]+\/\d/` is safe,
   but the same pattern including `text` is not.

2. **Is a modifier of `/100` a violation?**
   It is a no-op alpha and almost always left over from an edit. *Recommendation: flag it.*
   It costs nothing under `bias: false-positives`, and "delete the `/100`" is the cheapest
   fix in the codebase.

3. **Does the rule apply to `.css` files at all after the migration?** **[cross-rule]**
   The `@apply` case above is promised, and nothing in the planned three-component
   architecture covers it. See open question 3 in `no-spectral-color` — one decision, four
   contracts.

4. **Do the rules cover colour classes in `.ts` object-literal maps?** **[cross-rule]**
   The `scrimClass` case above is promised and `oxlint-tailwindcss` does not see it. See
   open question 4 in `no-spectral-color`.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

The current rule takes the class with variants and `!` stripped, requires the text after the
last `/` to be all digits, and requires the part before the `/` to start with one of
`TAILWIND_COLOR_PREFIXES` followed by `-`.

| Case | Today | Under this contract |
| --- | --- | --- |
| `bg-primary/50`, `hover:bg-primary/50` | caught | caught |
| `w-1/2` | allowed — `w-1` matches no colour prefix | allowed |
| **`text-sm/6`** | **caught — false positive**; `text-sm` starts with `text-` | allowed |
| `bg-primary/[0.5]`, `/[50%]`, `/[var(--a)]` | missed — suffix is not all digits | caught |
| `inset-ring-primary/30` | missed — prefix absent from `TAILWIND_COLOR_PREFIXES` | caught |
| `bg-primary/auto` | allowed | allowed |
| `` className={`bg-primary/${a}`} `` | missed — template literals are never extracted | blind spot, explicitly |
| `bg-red-500/50` | 2 reports (this rule + `no-spectral-color`) | 2 reports |

`text-sm/6` is the only known false positive in the current rule and the reason open
question 1 exists. It has no test in either direction.
