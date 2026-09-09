---
rule: no-raw-css-color
legacy-id: 2
status: agreed
disposition: mixed
bias: false-positives
files: ["*.tsx", "*.ts", "*.css"]
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

## Disposition: three surfaces, three owners

This rule's `disposition` is `mixed`. One rationale and one value surface are enforced by
three different mechanisms, and nothing available covers more than its own third:

| Surface | Owner |
| --- | --- |
| `.css` declarations and `@apply` | `stylelint-declaration-strict-value`, via the package's `/stylelint` entry point (off-the-shelf) |
| Tailwind arbitrary values (`bg-[#ff0000]`) in `.tsx` / `.ts` | `oxlint-tailwindcss` restricted classes (off-the-shelf) |
| SVG presentation attributes and string constants in `.tsx` / `.ts` | **a custom rule in our plugin** |

The third row is decision **B4**. Nothing off-the-shelf reaches it:
`stylelint-declaration-strict-value` only sees `.css`, and `oxlint-tailwindcss` only
inspects class strings, so `fill="#ff0000"` is invisible to both. The broad sweep
(decision A7) does not close it either — the token rules ask *"is this a forbidden Tailwind
class?"*, and `#ff0000` is not a class. The custom rule asks the other question, *"is this
string a raw color?"*, and its implementation is the raw-color matcher the CSS surface
already needs, applied to the broad sweep's output. It is the fifth custom rule in the
package.

