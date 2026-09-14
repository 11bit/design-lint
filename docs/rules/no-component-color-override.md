---
rule: no-component-color-override
legacy-id: 11
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.jsx"]
---

# no-component-color-override

Do not recolor design-system components through `className`.

A design-system component owns its appearance. Its colors should be chosen through its public API, usually a variant such as `variant="danger"` or `tone="success"`. Passing `bg-*`, `text-*`, or other color classes through `className` creates a one-off appearance that is not named, reviewed, documented, or easy to update.

If a component needs a new color treatment, add or use a variant instead of repainting it at the call site.

## Reports

This rule reports color classes passed to configured design-system components.

```tsx
<Button className="bg-primary" />
<Button className="text-destructive" />
<Card className="border-border" />
<Badge className="bg-red-500" />
<Button className="hover:bg-primary" />
```

It also reports color classes that reach the component through common class composition helpers.

```tsx
<Button className={cn("rounded-md", "bg-primary")} />
<Button className={clsx(isActive && "text-primary")} />
<Button className={twMerge(base, "border-border")} />
```

Each color class is a separate problem.

```tsx
<Button className="bg-primary text-primary-foreground" />
```

## Allows

Non-color layout and spacing classes are allowed by default.

```tsx
<Button className="px-4 py-2" />
<Card className="w-full max-w-sm" />
```

A class is allowed when it does not set color, even if its name overlaps with a color token. For example, if your theme has both a `card` shadow and a `card` color, `shadow-card` is still a shadow utility, so this rule leaves it alone.

```tsx
<Card className="shadow-card" />
```

Variants and other component props are allowed.

```tsx
<Button variant="destructive" />
<Badge tone="success" />
```

Elements and components that are not part of the configured design-system component set are not covered by this rule.

```tsx
<div className="bg-primary" />
<Chart className="bg-primary" />
```

## Options

Projects configure which imports represent design-system components. Only those components are protected by this rule.

A project may also choose to treat additional non-color utilities, such as `rounded` or `shadow`, as component-owned styling. By default, the rule focuses on color.

| Option | Default | What it does |
| --- | --- | --- |
| `componentSources` | none — required | Import patterns your design-system components come from, matched against each import exactly as written. `*` matches within one path segment, `**` across segments. |
| `ownedUtilities` | `[]` | Non-color utility prefixes the components also own, such as `rounded` or `shadow`. The message still says "overrides color". |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

```ts
"design/no-component-color-override": ["error", {
  componentSources: ["@/components/ui/*"],
  ownedUtilities: ["rounded", "shadow"],
}]
```

If your code imports `#/components/ui/button`, the pattern is `#/components/ui/*`, even when another alias points at the same folder. Relative imports such as `./button` or `../components/ui/button` are not matched by an alias pattern like `@/components/ui/*`; add a matching pattern if you want those imports covered. Passing an empty list when you set up the linter turns this rule off.

Setting options replaces the ones the recommended setup passed to this rule — see [Configuring rules](../../README.md#mechanism-ships-policy-is-supplied). Changing only the severity drops `componentSources`, so pass it again.

## Common fixes

- Use an existing component variant.
- Add a new variant when the design system needs a new appearance.
- Keep `className` for layout, spacing, and placement rather than component-owned color.
