---
rule: no-opacity-modifier
legacy-id: 3
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-opacity-modifier

Do not add opacity modifiers to color classes.

A class such as `bg-primary/50` creates a new color at the call site. That color has no name, no design review, and no guarantee of contrast. If several places need “primary, but softer,” they should all use the same token, not several local alpha values.

Use a named translucent token such as `bg-primary-muted`, `bg-overlay`, or another token your design system defines.

## Reports

This rule reports opacity modifiers on color utilities.

```tsx
<div className="bg-primary/50" />
<div className="text-foreground/75" />
<div className="border-border/20" />
<div className="ring-primary/10" />
<div className="fill-primary/50 stroke-primary/50" />
```

It also reports modifiers on palette colors and arbitrary color values. Those may be reported by other rules too, because they are separate problems.

```tsx
<div className="bg-red-500/50" />
<div className="bg-[#ff0000]/50" />
```

Variants do not change the rule.

```tsx
<div className="hover:bg-primary/50" />
<div className="md:focus:ring-primary/40" />
```

## Allows

The same token without an opacity modifier is allowed.

```tsx
<div className="bg-primary text-foreground border-border" />
```

Fractions on non-color utilities are allowed.

```tsx
<div className="w-1/2 basis-2/3 aspect-16/9" />
<div className="text-sm/6" />
```

Element opacity is a different effect and is allowed by this rule.

```tsx
<div className="opacity-50" />
```

## Common fixes

- Replace `bg-primary/50` with a named token for that translucent color.
- Delete no-op modifiers such as `/100`.
- If the opacity is part of an overlay or scrim, create an overlay token instead of deriving the color inline.