`.css` files are enforced by Stylelint; `.ts` and `.tsx` by Oxlint (decision B1 — the token
family covers all three file types, and the `.ts` object-literal map is the reason). The
surfaces are kept in separate subsections throughout, and the one remaining
[deferred question](#deferred-questions) is whether they should be separate rules — now a
three-way cut rather than a two-way one.

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

Both models are on in `recommended`, and the value-scoped backstop is a documented option
rather than a debate — see [Configuration](#configuration) for what turning it off costs.

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

The full 148-name CSS named-color set is enforced, and the list is **generated, not
hand-typed** — see [Configuration](#configuration). A partial list is the same class of
silent hole as a stale property list.

### Reporting granularity

One report per **declaration** on the CSS surface, regardless of how many literals the value
contains — `background: linear-gradient(#fff, #000)` is one problem, not two. On the
TSX/TS surfaces, one report per offending **class token** (`oxlint-tailwindcss`), and one
report per offending **JSX attribute or string literal** (the custom rule).

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

**Owner: the package's `/stylelint` entry point** (decision B2), reading the same `/policy`
module as the Oxlint side, so one policy governs both surfaces and the largest coverage
regression in the migration stays closed. This is a *different* rule from the raw-value
check, which matters for the token-file exemption below: `tokenFiles` is wired to the
raw-value rule's `ignoreFiles` only, so `@apply bg-[#ff0000]` inside a token file is still
caught. The whole-file blind spot covers raw literals in declaration values, not classes.

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

### TSX/TS: Tailwind arbitrary values

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

### TSX/TS: class strings wherever they are built

The class-string surface is whatever the shared class-string extractor can see. Under
decision A7 that is the **broad sweep**: every string literal and every static template
literal in the file, context-free, in `.tsx` and `.ts` alike. `cn()` / `clsx()` /
`twMerge()` arguments, `cva()` bases and variants, and object-literal maps in a constants
file are all simply *there*, with no special-case plumbing.

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
`oxlint-tailwindcss` coverage regression recorded in the migration plan, and it is promised
here. It is kept by the custom rule rather than left to chance: the broad sweep hands that
string to the raw-color matcher, and a Tailwind arbitrary-value bracket is a *delimited*
context, so reading `#ff0000` out of `bg-[#ff0000]` does not reopen the
[embedded-literal blind spot](#color-literals-embedded-in-longer-strings). Phase 4 still
decides whether `oxlint-tailwindcss` (or its `no-hardcoded-colors`) covers enough of this
that the second path is redundant — that is a de-duplication question, not a licence to
drop the promise.

### TSX/TS: color literals outside class strings — the custom rule

A raw color in `.tsx` or `.ts` is a violation whichever channel applies it. **This is the
custom rule's surface** (decision B4): SVG presentation attributes and free-standing string
constants are seen by neither planned off-the-shelf tool, and they are real bypasses — a
chart library handed `["#ff0000"]`, or an icon whose `fill` was never revisited when the
palette changed, is one of the most common ways a design system leaks. The `style` prop case
is deliberately shared with `no-style-color` — see
[Relationship to other rules](#relationship-to-other-rules).

```tsx caught
<div style={{ backgroundColor: "#f00" }} />

<div style={{ color: "rgb(255, 0, 0)" }} />

<div style={{ boxShadow: "0 0 4px #f00" }} />

<svg><rect fill="#ff0000" stroke="#00ff00" /></svg>

<svg><path stroke="rgb(0,255,0)" /></svg>

<svg><stop stopColor="#ff0000" /></svg>

<Chart colors={["#ff0000", "#00ff00"]} />

const CHART_SERIES = "#ff0000";
```

A whole-string color literal is caught anywhere in a `.tsx` or `.ts` file, not only in JSX —
the broad sweep does not care where the string lives, which is exactly the breadth today's
scanner has and a precise AST walk would have lost. Without property context there is a
residual false-positive class — a DOM selector or anchor whose
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

Case `.d` is allowed **here and only here**. Decision B5 bans `light-dark()` outright,
tokens or not, as a second theming mechanism competing with custom properties — but that
ban is owned by `no-dark-variant`, which flags the mechanism. This rule inspects the
arguments and finds no literal, so it stays quiet. `light-dark(#000, #fff)` reports under
both rules.

```tsx allowed
<div className="bg-primary text-primary-foreground" />

<div className="bg-[var(--color-primary)]" />

<div className="text-[--color-primary]" />

<div style={{ "--color-brand": userColor }} />
```

### The token files

`tokenFiles` is **consumer-supplied configuration** — the factory's `tokenFiles` key,
`["src/styles.css"]` in the `recommended` preset because that is this project's shape, not
because the linter knows where anyone's tokens live. Nothing is read from disk to discover
it and no path is derived from the package's own location; see
[Configuration](#configuration). Those files define the tokens, so a literal there is the
definition, not a bypass.

The exemption is **whole-file** (decision A11). It is wired to
`stylelint-declaration-strict-value`'s `ignoreFiles`, and whole-file is what `ignoreFiles`
provides. A literal in a `--color-*` declaration is allowed because it is the source of
truth; a literal in an ordinary styling declaration in the same file is allowed too, and
that is a **declared blind spot**, not a promise — see
[The token-file exemption is whole-file](#the-token-file-exemption-is-whole-file).

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

An earlier draft of this contract required the exemption to be **definition-scoped** — a
literal in a `--color-*` declaration allowed, an ordinary styling declaration in the same
file caught. That requirement is withdrawn. The capability is already known to be absent
from the tool, so promising it would have been promising a failure; declaring the limit is
the honest form of the same information, and putting it under
[Declared blind spots](#declared-blind-spots) means the harness asserts it, so a future
change that *starts* catching it fails CI and forces this document to be updated rather
than letting the behaviour drift silently.

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

Not caught, by decision. Each is either statically undecidable, unreachable with the chosen
tool, or belongs elsewhere. Listing them here means a future change that *starts* catching
one fails its assertion and forces this document to be updated.

### The token-file exemption is whole-file

Decision A11. `tokenFiles` is wired to `stylelint-declaration-strict-value`'s
`ignoreFiles`, which exempts the file, not the declaration. A raw color anywhere in a token
file is unlinted — including in an ordinary styling rule that has nothing to do with
defining a token. A token file that also carries base styles is therefore a place colors
can hide.

```css blindspot
body { background-color: #ffffff; }

.legacy-banner { color: #ff0000; }
```

Both cases are inside a file listed in `tokenFiles`. The mitigation is editorial rather
than technical: keep `tokenFiles` to files that only define tokens. The narrower the
list, the smaller this blind spot; a consumer who points it at a large stylesheet has
exempted that stylesheet. The `@apply` check is unaffected — it is a different rule and does
not consult `tokenFiles`.

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

The line is *literal present or not*, and it is the same line every rule in this repo draws:
this rule reports raw colors, and in none of the cases above is one written down.

An earlier draft justified this by calling ``className={`bg-${tone}`}`` legitimate
token-name interpolation. That justification is retired — decision **A7b** makes a color
prefix immediately preceding an interpolation a violation, owned by the token rules, with
the escape hatch (a lookup of complete class names, or a `--color-*` custom property) named
in the message. The blind spot above survives on its own merits, not on that one: the
literal genuinely is not there to report.

### Colors inside `url()` data URIs

An unescaped literal inside an embedded SVG is a genuine bypass this rule will not see.
Detecting it means parsing the data URI's payload as a separate document, which is out of
scope for both planned tools and for any successor.

```css blindspot
.a { background-image: url("data:image/svg+xml,<svg fill='#ff0000'></svg>"); }
```

### Color literals embedded in longer strings

Whole-string matching in TSX/TS is deliberate. A color spliced into a larger string is not
recovered. The single exception is a Tailwind arbitrary-value bracket — `bg-[#ff0000]` — a
*delimited* context with a known grammar, which the class surfaces read by design; free
prose around a literal has no such delimiter and is left alone.

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
- **`no-dark-variant`** owns theme-switching mechanism, and decision B5 settles
  `light-dark()`: it is **banned outright, tokens or not**, as a second theming mechanism
  competing with custom properties — the same argument that bans `dark:`. Ownership of that
  ban sits there, not here. This rule continues to inspect the *arguments*, so
  `light-dark(#000, #fff)` reports under both rules and
  `light-dark(var(--a), var(--b))` reports only under `no-dark-variant`. That is the same
  property-versus-value division of labour this rule already has with `no-style-color`.
- **The token rules** (`no-spectral-color`, `no-undefined-token`, `token-constraints`, …)
  own dynamically assembled *class names*. Decision A7b makes ``className={`bg-${tone}`}``
  a violation there, because a color prefix before an interpolation defeats every static
  guarantee. This rule stays quiet on it: no literal color is written down.
- **`token-constraints`** operates on token names within a prefix. Arbitrary values have no
  token name, so the two never see the same class.

## Message

Three surfaces, three emitters. Every message text must stand alone: suggestions do not
render in any CLI output format, and `meta.docs.url` is dead under Oxlint, so a diagnostic
cannot link a developer to this contract. The message text is the only channel, and nothing
may live only in a suggestion or only here.

Two of the three emitters are not ours. `stylelint-declaration-strict-value` and
`oxlint-tailwindcss` report under **their own rule ids**, which is the accepted cost of the
meta-package shape: a consumer suppressing one writes that package's rule id, not ours.
Only the custom rule reports under this plugin's namespace.

CSS (`stylelint-declaration-strict-value`):

```
text: "Raw color {{value}} in `{{property}}` — use a var(--color-*) token.
       Add one to {{tokenFile}} if none fits."
```

`{{tokenFile}}` is the first entry of the consumer's `tokenFiles`, interpolated by the
preset factory when it builds the Stylelint config. No path is hardcoded — a consumer whose
tokens live somewhere other than `src/styles.css` is told about their file, not ours. If
`tokenFiles` is empty the clause degrades to "Add one to your token file".

Tailwind arbitrary values (`oxlint-tailwindcss` restricted classes) carry a per-pattern
custom message, verified supported in Phase 0:

```
text: "raw color in `{{class}}` — colors must resolve through a var(--color-*) token"
```

The custom rule (Oxlint / ESLint):

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

## Configuration

Mechanism ships; policy is supplied. Everything below is an option with a `recommended`
default, not a fact about the world. A project that disagrees overrides the option; nobody
forks a rule.

| Option | Surface | `recommended` default | Overriding it |
| --- | --- | --- | --- |
| `tokenFiles` | CSS raw values, custom rule | **none — required**, supplied by the consumer (`tokenFiles` on the factory; `["src/styles.css"]` in this project) | Widening it widens the whole-file blind spot; narrowing it makes token definitions report |
| `namedColors` | all three | `true`, from the generated 148-name CSS set | `false` lets `color: red` and `text-[red]` through — the cheapest bypass of the token system |
| `valueScopedBackstop` | CSS | `true` (both enforcement models run) | `false` leaves only the property-scoped model, so any property missing from the list is a silent hole |
| `ignoreValues` | CSS | `["transparent", "currentColor", "inherit", "initial", "unset", "revert", "revert-layer"]` | Removing an entry flags values that are references or cascade operations, which trains developers to suppress the rule |
| `exclude` | all three | `["**/*.stories.*"]` | Set it to `[]` to lint stories; add globs to exempt more. Applies to both runners |

**`tokenFiles` is one value with two destinations.** The factory takes it once and
feeds it to `stylelint-declaration-strict-value`'s `ignoreFiles` *and* to the custom rule,
so the CSS and TS surfaces cannot disagree about which files define tokens. It is required
rather than defaulted to a path: a default path would be a guess about a consumer's layout,
and the rules must **fail loudly when it is absent** rather than returning early and
reporting nothing.

**Storybook.** The current runner skips stories wholesale via `isStorybookFile`, and nobody
remembers whether that was intent or convenience. As a configurable glob the question stops
needing an answer: stories are excluded by default because ad-hoc color is most tempting
and least harmful there, and a project that disagrees writes `exclude: []`.

**Named colors are generated, not hand-typed.** The CSS surface gets the full set for free
(`stylelint-declaration-strict-value` fails any non-`var()` value), but the class surface
needs the list explicitly for `text-[red]`. A hand-typed subset is the same class of silent
hole as a stale property list, so the list is produced from a machine-readable source at
build time.

### Distribution constraints

- **No filesystem reads, and no path derived from the package's own location.** Every path
  arrives as input: `tokenFiles` and `exclude` come from the consumer's config, never
  from a convention about where the plugin is installed. The 148-name color set and the
  color-property list are static data compiled into the package, not files read at runtime.
- **Discovery happens once at plugin-module load**, never inside `create()`, so `RuleTester`
  stays usable and a 200-file run pays no per-file cost.
- **Rule options replace, they do not merge — and failure is silent.** A consumer writing
  `"design/no-raw-css-color": "error"` to bump a severity **wipes the preset's options**.
  Every configured value goes at once: `tokenFiles`, `exclude`, the enforcement-model
  switches. Both failure modes are bad and neither announces itself — a rule that returns
  early on missing required options is enabled and catches nothing, exit 0; a rule that
  carries on reports inside the consumer's own token files, which reads as the linter being
  broken. This diverges from ESLint flat config, so it will surprise people. The mitigation
  is the one the plan mandates — **fail loudly** on absent required options rather than
  returning early, `defaultOptions` carries a usable baseline, and the README documents the
  footgun. To change severity only, restate the options:
  `["error", { tokenFiles: ["src/styles.css"] }]`.
- **Two of the three emitters are peer dependencies.** `oxlint-tailwindcss` and
  `stylelint-declaration-strict-value` are configured on the consumer's behalf, which
  couples this contract to their rule names and version ranges and puts their diagnostics
  under their own rule ids. Stated, not hidden.

## Deferred questions

One question remains, and it is deferred rather than open — it does not block
`status: agreed`.

1. **One rule, or two, or three?** *(deferred to Phase 4)*
   This contract now covers three mechanisms: a Stylelint rule over `.css`, an
   `oxlint-tailwindcss` restricted-classes pattern over `.tsx`/`.ts`, and a custom rule over
   the same files. They share a rationale and a value surface, and nothing else: different
   tools, different configuration, different suppression syntax (`stylelint-disable` vs
   `oxlint-disable`), different rule ids in the output, and — per Phase 4 — potentially
   different verdicts, since `no-hardcoded-colors` may subsume the arbitrary-value half
   while the CSS half stays Stylelint config.
   *Standing recommendation: split, but not yet.* Keep one contract through Phase 4, because
   the audit's central question ("does `no-hardcoded-colors` subsume the hand-written
   regex?") needs the halves visible in one document to answer. Decision B4 changes the
   shape of the answer rather than the timing: the cut is now **three-way, not two-way**,
   and the third piece is ours to maintain, which weakens the case for splitting on tool
   boundaries — a custom rule and a restricted-classes pattern that both run under Oxlint
   over the same files may be better documented together than apart. The sections above are
   partitioned by surface either way, so the split stays a cut rather than a rewrite.

The questions this section used to carry are settled and now live as prose:

| Was | Now |
| --- | --- |
| Is the definition-scoped token-file exemption achievable? | No — whole-file, and a [declared blind spot](#the-token-file-exemption-is-whole-file) (A11) |
| Does `light-dark(var(--a), var(--b))` violate anything? | Yes, but under `no-dark-variant`, not here (B5) — see [Relationship to other rules](#relationship-to-other-rules) |
| Do SVG attributes and string constants have an owner? | Yes — the custom rule (B4), see [Disposition](#disposition-three-surfaces-three-owners) |
| Does this rule apply to `.ts`? | Yes, `.tsx` `.ts` `.css` (B1) |
| Is the full named-color set enforced? | Yes, generated — [Configuration](#configuration) |
| Is the value-scoped backstop worth its noise? | Yes, both models — [Configuration](#configuration) |
| Are Storybook files excluded? | Yes, via the `exclude` glob — [Configuration](#configuration) |

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
| `background-color: light-dark(#fff, #000)` | caught (via hex) | caught (and again under `no-dark-variant`, B5) |
| `color: light-dark(var(--a), var(--b))` | missed | not this rule — reported by `no-dark-variant` (B5) |
| `color-mix(in oklch, var(--x), red)` | missed | caught |
| `color: currentColor` / `transparent` / `inherit` | allowed | allowed |
| `fill: url(#gradient)` | **caught (false positive)** | allowed |
| `content: "#fff"` | **caught (false positive)** | allowed |
| `href="#fade"` in TSX | **caught (false positive)** | caught (accepted noise) |
| `--brand: #ff0000` outside token files | caught | caught |
| Literal in a token file, outside `@theme` | allowed (whole-file exemption) | allowed — [declared blind spot](#the-token-file-exemption-is-whole-file) (A11) |
| `@apply bg-[#ff0000];` on its own line | caught | caught |
| `.a { @apply bg-[#f00]; }` on one line | caught, but via the value regex, not the `@apply` path | caught |
| `@apply` in an exempt file | not checked at all | checked |
| `color: #fff; background: #000;` on one line | **1 report** | 2 reports (2 declarations) |
| Multiple literals in one declaration | 1 report | 1 report |
| `#1234567` (7 hex digits, not a valid color) | **caught (false positive)** | allowed |
| Code after `*/` on a comment-closing line | **not scanned** | scanned |
| Storybook `.css` / `.tsx` | skipped | skipped by default, via the configurable `exclude` glob |
| `.ts` object-literal class map | caught | caught — `.ts` is in scope (B1) and A7's broad sweep sees the string |
| `<rect fill="#ff0000" />` in TSX | caught | caught, by the custom rule (B4) |
| `const CHART_SERIES = "#ff0000"` | caught | caught, by the custom rule (B4) |

Three structural properties of today's implementation explain most of the table. The regex
has no `g` flag and `checkLine` returns after the first match, so a CSS line reports at most
once. It has no notion of properties, so it can neither see named colors nor tell a
declaration value from a `content` string or a `url()` fragment. And exemption is
`isExempt`-gated at the whole-file level in `linter.js`, which disables both the raw-color
check and the `@apply` check for the entire token file.

The last of those three survives, and that is the one behavioural continuity worth naming:
the exemption stays whole-file (A11), but it is now a *declared* blind spot rather than an
implementation accident, it is narrowed to the raw-value check rather than covering
`@apply` too, and the file list arrives as consumer configuration rather than from a
project-local JSON file the linter reads for itself.
