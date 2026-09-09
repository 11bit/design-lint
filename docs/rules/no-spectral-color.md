---
rule: no-spectral-color
legacy-id: 4
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-spectral-color

**Tailwind's built-in palette must not be used to colour anything.**

`bg-red-500` names a colour, not a role. It resolves to a fixed value that cannot move when
the theme moves, carries no meaning a designer can redefine, and gives the next reader no
way to tell whether the red is "danger", "brand" or "someone had a hex code handy". The
design system's entire premise is that colour is addressed semantically — `bg-danger`,
`text-info-content` — and that the token file is the single place those resolve. Every
spectral class is a private fork of the palette embedded in a component.

The replacement is always a semantic token. Where the mapping is known, the rule's
`replacement` option records it — supplied by the consuming project, defaulted by the
`recommended` preset — and the diagnostic must name the token rather than leave the
developer to guess.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not. `deferred` blocks assert nothing — they document coverage that is planned but
> unimplemented; see [Deferred: CSS surface](#deferred-css-surface).

## Promises to catch

Any class whose colour value comes from a Tailwind palette family, in any string the project
authors.

The rule is **context-free**: it asks "is this string a forbidden class?" and never needs to
know which element the string reaches. It therefore runs over the broad sweep — every string
literal and every static template literal in a `.tsx`, `.ts`, `.jsx` or `.js` file, regardless
of the position it occupies. `className` literals, `cn` / `clsx` / `twMerge` arguments,
`cva` / `tv` variant maps and `.ts` object-literal constants all fall in for free, because
the strings are simply there and no special-case plumbing distinguishes them. Interpolated
template literals are scanned for complete classes in their static text, and for a colour
prefix left dangling against an interpolation (see
[Dynamically assembled class names](#dynamically-assembled-class-names)).

Precision is not what keeps this quiet. The gate is a name in the theme's `--color`
namespace, under a colour-carrying prefix, that the project's own token file did not define
— and a random string cannot accidentally satisfy all three. Stating it as a *subtraction*
rather than as a family-plus-scale pattern is what makes the allow list below fall out
instead of being enumerated: `text-sm` and `border-2` are not colours at all, `transparent`
and `current` are keywords Tailwind handles rather than theme colours, and `bg-brand` is a
name this project defined. The accepted cost is the string that *is* a palette class but never reaches a
`className` — a chart series colour, a prop on a non-DOM component. It reports anyway. Under
`bias: false-positives` that is the deliberate trade, and `oxlint-disable` is the escape
hatch.

Stylesheets are not on this surface. `@apply bg-red-500` in a `.css` file is a violation of
the same policy and will be caught when the CSS surface lands; today it is unenforced. See
[Deferred: CSS surface](#deferred-css-surface).

### Every colour-carrying prefix

The palette is reachable through every utility that takes a colour. All of them are in
scope; none is a lesser violation than `bg-`.

```tsx caught
<div className="bg-red-500" />

<div className="text-blue-200" />

<div className="border-slate-300" />

<div className="ring-blue-400" />

<div className="ring-offset-blue-200" />

<div className="inset-ring-emerald-500" />

<div className="divide-green-100" />

<div className="placeholder-gray-400" />

<div className="caret-rose-500" />

<input className="accent-violet-600" />

<div className="outline-amber-400" />

<span className="decoration-red-400" />

<div className="shadow-red-500" />

<div className="inset-shadow-zinc-700" />

<div className="text-shadow-sky-300" />
```

The paint and gradient families come in sets, and each class in a set is its own violation
with its own fix — the report is per class, not per attribute.

```tsx caught count=2
<svg><path className="fill-green-600 stroke-green-800" /></svg>
```

```tsx caught count=3
<div className="from-blue-500 via-purple-500 to-pink-500" />
```

### Every palette family

All twenty-two built-in families, at every scale step (`50`, `100`–`900`, `950`). The
neutrals are not an exception — `bg-gray-100` is the most common way this rule is violated
and the least likely to be noticed in review.

```tsx caught count=4
<div className="bg-red-50 bg-orange-100 bg-amber-200 bg-yellow-300" />

<div className="bg-lime-400 bg-green-500 bg-emerald-600 bg-teal-700" />

<div className="bg-cyan-800 bg-sky-900 bg-blue-950 bg-indigo-500" />
```

```tsx caught count=5
<div className="text-violet-500 text-purple-500 text-fuchsia-500 text-pink-500 text-rose-500" />

<div className="border-slate-200 border-gray-200 border-zinc-200 border-neutral-200 border-stone-200" />
```

### Compound and nested prefixes

The palette name is not always the second segment. Detection must scan for a family name
followed by a scale anywhere in the class, not parse a fixed prefix.

```tsx caught
<div className="border-t-red-500" />

<div className="ring-offset-blue-200" />

<div className="divide-x-red-500" />

<div className="inset-ring-red-500" />
```

```tsx caught count=2
<div className="border-x-slate-200 border-s-slate-200" />
```

`divide-x-red-500` is the odd one, and deliberately so: Tailwind's `divide-x-*` takes a
*width*, so the class generates no CSS at all and the colour never lands. It is reported
here anyway, because what the author wrote is unmistakably an attempt at a palette colour
and `bias: false-positives` decides the tie. The prefix in the message is `divide-x`, the
text they have to edit, even though the utility Tailwind knows about is `divide`.

### Variants, important, and opacity

The forbidden thing is the colour, so nothing attached to it makes it acceptable.

```tsx caught
<div className="hover:bg-red-500" />

<div className="md:dark:hover:text-blue-200" />

<div className="group-hover:border-slate-300" />

<div className="[&>*]:text-red-500" />

<div className="!bg-red-500" />

<div className="bg-red-500!" />

<div className="bg-red-500/50" />

<div className="bg-black/50" />
```

### Fixed, non-theming colour names

`black` and `white` are palette values with the scale omitted. They are the same violation:
`text-white` on a themed surface is exactly the case `*-content` / `*-foreground` tokens
exist to solve, and it is the one that breaks first when a light theme is added.

They are also common, sometimes legitimately correct over a photograph or a fixed-colour
brand surface, and the replacement map has no entry for either — so this is the noisiest
line in the contract, and the only part of it with its own switch. `flagFixedColors`
defaults to `true`, consistent with `bias: false-positives`. If a first real run returns a
large count that is mostly image overlays, the answer is to turn that one option off — not
to weaken the rule — and to name the overlay colour as a token. See
[Configuration](#configuration).

```tsx caught count=2
<div className="bg-white text-black" />
```

```tsx caught
<div className="border-white/20" />
```

### Wherever class strings are authored

Position is irrelevant. These are all just strings to the broad sweep.

```tsx caught
<div className={cn("bg-red-500", className)} />

<div className={clsx(isOn && "text-blue-600")} />
```

```tsx caught
<div className={`bg-red-500 ${extra}`} />

<div className={`rounded ${base} text-blue-200`} />

const tone = "bg-red-500";
```

```tsx caught
const chartSeries = ["text-blue-500"];
```

```tsx caught count=2
const button = cva("rounded", {
  variants: {
    tone: { bad: "bg-red-500", worse: "text-rose-600" },
  },
});
```

```tsx caught count=2
const badgeColor = { danger: "bg-red-500", ok: "bg-green-500" };
```

The remaining routes on the corpus list are the same string in a different wrapper, and the
sweep does not parse wrappers. A `twMerge()` argument, a `tv()` slot, an array joined at
runtime, a props object spread onto an element, and an attribute on a line of its own are
one string literal each.

```tsx caught
<div className={`bg-red-500`} />

<div className={twMerge("p-2", "bg-red-500")} />

<div className={tv({ base: "bg-red-500" })} />

const joined = ["bg-red-500", "p-2"].join(" ");

const spreadProps = { className: "bg-red-500" };
<div {...spreadProps} />;

<div
  className="bg-red-500"
/>
```

### Dynamically assembled class names

A colour-carrying prefix immediately preceding an interpolation is a violation even though
the interpolated value is unknowable. The value could be `red-500` or it could be `primary`,
and nothing static can tell — which is the point: a class assembled at the call site defeats
every guarantee the token system offers, and this is the one hole the system cannot tolerate.

This rule owns the diagnostic for the whole token family. The prefix is what makes it
checkable, and the fix is the same one this rule recommends everywhere else: a lookup of
complete class names, or a `--color-*` custom property.

```tsx caught
<div className={`bg-${tone}-500`} />

<div className={`text-${x}`} />

<div className={`border-t-${side}`} />
```

## Deliberately allows

### Semantic tokens

```tsx allowed
<div className="bg-primary text-primary-foreground" />

<div className="bg-success-weak text-success-content" />
```

### Non-colour utilities that share a colour prefix

```tsx allowed
<div className="text-sm text-center text-balance" />

<div className="bg-cover bg-no-repeat bg-center" />

<div className="border-2 divide-x ring-2 shadow-lg outline-none" />

<div className="from-0% via-50% to-100%" />
```

### Keyword colours that carry no palette value

`transparent`, `current` and `inherit` do not encode a colour of their own — they defer to
the cascade or to nothing. They are theme-neutral by construction, and `transparent` in
particular has no semantic-token equivalent worth inventing.

```tsx allowed
<div className="bg-transparent border-transparent" />

<svg><path className="fill-current stroke-current" /></svg>

<div className="text-inherit" />
```

### A palette family name with no scale

Not a valid Tailwind class, so it produces no colour. It belongs to `no-undefined-token`,
which reports it as generating no CSS.

```tsx allowed
<div className="text-red" />

<div className="bg-slate" />
```

### Arbitrary values

The palette is not involved even when the hex happens to match one. Raw colour literals are
`no-raw-color`'s surface, and flagging them here would double-report the same character
span from two rules with two different fixes.

```tsx allowed
<div className="bg-[#ef4444]" />

<div className="text-[--color-brand]" />
```

### Interpolation under a prefix that carries no colour

The A7b gate is the prefix, not the backtick. A template literal whose interpolation sits
under a non-colour utility is ordinary code.

```tsx allowed
<div className={`p-${size}`} />

<div className={`grid-cols-${n} gap-2`} />
```

### Strings that are not classes

The broad sweep hands the rule every string in the file; the gate discards the ones that
cannot be a palette class. A family name with no prefix is not a class, and a path is a
single whitespace-delimited token that starts with neither.

```tsx allowed
const chartSeries = ["slate-500", "500"];

fetch("/assets/blue-500.png");
```

### The token-definition files

The files named by the `tokenFiles` option are where the palette is legitimately consumed —
a semantic token has to be defined as *something*. Those files are exempt. Today the
exemption costs nothing, because those files are `.css` and no `.css` file is linted at all;
it becomes load-bearing the moment the CSS surface lands. `tokenFiles` itself is unaffected
by the scope change — the rule reads it to derive the semantic token set, so it is an
*input*, not a linted surface.

## Declared blind spots

Not caught, by decision.

### String concatenation

The `+` operator is not a template literal, so the prefix and the interpolation are two
unrelated expressions rather than one string with a hole in it. A7b's gate does not reach
it, and reconstructing it would be the first step of dataflow analysis.

```tsx blindspot
<div className={"bg-" + tone} />

<div className={["bg", family, "500"].join("-")} />
```

### Use sites with no literal of their own

The broad sweep catches the string where it is *written*, which is what closes the `.ts`
constants gap. What it cannot do is report the place the string is *used*, because no class
appears there. This matters when the definition lives outside the linted file set.

```tsx blindspot
<div className={TONES[kind]} />;

<div className={toneFromServer} />;
```

### The palette re-exported under a semantic name

`--color-brand: var(--color-red-500)` makes `bg-brand` spectral in effect and semantic in
spelling. That is the intended escape hatch — the fork is centralised in one reviewable
file — so this rule stays quiet and the question moves to design review.

```tsx blindspot
<div className="bg-brand" />
```

## Deferred: CSS surface

Not a blind spot. A blind spot is something this contract has decided not to catch; what
follows is something it has decided not to catch **yet**. The linter reads `.js`, `.jsx`,
`.ts` and `.tsx` only, so the cases below are unenforced today and are recorded so that
adding the CSS surface is an implementation task rather than a fresh design argument.

The fenced blocks here are tagged `deferred`. The harness executes `caught`, `allowed` and
`blindspot` blocks only, so nothing in this section asserts anything about the current
implementation.

### `@apply` class lists

A palette class reached through `@apply` is the same violation as one written in a
`className`, and the same policy decides it. No entry point in the current package shape
covers it, so the mechanism is an open choice; only the promise below is fixed.

```css deferred
.card {
  @apply bg-red-500 text-slate-50;
}
```

### The token-definition files, once `.css` is linted

The `tokenFiles` exemption exists for exactly this: a semantic token has to be defined as
*something*, and that something is a palette value. When `.css` becomes a linted surface the
files named by `tokenFiles` stay exempt wholesale.

```css deferred
@theme {
  --color-danger: var(--color-red-500);
}
```

## Relationship to other rules

- **`no-undefined-token`** partitions the same surface without overlapping it. A class under
  a colour prefix is either undefined (that rule), defined and spectral (this rule), or
  defined and semantic (neither). `bg-red-500` resolves cleanly, so `no-undefined-token`
  stays silent on it by design, not by luck.
- **`no-opacity-modifier`** is orthogonal — it inspects the modifier, this rule the colour.
  `bg-red-500/50` reports twice, which is correct: two independent things are wrong with it.
- **`no-raw-color`** owns arbitrary values and raw literals. This rule owns named
  palette classes. No class is in both sets.
- **`token-constraints`** governs which *semantic* token may be used with which prefix. It
  never fires on a spectral class, because a spectral class has no semantic token to
  constrain.
- **Dynamically assembled class names report here and only here.** `` `bg-${tone}` `` is
  unknowable, so every rule in the family has an equal claim on it and none can resolve it.
  Giving all four the diagnostic would produce four reports of one defect with one fix, so
  this rule owns it: the colour prefix is the visible half, and the escape hatch the message
  names is this rule's standing recommendation. `no-undefined-token`, `no-opacity-modifier`
  and `no-dark-variant` stay silent unless their *own* subject — an undefined token, a `/`
  modifier, a `dark:` segment — is statically present in the string.

## Message

Two ids for the static case, because the replacement map covers only part of the palette and
a message cannot be conditional. The token file is named through `data`, never hardcoded —
the consuming project decides where its tokens live.

```
messageId: spectralColorWithReplacement
data:      { className, prefix, family, scale, replacement }
text:      "{{className}} — spectral color class; use {{prefix}}-{{replacement}} instead"
```

```
messageId: spectralColor
data:      { className, family, scale, tokenFile }
text:      "{{className}} — spectral color class; use a semantic token from {{tokenFile}}
            instead of the {{family}} palette"
```

A third id for the dynamic case, which this rule owns.

```
messageId: dynamicColorClass
data:      { prefix }
text:      "{{prefix}}- is built from an interpolated value, so no rule can check which
            token it names. Map to complete class names instead — e.g.
            const CLASSES = { danger: \"bg-danger\" } — or use a --color-* custom property."
```

**`dynamicColorClass` must name the escape hatch**, not merely report the violation. It is
the one diagnostic here with no correct token to suggest, so without the alternative in the
text it reads as "you may not do this" with no way forward.

Ownership sits here because the colour prefix is the visible half of the defect and the
escape hatch the message names is this rule's standing recommendation everywhere else. The
rule is authored in-house, so nothing about detecting a prefix standing against an
interpolation is out of reach. `no-undefined-token`, `no-opacity-modifier` and
`no-dark-variant` stay silent on `` `bg-${tone}-500` `` so that one unknowable string yields
one report.

The replacement token must appear in the message text, not only in a suggestion:
suggestions do not render in any CLI output format, and naming the token is the whole value
of the diagnostic.

No autofix. A suggestion applying the replacement is offered where one exists, and it is
listed first — it is the non-destructive option, and `oxlint --fix-suggestions` applies
index 0 unprompted.

## Configuration

Mechanism ships; policy is supplied. Every value below is a `recommended` preset default the
consuming project overrides in its own config — none is a fact baked into the rule.

| Option | `recommended` | Overriding it |
| --- | --- | --- |
| `flagFixedColors` | `true` | `false` stops reporting `*-black` and `*-white`. Nothing else changes. This is the noisiest line in the rule and the only one with its own switch. |
| `replacement` | the 27-entry spectral→semantic map | Changes which token the message and the suggestion name. Never changes whether a class is caught — a family with no entry still reports, under `spectralColor`. |
| `tokenFiles` | `["src/styles.css"]` | The files the semantic token set and the Tailwind design system are derived from — an **input**, read at load, not a linted surface. They are also exempt wholesale from this rule, which costs nothing while `.css` is out of scope and becomes load-bearing when it lands. |
| `ignoreGlobs` | `["**/*.stories.@(ts\|tsx)"]` | Files the rule skips. Storybook is excluded by default because stories demonstrate colour rather than ship it; a project that treats stories as production code sets this to `[]`. |

The `replacement` map is a plain rule option, read from `options` at load like every other
value in the table. There is no generated config and no build step: the rule is ours, so the
map is data it reads rather than 27 patterns something has to bake into `.oxlintrc` from the
policy file and keep in sync.

### Distribution

- **The rule reads no files and derives no path from its own location.** `tokenFiles`,
  `replacement` and `ignoreGlobs` all arrive through `options`; nothing is discovered. The
  design system is built once at plugin-module load from the path the consumer supplied,
  never inside `create()`.
- **Rule options are JSON, and only JSON.** Oxlint serialises them with `JSON.stringify` on
  the way to a rule — in `RuleTester` and in a real run alike, and `meta.defaultOptions`
  travels the same path — so a rule can be handed the *answers* the design system gave at
  load but never the design system. This rule needs no live query to do its job, so its
  `designSystem` option is two lists of names, `{ colorPrefixes, colorNames }`, both derived
  by probing Tailwind at load, and `tokens` is a list rather than a `Set`. The corrected
  claim matters beyond this rule: any contract whose predicate is a *function* of the design
  system needs a channel other than `options`.
- **A wiped option falls back to the recommended one, per key.** Oxlint merges
  `meta.defaultOptions` into whatever the consumer supplied, key by key, so a consumer
  writing `"…/no-spectral-color": "error"` to bump a severity keeps the whole `replacement`
  map rather than losing it. What does *not* merge is a value: a consumer who supplies their
  own `replacement` replaces the map outright instead of adding to it. (An earlier draft of
  this section had the first half backwards — it predates
  [the conventions](./README.md#writing-a-rule), which make `meta.defaultOptions` the place
  the recommended policy lives for exactly this reason.)

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

The current rule splits the normalised class on `-` and looks for a member of
`TAILWIND_SPECTRAL_COLORS` followed by an all-digit segment, over string literals extracted
line by line.

| Case | Today | Under this contract |
| --- | --- | --- |
| `bg-red-500`, `ring-offset-blue-200`, `divide-x-red-500` | caught | caught |
| `hover:`, `md:dark:`, `!`-important forms | caught | caught |
| `bg-red-500/50` | caught (also by `no-opacity-modifier`) | caught, twice |
| `bg-white`, `text-black` | allowed | caught, under `flagFixedColors` |
| `` className={`bg-red-500 ${x}`} `` | missed — `extractStringLiterals` matches `"` and `'` only, never a backtick | caught — the broad sweep reads template literals |
| `` className={`bg-${tone}-500`} `` | missed | caught — here, under `dynamicColorClass` |
| `bg-[image:var(--x)]` | mangled — `normalizeTwToken` splits on the **last** `:`, yielding `var(--x)]` | allowed, explicitly; segmentation is bracket-depth aware |
| `"text-blue-500"` in a non-class array | caught | caught — the broad sweep is context-free by design |
| `const tone = "bg-red-500"` | caught at the literal | caught at the literal; the *use site* is the blind spot |
| Replacement hint for `divide-x-red-500` | would compose `divide-<semantic>`, dropping `-x` | prefix is reconstructed from the full class |
| `inset-ring-red-500`, `text-shadow-sky-300` | caught (the scan is prefix-independent) | caught |
| `@apply bg-red-500` in a `.css` file | caught — `linter.js` reads `.css` and extracts `@apply` lists | **deferred** — `.css` is not a linted surface for now; the promise is recorded, not the coverage |

`TAILWIND_COLOR_PREFIXES` in `shared.js` is missing `inset-ring`, `inset-shadow` and
`text-shadow`. It does not affect detection here — the segment scan never consults it — but
it does affect the replacement hint, and it affects `no-opacity-modifier` and
`no-undefined-token`, which gate on it. Under this contract the prefix set is derived from
the Tailwind design system in `/policy` rather than hand-maintained, so the hint reconstructs
the full prefix (`divide-x-`, `inset-ring-`) instead of guessing at it.

`TAILWIND_SPECTRAL_COLORS` goes the same way, and further: there is no family list under
this contract at all. The scan looks for a suffix of the class that is a name in the theme's
`--color` namespace — which is `red-500` and `white` and the project's own `primary`, all
the same kind of thing — and the palette is what remains once the project's token names are
subtracted. A family Tailwind adds is covered on the day it ships, and a project that trims
the default palette stops being told about the families it removed, both without an edit.

The source comment claims returning a message "signals the orchestrator to stop checking
this token further". It does not: `linter.js` runs every rule against every token and
collects all messages. `dark:bg-red-500/50` produces three reports today.
