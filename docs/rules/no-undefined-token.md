---
rule: no-undefined-token
legacy-id: 12
status: implemented
disposition: custom
bias: false-negatives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-undefined-token

Do not use color token classes that do not exist.

A class such as `text-warning-foreground` looks correct in review, but if the design system never defined `--color-warning-foreground`, it produces no color at all. The UI then falls back silently, and the missing state may go unnoticed until it ships.

This rule catches token-like color classes that do not resolve to real CSS.

## Reports

This rule reports color utilities whose token name is missing or misspelled.

```tsx
<div className="text-warning-foreground" />
<div className="bg-danger-muted" />
<div className="border-outline" />
<div className="bg-primry" />
<div className="text-forground" />
```

Variants and modifiers do not hide the problem.

```tsx
<div className="hover:text-secondary" />
<div className="md:bg-danger-muted" />
<div className="!bg-danger-muted" />
<div className="bg-danger-muted/50" />
```

## Allows

Defined tokens are allowed.

```tsx
<div className="bg-primary text-primary-foreground border-border" />
```

Non-color utilities are allowed.

```tsx
<div className="text-sm border-2 shadow-md" />
```

Arbitrary values are not the subject of this rule.

```tsx
<div className="bg-[#ff0000]" />
<div className="text-[14px]" />
```

## Common fixes

- Correct the spelling of the token.
- Add the missing token if the design role is real.
- Use an existing token if the intended role is already named differently.
