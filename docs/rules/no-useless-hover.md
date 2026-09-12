---
rule: no-useless-hover
legacy-id: 10
status: implemented
disposition: custom
bias: false-negatives
files: ["*.tsx", "*.jsx"]
---

# no-useless-hover

Do not put `hover:` styling on elements that are not interactive.

A hover style tells users that something responds to the pointer. On a plain `<div>`, `<span>`, or decorative SVG, that signal is misleading: the UI looks clickable but does nothing. Overusing hover states also makes real controls harder to recognize.

Put hover styles on the element that actually handles the interaction. If a child should change when its parent is hovered, use `group-hover:` or `peer-hover:` so the relationship is explicit.

## Reports

This rule reports self-hover styles on non-interactive elements.

```tsx
<div className="hover:bg-muted" />
<span className="hover:text-primary" />
<section className="hover:border-border" />
<svg className="hover:fill-primary" />
```

It also reports equivalent self-hover forms.

```tsx
<div className="not-hover:bg-muted" />
<div className="[&:hover]:bg-muted" />
```

## Allows

Interactive elements may use hover styles.

```tsx
<button className="hover:bg-primary-hover" />
<a href="/docs" className="hover:underline" />
<input className="hover:border-ring" />
```

Hover styles on a descendant are allowed when the hovered element is named through `group` or `peer`.

```tsx
<a href="/docs" className="group">
  <span className="group-hover:underline" />
</a>

<label className="peer">
  <input type="checkbox" />
</label>
<span className="peer-hover:text-primary" />
```

Capitalized components are not reported by default, because the rule cannot know from JSX alone whether a component is interactive. Projects can opt known non-interactive components into the rule.

```tsx
<Card className="hover:bg-muted" />
```

## Options

Every option has a default, so the rule works without any.

| Option | Default | What it does |
| --- | --- | --- |
| `interactiveElements` | `["tr", "td", "th"]` | Tags removed from the list of elements the rule treats as non-interactive. Table rows and cells are removed by default, because a row hover highlight is a deliberate, common pattern in data tables. |
| `nonInteractiveComponents` | `[]` | Components (or any tag names) to report on as well, such as `Card` or `Dialog.Content`. Components are not reported otherwise, because the rule can't see whether they handle the pointer. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

```ts
"design/no-useless-hover": ["error", { nonInteractiveComponents: ["Card", "Badge"] }]
```

Setting options replaces the ones the recommended setup passed to this rule — see [Configuring rules](../../README.md#mechanism-ships-policy-is-supplied).

## Common fixes

- Move the `hover:` class to the clickable element.
- Replace a decorative hover effect with a `group-hover:` or `peer-hover:` relationship.
- If a non-interactive element is meant to be clickable, make it a real control such as `button` or `a`.
