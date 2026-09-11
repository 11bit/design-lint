---
rule: no-dark-variant
legacy-id: 9
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-dark-variant

**Theming happens in the token file. No second mechanism.**

Concretely: the `dark:` variant must not appear in application code, and neither must
`light-dark()`.

The design system resolves themes in exactly one place: the `--color-*` custom properties in
your token stylesheets — the CSS files that define your `--color-*` tokens, which you name
once when you [set up the linter](../../README.md). `bg-card` is dark-mode-correct because `--color-card` has a
dark value, and every component that uses it becomes correct at the same moment. A `dark:`
variant opts one element out of that arrangement and re-decides the theme locally.

The cost is not stylistic. Each `dark:bg-slate-800` is a theme fork that no token change can
reach, that the next theme (high-contrast, a second brand) will not have an answer for, and
that doubles the number of states every component must be reviewed in. A `dark:` in a
component is also usually evidence of a missing token — the developer needed a colour the
system had not named, and branched instead of asking for it.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not. `deferred` blocks assert nothing — they document coverage that is planned but
> unimplemented; see [Deferred: CSS surface](#deferred-css-surface).

## Promises to catch

The `dark:` variant on any class, and any `light-dark()` that appears inside a class string,
in any string the project authors.

The rule is **context-free**: it asks "does this string carry a `dark:` segment or a
`light-dark()` call?" and never needs to know which element the string reaches. It runs over
the broad sweep — every string literal and every static template literal in a `.tsx`, `.ts`,
`.jsx` or `.js` file, regardless of position. `className` literals, `cn` / `clsx` / `twMerge`
arguments, `cva` / `tv` variant maps and `.ts` object-literal constants are all in, for free.

`dark` is matched **as a variant segment**, never as a substring. Segmentation comes from
`/policy`, splits on `:` at bracket depth zero, and strips named-group suffixes — so
`bg-dark-muted` is a token name, `[@media(prefers-color-scheme:dark)]:` is a single
arbitrary-variant segment, and `md:dark:hover:` is three segments of which the second
matches. Position in a stacked chain is therefore irrelevant by construction rather than by
regex luck.

`not-dark:` **is** caught. A3's inverse carve-out exists for `not-hover:`, where a `-hover`
token would read backwards; there is no such reading here. `not-dark:` depends on the same
`.dark` root class this design system does not use, so it is the same fork seen from the
other side.

**The CSS/JS line runs through the middle of this rule, and it runs through `light-dark()`.**
`bg-[light-dark(var(--a),var(--b))]` is a class string in a `.tsx` file, so it is fully in
scope and caught below like any other class. `color: light-dark(#000, #fff)` written as a CSS
declaration is not — nor is `@apply dark:bg-card`, nor a `.dark &` selector. Those are the
same offence on a surface the linter does not read yet; they are recorded under
[Deferred: CSS surface](#deferred-css-surface) rather than promised here.

### As the only variant

```tsx caught
<div className="dark:bg-primary" />

<div className="dark:text-foreground" />

<div className="dark:border-slate-700" />
```

### Anywhere in a stacked variant chain

Position in the chain is irrelevant; so is what else is in it.

```tsx caught
<div className="md:dark:text-muted" />

<div className="dark:hover:bg-card" />

<div className="hover:dark:bg-card" />

<div className="group-hover:dark:text-foreground" />

<div className="lg:dark:focus-visible:ring-primary" />

<div className="dark:[&>svg]:text-muted" />

<div className="not-dark:bg-card" />

<div className="group-hover/nav:dark:text-foreground" />
```

### On non-colour utilities

Taken deliberately, and it is the widest reading available. `dark:` is a theme branch in
markup whatever it modifies, and the mechanism it depends on — a `.dark` class toggled on
the document root — is the mechanism this design system does not use. Allowing
`dark:` on layout utilities would also make the rule's boundary a matter of judging each
utility, and would give `dark:border-slate-700` and `dark:border-0` different answers for
reasons no reader will retain.

The known cost is the light/dark asset swap — one `<img>` with `dark:hidden` next to another
with `hidden dark:block`, the standard Tailwind idiom for a logo, with no token-based
equivalent because the thing that changes is a file rather than a colour. The answer is
`oxlint-disable` at the two or three sites, and if the pattern turns out to be common, a
`<ThemedImage>` component — not a narrower rule. `flagNonColorUtilities` exists for a project
that disagrees; see [Configuration](#configuration).

```tsx caught
<div className="dark:hidden" />

<img className="dark:block hidden" src="/logo-dark.svg" />
```

Two non-colour utilities in one string are two forks and two reports, on the same rule as
[every other class](#every-offending-class-reports-separately) — the widest reading does not
also mean the coarsest one. Nothing about `dark:shadow-none` is fixed by deleting
`dark:border-0`.

```tsx caught count=2
<div className="dark:border-0 dark:shadow-none" />
```

### With important, and in every authoring position

```tsx caught
<div className="dark:!bg-primary" />

<div className="dark:bg-primary!" />

<div className={cn("dark:text-muted", extra)} />

<div className={clsx(isCompact && "dark:bg-card")} />
```

```tsx caught count=2
const panel = cva("rounded", {
  variants: { tone: { a: "dark:bg-card", b: "dark:bg-popover" } },
});
```

```tsx caught
const themeClass = { night: "dark:bg-black", day: "bg-white" };
```

The remaining routes on the corpus list are the same string in a different wrapper, and the
sweep does not parse wrappers. A `twMerge()` argument, a `tv()` slot, an array joined at
runtime, a props object spread onto an element, and an attribute on a line of its own are
one string literal each.

```tsx caught
<div className={`dark:bg-card`} />

<div className={twMerge("p-2", "dark:bg-card")} />

<div className={tv({ base: "dark:bg-card" })} />

const joined = ["dark:bg-card", "p-2"].join(" ");

const spreadProps = { className: "dark:bg-card" };
<div {...spreadProps} />;

<div
  className="dark:bg-card"
/>
```

### The variant interpolated

`dark:` is statically present. Nothing about the interpolation makes the theme fork less
real, and unlike an interpolated colour the rule's entire subject is visible in the source.

```tsx caught
<div className={`dark:${utility}`} />

<div className={`dark:bg-card ${extra}`} />
```

### `light-dark()` in an arbitrary value

Banned outright, tokens on both sides or not.

This is the arbitrary-value class form — a class string in a `.tsx` file, reached by the same
broad sweep as every other case above, and caught today. The same function written as a CSS
declaration is the deferred half; see
[Deferred: CSS surface](#deferred-css-surface). Nothing about the argument changes between
the two forms, only which file the text sits in.

```tsx caught
<div className="bg-[light-dark(var(--color-fg),var(--color-fg-dark))]" />

<div className="text-[light-dark(#000,#fff)]" />
```

The all-tokens form is the one worth arguing about, and it is still a violation. A
`--color-*` token *already* resolves per theme — that is what makes it a token — so
`light-dark()` does the job a second time, in a place the token file cannot see. The
property that makes a theme change safe is that one file decides every colour; a
`light-dark()` in a component takes one colour back out of that file's reach and leaves it
looking compliant. Two tokens spliced together at the call site is a fork with better
spelling.

Ownership sits here rather than with `no-raw-color` because the defect is the
*mechanism*, not the values inside it. `no-raw-color` separately inspects the arguments,
so `light-dark(#000, #fff)` reports under both rules — the same property-versus-value
division of labour those two contracts already document.

### Every offending class reports separately

```tsx caught count=2
<div className="dark:bg-primary dark:text-muted" />
```

## Deliberately allows

### `dark` as a token segment, not a variant

Segmentation is what separates these, not a substring search. `dark` appearing inside a
utility body is never a variant segment, and a token may legitimately be named for a dark
surface.

```tsx allowed
<div className="bg-dark-muted" />

<div className="text-darkness" />

<div className="border-dark" />
```

### The theme root class itself

`dark` on its own is not a variant — it is how the theme gets applied. Something has to set
it, and banning it would ban the design system's own switch.

```tsx allowed
<html className="dark" />

<div className={theme === "dark" ? "dark" : ""} />
```

### Theme state expressed as data, not as a variant

```tsx allowed
<html data-theme="dark" />

<div className="[data-theme=dark]:sr-only" />
```

### Semantic tokens, which are the fix

```tsx allowed
<div className="bg-card text-card-foreground border-border" />
```

### `light-dark()` inside the token-definition files

The ban is on a *second* theming mechanism, and inside your token stylesheets there is no
second one. That is where a `--color-*`
property is given its per-theme value, and `light-dark()` is one legitimate way to write
that. The same exemption `.dark &` gets in those files, for the same reason.

Nothing is exempt yet, and nothing needs to be: token stylesheets are CSS, and CSS files
aren't linted yet, so nothing in them is reported. The exemption becomes load-bearing when
the CSS surface lands; the case sits under [Deferred: CSS surface](#deferred-css-surface).
Otherwise the linter reads your token stylesheets once, at startup, to learn which colour
tokens you define and which utilities take a colour. They are an *input*, not a linted
surface.

## Declared blind spots

Not caught, by decision.

### The variant itself interpolated, or concatenated

`dark:` is only caught when `dark` is statically a variant segment. An interpolated *variant*
is not one, and `+` is not a template literal — the bare `"dark:"` the broad sweep sees is a
prefix with no class attached, and treating it as a violation would report a fragment rather
than a defect.

```tsx blindspot
<div className={`${theme}:bg-card`} />

<div className={"dark:" + utility} />
```

### Use sites with no literal of their own

The broad sweep catches the string where it is written, not where it is used.

```tsx blindspot
<div className={THEME_CLASSES[mode]} />;

<div className={themeClass} />;
```

### Theme branching in JavaScript

The same fork, expressed in the language instead of the class string. It is a real problem
and a different one — this rule matches a variant token, not control flow.

```tsx blindspot
<div className={isDark ? "bg-black" : "bg-white"} />;

const bg = useTheme() === "dark" ? "bg-card" : "bg-popover";
```

### The variant reconstructed from an arbitrary selector

A genuine blind spot, and not the same thing as the deferred `.dark &` *selector* below:
these are class strings on a surface the rule already reads, and it declines to model
arbitrary variants rather than being unable to see them.

```tsx blindspot
<div className="[.dark_&]:bg-card" />

<div className="[@media(prefers-color-scheme:dark)]:bg-card" />
```

## Deferred: CSS surface

Not a blind spot. A blind spot is something this contract has decided not to catch; what
follows is something it has decided not to catch **yet**. The linter reads `.js`, `.jsx`,
`.ts` and `.tsx` only, so the cases below are unenforced today and are recorded so that
adding the CSS surface is an implementation task rather than a fresh design argument.

The fenced blocks here are tagged `deferred`. The harness executes `caught`, `allowed` and
`blindspot` blocks only, so nothing in this section asserts anything about the current
implementation.

Read this section against the boundary drawn in [Promises to catch](#promises-to-catch):
`light-dark()` **inside a class string** is caught today, and only the CSS-declaration form of
it waits here.

### `@apply` class lists

`@apply dark:bg-card` is the same theme fork as `className="dark:bg-card"`, decided by the
same segmentation. No entry point in the current package shape covers it, so the mechanism is
an open choice; only the promise below is fixed.

```css deferred
.panel {
  @apply dark:bg-card;
}
```

### `light-dark()` in a declaration value

The class-string form of this is caught today. The declaration form is the identical defect —
a second theming mechanism, in a place the token file cannot see — on a surface the linter
does not read.

```css deferred
.panel {
  color: light-dark(#000, #fff);
}

.card {
  background: light-dark(var(--color-fg), var(--color-fg-dark));
}
```

### `.dark &` selectors and `prefers-color-scheme` blocks

Inside `tokenFiles` these are the *implementation* of the theme — how `--color-card` gets a
dark value — and a rule that flagged them would flag the design system itself. Outside those
files, in a component stylesheet, they are the same offence as `dark:` and equally unwanted.
That asymmetry, not the selector syntax, is the substance of the promise: when the CSS
surface lands, selector-level dark theming reports outside `tokenFiles` and is silent inside
them.

```css deferred
.panel {
  background: var(--color-white);
}

.dark .panel {
  background: var(--color-slate-900);
}

@media (prefers-color-scheme: dark) {
  .panel {
    background: var(--color-slate-900);
  }
}
```

### `light-dark()` inside the token-definition files

The exemption above applies to `light-dark()` too: `tokenFiles` is where a `--color-*`
property is given its per-theme value, and `light-dark()` is one legitimate way to write it.

```css deferred
@theme {
  --color-fg: light-dark(oklch(0.2 0 0), oklch(0.98 0 0));
}
```

## Relationship to other rules

- **`no-spectral-color`** is orthogonal — this rule matches the variant, that one the
  colour. `dark:bg-slate-800` reports twice, correctly: the theme fork and the palette class
  are separate defects with separate fixes.
- **`no-opacity-modifier`** is likewise orthogonal. `dark:bg-primary/50` reports from both.
- **`no-undefined-token`** evaluates the class with variants stripped, so it neither
  suppresses nor is suppressed by this rule.
- **`token-constraints`** and **`no-useless-hover`** own the `hover:` variant. This rule
  owns `dark:` and `light-dark()` only, and takes no position on any other variant.
- **`no-raw-color`** inspects the *arguments* of a `light-dark()` call; this rule bans
  the call. `text-[light-dark(#000,#fff)]` therefore reports from both, and correctly: the
  mechanism is unsanctioned and the values are raw. The all-tokens form reports only here.
  The division of labour is unchanged for the deferred CSS-declaration form; only the surface
  it applies on is.
- **Dynamically assembled class names belong to `no-spectral-color`.** `` `dark:${u}` ``
  reports here because `dark:` is statically present; `` `${theme}:bg-card` `` reports from
  neither, because nothing forbidden is visible in it.

## Message

The token file is named through `data`, never hardcoded — the consuming project decides
where its tokens live.

```
messageId: darkVariant
data:      { className, utility, tokenFile }
text:      "{{className}} — dark: variant not allowed; theming is resolved by the
            --color-* tokens in {{tokenFile}}, so use a semantic token for {{utility}}"
```

A second id for `light-dark()`, because the fix is different: there is no paired class to
collapse, only a call to delete once the token carries both values. Today it fires on the
arbitrary-value class form only — `source` is the class — and it is the message the deferred
CSS-declaration case will reuse unchanged.

```
messageId: lightDarkFunction
data:      { source, tokenFile }
text:      "{{source}} — light-dark() is a second theming mechanism; a --color-* token
            already resolves per theme, so give the property both values in {{tokenFile}}
            and reference the token here"
```

No autofix and no suggestion. The correct rewrite is the paired light class collapsed into
one semantic token — `dark:bg-slate-800 bg-white` becomes `bg-card` — which requires
reading a sibling class this rule does not model, and choosing a token this rule cannot
name.

## Configuration

Mechanism ships; policy is supplied. Every value below is a `recommended` preset default the
consuming project overrides in its own config — none is a fact baked into the rule.

| Option | `recommended` | Overriding it |
| --- | --- | --- |
| `flagNonColorUtilities` | `true` | `false` limits reporting to `dark:` on a class that sets a colour, which buys back the asset-swap idiom at the price of a per-utility boundary. The default is the widest reading, deliberately. |
| `flagLightDark` | `true` | `false` allows `light-dark()` in an arbitrary value. A project that has genuinely chosen `light-dark()` *as* its theming mechanism sets this and stops using `--color-*` variants — the two are alternatives, not a spectrum. The same switch will govern the deferred CSS-declaration case. |
| `tokenFiles` | `["src/styles.css"]` | Decides which file the message points you to; it doesn't change what the rule checks. The recommended setup fills it in with your token stylesheets. Planned: exempt these files wholesale once `.css` is linted, which is where `light-dark()` and `.dark &` are legitimate. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Storybook is excluded by default because a story demonstrating both themes is the one place a theme fork is the subject; a project that disagrees sets this to `[]`. |

Whether `dark:` is banned at all is itself policy — a project using Tailwind's `dark:` as
its theming mechanism turns this rule off entirely rather than configuring it. The rule
carries the mechanism for detecting a theme fork; the decision that a theme fork is wrong
belongs to the preset.

### Distribution

- **The rule reads no files and derives no path from its own location.** `tokenFiles` and
  `ignoreGlobs` arrive through `options`; nothing is discovered, and the `.dark` class name
  is never inferred from a Tailwind config on disk.
- **Everything you configure goes in this rule's options**, not in `settings`, so nothing
  here depends on `settings` being inherited through `extends`. What
  `flagNonColorUtilities: false` needs to know — which utilities take a colour — the linter
  reads from your token stylesheets once, at startup, with the same Tailwind engine your
  build uses.
- **Changing only this rule's severity keeps its behaviour.** Options you don't write fall
  back to the defaults in the table, and the tokens read at startup are unaffected. The
  visible difference: `"…/no-dark-variant": "error"` on its own makes messages name
  `src/styles.css` instead of your token stylesheet. Once the CSS surface lands and token
  stylesheets are exempt, it would also leave your token stylesheet reporting its own
  `light-dark()`, unless that file is `src/styles.css`. To change severity and keep your
  stylesheet named, restate the options alongside it.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

The current rule tests the raw class against `/(?:^|:)dark:/` — before any normalisation, so
variants and `!` are still attached. It is the closest of the four to its contract.

| Case | Today | Under this contract |
| --- | --- | --- |
| `dark:bg-primary`, `md:dark:`, `hover:dark:` | caught | caught |
| `dark:hidden`, `dark:border-0` | caught | caught, under `flagNonColorUtilities` |
| `bg-dark-muted`, `text-darkness` | allowed — `dark:` is preceded by `-` | allowed — by segmentation, not by luck |
| `className="dark"` (theme root) | allowed | allowed |
| `not-dark:bg-card` | missed — `/(?:^\|:)dark:/` sees a `-` before `dark:` | caught |
| `@apply dark:bg-card` | caught | **deferred** — `.css` is not a linted surface for now |
| `bg-[light-dark(var(--a),var(--b))]` (class string) | not examined | caught |
| `color: light-dark(#000, #fff)` (CSS declaration) | not examined | **deferred** — same defect, unlinted surface |
| `` className={`dark:${u}`} `` | missed — template literals are never extracted | caught |
| `const themeClass = { night: "dark:bg-black" }` | caught at the literal | caught at the literal; the *use site* is the blind spot |
| `.dark &` in a component stylesheet | not examined | **deferred** — promised for the CSS surface, unenforced today |
| `dark:bg-slate-800` | 2 reports (this rule + `no-spectral-color`) | 2 reports |

This is the only one of the four palette-class rules that never sees a normalised class —
`linter.js` passes the raw class for all three of `checkToken`'s class parameters. It is
therefore the only one unaffected by `normalizeTwToken` splitting on the **last** `:`, which
mangles `bg-[image:var(--x)]` into `var(--x)]` for the other three.
