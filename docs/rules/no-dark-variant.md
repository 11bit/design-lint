---
rule: no-dark-variant
legacy-id: 9
status: draft
disposition: off-the-shelf
bias: false-positives
files: ["*.tsx", "*.ts", "*.css"]
---

# no-dark-variant

**The `dark:` variant must not appear in application code.**

The design system resolves themes in exactly one place: the `--color-*` custom properties in
`colorTokenFiles`. `bg-card` is dark-mode-correct because `--color-card` has a dark value,
and every component that uses it becomes correct at the same moment. A `dark:` variant opts
one element out of that arrangement and re-decides the theme locally.

The cost is not stylistic. Each `dark:bg-slate-800` is a theme fork that no token change can
reach, that the next theme (high-contrast, a second brand) will not have an answer for, and
that doubles the number of states every component must be reviewed in. A `dark:` in a
component is also usually evidence of a missing token — the developer needed a colour the
system had not named, and branched instead of asking for it.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## Promises to catch

The `dark:` variant on any class, in any class string the project authors.

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
```

### On non-colour utilities

Taken deliberately, and it is the widest reading available. `dark:` is a theme branch in
markup whatever it modifies, and the mechanism it depends on — a `.dark` class toggled on
the document root — is the mechanism this design system does not use. Allowing
`dark:` on layout utilities would also make the rule's boundary a matter of judging each
utility, which is exactly the ambiguity a lint rule should not have. See
[Open questions](#open-questions): the asset-swap case is the real cost of this position.

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

### Every offending class reports separately

```tsx caught count=2
<div className="dark:bg-primary dark:text-muted" />
```

## Deliberately allows

### `dark` as a token segment, not a variant

The trailing colon is what makes it a variant. A token may legitimately be named for a
dark surface.

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

## Declared blind spots

Not caught, by decision.

### Dark theming in CSS selectors

`.dark &` and `@media (prefers-color-scheme: dark)` are the *implementation* of the theme,
not a violation of it — inside `colorTokenFiles` they are how `--color-card` gets a dark
value, and a rule that flagged them would flag the design system itself. Outside those
files, in a component stylesheet, they are the same offence as `dark:` and are equally
unwanted.

This rule does not report either, in either location. Oxlint JS plugins cannot read CSS
selectors, and the distinction that matters — which file the selector is in — is a
Stylelint configuration (`selector-disallowed-list` / `at-rule-disallowed-list` with
`colorTokenFiles` in `ignoreFiles`), not a rule this contract can promise. Recorded here as
a limit so the gap is visible rather than assumed closed. This resolves the open question
the migration plan raises: the `dark:` utility is in scope, CSS-level dark theming is
delegated.

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

### Dynamic composition

```tsx blindspot
<div className={`${theme}:bg-card`} />

<div className={"dark:" + utility} />
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
  owns `dark:` only, and takes no position on any other variant.

## Message

```
messageId: darkVariant
data:      { className, utility }
text:      "{{className}} — dark: variant not allowed; theming is resolved by the
            --color-* tokens in styles.css, so use a semantic token for {{utility}}"
```

No autofix and no suggestion. The correct rewrite is the paired light class collapsed into
one semantic token — `dark:bg-slate-800 bg-white` becomes `bg-card` — which requires
reading a sibling class this rule does not model, and choosing a token this rule cannot
name.

## Open questions

Each blocks `status: agreed`.

1. **Is `dark:` on a non-colour utility a violation?**
   The contract says yes. The known cost is the light/dark asset swap — one `<img>` with
   `dark:hidden` next to another with `hidden dark:block` — which is the standard Tailwind
   idiom for a logo and has no token-based equivalent, because the thing that changes is a
   file, not a colour. *Recommendation: keep flagging it, with
   `oxlint-disable` at the two or three asset-swap sites.* The alternative — allowing
   `dark:` on utilities judged non-colour — makes the rule's boundary depend on a
   per-utility classification and gives `dark:border-slate-700` and `dark:border-0`
   different answers for reasons no reader will retain. If the swap pattern turns out to be
   common, the right fix is a `<ThemedImage>` component, not a narrower rule.

2. **Should the CSS side be enforced, and by what?**
   The blind spot above delegates `.dark &` and `prefers-color-scheme` to Stylelint but no
   such config exists yet. *Recommendation: add it in Phase 4 alongside the
   `declaration-strict-value` setup*, since both need the same `ignoreFiles` list and
   deciding them together is cheaper. Until it exists, dark theming in a component
   stylesheet is unenforced, and that should be stated rather than implied.

3. **Does the rule apply to `.css` files at all after the migration?** **[cross-rule]**
   The `@apply dark:bg-card` case above is promised and nothing in the planned architecture
   covers it. See open question 3 in `no-spectral-color`.

4. **Do the rules cover colour classes in `.ts` object-literal maps?** **[cross-rule]**
   The `themeClass` case above is promised and `oxlint-tailwindcss` does not see it. See
   open question 4 in `no-spectral-color`.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

The current rule tests the raw class against `/(?:^|:)dark:/` — before any normalisation, so
variants and `!` are still attached. It is the closest of the four to its contract.

| Case | Today | Under this contract |
| --- | --- | --- |
| `dark:bg-primary`, `md:dark:`, `hover:dark:` | caught | caught |
| `dark:hidden`, `dark:border-0` | caught | caught |
| `bg-dark-muted`, `text-darkness` | allowed — `dark:` is preceded by `-` | allowed |
| `className="dark"` (theme root) | allowed | allowed |
| `@apply dark:bg-card` | caught | caught |
| `` className={`dark:${u}`} `` | missed — template literals are never extracted | blind spot, explicitly |
| `.dark &` in a component stylesheet | not examined | blind spot, delegated to Stylelint |
| `dark:bg-slate-800` | 2 reports (this rule + `no-spectral-color`) | 2 reports |

This is the only one of the four palette-class rules that never sees a normalised class —
`linter.js` passes the raw class for all three of `checkToken`'s class parameters. It is
therefore the only one unaffected by `normalizeTwToken` splitting on the **last** `:`, which
mangles `bg-[image:var(--x)]` into `var(--x)]` for the other three.
