---
rule: no-opacity-modifier
legacy-id: 3
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
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
> it does not. `deferred` blocks assert nothing — they document coverage that is planned but
> unimplemented; see [Deferred: CSS surface](#deferred-css-surface).

## Promises to catch

A `/`-suffixed opacity modifier on a class that sets a **colour**. The colour's origin does
not matter — semantic token, palette class or arbitrary value are all equally derived at the
call site.

The rule is **context-free**: it asks "does this string contain a colour class with a
modifier?" and never needs to know which element the string reaches. It checks every string
literal and the static text of every template literal in a `.tsx`, `.ts`, `.jsx` or `.js`
file, regardless of position. `className` literals, `cn` / `clsx` / `twMerge` arguments,
`cva` / `tv` variant maps and `.ts` object-literal constants are all in, for free, because
the strings are simply there.

Two gates keep that breadth quiet, and neither depends on where the string was found. The
class must sit under a prefix Tailwind uses for colours in your project, and its body must
not be something Tailwind resolves to a **non**-colour — which is what stops
`text-sm/6` being reported. Variants are stripped **by segment**, with bracket depth
respected, so `[@media(hover:hover)]:` is one segment and `bg-[image:var(--x)]` is never
split at its inner colon.

The second gate is a double negative on purpose, because "not a colour" answers two
different questions at once. `text-sm` resolves to a `font-size`: it is a different utility
that happens to share a prefix, and it is excluded. `border-input`, in a project whose
stylesheet never defined `--color-input`, resolves to *nothing*: it is a colour class whose
token is missing, which is `no-undefined-token`'s subject and not a licence to fade it at
the call site. `bg-nonesuch/50` is wrong twice over and reports from both rules — see
[Relationship to other rules](#relationship-to-other-rules).

Stylesheets are not on this surface. `@apply bg-primary/50` is the same violation as
`className="bg-primary/50"` and will be caught when the CSS surface lands; today it is
unenforced. See [Deferred: CSS surface](#deferred-css-surface).

### On semantic tokens

```tsx caught
<div className="bg-primary/50" />

<div className="text-foreground/75" />

<div className="border-input/20" />

<div className="ring-primary/10" />

<div className="divide-border/30" />

<div className="placeholder-muted/60" />

<div className="shadow-primary/25" />

<div className="inset-ring-primary/30" />
```

The remaining families are demonstrated two and four to a string, which is two and four
reports — see [Every offending class reports separately](#every-offending-class-reports-separately).

```tsx caught count=2
<div className="from-primary/40 to-accent/0" />
```

```tsx caught count=2
<svg><path className="fill-primary/50 stroke-primary/50" /></svg>
```

```tsx caught count=4
<div className="outline-ring/50 decoration-link/40 caret-primary/80 accent-primary/70" />
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

`allowFullOpacity` turns that off, and it turns off a **value** rather than a spelling:
`/100`, `/[100%]` and `/[1]` are one no-op alpha written three ways. Every other modifier
still reports, which is the point of having the option at all rather than a blanket
exemption.

```json options=baseline
{}
```

```json options=allow-full-opacity
{ "allowFullOpacity": true }
```

```tsx allowed options=allow-full-opacity
<div className="bg-primary/100" />

<div className="bg-primary/[100%]" />

<div className="bg-primary/[1]" />
```

```tsx caught options=allow-full-opacity
<div className="bg-primary/50" />
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

```tsx caught count=2
const scrimClass = { light: "bg-white/60", dark: "bg-black/60" };
```

```tsx caught
<div className={`bg-primary/50 ${extra}`} />

const scrim = "bg-black/50";
```

The remaining routes are the same string in a different wrapper, and the rule does not
parse wrappers. A `twMerge()` argument, a `tv()` slot, an array joined at
runtime, a props object spread onto an element, and an attribute on a line of its own are
one string literal each.

```tsx caught
<div className={`bg-primary/50`} />

<div className={twMerge("p-2", "bg-primary/50")} />

<div className={tv({ base: "bg-primary/50" })} />

const joined = ["bg-primary/50", "p-2"].join(" ");

const spreadProps = { className: "bg-primary/50" };
<div {...spreadProps} />;

<div
  className="bg-primary/50"
/>
```

### A complete class next to an interpolation

A template literal's static text is checked like any string, so a complete class in it
reports even when the template also interpolates something else. See
[Classes built by interpolation](#classes-built-by-interpolation) for the class that is
itself interpolated.

```tsx caught
<div className={`bg-primary/50 ${extra}`} />
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

Prefix matching alone cannot separate these, which is why the verdict comes from asking
Tailwind what the class generates, using your token stylesheets: `text-sm` generates a
`font-size` declaration, `text-primary` generates a `color` declaration, and only the second
is this rule's business. A class that generates *neither* — a token nobody defined — is not
excluded; see [Promises to catch](#promises-to-catch). The same question supplies the prefix
set itself, which is how `inset-ring-`, `text-shadow-` and every per-side border family
arrive without anyone maintaining a list.

The rule never falls back to guessing from the prefix alone. That would report `text-sm/6`,
which is precisely the false positive this contract exists to remove; without your token
stylesheets the linter refuses to start instead.

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

A translucent token has to be defined somewhere, and your token stylesheets — the CSS files
that define your `--color-*` tokens, which you name once when you
[set up the linter](../../README.md) — are where. Token stylesheets are CSS, and CSS files
aren't linted yet, so nothing in them is reported; how they are treated once CSS is linted
is [below](#the-token-definition-files-once-css-is-linted). They are an *input*, not a
linted surface: the linter reads your token stylesheets once, at startup, with the same
Tailwind engine your build uses, and every rule works from what it found — which colour
tokens you define, and which utilities take a colour.

## Declared blind spots

Not caught, by decision.

### String concatenation

The `+` operator is not a template literal, so the class and the modifier are two unrelated
expressions rather than one string with a hole in it.

```tsx blindspot
<div className={"bg-primary/" + alpha} />
```

### Classes built by interpolation

A class with an interpolation in it — `` `bg-primary/${alpha}` ``, `` `bg-${tone}/50` `` — is
not checked, because the rule can't know what it becomes. Complete classes in the same
template are: `` `bg-primary/50 ${extra}` `` is still caught. Every rule in this package
draws the line in the same place. To have a dynamic choice checked, choose between complete
class names.

```tsx blindspot
<div className={`bg-primary/${alpha}`} />

<div className={`bg-${tone}/50`} />
```

### Use sites with no literal of their own

The rule catches the string where it is written, not where it is used.

```tsx blindspot
<div className={SCRIMS[mode]} />;

<div className={scrimClass} />;
```

### Alpha reached by another mechanism

The same result, arrived at without a modifier. Each belongs to a different rule or to none.

```tsx blindspot
<div className="bg-[color-mix(in_oklab,var(--color-primary)_50%,transparent)]" />

<div className="[--tw-bg-opacity:0.5] bg-primary" />

<div style={{ backgroundColor: "rgb(0 0 0 / 50%)" }} />
```

## Deferred: CSS surface

Not a blind spot. A blind spot is something this contract has decided not to catch; what
follows is something it has decided not to catch **yet**. The linter reads `.js`, `.jsx`,
`.ts` and `.tsx` only, so the cases below are unenforced today. They are recorded so that
what CSS linting will catch is already decided when it arrives.

The examples here are tagged `deferred`: they describe future behaviour, and nothing is
checked against them today.

### `@apply` class lists

An opacity modifier reached through `@apply` derives a colour at the call site exactly as a
`className` does, and the same two gates decide it — the colour prefix, then the colour
test. How CSS will be linted is still open; only the promise below is fixed.

```css deferred
.scrim {
  @apply bg-primary/50;
}
```

### The token-definition files, once `.css` is linted

A translucent token has to be defined somewhere, and that definition is a colour derived on
purpose in the one file allowed to do it. When `.css` becomes a linted surface your token
stylesheets stay exempt wholesale.

```css deferred
@theme {
  --color-scrim: color-mix(in oklab, var(--color-neutral-950) 50%, transparent);
}
```

Declaration-level alpha in a component stylesheet — `background: rgb(0 0 0 / 50%)` — is not
deferred coverage for this rule. It is a raw colour value, and it stays with
`no-raw-color` on whatever surface that rule ends up covering.

## Relationship to other rules

- **`no-spectral-color`** is orthogonal. This rule inspects the modifier, that one the
  colour. `bg-red-500/50` reports from both, which is correct — the palette class and the
  ad-hoc alpha are independently wrong.
- **`no-raw-color`** owns the value inside `bg-[#ff0000]/50`; this rule owns the `/50`.
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

Mechanism ships; policy is supplied. Every value below is the rule's own default, which a
project overrides in its own config — none is a fact baked into the rule.

| Option | Default | Overriding it |
| --- | --- | --- |
| `allowFullOpacity` | `false` | `true` stops reporting a full-opacity modifier however it is spelled — `/100`, `/[100%]`, `/[1]`. Every other modifier still reports. Set it only if a codebase uses `/100` deliberately, which is rare enough that the default flags it. |
| `colorPrefixes` | every prefix Tailwind uses for colours in your project | An array *adds* utility prefixes a Tailwind plugin introduces. It does not replace the derived set — hand-maintaining that set is the bug this option exists to avoid, not the feature it offers. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips, matched against the path Oxlint reports. Storybook is excluded by default, as it is by every rule; a project that treats stories as production code sets this to `[]`. |

### Distribution

- **The rule reads no files of its own.** Whether a class sets a colour is answered from
  what the linter found in your token stylesheets at startup, so those stylesheets are what
  make the colour test available at all. Without token stylesheets the linter refuses to
  start, rather than run rules that can't tell a token from a typo. There is no fallback
  that guesses without them: silence would be indistinguishable from a clean codebase.
- **A severity-only override is safe.** Changing only this rule's severity —
  `"…/no-opacity-modifier": "error"` — keeps its behaviour: options you don't write fall
  back to the defaults in the table, and the tokens read at startup are unaffected. Restate
  an option alongside the severity only to keep a value you changed.

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
| `` className={`bg-primary/${a}`} `` | missed — template literals are never extracted | blind spot — a class with an interpolation in it is not checked |
| `const scrim = "bg-black/50"` | caught at the literal | caught at the literal; the *use site* is the blind spot |
| `bg-red-500/50` | 2 reports (this rule + `no-spectral-color`) | 2 reports |
| `@apply bg-primary/50` in a `.css` file | caught — `linter.js` reads `.css` and extracts `@apply` lists | **deferred** — `.css` is not a linted surface for now; the promise is recorded, not the coverage |

`text-sm/6` was the only known false positive in the current rule, and it is fixed by
deriving the colour test from the Tailwind design system rather than from a hand-written
prefix list. It has no test in either direction today; it needs one in both.
