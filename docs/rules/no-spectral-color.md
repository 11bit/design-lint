---
rule: no-spectral-color
legacy-id: 4
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-spectral-color

Do not use Tailwind's built-in palette to color product UI.

Classes such as `bg-red-500`, `text-slate-700`, and `border-blue-200` describe a color value, not a design role. They do not say whether the color means danger, brand, emphasis, or decoration, and they cannot be retuned safely across themes.

Use semantic tokens instead: `bg-danger`, `text-muted-foreground`, `border-border`, and so on.

## Reports

This rule reports Tailwind palette colors used in color utilities.

```tsx
<div className="bg-red-500" />
<div className="text-blue-200" />
<div className="border-slate-300" />
<div className="ring-emerald-500" />
<div className="from-blue-500 via-purple-500 to-pink-500" />
<svg><path className="fill-green-600 stroke-green-800" /></svg>
```

Variants do not make palette colors acceptable.

```tsx
<div className="hover:bg-red-500" />
<div className="dark:text-slate-100" />
<div className="md:border-blue-300" />
```

## Allows

Semantic tokens are allowed.

```tsx
<div className="bg-danger text-danger-foreground" />
<div className="border-border ring-ring" />
```

Non-color utilities are allowed.

```tsx
<div className="text-sm border-2 shadow-md" />
```

Color keywords handled by separate rules or policies are not the subject of this rule.

```tsx
<div className="bg-transparent" />
<div className="text-current" />
```

## Common fixes

- Replace the palette class with the semantic token that describes the intended role.
- If the role does not exist yet, add a token rather than choosing a nearby palette color.
- Keep mappings such as `red-500 -> danger` in project configuration when you want diagnostics to suggest the right token.
