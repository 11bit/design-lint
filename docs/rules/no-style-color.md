---
rule: no-style-color
legacy-id: 1
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.jsx"]
---

# no-style-color

Do not apply color through React's `style` prop.

Inline styles sit outside the design system. A color written in `style` does not use a semantic token, does not naturally follow theme changes, and can override the classes that were meant to control the component's appearance.

Use semantic classes such as `text-primary`, `bg-card`, or `border-border`. If a value truly must be chosen at runtime, set a CSS custom property and consume that property from a class or stylesheet.

## Reports

This rule reports color-related properties inside a JSX `style` object.

Examples:

```tsx
<div style={{ color: "red" }} />
<div style={{ backgroundColor: "#fff" }} />
<div style={{ borderColor: token }} />
<svg><path style={{ fill: "red", stroke: "blue" }} /></svg>
```

It also reports shorthand properties that can contain colors, such as `background`, `border`, `outline`, `boxShadow`, `textShadow`, `filter`, and `backgroundImage`.

```tsx
<div style={{ border: "1px solid red" }} />
<div style={{ boxShadow: "0 0 4px rgba(0,0,0,.4)" }} />
<div style={{ backgroundImage: "linear-gradient(red, blue)" }} />
```

## Allows

Non-color style properties are allowed.

```tsx
<div style={{ display: "flex", gap: 8 }} />
<div style={{ width: size, transform: "translateX(10px)" }} />
```

CSS custom properties are allowed, because they can be consumed by token-aware CSS.

```tsx
<div style={{ "--chart-color": value }} className="text-[var(--chart-color)]" />
```

## Options

Every option has a default, so the rule works without any.

| Option | Default | What it does |
| --- | --- | --- |
| `allowTokenValues` | `false` | `true` allows a property whose value contains any `var(--…)` reference, such as `color: "var(--color-primary)"`. |
| `shorthandProperties` | `"key"` | `"key"` reports a color-capable shorthand (`border`, `background`, `boxShadow`, …) whatever its value. `"value"` reports it only when its value contains a color; `var()`, `currentColor`, `transparent` and keywords like `inherit` don't count. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

```ts
"design/no-style-color": ["error", { shorthandProperties: "value" }]
// boxShadow: "none" and border: "1px solid currentColor" now pass.
```

Setting options replaces the ones the recommended setup passed to this rule — see [Configuring rules](../../README.md#mechanism-ships-policy-is-supplied).

## Common fixes

- Replace `style={{ color: ... }}` with a semantic text color class.
- Replace `style={{ backgroundColor: ... }}` with a semantic background class.
- Move complex visual styling into CSS and reference design tokens there.
- For runtime values, pass a CSS custom property instead of setting a color property directly.
