---
rule: no-opacity-modifier
legacy-id: 3
status: agreed
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

The rule is **context-free**: it asks "does this string contain a colour class with a
modifier?" and never needs to know which element the string reaches. It runs over the broad
sweep — every string literal and every static template literal in a `.tsx`, `.ts` or `.css`
file, regardless of position. `className` literals, `cn` / `clsx` / `twMerge` arguments,
`cva` / `tv` variant maps and `.ts` object-literal constants are all in, for free, because
the strings are simply there.

Two gates keep that breadth quiet, and both come from `/policy` rather than from where the
string was found. The class must sit under a **derived** colour prefix, and its body must
actually name a colour — which is what stops `text-sm/6` being reported. Variants are
stripped **by segment**, with bracket depth respected, so `[@media(hover:hover)]:` is one
segment and `bg-[image:var(--x)]` is never split at its inner colon.

`.css` is covered by the package's `/stylelint` entry point, which reads the same `/policy`
module, so `@apply bg-primary/50` and `className="bg-primary/50"` are governed by one policy
rather than two that drift.

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

`/100` is included. It is a no-op alpha and almost always left over from an edit, "delete
the `/100`" is the cheapest fix available, and exempting it would mean the rule's boundary
depends on arithmetic rather than on syntax. It is separately configurable all the same —
see [Configuration](#configuration).

```tsx caught
<div className="bg-primary/100" />
```

### With variants and important

Variants are stripped by segment before the modifier is located, so position in the chain
and the contents of an arbitrary variant are both irrelevant.

```tsx caught
<div className="hover:bg-primary/50" />

<div className="md:dark:focus-visible:ring-primary/40" />

<div className="group-hover/nav:bg-primary/40" />

<div className="[@media(hover:hover)]:bg-primary/50" />

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

```tsx caught
<div className={`bg-primary/50 ${extra}`} />

const scrim = "bg-black/50";
```

```css caught
.scrim {
  @apply bg-primary/50;
}
```

### The modifier interpolated

The `/` is statically present and it sits on a class the rule has already established is a
colour, so the defect is visible even though the alpha is not. Whatever the interpolation
resolves to, a call site is choosing an opacity the design system has never seen — which is
the entire thing this rule exists to stop.

```tsx caught
<div className={`bg-primary/${alpha}`} />
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
colour in it at all.

Prefix matching alone cannot separate these, which is why the verdict comes from resolving
the class through the Tailwind design system in `/policy`: `text-sm` generates a `font-size`
declaration, `text-primary` generates a `color` declaration, and only the second is this
rule's business. The same derivation supplies the prefix set itself, which is how
`inset-ring-`, `text-shadow-` and every per-side border family arrive without anyone
maintaining a list.

Where the resolver is unavailable, `/policy` falls back to prefix matching plus a deny list
of known non-colour `text-` bodies (`xs`…`9xl`, bracketed lengths). The fallback is
strictly worse and is documented as such; an off-the-shelf restricted-classes regex can
express only the fallback, which is why a pattern including `text` is the first thing Phase 4
must probe.

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

### Non-colour classes that survive segment-aware parsing

```tsx allowed
<div className="bg-[image:var(--hero)]" />

<div className="[@media(hover:hover)]:bg-primary" />
```

### The token-definition files

A translucent token has to be defined somewhere, and the `tokenFiles` option is where.

```css allowed
@theme {
  --color-scrim: color-mix(in oklab, var(--color-neutral-950) 50%, transparent);
}
```

## Declared blind spots

Not caught, by decision.

### String concatenation

The `+` operator is not a template literal, so the class and the modifier are two unrelated
expressions rather than one string with a hole in it.

```tsx blindspot
<div className={"bg-primary/" + alpha} />
```

### A colour prefix interpolated before the modifier is reached

`` `bg-${tone}/50` `` is a dynamically assembled class name, which reports once from
`token-constraints` under `dynamicColorClass`. This rule stays silent rather than adding a
second report of the same unknowable string — its own subject, the modifier, is only half
the defect there.

```tsx blindspot
<div className={`bg-${tone}/50`} />
```

### Use sites with no literal of their own

The broad sweep catches the string where it is written, not where it is used.

```tsx blindspot
<div className={SCRIMS[mode]} />;
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
- **Dynamically assembled class names belong to `no-spectral-color`.** The split is by which
  subject is statically visible: `` `bg-primary/${alpha}` `` has a real colour class and a
  real `/`, so it reports here; `` `bg-${tone}/50` `` has neither resolved, so it reports
  there, once.

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

## Configuration

Mechanism ships; policy is supplied. Every value below is a `recommended` preset default the
consuming project overrides in its own config — none is a fact baked into the rule.

| Option | `recommended` | Overriding it |
| --- | --- | --- |
| `allowFullOpacity` | `false` | `true` stops reporting `/100` and `/[100%]`. Every other modifier still reports. Set it only if a codebase uses `/100` deliberately, which is rare enough that the default flags it. |
| `colorPrefixes` | derived from the Tailwind design system | An array *adds* utility prefixes a Tailwind plugin introduces. It does not replace the derived set — hand-maintaining that set is the bug this option exists to avoid, not the feature it offers. |
| `tokenFiles` | `["src/styles.css"]` | The files exempted wholesale, because a translucent token has to be defined somewhere. Also feeds Stylelint's `ignoreFiles`. |
| `ignoreGlobs` | `["**/*.stories.@(ts\|tsx)"]` | Files the rule skips. Storybook is excluded by default; a project that treats stories as production code sets this to `[]`. |

### Distribution

- **The rule reads no files and derives no path from its own location.** `tokenFiles`,
  `colorPrefixes` and `ignoreGlobs` arrive through `options`; the design system is built once
  at plugin-module load from a path the consumer supplied, never inside `create()`.
- **`settings.tailwindcss.entryPoint` is mandatory** for `oxlint-tailwindcss`, and
  `settings` is not inherited through `extends`. The consumer supplies it in its own config;
  the preset cannot. It is also what makes the exact colour test above available rather than
  the deny-list fallback.
- **Rule options replace, they do not merge.** A consumer writing
  `"…/no-opacity-modifier": "error"` to bump a severity wipes the preset's options,
  including `tokenFiles` — so token-definition files start reporting. To change severity
  alone, restate the options.

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
| **`text-sm/6`** | **caught — false positive**; `text-sm` starts with `text-` | allowed — the colour test resolves the class, it does not match the prefix |
| `bg-primary/[0.5]`, `/[50%]`, `/[var(--a)]` | missed — suffix is not all digits | caught |
| `inset-ring-primary/30` | missed — prefix absent from `TAILWIND_COLOR_PREFIXES` | caught — the prefix set is derived |
| `bg-primary/auto` | allowed | allowed |
| `bg-primary/100` | caught | caught, under `allowFullOpacity: false` |
| `[@media(hover:hover)]:bg-primary/50` | caught by accident — variants are not segmented | caught by construction |
| `` className={`bg-primary/${a}`} `` | missed — template literals are never extracted | caught |
| `const scrim = "bg-black/50"` | caught at the literal | caught at the literal; the *use site* is the blind spot |
| `bg-red-500/50` | 2 reports (this rule + `no-spectral-color`) | 2 reports |

`text-sm/6` was the only known false positive in the current rule, and it is fixed by
deriving the colour test from the Tailwind design system rather than from a hand-written
prefix list. It has no test in either direction today; it needs one in both.
