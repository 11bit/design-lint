---
rule: no-dark-variant
legacy-id: 9
status: implemented
disposition: custom
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

## Common fixes

- Replace paired light/dark classes with one semantic token.
- Add or adjust the token if the design system does not yet name the needed color.
- For light/dark image swaps, prefer a component that chooses the asset intentionally rather than scattering `dark:hidden` and `dark:block` classes.
