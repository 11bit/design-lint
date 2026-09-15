---
rule: no-dark-variant
status: implemented
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-dark-variant

Do not use local dark-mode branches in application code.

Theme differences belong in the token definitions. A class such as `bg-card` should already resolve to the right value in light and dark themes. Adding `dark:bg-slate-900` beside it creates a second theme system in the component itself.

This rule also bans `light-dark()` outside the token system for the same reason: it chooses theme values locally instead of letting a semantic token do it.

## Reports

This rule reports `dark:` in class strings.

```tsx
<div className="dark:bg-primary" />
<div className="md:dark:text-muted" />
<div className="hover:dark:border-border" />
<div className="dark:hidden" />
```

It also reports `light-dark()`.

```tsx
<div className="bg-[light-dark(#fff,#000)]" />
<div style={{ color: "light-dark(#000, #fff)" }} />
```

## Allows

Semantic tokens are allowed and are the preferred fix.

```tsx
<div className="bg-card text-card-foreground border-border" />
```

The root theme marker is allowed.

```tsx
<html className="dark" />
<html data-theme="dark" />
```

A token name may contain the word `dark` without using the `dark:` variant.

```tsx
<div className="bg-dark-muted" />
```

## Options

Every option has a default, so the rule works without any.

| Option | Default | What it does |
| --- | --- | --- |
| `flagNonColorUtilities` | `true` | `false` reports `dark:` only on classes that set a color, which allows the light/dark asset swap (`dark:hidden`, `dark:block`). |
| `flagLightDark` | `true` | `false` stops reporting `light-dark()`, for a project that has chosen it as its theming mechanism instead of `--color-*` tokens. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

Setting options replaces the ones the recommended setup passed to this rule — see [Configuring rules](../../README.md#mechanism-ships-policy-is-supplied).

## Common fixes

- Replace paired light/dark classes with one semantic token.
- Add or adjust the token if the design system does not yet name the needed color.
- For light/dark image swaps, prefer a component that chooses the asset intentionally rather than scattering `dark:hidden` and `dark:block` classes.
