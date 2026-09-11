---
rule: no-raw-color
legacy-id: 2
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-raw-color

Do not write literal colors in application code.

A literal color such as `#0a7cff`, `rgb(10 124 255)`, or `red` is not connected to the design system. It will not change when the theme changes, it cannot be audited as a token, and future readers cannot tell what role it was meant to play.

Use semantic tokens instead. If no existing token fits, add one to the design system rather than inlining the value.

## Reports

This rule reports raw color values in color-carrying places.

### Tailwind arbitrary values

```tsx
<div className="bg-[#ff0000]" />
<div className="text-[rgb(255,0,0)]" />
<div className="border-[red]" />
<div className="shadow-[0_0_4px_#000]" />
```

### JSX color attributes

```tsx
<path fill="#ff0000" />
<rect stroke="red" />
<Badge color="#0a7cff" />
```

### Style values

```tsx
<div style={{ color: "#f00" }} />
<div style={{ background: "linear-gradient(#fff, #000)" }} />
```

### Color constants

```tsx
const brand = "#0a7cff";
const chartColors = ["#ff0000", "#00ff00"];
```

## Allows

Token references are allowed.

```tsx
<div className="bg-primary text-primary-foreground" />
<div className="bg-[var(--color-primary)]" />
<path fill="var(--color-primary)" />
```

The values `currentColor`, `transparent`, and CSS-wide cascade keywords such as `inherit` are allowed.

```tsx
<path fill="currentColor" />
<div className="border-[transparent]" />
<div style={{ color: "inherit" }} />
```

Non-color strings are allowed.

```tsx
<a href="#pricing">Pricing</a>
const label = "red";
```

## Common fixes

- Replace the literal with an existing semantic token.
- Add a new token when the color represents a new design role.
- Use `currentColor` when an icon or child element should inherit the surrounding text color.
