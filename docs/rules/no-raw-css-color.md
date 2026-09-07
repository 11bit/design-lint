---
rule: no-raw-css-color
legacy-id: 2
status: draft
disposition: off-the-shelf
bias: false-positives
files: ["*.css", "*.tsx"]
---

# no-raw-css-color

**A color must never be written as a literal value. Every applied color resolves through a
`var(--color-*)` token.**

A literal color is a fact about one pixel at one moment. It does not change with the theme,
it does not appear in the token audit, and it cannot be renamed. `#0a7cff` written in a
component stylesheet is invisible to the design system: nothing links it to `--color-primary`,
so the day the brand blue moves, that one declaration stays behind. The same is true of
`rgb(10 124 255)`, of `red`, and of `bg-[#0a7cff]` — the syntax differs, the failure is
identical.

The token files are the one place a literal is legitimate, because that is where the token
system is defined. Everywhere else, a color is a *reference*: `var(--color-primary)` in CSS,
a semantic utility class in markup. Where a genuinely new color is needed, the fix is to add
a token, not to inline the value — see [Deliberately allows](#deliberately-allows) for the
narrow set of values that are not colors in this sense.

This rule spans two file types and two tools: `.css` declarations
(`stylelint-declaration-strict-value`) and Tailwind arbitrary values in `.tsx`
(`oxlint-tailwindcss`). The surfaces are kept in separate subsections throughout, and
[Open questions](#open-questions) asks whether they should be separate rules.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## Promises to catch

### The value surface

These are the forms a color literal can take. Every promise below is written against this
set; it is enumerated once here rather than repeated per property.

| Form | Examples |
| --- | --- |
| Hex | `#fff` `#ffff` `#ffffff` `#ffffff80` |
| Legacy functions | `rgb()` `rgba()` `hsl()` `hsla()` |
| Modern functions | `hwb()` `lab()` `lch()` `oklab()` `oklch()` |
| Wide-gamut | `color(display-p3 1 0 0)` `device-cmyk(0 1 1 0)` |
| Composed | `color-mix(...)` and `light-dark(...)`, when any argument is itself a literal |
| Named | the full CSS named-color set — `red`, `rebeccapurple`, `aliceblue`, … (148 names) |
| System | `Canvas` `CanvasText` `ButtonText` `ButtonFace` `LinkText` `GrayText` `Highlight` `AccentColor`, … |

**Named colors are in scope**, and this is the one judgement call worth stating outright.
`color: red` is a raw literal by any reading of the rationale — it is unthemed, untokenised
and unrenameable — and excluding it would leave the cheapest possible way to bypass the
token system wide open. The objection is false positives: `red` is also a valid
`<custom-ident>`, so bare word-matching would flag `grid-area: red`,
`animation-name: fadeToRed`, and `font-family: Tomato`.

The resolution is that this rule never matches bare words in isolation. A named color is
recognised **only inside the value of a color-carrying property** (the enumerated list
below) or inside the arguments of a color function. That is precisely where a
`<custom-ident>` cannot legally appear, so the false-positive class disappears without
narrowing coverage on any surface that renders a color.

**System colors are in scope** for the same reason — `ButtonText` is a literal the token
system cannot see — with one carve-out: inside a `@media (forced-colors: active)` block they
are the *correct* value, and are allowed there. See
[Deliberately allows](#deliberately-allows).

### Enforcement model

The contract requires **both** models, because each covers the other's hole:

1. **Property-scoped.** Every color-carrying property must resolve its color through
   `var()`. This is what catches `color: red` and `border: 1px solid darkslategray`
   without pattern-matching words, and it is the model
   `stylelint-declaration-strict-value` implements.
2. **Value-scoped backstop.** A syntactically unambiguous color literal — hex, or any of
   the color function heads — is caught in *any* declaration value, whether or not its
   property is on the list. This is what catches
   `mask-image: linear-gradient(#fff, transparent)` when nobody remembered to list
   `mask-image`.

The property-scoped model alone is incomplete: the property list is hand-maintained, CSS
keeps adding properties, and every omission is a silent hole. The value-scoped model alone
is incomplete in the other direction: it cannot see `red`. Requiring only one of them would
be promising coverage this rule does not have.

**The color-carrying property list**, which the property-scoped half must cover in full:

`color` · `background-color` · `border-color` · `border-top-color` ·
`border-right-color` · `border-bottom-color` · `border-left-color` ·
`border-block-color` · `border-block-start-color` · `border-block-end-color` ·
`border-inline-color` · `border-inline-start-color` · `border-inline-end-color` ·
`outline-color` · `text-decoration-color` · `text-emphasis-color` · `column-rule-color` ·
`caret-color` · `accent-color` · `scrollbar-color` · `fill` · `stroke` · `stop-color` ·
`flood-color` · `lighting-color` · `-webkit-text-fill-color` · `-webkit-text-stroke-color`

and the shorthands and color-capable properties:

`background` · `background-image` · `border` (and all four sides, plus block/inline) ·
`outline` · `text-decoration` · `text-emphasis` · `column-rule` · `box-shadow` ·
`text-shadow` · `filter` · `backdrop-filter` · `border-image` · `border-image-source` ·
`mask-image` · `list-style` · `list-style-image` · `-webkit-text-stroke` · `caret`

### Reporting granularity

One report per **declaration** on the CSS surface, regardless of how many literals the value
contains — `background: linear-gradient(#fff, #000)` is one problem, not two. On the TSX
surface, one report per offending **class token**, JSX attribute, or string literal.

### CSS: color-only properties

```css caught
.a { color: #ff0000; }

.b { background-color: rgb(255 0 0); }

.c { border-color: hsl(0 100% 50%); }

.d { border-top-color: oklch(0.7 0.15 30); }

.e { outline-color: lab(50 40 -20); }

.f { caret-color: lch(50 80 30); }

.g { accent-color: hwb(0 0% 0%); }

.h { text-decoration-color: oklab(0.5 0.1 -0.1); }

.i { column-rule-color: #f00; }

.j { text-emphasis-color: #ffff; }

.k { -webkit-text-fill-color: #ffffff80; }

.l { stop-color: #fff; }
```

Each declaration reports separately:

```css caught count=4
.a { fill: #ff0000; stroke: #00ff00; }

.b { flood-color: #fff; lighting-color: #000; }
```

### CSS: named and system values

Caught because the *property* demands a token, without any bare-word matching.

```css caught
.a { color: red; }

.b { background-color: rebeccapurple; }

.c { border-color: darkslategray; }

.d { fill: aliceblue; }

.e { color: ButtonText; }

.f { background-color: Canvas; }

.g { border: 1px solid red; }

.h { box-shadow: 0 0 4px black; }
```

### CSS: modern and composed color functions

```css caught
.a { color: color(display-p3 1 0 0); }

.b { background-color: device-cmyk(0 1 1 0); }

.c { color: color-mix(in srgb, #fff 50%, #000); }

.d { color: color-mix(in oklch, var(--color-primary) 50%, red); }

.e { background-color: light-dark(#fff, #000); }
```

### CSS: shorthands, gradients and shadows

The value-scoped backstop covers these even where the property is not on the list.

```css caught
.a { background: #ff0000; }

.b { background: linear-gradient(#fff, #000); }

.c { background-image: radial-gradient(circle, rgb(255 0 0), transparent); }

.d { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }

.e { text-shadow: 0 0 4px #000; }

.f { filter: drop-shadow(0 0 4px #ff0000); }

.g { backdrop-filter: drop-shadow(0 0 4px #ff0000); }

.h { border-image: linear-gradient(#f00, #00f) 1; }

.i { outline: 1px solid #f00; }

.j { column-rule: 1px solid #f00; }

.k { text-decoration: underline #f00; }

.l { mask-image: linear-gradient(#fff, transparent); }

.m { list-style-image: linear-gradient(#f00, #00f); }
```

### CSS: custom property definitions

A custom property defined outside the token files is a token-system bypass wearing the
token system's clothes. The literal is caught at the **definition**; every *use* of it is
then clean, which is the point — one report at the one place the value lives.

```css caught
.a { --brand: #ff0000; }

:root { --card-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }

.b { --accent: red; }
```

```css allowed
.a { color: var(--brand); }

.b { box-shadow: var(--card-shadow); }

.c { color: var(--color-primary, var(--color-fg)); }
```

Whether `--brand` is a *sanctioned* token name is not this rule's question — see
[Relationship to other rules](#relationship-to-other-rules).

### CSS: `@apply` directives

`@apply` carries Tailwind classes into CSS, so the arbitrary-value surface reappears there.
Verified present in the current runner (`linter.js` matches `^@apply\s+(.+?);?\s*$` on the
trimmed line and runs the full token pipeline over the classes).

```css caught
.a { @apply bg-[#ff0000]; }

.b {
  @apply text-[rgb(255,0,0)];
}

.c {
  @apply rounded-md border-[#f00] p-2;
}
```

```css allowed
.a { @apply bg-primary text-primary-foreground; }

.b { @apply bg-[var(--color-primary)]; }
```

### TSX: Tailwind arbitrary values

```tsx caught
<div className="bg-[#ff0000]" />

<div className="text-[#f00]" />

<div className="border-[#ff000080]" />

<div className="ring-[rgb(255,0,0)]" />

<div className="bg-[rgba(255,0,0,0.5)]" />

<div className="text-[hsl(0,100%,50%)]" />

<div className="text-[oklch(0.7_0.15_30)]" />

<div className="text-[lab(50_40_-20)]" />

<div className="text-[hwb(0_0%_0%)]" />

<div className="shadow-[0_0_4px_#f00]" />

<div className="bg-[color-mix(in_oklch,#fff_50%,#000)]" />

<div className="bg-[light-dark(#fff,#000)]" />
```

Variants and prefixes do not change the answer:

```tsx caught
<div className="hover:bg-[#ff0000]" />

<div className="md:dark:text-[#f00]" />

<div className="[&>svg]:fill-[#f00]" />
```

Every offending token in one class string is reported separately:

```tsx caught count=2
<div className="bg-[#ff0000] text-[#00ff00]" />
```

### TSX: class strings wherever they are built

The class-string surface is whatever the shared class-string extractor can see.

```tsx caught
<div className={cn("bg-[#ff0000]", className)} />

<div className={clsx(isActive && "text-[#f00]")} />

<div className={twMerge("bg-[#f00]", "p-2")} />

const button = cva("rounded", {
  variants: { tone: { danger: "bg-[#ff0000]" } },
});

const badgeColor = { danger: "bg-[#ff0000]", ok: "bg-primary" };
```

The last case — a color class in a `.ts`/`.tsx` object-literal map — is the known
`oxlint-tailwindcss` coverage regression recorded in the migration plan. It is promised
here; whether the promise is kept by the off-the-shelf rule or by a thin custom rule is a
Phase 4 verdict, not a licence to drop it.

### TSX: color literals outside class strings

A raw color in `.tsx` is a violation whichever channel applies it. The `style` prop case is
deliberately shared with `no-style-color` — see
[Relationship to other rules](#relationship-to-other-rules).

```tsx caught
<div style={{ backgroundColor: "#f00" }} />

<div style={{ color: "rgb(255, 0, 0)" }} />

<div style={{ boxShadow: "0 0 4px #f00" }} />

<svg><rect fill="#ff0000" stroke="#00ff00" /></svg>

<svg><stop stopColor="#ff0000" /></svg>

<Chart colors={["#ff0000", "#00ff00"]} />

const CHART_SERIES = "#ff0000";
```

A whole-string color literal is caught anywhere in a `.tsx` file, not only in JSX. Without
property context there is a residual false-positive class — a DOM selector or anchor whose
identifier happens to be hex-only, `"#face"` or `"#decade"` — which `bias: false-positives`
accepts as suppressible noise. See [Deliberately allows](#deliberately-allows) for the
non-hex cases that must stay quiet regardless.

## Deliberately allows

### The three non-color keywords

`currentColor`, `transparent` and the CSS-wide keywords are not literals in the sense this
rule cares about. `currentColor` *is* a reference — it resolves to whatever `color` the
cascade produced, which under this rule is always a token. `transparent` names the absence
of a color, and there is no token that could replace it. The CSS-wide keywords name a
cascade operation, not a value.

Stating this explicitly, rather than leaving it to silence, matters: these three are the
values people reach for when they have done the right thing, and a rule that flagged them
would train developers to suppress it.

```css allowed
.a { color: currentColor; }

.b { fill: currentColor; }

.c { background-color: transparent; }

.d { border-color: transparent; }

.e { color: inherit; }

.f { background-color: initial; }

.g { color: unset; }

.h { border-color: revert; }

.i { color: color-mix(in oklch, var(--color-primary) 50%, transparent); }
```

```tsx allowed
<div className="border-[transparent]" />

<svg><path fill="currentColor" /></svg>
```

### Token references

```css allowed
.a { color: var(--color-primary); }

.b { background: linear-gradient(var(--color-from), var(--color-to)); }

.c { box-shadow: 0 1px 2px var(--color-shadow); }

.d { color: light-dark(var(--color-fg-light), var(--color-fg-dark)); }
```

```tsx allowed
<div className="bg-primary text-primary-foreground" />

<div className="bg-[var(--color-primary)]" />

<div className="text-[--color-primary]" />

<div style={{ "--color-brand": userColor }} />
```

### The token files

`colorTokenFiles` from `design-system/lint/colors.json` — currently `["src/styles.css"]` —
define the tokens, so a literal there is the definition, not a bypass.

The exemption the contract requires is **definition-scoped**, not whole-file: a literal in a
`--color-*` declaration inside `@theme`, `:root`, or a theme selector is the source of
truth; an ordinary styling declaration in the same file is a violation like any other. A
token file that also contains base styles should not become a place where colors can be
hidden.

```css allowed
@theme {
  --color-primary: oklch(0.62 0.19 259);
  --color-danger: #e5484d;
}

:root {
  --color-bg: #ffffff;
}

.dark {
  --color-bg: #0b0b0c;
}
```

```css caught
body { background-color: #ffffff; }

.legacy-banner { color: #ff0000; }
```

Both blocks above are the token file. The `caught` block is what whole-file `ignoreFiles`
would let through — see [Open questions](#open-questions), which is where this requirement
is reconciled with the tool.

### Comments

A literal in a comment is prose about a color, not a color.

```css allowed
/* brand blue is #0a7cff */
.a { color: var(--color-primary); }

.b {
  /* was rgb(255, 0, 0) before the token migration */
  color: var(--color-danger);
}

.c { color: var(--color-fg); /* #111 in the light theme */ }
```

### `url()` and asset references

Everything inside `url()` is an address. The `#` there is a fragment identifier — most often
an SVG element reference — not a hex color.

```css allowed
.a { fill: url(#gradient-primary); }

.b { background-image: url("/img/hero.png#anchor"); }

.c { mask-image: url(#mask-fade); }

.d { background-image: url("data:image/svg+xml,%3Csvg%20fill='%23ff0000'%3E%3C/svg%3E"); }
```

The data URI is the uncomfortable one: an unescaped `#ff0000` inside a data URI *is* a
color, and it *is* a bypass. It is allowed here because there is no way to distinguish it
from an ordinary fragment without parsing the embedded document, and because inline SVG
sprites are the legitimate reason data URIs appear at all. Recorded again under
[Declared blind spots](#declared-blind-spots).

### `content` strings and other non-rendering values

A color-shaped string in `content` is text.

```css allowed
.a::before { content: "#fff"; }

.b::after { content: "red"; }

.c { font-family: "Tomato", sans-serif; }

.d { grid-area: red; }

.e { animation-name: fadeToRed; }

.f { --docs-example-label: "rgb(255, 0, 0)"; }
```

### At-rule preludes and feature queries

An at-rule prelude tests capability or context; it does not apply a color.

```css allowed
@supports (color: color(display-p3 1 0 0)) {
  .a { color: var(--color-primary); }
}

@media (prefers-color-scheme: dark) {
  .b { color: var(--color-fg); }
}

@media (forced-colors: active) {
  .c { color: CanvasText; background-color: Canvas; border-color: ButtonBorder; }
}
```

The `forced-colors` block is the system-color carve-out: inside it, system colors are the
only correct values, and substituting a token would defeat the accessibility mode the query
exists to serve.

### Non-color arbitrary values

```tsx allowed
<div className="bg-[url('/img.png')]" />

<div className="w-[calc(100%-2rem)]" />

<div className="grid-cols-[1fr_auto]" />

<div className="text-[13px]" />

<div className="bg-[#zz]" />
```

### Non-color strings in TSX

```tsx allowed
<a href="#pricing">Pricing</a>

<div id="app-root" />

document.querySelector("#app-root");

const heading = "Rules #1 and #2";
```

## Declared blind spots

Not caught, by decision. Each is either statically undecidable or belongs elsewhere.
Listing them here means a future change that *starts* catching one fails its assertion and
forces this document to be updated.

### Dynamically composed values

The literal is not present as a literal.

```css blindspot
.a { color: var(--maybe-a-literal); }
```

```tsx blindspot
const hue = 0;
<div className={`bg-[hsl(${hue},100%,50%)]`} />;

<div className={"bg-[#" + hexFromProps + "]"} />;

<div style={{ color: computeColor(theme) }} />;
```

Flagging all dynamic composition was considered and rejected for the TSX surface: template
literals are how legitimate token-name interpolation is written (``className={`bg-${tone}`}``),
so a blanket rule would fire constantly on correct code. The line is *literal present or
not*, and it is the same line every rule in this repo draws.

### Colors inside `url()` data URIs

An unescaped literal inside an embedded SVG is a genuine bypass this rule will not see.
Detecting it means parsing the data URI's payload as a separate document, which is out of
scope for both planned tools and for any successor.

```css blindspot
.a { background-image: url("data:image/svg+xml,<svg fill='#ff0000'></svg>"); }
```

### Color literals embedded in longer strings

Whole-string matching in TSX is deliberate. A color spliced into a larger string is not
recovered.

```tsx blindspot
const css = "color: #ff0000; padding: 4px";

<div dangerouslySetInnerHTML={{ __html: "<b style='color:#f00'>hi</b>" }} />;
```

### CSS-in-JS

No `styled-components` / Emotion usage exists in the target codebase. If that changes it
becomes a new rule, not an extension of this one — the CSS inside a tagged template is a
third surface with a third parser.

```tsx blindspot
const Box = styled.div`
  color: #ff0000;
`;
```

### Non-CSS color channels

Colors reaching the page by a route that is neither CSS nor a class string.

```tsx blindspot
canvas.getContext("2d").fillStyle = "#ff0000";

element.style.setProperty("--brand", "#ff0000");
```

The second case is `no-style-color`'s sanctioned escape hatch being fed a literal. Neither
rule catches it, and that is the accepted cost of the escape hatch existing.

## Relationship to other rules

- **`no-style-color`** overlaps deliberately, and the division of labour is the same read
  from either side: that rule flags the *property* (`color:` appearing in a `style` prop),
  this rule flags the *value* (`#f00`, `rgb(...)`) wherever it appears.
  `style={{ color: "#f00" }}` therefore reports **twice**, which is correct — the mechanism
  and the literal are independently wrong, and fixing only one leaves a real defect.
  `style={{ color: brandToken }}` reports once, from `no-style-color` only.
  `className="bg-[#f00]"` reports once, from this rule only.
- **`no-undefined-token`** owns whether a token *name* is real. This rule only asks whether
  a value is a literal or a reference; `color: var(--color-nonexistent)` is clean here and
  that rule's problem.
- **`no-spectral-color`** owns palette classes (`bg-red-500`). Those are token references —
  wrong tokens, but references — so this rule stays quiet on them. `bg-[#ef4444]` is this
  rule's, even though it is the same color.
- **`no-dark-variant`** owns theme-switching mechanism. `light-dark()` is the CSS-native
  form of a `dark:` variant, and this rule catches it only when its arguments are literals.
  Whether `light-dark(var(--a), var(--b))` should be flagged as a mechanism belongs there —
  flagged in [Open questions](#open-questions).
- **`token-constraints`** operates on token names within a prefix. Arbitrary values have no
  token name, so the two never see the same class.

## Message

Two surfaces, two emitters. Both message texts must stand alone: suggestions do not render
in any CLI output format, so nothing may live only in a suggestion.

CSS (`stylelint-declaration-strict-value`):

```
text: "Raw color {{value}} in `{{property}}` — use a var(--color-*) token.
       Add one to src/styles.css if none fits."
```

TSX (Oxlint):

```
messageId: rawColorValue
data:      { value, surface }
text:      "raw color {{value}} in {{surface}} — colors must resolve through a
            var(--color-*) token"
```

where `surface` is one of `an arbitrary value`, `a style prop`, `an SVG attribute`,
`a string literal`.

No autofix. Choosing the replacement token requires intent the rule cannot infer, and
guessing wrong silently changes a rendered color — the worst possible failure mode for an
automatic fix.

A **suggestion** is worth having where the literal is exactly equal to a defined token's
computed value: `#e5484d` → `var(--color-danger)` is a mechanical, safe rewrite. It must be
offered only on exact match, never on nearest-match, and the matched token name must also
appear in the message text via `data`. If more than one token matches, list them all; if the
list would be a guess, emit no suggestion. Nothing destructive is ever offered, so ordering
is unconstrained here — but the rule stands.

## Open questions

Each blocks `status: agreed`.

1. **One rule across two tools, or two rules with two contracts?**
   Today this is one contract covering a Stylelint rule over `.css` and an
   `oxlint-tailwindcss` rule over `.tsx`. They share a rationale and a value surface, and
   nothing else: different tools, different configuration files, different suppression
   syntax (`stylelint-disable` vs `oxlint-disable`), different message emitters, and — per
   Phase 4 — potentially different verdicts, since `no-hardcoded-colors` may subsume the
   TSX half entirely while the CSS half stays Stylelint config.
   *Recommendation: split into two rules — `no-raw-css-color` (`.css`) and
   `no-raw-color-utility` (`.tsx`) — but not yet.* Keep one contract through Phase 4, because
   the audit's central question ("does `no-hardcoded-colors` subsume the hand-written
   regex?") needs both halves visible in one document to answer. Split at the moment that
   verdict lands. The sections above are already partitioned by surface, so the split is a
   cut, not a rewrite. A single contract whose two halves are audited separately, suppressed
   separately, and may be adopted separately is a contract in name only.

2. **Is the definition-scoped token-file exemption achievable, or does it narrow to
   whole-file?**
   [Deliberately allows](#deliberately-allows) requires that a literal in a `--color-*`
   definition inside the token file is allowed while an ordinary styling declaration in the
   same file is caught. `stylelint-declaration-strict-value` is configured with
   `ignoreFiles`, which is whole-file. This is the one place the contract knowingly asks for
   more than the planned tool provides, and Phase 4 must return a verdict rather than let it
   pass unnoticed.
   *Recommendation: attempt the scoped form first* — a `disableFix`/`ignoreValues` split, or
   a second Stylelint rule limited to non-custom-property declarations in the token file. If
   it cannot be expressed, narrow the contract explicitly and move this case to
   **Declared blind spots**. Do not adopt `ignoreFiles` and leave the `caught` block above
   standing; it is executed, so it would fail loudly, which is the intended behaviour.

3. **Does `light-dark(var(--a), var(--b))` violate anything?** [cross-rule]
   It contains no literal, so this rule is quiet. But it is a theme-switching mechanism
   living in a component stylesheet, which is exactly what `no-dark-variant` exists to
   prevent in its `dark:` form. The migration plan already carries the open question of
   whether `no-dark-variant` extends to `.dark &` selectors and `prefers-color-scheme`
   blocks; `light-dark()` is the same question in a third syntax and should be answered with
   them, not here.

4. **Do SVG presentation attributes and `.tsx` string constants have an owner?**
   `<rect fill="#ff0000" />` and `const CHART_SERIES = "#ff0000"` are promised above and are
   caught today, because the current scanner reads every string literal in the file.
   `oxlint-tailwindcss` sees class strings, not arbitrary JSX attributes or free-floating
   constants, so nothing in the planned replacement covers them.
   *Recommendation: keep the promise and plan for a thin custom rule.* These are real
   bypasses — a chart library taking `["#ff0000"]` is one of the most common ways a design
   system leaks — and dropping them silently is precisely the failure mode the migration
   standard forbids. If Phase 4 finds `no-hardcoded-colors` reaches them, better; if not,
   this is a ~30-line addition to the local plugin, not a reason to narrow.

5. **Is the named-color set enforced at full breadth?**
   The contract requires all 148 CSS named colors within color-carrying properties.
   `stylelint-declaration-strict-value` gets this for free (any non-`var()` value fails),
   but the TSX side needs the list explicitly for `text-[red]`.
   *Recommendation: full set, generated, not hand-typed.* A partial list is the same class
   of silent hole as the property list, and the set is stable and small enough to inline.

6. **Are Storybook files excluded?** [cross-rule]
   The current runner skips them wholesale via `isStorybookFile`, for both `.css` and
   `.tsx`. Unclear whether that was intent or convenience. Stories are where ad-hoc literal
   color is most tempting and least harmful. The answer should be the same for all nine
   rules.

7. **Does this rule apply to `.ts` as well as `.tsx`?** [cross-rule]
   It matters more here than for most: the `.ts` object-literal map
   (`const badgeColor = { danger: "bg-[#ff0000]" }`) is promised in
   [Promises to catch](#promises-to-catch), it is caught today, and Phase 0 established that
   `oxlint-tailwindcss` does not see it. So does `const CHART_SERIES = "#ff0000"` in a
   constants file. Both are `.ts`-shaped in practice.
   *Recommendation for this rule: `.ts` and `.tsx` both.* But the file-scope decision is
   project-wide and should be made once across all nine contracts rather than nine times —
   it is not settled here.

8. **Is the value-scoped backstop worth its false positives on the CSS surface?**
   Requiring both enforcement models means a hex in *any* declaration is caught, including
   properties nobody would think of as color-carrying. No concrete false positive has been
   identified beyond the `url()` and `content` cases already allowed above.
   *Recommendation: keep both models.* If real noise appears, narrow the backstop to hex and
   function heads only (already the case) rather than dropping it — a value-scoped check is
   the only defence against the property list going stale.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

For migration reference. The current rule is a single regex,
`/#[0-9a-fA-F]{3,8}\b|(?:rgb|rgba|hsl|hsla|oklch|lch|lab|oklab|hwb)\s*\(/`, applied
line-wise to `.css` and token-wise to string literals extracted from `.ts`/`.tsx`.

| Case | Today | Under this contract |
| --- | --- | --- |
| `color: #ff0000` | caught | caught |
| `bg-[#ff0000]` | caught | caught |
| `color: red` (named) | missed | caught |
| `color: ButtonText` (system) | missed | caught |
| `color: color(display-p3 1 0 0)` | missed | caught |
| `color: device-cmyk(0 1 1 0)` | missed | caught |
| `background-color: light-dark(#fff, #000)` | caught (via hex) | caught |
| `color-mix(in oklch, var(--x), red)` | missed | caught |
| `color: currentColor` / `transparent` / `inherit` | allowed | allowed |
| `fill: url(#gradient)` | **caught (false positive)** | allowed |
| `content: "#fff"` | **caught (false positive)** | allowed |
| `href="#fade"` in TSX | **caught (false positive)** | caught (accepted noise) |
| `--brand: #ff0000` outside token files | caught | caught |
| Literal in a token file, outside `@theme` | allowed (whole-file exemption) | caught |
| `@apply bg-[#ff0000];` on its own line | caught | caught |
| `.a { @apply bg-[#f00]; }` on one line | caught, but via the value regex, not the `@apply` path | caught |
| `@apply` in an exempt file | not checked at all | checked |
| `color: #fff; background: #000;` on one line | **1 report** | 2 reports (2 declarations) |
| Multiple literals in one declaration | 1 report | 1 report |
| `#1234567` (7 hex digits, not a valid color) | **caught (false positive)** | allowed |
| Code after `*/` on a comment-closing line | **not scanned** | scanned |
| Storybook `.css` / `.tsx` | skipped | [open question 6](#open-questions) |
| `.ts` object-literal class map | caught | [open question 7](#open-questions) — promised |

Three structural properties of today's implementation explain most of the table. The regex
has no `g` flag and `checkLine` returns after the first match, so a CSS line reports at most
once. It has no notion of properties, so it can neither see named colors nor tell a
declaration value from a `content` string or a `url()` fragment. And exemption is
`isExempt`-gated at the whole-file level in `linter.js`, which disables both the raw-color
check and the `@apply` check for the entire token file.
