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

## Common fixes

- Move the `hover:` class to the clickable element.
- Replace a decorative hover effect with a `group-hover:` or `peer-hover:` relationship.
- If a non-interactive element is meant to be clickable, make it a real control such as `button` or `a`.
