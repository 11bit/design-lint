---
rule: no-dark-variant
legacy-id: 9
status: agreed
disposition: off-the-shelf
bias: false-positives
files: ["*.tsx", "*.ts", "*.css"]
---

# no-dark-variant

**Theming happens in the token file. No second mechanism.**

Concretely: the `dark:` variant must not appear in application code, and neither must
`light-dark()`.

The design system resolves themes in exactly one place: the `--color-*` custom properties in
the files named by `tokenFiles`. `bg-card` is dark-mode-correct because `--color-card` has a
dark value, and every component that uses it becomes correct at the same moment. A `dark:`
variant opts one element out of that arrangement and re-decides the theme locally.

The cost is not stylistic. Each `dark:bg-slate-800` is a theme fork that no token change can
reach, that the next theme (high-contrast, a second brand) will not have an answer for, and
that doubles the number of states every component must be reviewed in. A `dark:` in a
component is also usually evidence of a missing token — the developer needed a colour the
system had not named, and branched instead of asking for it.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## Promises to catch

The `dark:` variant on any class, and any use of `light-dark()`, in any string the project
authors.

The rule is **context-free**: it asks "does this string carry a `dark:` segment or a
`light-dark()` call?" and never needs to know which element the string reaches. It runs over
the broad sweep — every string literal and every static template literal in a `.tsx`, `.ts`
or `.css` file, regardless of position. `className` literals, `cn` / `clsx` / `twMerge`
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

`.css` is covered by the package's `/stylelint` entry point, which reads the same `/policy`
module, so `@apply dark:bg-card` and a `light-dark()` declaration value are governed by one
policy rather than two that drift.

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

```css caught
.panel {
  @apply dark:bg-card;
}
```

### The variant interpolated

`dark:` is statically present. Nothing about the interpolation makes the theme fork less
real, and unlike an interpolated colour the rule's entire subject is visible in the source.

```tsx caught
<div className={`dark:${utility}`} />

<div className={`dark:bg-card ${extra}`} />
```

### `light-dark()`

Banned outright, tokens on both sides or not.

```css caught
.panel {
  color: light-dark(#000, #fff);
}

.card {
  background: light-dark(var(--color-fg), var(--color-fg-dark));
}
```

```tsx caught
<div className="bg-[light-dark(var(--color-fg),var(--color-fg-dark))]" />
```

The all-tokens form is the one worth arguing about, and it is still a violation. A
`--color-*` token *already* resolves per theme — that is what makes it a token — so
`light-dark()` does the job a second time, in a place the token file cannot see. The
property that makes a theme change safe is that one file decides every colour; a
`light-dark()` in a component takes one colour back out of that file's reach and leaves it
looking compliant. Two tokens spliced together at the call site is a fork with better
spelling.

Ownership sits here rather than with `no-raw-css-color` because the defect is the
*mechanism*, not the values inside it. `no-raw-css-color` separately inspects the arguments,
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

The ban is on a *second* theming mechanism, and inside `tokenFiles` there is no second one —
that is the file where a `--color-*` property is given its per-theme value, and
`light-dark()` is one legitimate way to write that. The same exemption `.dark &` gets in
those files, for the same reason.

```css allowed
@theme {
  --color-fg: light-dark(oklch(0.2 0 0), oklch(0.98 0 0));
}
```

## Declared blind spots

Not caught, by decision.

### Dark theming in CSS selectors

`.dark &` and `@media (prefers-color-scheme: dark)` are the *implementation* of the theme,
not a violation of it — inside the `tokenFiles` they are how `--color-card` gets a dark
value, and a rule that flagged them would flag the design system itself. Outside those
files, in a component stylesheet, they are the same offence as `dark:` and are equally
unwanted.

