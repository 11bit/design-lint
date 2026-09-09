---
rule: no-raw-color
legacy-id: 2
status: agreed
disposition: custom
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-raw-color

**A color must never be written as a literal value. Every applied color resolves through a
`var(--color-*)` token.**

A literal color is a fact about one pixel at one moment. It does not change with the theme,
it does not appear in the token audit, and it cannot be renamed. `#0a7cff` written in a
`className`, an SVG `fill`, or a chart's series array is invisible to the design system:
nothing links it to `--color-primary`, so the day the brand blue moves, that one value stays
behind. The same is true of `rgb(10 124 255)`, of `red`, and of `bg-[#0a7cff]` — the syntax
differs, the failure is identical.

The token files are the one place a literal is legitimate, because that is where the token
system is defined. Everywhere else, a color is a *reference*: a semantic utility class, a
`var(--color-*)` arbitrary value, `currentColor`. Where a genuinely new color is needed, the
fix is to add a token, not to inline the value — see
[Deliberately allows](#deliberately-allows) for the narrow set of values that are not colors
in this sense.

## Disposition: one owner, two surfaces

This rule's `disposition` is `custom`. One rationale, one value surface, **one
implementation** — a rule in our own plugin, running under Oxlint over
`.js` / `.ts` / `.jsx` / `.tsx`.

| Surface | Owner |
| --- | --- |
| Tailwind arbitrary values (`bg-[#ff0000]`) in class strings | **a custom rule in our plugin** |
| SVG presentation attributes, `style` prop values, and free-standing string constants | **the same custom rule** |
| `.css` declarations and `@apply` | **deferred — no owner today**, see [Deferred: CSS surface](#deferred-css-surface) |

This is a change from an earlier draft, which had three surfaces with three owners:
`stylelint-declaration-strict-value` over `.css`, `oxlint-tailwindcss` over class strings,
and a custom rule (decision **B4**) over everything else. Two of those three are gone:

- **All nine rules are authored in-house.** `oxlint-tailwindcss` and
  `stylelint-declaration-strict-value` are no longer dependencies, so the arbitrary-value
  half is ours to implement rather than to configure. It was always going to share the
  raw-color matcher with the rest of the rule; now it shares the rule.
- **The CSS surface is out of scope for now.** `.css` files and `@apply` are *deferred* —
  planned work with a written contract, not a declared blind spot. Nothing enforces them
  today, and this document says so where it used to make promises.

What is left is a single coherent idea: **a raw color literal written down in application
code is a violation, whichever channel applies it** — a Tailwind arbitrary value, an SVG
attribute, a `style` prop, or a bare string constant handed to a charting library. One
matcher answers *"is this string a raw color?"*, and the surfaces differ only in how the
string is reached.

`tokenFiles` remains a **required option** and is unaffected by the scope change. Those
files are an *input* — the rule reads them to derive the semantic token set that a suggestion
can point at — not a linted surface. Narrowing the linted file set does not narrow the
inputs; see [Configuration](#configuration).

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not. Fences in [Deferred: CSS surface](#deferred-css-surface) carry **no tag** and
> are not executed by the harness — they describe work not yet done.

## Promises to catch

### The value surface

These are the forms a color literal can take. Every promise below is written against this
set; it is enumerated once here rather than repeated per surface.

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
`fill="red"` is a raw literal by any reading of the rationale — it is unthemed, untokenised
and unrenameable — and excluding it would leave the cheapest possible way to bypass the
token system wide open. The objection is false positives: `red` is also an ordinary English
word, so bare word-matching would flag `<div id="red" />`, `const red = …`, and
`"animate-fadeToRed"`.

The resolution is that this rule never matches bare words in isolation. A named color is
recognised **only inside a color-carrying context** — the value of a color-carrying SVG
attribute or `style` property, the bracket of a color-carrying Tailwind utility
(`text-[red]`), or the arguments of a color function. Each of those is delimited with a known
grammar, so the false-positive class disappears without narrowing coverage on any surface
that renders a color.

**System colors are in scope** for the same reason — `ButtonText` is a literal the token
system cannot see. The `@media (forced-colors: active)` carve-out that used to accompany this
is a CSS construct and returns with the CSS surface; there is no equivalent context in
`.tsx`, so no carve-out applies today.

### Enforcement model

The contract requires **both** models, because each covers the other's hole:

1. **Context-scoped.** Every color-carrying channel must resolve its color through a token:
   the color-carrying SVG presentation attributes, the color-carrying `style` properties, and
   the color-carrying Tailwind utility prefixes. This is what catches `fill="red"`,
   `style={{ color: "red" }}` and `text-[red]` without pattern-matching words.
2. **Value-scoped backstop.** A syntactically unambiguous color literal — hex, or any of the
   color function heads — is caught in *any* string literal in the file, whether or not its
   context is on a list. This is what catches `const SERIES = ["#ff0000"]`, which belongs to
   no attribute and no utility prefix at all.

The context-scoped model alone is incomplete: the attribute and property lists are
hand-maintained, and a free-standing constant has no context to scope to. The value-scoped
model alone is incomplete in the other direction: it cannot see `red`. Requiring only one of
them would be promising coverage this rule does not have.

Both models are on in `recommended`, and the value-scoped backstop is a documented option
rather than a debate — see [Configuration](#configuration) for what turning it off costs.

**The color-carrying property set**, which the context-scoped half must cover in full, is one
generated list with two readings today:

*As SVG presentation attributes* (JSX accepts both the camelCase and the dashed spelling, and
both are checked):

`fill` · `stroke` · `color` · `stopColor` / `stop-color` · `floodColor` / `flood-color` ·
`lightingColor` / `lighting-color`

*As `style` prop properties* (camelCase):

`color` · `backgroundColor` · `borderColor` and the four sides plus block/inline ·
`outlineColor` · `textDecorationColor` · `textEmphasisColor` · `columnRuleColor` ·
`caretColor` · `accentColor` · `scrollbarColor` · `fill` · `stroke` · `stopColor` ·
`floodColor` · `lightingColor` · `WebkitTextFillColor` · `WebkitTextStrokeColor`

and the shorthands and color-capable properties:

`background` · `backgroundImage` · `border` (and all four sides, plus block/inline) ·
`outline` · `textDecoration` · `textEmphasis` · `columnRule` · `boxShadow` · `textShadow` ·
`filter` · `backdropFilter` · `borderImage` · `borderImageSource` · `maskImage` ·
`listStyle` · `listStyleImage` · `WebkitTextStroke` · `caret`

*As Tailwind color-carrying utility prefixes*, which is where `text-[red]` is recognised:

`bg-` · `text-` · `border-` · `divide-` · `outline-` · `ring-` · `ring-offset-` · `shadow-` ·
`accent-` · `caret-` · `decoration-` · `fill-` · `stroke-` · `from-` · `via-` · `to-` ·
`placeholder-`

The full 148-name CSS named-color set is enforced, and the list — like the property set — is
**generated, not hand-typed**; see [Configuration](#configuration). A partial list is a
silent hole. The same generated data serves the CSS declaration surface unchanged when that
surface lands.

### Reporting granularity

One emitter, one namespace, and one report per offending **thing**: per class token in a
class string (`"bg-[#f00] text-[#0f0]"` is two), per JSX attribute
(`<rect fill="#f00" stroke="#0f0" />` is two), and per string literal everywhere else.
`style={{ boxShadow: "0 0 4px #f00, 0 0 8px #00f" }}` is one report — one value, however many
literals it contains.

### Tailwind arbitrary values

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

<div className="text-[red]" />

<div className="bg-[ButtonText]" />

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

### Class strings wherever they are built

The class-string surface is whatever the shared class-string extractor can see. Under
decision A7 that is the **broad sweep**: every string literal and every static template
literal in the file, context-free, across `.js` / `.ts` / `.jsx` / `.tsx` alike. `cn()` /
`clsx()` / `twMerge()` arguments, `cva()` bases and variants, and object-literal maps in a
constants file are all simply *there*, with no special-case plumbing.

```tsx caught
<div className={cn("bg-[#ff0000]", className)} />

<div className={clsx(isActive && "text-[#f00]")} />

<div className={twMerge("bg-[#f00]", "p-2")} />

const button = cva("rounded", {
  variants: { tone: { danger: "bg-[#ff0000]" } },
});

const badgeColor = { danger: "bg-[#ff0000]", ok: "bg-primary" };
```

The last case — a color class in a `.ts` object-literal map — was the known coverage
regression recorded in the migration plan, and it is promised here. The broad sweep hands
that string to the raw-color matcher, and a Tailwind arbitrary-value bracket is a *delimited*
context, so reading `#ff0000` out of `bg-[#ff0000]` does not reopen the
[embedded-literal blind spot](#color-literals-embedded-in-longer-strings). There is no longer
a second path to de-duplicate against: with the arbitrary-value half implemented in-house,
one matcher covers it and the Phase 4 audit that would have compared ours against
`oxlint-tailwindcss` has nothing left to compare.

### SVG presentation attributes

An icon whose `fill` was never revisited when the palette changed is one of the most common
ways a design system leaks, and it is invisible to anything that only reads class strings.

```tsx caught count=2
<svg><rect fill="#ff0000" stroke="#00ff00" /></svg>
```

```tsx caught
<circle fill="#ff0000" />

<svg><path stroke="rgb(0,255,0)" /></svg>

<svg><stop stopColor="#ff0000" /></svg>

<svg><stop stop-color="red" /></svg>

<svg><feFlood floodColor="#f00" /></svg>

<path fill="rebeccapurple" />
```

### Style prop values

Shared deliberately with `no-style-color`, which owns the *mechanism* while this rule owns
the *value* — see [Relationship to other rules](#relationship-to-other-rules).

```tsx caught
<div style={{ backgroundColor: "#f00" }} />

<div style={{ color: "rgb(255, 0, 0)" }} />

<div style={{ color: "red" }} />

<div style={{ boxShadow: "0 0 4px #f00" }} />

<div style={{ background: "linear-gradient(#fff, #000)" }} />
```

### String constants

A raw color in a `.ts` or `.tsx` constant is a violation whichever consumer eventually
applies it. The value-scoped backstop reaches these; no attribute or utility prefix is
involved.

```tsx caught
<Chart colors={["#ff0000", "#00ff00"]} />

const CHART_SERIES = "#ff0000";

export const BRAND = { blue: "#0a7cff" };

const gridStroke = "rgb(200 200 200)";
```

A whole-string color literal is caught anywhere in a linted file, not only in JSX — the broad
sweep does not care where the string lives, which is exactly the breadth today's scanner has
and a precise AST walk would have lost. Without surrounding context there is a residual
false-positive class — a DOM selector or anchor whose identifier happens to be hex-only,
`"#face"` or `"#decade"` — which `bias: false-positives` accepts as suppressible noise. See
[Deliberately allows](#deliberately-allows) for the non-hex cases that must stay quiet
regardless.

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

```tsx allowed
<svg><path fill="currentColor" /></svg>

<circle fill="transparent" stroke="currentColor" />

<div className="border-[transparent]" />

<div style={{ color: "currentColor" }} />

<div style={{ backgroundColor: "transparent" }} />

<div style={{ color: "inherit" }} />

<div style={{ borderColor: "revert" }} />

<div className="bg-[color-mix(in_oklch,var(--color-primary)_50%,transparent)]" />
```

### Token references

```tsx allowed
<div className="bg-primary text-primary-foreground" />

<div className="bg-[var(--color-primary)]" />

<div className="text-[--color-primary]" />

<div style={{ "--color-brand": userColor }} />

<svg><path fill="var(--color-primary)" /></svg>

<div className="bg-[light-dark(var(--color-fg-light),var(--color-fg-dark))]" />
```

The last case is allowed **here and only here**. Decision B5 bans `light-dark()` outright,
tokens or not, as a second theming mechanism competing with custom properties — but that ban
is owned by `no-dark-variant`, which flags the mechanism. This rule inspects the arguments and
finds no literal, so it stays quiet. `light-dark(#000, #fff)` reports under both rules.

### `url()` and fragment references

Everything inside `url()` is an address. The `#` there is a fragment identifier — most often
an SVG element reference — not a hex color.

```tsx allowed
<svg><path fill="url(#gradient-primary)" /></svg>

<rect mask="url(#mask-fade)" />

<div className="bg-[url('/img.png')]" />

<div style={{ backgroundImage: "url('/img/hero.png#anchor')" }} />
```

### Comments

A literal in a comment is prose about a color, not a color. The broad sweep reads string
literals and static template literals; a comment is neither, so this falls out of the design
rather than needing a carve-out.

```tsx allowed
// brand blue is #0a7cff
<div className="bg-primary" />

/* was rgb(255, 0, 0) before the token migration */
<div className="bg-danger" />
```

### Non-color arbitrary values

```tsx allowed
<div className="w-[calc(100%-2rem)]" />

<div className="grid-cols-[1fr_auto]" />

<div className="text-[13px]" />

<div className="bg-[#zz]" />

<div className="animate-[fadeToRed_2s]" />
```

### Non-color strings

```tsx allowed
<a href="#pricing">Pricing</a>

<div id="app-root" />

document.querySelector("#app-root");

const heading = "Rules #1 and #2";

const label = "red";

const theme = { name: "tomato" };
```

The last two are the point of the context-scoped model: `red` and `tomato` are named colors,
and neither appears in a color-carrying context, so neither reports.

## Declared blind spots

Not caught, by decision. Each is either statically undecidable, unreachable, or belongs
elsewhere. Listing them here means a future change that *starts* catching one fails its
assertion and forces this document to be updated.

Note what is **not** in this list any more: the CSS surface. An unenforced surface with a
written plan is deferred work, not a blind spot, and conflating the two would let a schedule
harden into a limitation. It lives in [Deferred: CSS surface](#deferred-css-surface).

### Dynamically composed values

The literal is not present as a literal.

```tsx blindspot
const hue = 0;
<div className={`bg-[hsl(${hue},100%,50%)]`} />;

<div className={"bg-[#" + hexFromProps + "]"} />;

<div style={{ color: computeColor(theme) }} />;

<circle fill={props.seriesColor} />;
```

The line is *literal present or not*, and it is the same line every rule in this repo draws:
this rule reports raw colors, and in none of the cases above is one written down.

An earlier draft justified this by calling ``className={`bg-${tone}`}`` legitimate
token-name interpolation. That justification is retired — decision **A7b** makes a color
prefix immediately preceding an interpolation a violation, owned by the token rules, with
the escape hatch (a lookup of complete class names, or a `--color-*` custom property) named
in the message. The blind spot above survives on its own merits, not on that one: the
literal genuinely is not there to report.

### Color literals embedded in longer strings

Whole-string matching is deliberate. A color spliced into a larger string is not recovered.
The single exception is a Tailwind arbitrary-value bracket — `bg-[#ff0000]` — a *delimited*
context with a known grammar, which the class surface reads by design; free prose around a
literal has no such delimiter and is left alone.

```tsx blindspot
const css = "color: #ff0000; padding: 4px";

<div dangerouslySetInnerHTML={{ __html: "<b style='color:#f00'>hi</b>" }} />;

<img src="data:image/svg+xml,<svg fill='#ff0000'></svg>" />;
```

The data URI is the uncomfortable one: an unescaped `#ff0000` inside it *is* a color and *is*
a bypass. Distinguishing it from an ordinary fragment identifier means parsing the embedded
document as a separate grammar, which is out of scope here and would be out of scope for the
CSS surface too.

### CSS-in-JS

No `styled-components` / Emotion usage exists in the target codebase. If that changes it
becomes a new rule, not an extension of this one — the CSS inside a tagged template is a
separate surface with a separate parser, and notably *not* the same one as the deferred `.css`
surface: a tagged template is JS the linter already reads, a stylesheet is a file it does not.

```tsx blindspot
const Box = styled.div`
  color: #ff0000;
`;
```

### Non-CSS color channels

Colors reaching the page by a route that is neither a class string, an attribute, a style
prop, nor a plain string constant.

```tsx blindspot
canvas.getContext("2d").fillStyle = "#ff0000";

element.style.setProperty("--brand", "#ff0000");
```

The first is a member assignment whose right-hand side *is* a whole-string literal, so the
value-scoped backstop would in principle see it; it is listed here because the current
extractor reaches string literals through the class-string sweep and this one is not promised.
The second is `no-style-color`'s sanctioned escape hatch being fed a literal. Neither rule
catches it, and that is the accepted cost of the escape hatch existing.

## Deferred: CSS surface

**Nothing in this section is enforced today.** The linter reads `.js`, `.ts`, `.jsx` and
`.tsx` only. `.css` files are not parsed, `@apply` is not inspected, and no Stylelint
integration ships. This is *deferred work with a written contract*, not a declared blind
spot: the promises below are the ones this rule will make when the CSS surface lands, and
they are recorded here so the design does not have to be rediscovered.

Every fence in this section is an **untagged** ` ```css ` block — no `caught`, `allowed` or
`blindspot` marker — precisely so the harness does not execute it. A harness assertion is a
promise being kept; these are promises not yet made, and a green CI run must not be able to
claim otherwise.

### What returns with it

Both enforcement models, unchanged in substance, applied to declarations:

- **Property-scoped.** Every declaration whose property is on the generated color-carrying
  list must resolve its color through `var()`. This catches `color: red` and
  `border: 1px solid darkslategray` without bare-word matching.
- **Value-scoped backstop.** Hex or any color-function head is caught in any declaration
  value, whether or not the property is listed — `mask-image: linear-gradient(#fff,
  transparent)` when nobody remembered to list `mask-image`.

The color-carrying property list is the same generated data the `style` prop surface already
uses, read in its dashed spelling. Reporting granularity is one report per **declaration**,
however many literals the value contains.

```css deferred
/* would be caught: color-only properties */
.a { color: #ff0000; }
.b { background-color: rgb(255 0 0); }
.c { border-top-color: oklch(0.7 0.15 30); }
.d { -webkit-text-fill-color: #ffffff80; }

/* would be caught: named and system values, via the property */
.e { color: red; }
.f { border: 1px solid darkslategray; }
.g { color: ButtonText; }

/* would be caught: shorthands, gradients and shadows, via the backstop */
.h { background: linear-gradient(#fff, #000); }
.i { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }
.j { mask-image: linear-gradient(#fff, transparent); }

/* would be caught: a custom property defined outside the token files */
.k { --brand: #ff0000; }
```

```css deferred
/* would be allowed: references, keywords, comments, url(), content, preludes */
.a { color: var(--color-primary); }
.b { color: currentColor; background-color: transparent; }
.c { fill: url(#gradient-primary); }
.d::before { content: "#fff"; }
.e { grid-area: red; font-family: "Tomato", sans-serif; }

@supports (color: color(display-p3 1 0 0)) { .f { color: var(--color-primary); } }

@media (forced-colors: active) {
  /* the system-color carve-out: here they are the only correct values */
  .g { color: CanvasText; background-color: Canvas; }
}
```

`@apply` returns with it. `@apply` carries Tailwind classes into CSS, so the arbitrary-value
surface reappears there and the same matcher covers it — `@apply bg-[#ff0000]` is the class
surface wearing CSS syntax.

```css deferred
/* would be caught */
.a { @apply bg-[#ff0000]; }
.b { @apply rounded-md border-[#f00] p-2; }

/* would be allowed */
.c { @apply bg-primary text-primary-foreground; }
.d { @apply bg-[var(--color-primary)]; }
```

One blind spot returns with the surface rather than being solved by it: an unescaped literal
inside a `url()` data URI stays undetected, for the same reason it does on the JS side — it
requires parsing the embedded document.

### A11 is moot

Decision **A11** asked whether the token-file exemption could be *definition-scoped* — a
literal in a `--color-*` declaration allowed, a literal in an ordinary styling declaration in
the same file caught. The answer recorded at the time was **no, whole-file**, and it was
recorded as a declared blind spot. That answer was never about what the contract wanted; it
was about what `stylelint-declaration-strict-value`'s `ignoreFiles` could express, which was
whole-file or nothing.

**Both premises are gone.** The CSS surface is deferred, so there is no token-file exemption
in force at all today — nothing in the linted file set is exempt on `tokenFiles` grounds — and
the implementation, when CSS returns, will be ours. A rule we write can scope an exemption to
a declaration as easily as to a file.

So A11 is **moot, not answered**. The blind spot it produced is withdrawn along with the
surface that produced it, and the constraint that forced it no longer exists. When the CSS
surface lands, the exemption should be **definition-scoped** — which is what this contract
originally asked for, before the tool's limits overruled it:

```css deferred
/* src/styles.css — a file listed in tokenFiles */
@theme { --color-primary: oklch(0.62 0.19 259); }   /* allowed: the definition */
.legacy-banner { color: #ff0000; }                   /* would be caught: not a definition */
```

This is written down so the reasoning is not lost and the question is not re-litigated from
scratch. The whole-file exemption was a concession to a dependency we no longer have; it
should not be reinherited by default when the surface comes back.

### The regression this creates, stated plainly

The current linter *does* check `.css` and `@apply`. Deferring the surface is therefore a
real, temporary coverage loss, not a no-op — see the CSS rows in
[Deltas](#deltas-from-the-current-implementation), which are marked rather than deleted. The
mitigation is that it is scheduled, scoped and written down here, and that the token
definitions themselves live in the token files, which were exempt anyway.

## Relationship to other rules

- **`no-style-color`** overlaps deliberately, and the division of labour is the same read
  from either side: that rule flags the *property* (`color:` appearing in a `style` prop),
  this rule flags the *value* (`#f00`, `rgb(...)`, `red`) wherever it appears.
  `style={{ color: "#f00" }}` therefore reports **twice**, which is correct — the mechanism
  and the literal are independently wrong, and fixing only one leaves a real defect. **This
  interaction is unaffected by the scope change**: it is entirely a `.tsx` interaction between
  two rules that both still run, and `no-style-color`'s statement of it stands as written.
  `style={{ color: brandToken }}` reports once, from `no-style-color` only.
  `className="bg-[#f00]"` reports once, from this rule only.
- **`no-undefined-token`** owns whether a token *name* is real. This rule only asks whether
  a value is a literal or a reference; `bg-[var(--color-nonexistent)]` is clean here and
  that rule's problem. The same division applies to a custom property defined in code: whether
  `--brand` is a *sanctioned* token name is not this rule's question.
- **`no-spectral-color`** owns palette classes (`bg-red-500`). Those are token references —
  wrong tokens, but references — so this rule stays quiet on them. `bg-[#ef4444]` is this
  rule's, even though it is the same color.
- **`no-dark-variant`** owns theme-switching mechanism, and decision B5 settles
  `light-dark()`: it is **banned outright, tokens or not**, as a second theming mechanism
  competing with custom properties — the same argument that bans `dark:`. Ownership of that
  ban sits there, not here. This rule continues to inspect the *arguments*, so
  `bg-[light-dark(#000,#fff)]` reports under both rules and
  `bg-[light-dark(var(--a),var(--b))]` reports only under `no-dark-variant`. That is the same
  property-versus-value division of labour this rule already has with `no-style-color`.
- **The token rules** (`no-spectral-color`, `no-undefined-token`, `token-constraints`, …)
  own dynamically assembled *class names*. Decision A7b makes ``className={`bg-${tone}`}``
  a violation there, because a color prefix before an interpolation defeats every static
  guarantee. This rule stays quiet on it: no literal color is written down.
- **`token-constraints`** operates on token names within a prefix. Arbitrary values have no
  token name, so the two never see the same class.

## Message

One surface family, **one emitter, one namespace**. Every diagnostic this contract produces
is reported by our own rule under this plugin's rule id — a plain improvement over the
earlier shape, where two of three emitters reported under third-party rule ids and a consumer
suppressing one had to write a foreign rule name.

Every message text must stand alone: suggestions do not render in any CLI output format, and
`meta.docs.url` is dead under Oxlint, so a diagnostic cannot link a developer to this
contract. The message text is the only channel, and nothing may live only in a suggestion or
only here.

```
messageId: rawColorValue
data:      { value, surface, tokenFile }
text:      "raw color {{value}} in {{surface}} — colors must resolve through a
            var(--color-*) token. Add one to {{tokenFile}} if none fits."
```

where `surface` is one of `an arbitrary value`, `a style prop`, `an SVG attribute`,
`a string literal`.

`{{tokenFile}}` is the first entry of the consumer's `tokenFiles`, interpolated at report
time. No path is hardcoded — a consumer whose tokens live somewhere other than
`src/styles.css` is told about their file, not ours. If `tokenFiles` is empty the clause
degrades to "Add one to your token file". This is the second reason `tokenFiles` survives the
scope change intact: it is where the fix goes, whether or not the file is linted.

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
| `tokenFiles` | **input, not a linted surface** | **none — required**, supplied by the consumer (`tokenFiles` on the factory; `["src/styles.css"]` in this project) | The rule loses the token set it matches suggestions against and the path it names in the message. Absent, the rule fails loudly rather than reporting nothing |
| `namedColors` | both surfaces | `true`, from the generated 148-name CSS set | `false` lets `fill="red"` and `text-[red]` through — the cheapest bypass of the token system |
| `valueScopedBackstop` | string constants | `true` (both enforcement models run) | `false` leaves only the context-scoped model, so `const SERIES = ["#ff0000"]` — a literal with no attribute and no utility prefix — goes unseen |
| `ignoreValues` | both surfaces | `["transparent", "currentColor", "inherit", "initial", "unset", "revert", "revert-layer"]` | Removing an entry flags values that are references or cascade operations, which trains developers to suppress the rule |
| `exclude` | both surfaces | `["**/*.stories.*"]` | Set it to `[]` to lint stories; add globs to exempt more |

**`tokenFiles` is an input, and the scope change does not touch it.** It is read to derive
the semantic token set — which token names exist, and what value each resolves to — which is
what makes an exact-match suggestion possible and what fills `{{tokenFile}}` in the message.
That the files themselves happen to be `.css`, and that `.css` is not currently linted, are
independent facts: the rule *reads* those files, it does not *check* them. Removing the
option because "CSS is out of scope" would be a category error.

The option's second job — exempting token files from being linted — is dormant, not gone. It
had force only over the CSS surface, so today it exempts nothing, because nothing in the
linted file set is a token file. It resumes when the CSS surface lands, and it resumes
**definition-scoped** rather than whole-file; see [A11 is moot](#a11-is-moot).

It is required rather than defaulted to a path: a default path would be a guess about a
consumer's layout, and the rule must **fail loudly when it is absent** rather than returning
early and reporting nothing.

**Storybook.** The current runner skips stories wholesale via `isStorybookFile`, and nobody
remembers whether that was intent or convenience. As a configurable glob the question stops
needing an answer: stories are excluded by default because ad-hoc color is most tempting
and least harmful there, and a project that disagrees writes `exclude: []`.

**Named colors are generated, not hand-typed.** The list is needed explicitly for `text-[red]`
and `fill="red"`. A hand-typed subset is the same class of silent hole as a stale property
list, so the list is produced from a machine-readable source at build time. The
color-carrying property set is generated the same way, from the same build step, and both are
static data compiled into the package.

### Distribution constraints

- **No third-party emitters, and no lint dependencies.** `oxlint-tailwindcss` and
  `stylelint-declaration-strict-value` are no longer dependencies of this package. Nothing
  here is configured on a foreign rule's behalf, nothing is coupled to a foreign rule's names
  or version ranges, and every diagnostic carries our rule id. The earlier peer-dependency
  caveat is withdrawn along with the dependencies.
- **No filesystem reads for discovery, and no path derived from the package's own location.**
  Every path arrives as input: `tokenFiles` and `exclude` come from the consumer's config,
  never from a convention about where the plugin is installed. The 148-name color set and the
  color-property list are static data compiled into the package, not files read at runtime.
  Reading the consumer's `tokenFiles` is the one deliberate exception, and it happens once —
  see the next bullet.
- **Discovery happens once at plugin-module load**, never inside `create()`, so `RuleTester`
  stays usable and a 200-file run pays no per-file cost.
- **Rule options replace, they do not merge — and failure is silent.** A consumer writing
  `"design/no-raw-color": "error"` to bump a severity **wipes the preset's options**.
  Every configured value goes at once: `tokenFiles`, `exclude`, the enforcement-model
  switches. Both failure modes are bad and neither announces itself — a rule that returns
  early on missing required options is enabled and catches nothing, exit 0; a rule that
  carries on has no token set to match suggestions against and no file to name in its
  message. This diverges from ESLint flat config, so it will surprise people. The mitigation
  is the one the plan mandates — **fail loudly** on absent required options rather than
  returning early, `defaultOptions` carries a usable baseline, and the README documents the
  footgun. To change severity only, restate the options:
  `["error", { tokenFiles: ["src/styles.css"] }]`.

## Deferred questions

**None.** The one question this section carried is now resolved.

### Resolved: one rule, not two (or three)

*Previously deferred to Phase 4.* The question was whether this contract's surfaces should be
separate rules. **They should not. This is one rule.**

The case for splitting was always a case about *tool boundaries*, not about the idea: three
mechanisms meant different configuration, different suppression syntax (`stylelint-disable`
vs `oxlint-disable`), different rule ids in the output, and potentially different verdicts
from a Phase 4 audit of whether `oxlint-tailwindcss`'s `no-hardcoded-colors` subsumed our
hand-written matcher. Every one of those premises is gone:

| Premise for splitting | Status |
| --- | --- |
| Two runners, two suppression syntaxes | Gone — one runner, Oxlint |
| Two third-party rule ids plus ours | Gone — one rule id, ours |
| Phase 4 must compare our matcher against `no-hardcoded-colors` | Gone — no such dependency to compare against |
| Three separately configured mechanisms | Gone — one options object |

What remains is one matcher, one options object, one emitter and one rationale, applied to
strings reached three slightly different ways. That is a rule, not three rules sharing a
document. Splitting it would produce three rules that must be enabled together, configured
identically, and suppressed in the same syntax — pure surface area with nothing behind it.

This is resolved now rather than at Phase 4 because Phase 4's job here was to audit a
third-party dependency that no longer exists; there is nothing left for it to decide. The one
thing that could reopen the question is the CSS surface: if it lands as a Stylelint rule
rather than as an extension of this one, the *two-runner* premise returns, and with it a real
two-way cut. That decision belongs to the phase that builds the CSS surface, on the evidence
available then. It is not deferred work on this contract — the JS/TS rule is settled either
way, and the sections above stay partitioned by surface, so a future cut is a cut rather than
a rewrite.

The questions this section used to carry are settled and now live as prose:

| Was | Now |
| --- | --- |
| Is the definition-scoped token-file exemption achievable? | **Moot** (A11) — the constraint was the tool's, the tool is gone, the surface is deferred; definition-scoped is the target when CSS returns, see [A11 is moot](#a11-is-moot) |
| One rule, or two, or three? | One — [resolved above](#resolved-one-rule-not-two-or-three) |
| Do SVG attributes and string constants have an owner? | Yes — the custom rule (B4), which is now the whole rule |
| Does `light-dark(var(--a), var(--b))` violate anything? | Yes, but under `no-dark-variant`, not here (B5) — see [Relationship to other rules](#relationship-to-other-rules) |
| Does this rule apply to `.ts`? | Yes — `.js` `.ts` `.jsx` `.tsx` (B1, as narrowed by the CSS deferral) |
| Is the full named-color set enforced? | Yes, generated — [Configuration](#configuration) |
| Is the value-scoped backstop worth its noise? | Yes, both models — [Configuration](#configuration) |
| Are Storybook files excluded? | Yes, via the `exclude` glob — [Configuration](#configuration) |

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

For migration reference. The current rule is a single regex,
`/#[0-9a-fA-F]{3,8}\b|(?:rgb|rgba|hsl|hsla|oklch|lch|lab|oklab|hwb)\s*\(/`, applied
line-wise to `.css` and token-wise to string literals extracted from `.ts`/`.tsx`.

Rows marked **deferred** are ones where the current linter checks something this contract
does not yet cover. They are a real coverage regression, taken deliberately and scheduled —
see [Deferred: CSS surface](#deferred-css-surface).

| Case | Today | Under this contract |
| --- | --- | --- |
| `bg-[#ff0000]` | caught | caught |
| `text-[red]` (named, in a color utility) | missed | caught |
| `bg-[ButtonText]` (system) | missed | caught |
| `bg-[color(display-p3_1_0_0)]` | missed | caught |
| `bg-[light-dark(#fff,#000)]` | caught (via hex) | caught (and again under `no-dark-variant`, B5) |
| `bg-[light-dark(var(--a),var(--b))]` | missed | not this rule — reported by `no-dark-variant` (B5) |
| `bg-[color-mix(in_oklch,var(--x),red)]` | missed | caught |
| `bg-[#f00] text-[#0f0]` in one string | 1 report | 2 reports (one per class token) |
| `.ts` object-literal class map | caught | caught — `.ts` is in scope and A7's broad sweep sees the string |
| `<rect fill="#ff0000" />` in TSX | caught | caught, by name, as an SVG attribute (B4) |
| `<rect fill="red" />` | missed | caught |
| `<rect fill="#f00" stroke="#0f0" />` | 1 report | 2 reports (one per attribute) |
| `style={{ color: "#f00" }}` | caught | caught (and again under `no-style-color`) |
| `style={{ color: "red" }}` | missed | caught |
| `const CHART_SERIES = "#ff0000"` | caught | caught, by the value-scoped backstop (B4) |
| `href="#fade"` in TSX | **caught (false positive)** | caught (accepted noise) |
| `#1234567` (7 hex digits, not a valid color) | **caught (false positive)** | allowed |
| `const label = "red"` (no color context) | missed | allowed, deliberately — the context-scoped model |
| `bg-[url('/img.png')]` | allowed | allowed |
| `fill="url(#gradient)"` in TSX | **caught (false positive)** | allowed |
| `currentColor` / `transparent` / `inherit` | allowed | allowed |
| Storybook `.tsx` | skipped | skipped by default, via the configurable `exclude` glob |
| `.jsx` / `.js` files | not scanned | scanned — same rule, same surfaces |
| `color: #ff0000` in `.css` | caught | **deferred** — `.css` not linted |
| `color: red` in `.css` | missed | **deferred** — `.css` not linted |
| `--brand: #ff0000` outside token files | caught | **deferred** — `.css` not linted |
| `@apply bg-[#ff0000];` | caught | **deferred** — `.css` not linted |
| Literal in a token file, outside `@theme` | allowed (whole-file exemption) | **deferred** — nothing in a `.css` token file is linted either way; A11 is [moot](#a11-is-moot) |
| `fill: url(#gradient)` in `.css` | **caught (false positive)** | **deferred** — no longer reported, because the file is not read |
| `content: "#fff"` in `.css` | **caught (false positive)** | **deferred** — as above |
| `color: #fff; background: #000;` on one line | **1 report** | **deferred** — the two-report promise returns with the surface |

Two structural properties of today's implementation still explain most of the JS/TS rows.
The regex has no `g` flag and `checkLine` returns after the first match, so a line reports at
most once — which is why the per-class-token and per-attribute rows are improvements rather
than restatements. And it has no notion of context, so it can neither see named colors nor
tell a color value from a `url()` fragment or an anchor `href`.

The third property — whole-file `isExempt` gating in `linter.js` — no longer has a
counterpart here. It gated `.css` token files, and `.css` is not read. Its successor is a
question for the phase that brings the CSS surface back, and the answer that phase should
reach is definition-scoped exemption, for the reasons in [A11 is moot](#a11-is-moot).
