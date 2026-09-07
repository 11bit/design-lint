---
rule: no-spectral-color
legacy-id: 4
status: draft
disposition: off-the-shelf
bias: false-positives
files: ["*.tsx", "*.ts", "*.css"]
---

# no-spectral-color

**Tailwind's built-in palette must not be used to colour anything.**

`bg-red-500` names a colour, not a role. It resolves to a fixed value that cannot move when
the theme moves, carries no meaning a designer can redefine, and gives the next reader no
way to tell whether the red is "danger", "brand" or "someone had a hex code handy". The
design system's entire premise is that colour is addressed semantically — `bg-danger`,
`text-info-content` — and that `styles.css` is the single place those resolve. Every
spectral class is a private fork of the palette embedded in a component.

The replacement is always a semantic token. Where the mapping is known,
`design-system/lint/colors.json` records it under `no-spectral-color.replacement`, and the
diagnostic must name the token rather than leave the developer to guess.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## Promises to catch

Any class whose colour value comes from a Tailwind palette family, in any class string the
project authors — a `className` literal, an argument to `cn` / `clsx` / `twMerge`, a
`cva` / `tv` variant map, or an `@apply` directive.

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

<svg><path className="fill-green-600 stroke-green-800" /></svg>

<div className="from-blue-500 via-purple-500 to-pink-500" />

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

### Every palette family

All twenty-two built-in families, at every scale step (`50`, `100`–`900`, `950`). The
neutrals are not an exception — `bg-gray-100` is the most common way this rule is violated
and the least likely to be noticed in review.

```tsx caught
<div className="bg-red-50 bg-orange-100 bg-amber-200 bg-yellow-300" />

<div className="bg-lime-400 bg-green-500 bg-emerald-600 bg-teal-700" />

<div className="bg-cyan-800 bg-sky-900 bg-blue-950 bg-indigo-500" />

<div className="text-violet-500 text-purple-500 text-fuchsia-500 text-pink-500 text-rose-500" />

<div className="border-slate-200 border-gray-200 border-zinc-200 border-neutral-200 border-stone-200" />
```

### Compound and nested prefixes

The palette name is not always the second segment. Detection must scan for a family name
followed by a scale anywhere in the class, not parse a fixed prefix.

