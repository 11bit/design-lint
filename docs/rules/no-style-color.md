---
rule: no-style-color
legacy-id: 1
status: agreed
disposition: custom
bias: false-positives
files: ["*.tsx"]
---

# no-style-color

**Color must not be applied through the React `style` prop.**

A `style` prop writes a literal value into the element's inline style attribute. That
value cannot participate in the token system: it does not resolve through
`var(--color-*)`, it does not respond to theme switching, and it cannot carry a `hover:`
or `dark:` variant. Inline styles also win the cascade against every class, so a single
`style={{ color }}` silently defeats the design system for that element.

Colors belong in Tailwind classes (`text-primary`) or, where a class will not do, in a CSS
module reading a token. Where a color genuinely must be computed at runtime, the sanctioned
escape hatch is to set a **CSS custom property** inline and consume it from CSS — see
[Deliberately allows](#deliberately-allows).

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## Promises to catch

Any color-applying property key inside a `style` prop's object literal, regardless of the
value's type or whether the value is statically knowable.

### Color-only properties

Properties whose entire purpose is to set a color. Always flagged.

```tsx caught
<div style={{ color: "red" }} />

<div style={{ backgroundColor: "blue" }} />

<div style={{ borderColor: token }} />

<div style={{ borderTopColor: x, borderInlineStartColor: y }} />

<div style={{ outlineColor: "#fff" }} />

<div style={{ caretColor: "red" }} />

<div style={{ accentColor: "red" }} />

<div style={{ textDecorationColor: "red" }} />

<div style={{ textEmphasisColor: "red" }} />

<div style={{ columnRuleColor: "red" }} />

<div style={{ scrollbarColor: "dark" }} />

<svg><rect style={{ fill: "red", stroke: "blue" }} /></svg>

<svg><stop style={{ stopColor: "red" }} /></svg>

<svg><filter style={{ floodColor: "red", lightingColor: "blue" }} /></svg>

<div style={{ WebkitTextFillColor: "red", WebkitTextStrokeColor: "blue" }} />
```

### Color-capable shorthands

Properties that may carry a color among other values. Flagged on the key alone; see
[Configuration](#configuration) for the `shorthandProperties` option that narrows this to
value inspection.

```tsx caught
<div style={{ background: "red" }} />

<div style={{ border: "1px solid red" }} />

<div style={{ borderTop: "1px solid red" }} />

<div style={{ outline: "1px solid red" }} />

<div style={{ boxShadow: "0 0 4px rgba(0,0,0,.5)" }} />

<div style={{ textShadow: "0 0 4px red" }} />

<div style={{ textDecoration: "underline red" }} />

<div style={{ columnRule: "1px solid red" }} />

<div style={{ backgroundImage: "linear-gradient(red, blue)" }} />

<div style={{ borderImage: "linear-gradient(red, blue) 1" }} />

<div style={{ filter: "drop-shadow(0 0 4px red)" }} />
```

### Syntactic forms

The property must be found regardless of how the object literal or the prop is written.

```tsx caught
<div style={{ color }} />

<div style={{ ["color"]: x }} />

<div style={{ "color": "red" }} />

<div style={{ 'backgroundColor': "red" }} />

<div style={{ color: cond ? a : b }} />

<div style={{ transform: active ? { scale: 1 } : {}, color: "red" }} />

<div
  style={{
    fontWeight: "bold",
    color: "red",
  }}
/>
```

Every offending property in a single block is reported separately:

```tsx caught count=2
<div
  style={{
    color: "red",
    backgroundColor: "blue",
  }}
/>
```

## Deliberately allows

### Non-color properties

```tsx allowed
<div style={{ fontWeight: "bold" }} />

<div style={{ width: 10, transform: "translateX(4px)" }} />

<div style={{ transform: active ? { scale: 1 } : {} }} />
```

### Properties whose name contains "color" but which do not apply one

```tsx allowed
<div style={{ colorScheme: "dark" }} />

<div style={{ colorInterpolation: "sRGB" }} />

<div style={{ colorInterpolationFilters: "sRGB" }} />

<div style={{ colorRendering: "auto" }} />

<div style={{ printColorAdjust: "exact" }} />

<div style={{ forcedColorAdjust: "none" }} />
```

### The sanctioned escape hatch: defining a custom property

Setting a CSS custom property inline is the supported way to feed a runtime-computed color
into the token system. The value flows into CSS, where variants and theming still apply.
This is the fix the diagnostic should point people at.

```tsx allowed
<div style={{ "--color-brand": userColor }} className="bg-[--color-brand]" />

<div style={{ "--chart-series-1": series.color }} />
```

### Color outside a `style` prop

Object literals elsewhere are not this rule's concern, even when they look identical.

```tsx allowed
const styles = { color: "red" };

const theme = { color: "red", backgroundColor: "blue" };

<Chart options={{ color: "red" }} />
```

### `color` appearing only in a value

```tsx allowed
<div style={{ fontFamily: "color-scheme-font" }} />

<div style={{ content: '"color:"' }} />
```

## Declared blind spots

Not caught, by decision. Each is either statically undecidable or belongs to a different
rule. Listing them here means a future change that *starts* catching one will fail its
assertion and force this document to be updated.

### Indirect style values

The object does not appear at the call site. Resolving it would require cross-statement
analysis, which decision A8 declined: bounded and declared beats the slide toward dataflow
analysis, where every answer to *how many levels, which scopes* is arbitrary and gets
re-argued in review. Revisit only if it shows up in practice.

```tsx blindspot
const s = { color: "red" };
<div style={s} />;

<div style={{ ...spread }} />;

<div style={props.style} />;

<div {...props} />;
```

### Imperative DOM manipulation

Outside the JSX surface entirely.

```tsx blindspot
element.style.color = "red";

element.style.setProperty("color", "red");

Object.assign(element.style, { color: "red" });
```

### CSS-in-JS

No `styled-components` / Emotion usage exists in the target codebase. If that changes, this
becomes a new rule rather than an extension of this one.

```tsx blindspot
const Box = styled.div`
  color: red;
`;
```

## Relationship to other rules

- **`no-raw-css-color`** overlaps deliberately. This rule flags the *property*
  (`color:` in a `style` prop); `no-raw-css-color` flags the *value* (`#f00`, `rgb(...)`)
  wherever it appears. `style={{ color: "#f00" }}` therefore reports twice, which is
  correct — both the mechanism and the literal are wrong. `style={{ color: brandToken }}`
  reports once, from this rule only.
- **`no-component-color-override`** governs the `className` channel into design-system
  components. This rule governs the `style` channel into any element. They do not overlap.

## Message

```
messageId: colorInStyleProp
data:      { property }
text:      "{{property}} in style= — inline color bypasses the token system;
            use a color class, or set a --color-* custom property instead"
```

No autofix — choosing the replacement token requires intent this rule cannot infer.
A suggestion offering the custom-property rewrite was considered and rejected: the
generated property name would be a guess.

## Configuration

| Option | `recommended` default | Overriding it |
| --- | --- | --- |
| `allowTokenValues` | `false` | `true` permits `style={{ color: "var(--color-primary)" }}`. See below — the default is deliberate. |
| `shorthandProperties` | `"key"` | `"value"` flags a colour-capable shorthand only when its literal value looks like it carries a colour. Quieter, and misses `boxShadow: shadowVar`. |
| `exclude` | `["**/*.stories.tsx"]` | A preset-level `overrides` glob, not rule logic — no rule derives a path from its own location. Stories are where ad-hoc inline colour is most tempting and least harmful. |

**`var()` values are a violation by default.** `style={{ color: "var(--color-primary)" }}`
does use a token, so the headline rationale does not apply to it. It is still flagged: it
cannot carry a variant, and it still beats every class in the cascade. The custom-property
escape hatch documented above covers the legitimate need, and allowing `var()` here would
create a second, weaker way to do the same thing.

**Colour-capable shorthands flag on the key alone.** Complete, and consistent with
`bias: false-positives`. It will flag `filter: "blur(4px)"`, `boxShadow: "none"` and
`backgroundImage: "url(...)"`, which are rare in a Tailwind codebase and cheap to
`oxlint-disable`. Value inspection is available via `shorthandProperties: "value"` if the
noise proves real.

### Distribution

This rule reads nothing from disk and resolves no path relative to the package. It needs no
token set and no design-system resolution — the colour-property list is a fact about CSS,
not about any project — which makes it the only rule of the nine with no required option.

That has one consequence worth stating: the **options-replace-not-merge** footgun cannot
silence this rule. A consumer writing `"design/no-style-color": "error"` to bump severity
wipes the preset's options and falls back to `defaultOptions`, which is the recommended
policy. Elsewhere that mistake produces zero diagnostics at exit 0; here it produces the
correct behaviour.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

For migration reference. The current rule is a line-oriented regex
(`\b(color|backgroundColor)\s*:`) with manual brace-depth tracking.

| Case | Today | Under this contract |
| --- | --- | --- |
| `style={{ background: "red" }}` | missed | caught |
| `style={{ borderColor: x }}` | missed | caught |
| `style={{ fill, stroke, boxShadow }}` | missed | caught |
| `style={{ color }}` (ES6 shorthand) | missed | caught |
| `style={{ ["color"]: x }}` | missed | caught |
| `colorScheme` | allowed | allowed |
| `"--color-*"` custom property | allowed | allowed |
| Multi-line `style` blocks | caught | caught |
| Two properties in one block | 2 reports | 2 reports |

The regex is case-sensitive and anchored with `(?<!\w)`, which is why every camelCase
property other than `backgroundColor` escapes it today.