This rule does not report either, in either location. The package's `/stylelint` entry point
covers the CSS surface it was scoped to — `@apply` class lists and declaration values, which
is how `@apply dark:bg-card` and `light-dark()` above are enforced — but a `.dark &`
*selector* is neither. Closing it is a `selector-disallowed-list` /
`at-rule-disallowed-list` configuration with `tokenFiles` in `ignoreFiles`, sharing the same
`ignoreFiles` list as the raw-value setup; the sensible time to add it is alongside that
setup in Phase 4, since deciding both together is cheaper than deciding either alone. Until
it exists, dark theming in a component stylesheet is unenforced, and that is stated here
rather than implied.

The scope line stands regardless: the `dark:` utility and `light-dark()` are this rule's,
selector-level dark theming is delegated.

```css blindspot
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
```

### Theme branching in JavaScript

The same fork, expressed in the language instead of the class string. It is a real problem
and a different one — this rule matches a variant token, not control flow.

```tsx blindspot
<div className={isDark ? "bg-black" : "bg-white"} />;

const bg = useTheme() === "dark" ? "bg-card" : "bg-popover";
```

### The variant reconstructed from an arbitrary selector

```tsx blindspot
<div className="[.dark_&]:bg-card" />

<div className="[@media(prefers-color-scheme:dark)]:bg-card" />
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
- **`no-raw-css-color`** inspects the *arguments* of a `light-dark()` call; this rule bans
  the call. `light-dark(#000, #fff)` therefore reports from both, and correctly: the
  mechanism is unsanctioned and the values are raw. The all-tokens form reports only here.
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
collapse, only a call to delete once the token carries both values.

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
| `flagLightDark` | `true` | `false` allows `light-dark()` outside the token files. A project that has genuinely chosen `light-dark()` *as* its theming mechanism sets this and stops using `--color-*` variants — the two are alternatives, not a spectrum. |
| `tokenFiles` | `["src/styles.css"]` | The files exempted wholesale. This is where `light-dark()` and `.dark &` are legitimate, because it is where a token gets its per-theme value. Also feeds Stylelint's `ignoreFiles`. |
| `ignoreGlobs` | `["**/*.stories.@(ts\|tsx)"]` | Files the rule skips. Storybook is excluded by default because a story demonstrating both themes is the one place a theme fork is the subject; a project that disagrees sets this to `[]`. |

Whether `dark:` is banned at all is itself policy — a project using Tailwind's `dark:` as
its theming mechanism turns this rule off entirely rather than configuring it. The rule
carries the mechanism for detecting a theme fork; the decision that a theme fork is wrong
belongs to the preset.

### Distribution

- **The rule reads no files and derives no path from its own location.** `tokenFiles` and
  `ignoreGlobs` arrive through `options`; nothing is discovered, and the `.dark` class name
  is never inferred from a Tailwind config on disk.
- **`settings.tailwindcss.entryPoint` is mandatory** for `oxlint-tailwindcss`, and
  `settings` is not inherited through `extends`. The consumer supplies it in its own config;
  the preset cannot.
- **Rule options replace, they do not merge.** A consumer writing
  `"…/no-dark-variant": "error"` to bump a severity wipes the preset's options, including
  `tokenFiles` — so the token file itself starts reporting its own `light-dark()`. To change
  severity alone, restate the options.

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
| `@apply dark:bg-card` | caught | caught, via `/stylelint` |
| `light-dark(var(--a), var(--b))` | not examined | caught |
| `` className={`dark:${u}`} `` | missed — template literals are never extracted | caught |
| `const themeClass = { night: "dark:bg-black" }` | caught at the literal | caught at the literal; the *use site* is the blind spot |
| `.dark &` in a component stylesheet | not examined | blind spot, delegated to a Stylelint selector list |
| `dark:bg-slate-800` | 2 reports (this rule + `no-spectral-color`) | 2 reports |

This is the only one of the four palette-class rules that never sees a normalised class —
`linter.js` passes the raw class for all three of `checkToken`'s class parameters. It is
therefore the only one unaffected by `normalizeTwToken` splitting on the **last** `:`, which
mangles `bg-[image:var(--x)]` into `var(--x)]` for the other three.