```tsx caught
<div className="border-t-red-500" />

<div className="border-x-slate-200 border-s-slate-200" />

<div className="ring-offset-blue-200" />

<div className="divide-x-red-500" />

<div className="inset-ring-red-500" />
```

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
exist to solve, and it is the one that breaks first when a light theme is added. See
[Open questions](#open-questions) — this is the noisiest line in the contract.

```tsx caught
<div className="bg-white text-black" />

<div className="border-white/20" />
```

### Wherever class strings are authored

```tsx caught
<div className={cn("bg-red-500", className)} />

<div className={clsx(isOn && "text-blue-600")} />
```

```tsx caught count=2
const button = cva("rounded", {
  variants: {
    tone: { bad: "bg-red-500", worse: "text-rose-600" },
  },
});
```

```tsx caught
const badgeColor = { danger: "bg-red-500", ok: "bg-green-500" };
```

```css caught
.card {
  @apply bg-red-500 text-slate-50;
}
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
`no-raw-css-color`'s surface, and flagging them here would double-report the same character
span from two rules with two different fixes.

```tsx allowed
<div className="bg-[#ef4444]" />

<div className="text-[--color-brand]" />
```

### The token-definition files

`colorTokenFiles` is where the palette is legitimately consumed — a semantic token has to
be defined as *something*. Those files are exempt.

```css allowed
@theme {
  --color-danger: var(--color-red-500);
}
```

## Declared blind spots

Not caught, by decision.

### Dynamic composition

The family or the scale is not present in the source.

```tsx blindspot
<div className={`bg-${family}-500`} />

<div className={`bg-red-${scale}`} />

<div className={"bg-" + tone} />
```

### Indirection through a variable

```tsx blindspot
const tone = "bg-red-500";
<div className={tone} />;

<div className={TONES[kind]} />;
```

### The palette re-exported under a semantic name

`--color-brand: var(--color-red-500)` makes `bg-brand` spectral in effect and semantic in
spelling. That is the intended escape hatch — the fork is centralised in one reviewable
file — so this rule stays quiet and the question moves to design review.

```tsx blindspot
<div className="bg-brand" />
```

### Palette names outside a class position

With AST-based extraction the rule only sees strings that can reach a `className`, so a
palette-looking string elsewhere is out of scope rather than suppressed.

```tsx blindspot
const chartSeries = ["slate-500", "text-blue-500"];

fetch("/assets/blue-500.png");
```

## Relationship to other rules

- **`no-undefined-token`** partitions the same surface without overlapping it. A class under
  a colour prefix is either undefined (that rule), defined and spectral (this rule), or
  defined and semantic (neither). `bg-red-500` resolves cleanly, so `no-undefined-token`
  stays silent on it by design, not by luck.
- **`no-opacity-modifier`** is orthogonal — it inspects the modifier, this rule the colour.
  `bg-red-500/50` reports twice, which is correct: two independent things are wrong with it.
- **`no-raw-css-color`** owns arbitrary values and raw literals. This rule owns named
  palette classes. No class is in both sets.
- **`token-constraints`** governs which *semantic* token may be used with which prefix. It
  never fires on a spectral class, because a spectral class has no semantic token to
  constrain.

## Message

Two message ids, because the replacement map covers only part of the palette and a message
cannot be conditional.

```
messageId: spectralColorWithReplacement
data:      { className, prefix, family, scale, replacement }
text:      "{{className}} — spectral color class; use {{prefix}}-{{replacement}} instead"
```

```
messageId: spectralColor
data:      { className, family, scale }
text:      "{{className}} — spectral color class; use a semantic token from styles.css
            instead of the {{family}} palette"
```

The replacement token must appear in the message text, not only in a suggestion:
suggestions do not render in any CLI output format, and naming the token is the whole value
of the diagnostic.

No autofix. A suggestion applying the replacement is offered where one exists, and it is
listed first — it is the non-destructive option, and `oxlint --fix-suggestions` applies
index 0 unprompted.

## Open questions

Each blocks `status: agreed`.

1. **Are `black` and `white` violations?**
   The contract above says yes. They are fixed values that cannot follow a theme, and every
   `text-white` on a coloured surface is a `*-content` token waiting to be named. But they
   are also common, and legitimately correct over a photograph or a fixed-colour brand
   surface, and the replacement map has no entry for either. *Recommendation: flag them,
   consistent with `bias: false-positives`.* Revisit after the first real run: if the count
   is large and mostly overlays, split them into a separately configurable pattern rather
   than dropping them.

2. **Is the replacement map essential to this rule, or a nice-to-have?**
   This determines the disposition. *Recommendation: nice-to-have, and the disposition
   stands at `off-the-shelf`.* Two reasons. First, the map covers `text` and `bg` only, nine
   families of twenty-two, and narrow scale ranges — the majority of spectral classes (every
   neutral, every `border-*`, `ring-*`, `divide-*`) get no replacement today, so the rule's
   value plainly does not depend on it. Second, Phase 0 verified that `oxlint-tailwindcss`
   restricted-classes supports a **custom message per pattern**, and the map is 27 entries
   that mechanically expand to 27 patterns (`green-400...600` → `bg-green-(400|500|600)`).
   The map therefore survives as generated config, not as a custom rule. The cost is a build
   step that regenerates `.oxlintrc` from `colors.json`, replacing today's read-at-runtime
   property. If Phase 4 finds per-pattern messages cannot carry it after all, this becomes a
   thin custom rule whose only job is the map — that is the fallback the migration plan
   already anticipates.

3. **Does the rule apply to `.css` files at all after the migration?** **[cross-rule]**
   The contract above claims `@apply bg-red-500` in a component stylesheet. Oxlint JS
   plugins cannot read CSS, and `stylelint-declaration-strict-value` inspects declaration
   *values*, not `@apply` class lists — so nothing in the planned three-component
   architecture covers it. This is an unsurfaced regression, and it affects all four
   palette-class rules identically. *Recommendation: keep the promise and close the gap with
   a small Stylelint rule (`at-rule-disallowed-list` or a
   `declaration-property-value-allowed-list` over `@apply`), with `colorTokenFiles` in
   `ignoreFiles`.* If that is rejected, the `.css` promise must be demoted to a declared
   blind spot in all four contracts rather than left implied.

4. **Do the rules cover colour classes in `.ts` object-literal maps?** **[cross-rule]**
   `const badgeColor = { danger: "bg-red-500" }` is listed as `caught` above. Phase 0 found
   `oxlint-tailwindcss` does not see it, while the current scanner does. *Recommendation:
   keep the promise.* Variant maps in `.ts` constants files are exactly where a palette
   class hides longest. Phase 4 records either a narrowed contract or a thin custom rule for
   the `.ts` surface — the decision must be the same one across all nine contracts.

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
| `bg-white`, `text-black` | allowed | caught |
| `` className={`bg-red-500 ${x}`} `` | missed — `extractStringLiterals` matches `"` and `'` only, never a backtick | blind spot, explicitly |
| `bg-[image:var(--x)]` | mangled — `normalizeTwToken` splits on the **last** `:`, yielding `var(--x)]` | allowed, explicitly |
| `"text-blue-500"` in a non-class array | caught | out of scope (AST extraction) |
| Replacement hint for `divide-x-red-500` | would compose `divide-<semantic>`, dropping `-x` | prefix is reconstructed from the full class |
| `inset-ring-red-500`, `text-shadow-sky-300` | caught (the scan is prefix-independent) | caught |

`TAILWIND_COLOR_PREFIXES` in `shared.js` is missing `inset-ring`, `inset-shadow` and
`text-shadow`. It does not affect detection here — the segment scan never consults it — but
it does affect the replacement hint, and it affects `no-opacity-modifier` and
`no-undefined-token`, which gate on it.

The source comment claims returning a message "signals the orchestrator to stop checking
this token further". It does not: `linter.js` runs every rule against every token and
collects all messages. `dark:bg-red-500/50` produces three reports today.
