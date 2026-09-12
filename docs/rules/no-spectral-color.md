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

## Options

Every option has a default, so the rule works without any of them.

| Option | Default | What it does |
| --- | --- | --- |
| `replacement` | a built-in map (see below) | Maps palette colors to the semantic token a report should suggest, per utility prefix. |
| `flagFixedColors` | `true` | Also reports the unscaled palette colors `white` and `black` (`text-white`, `bg-black`). Set `false` to allow them. |
| `tokenFiles` | `["src/styles.css"]` | The token stylesheet names shown in messages. The recommended setup fills this in with your token stylesheets; it doesn't change what the rule checks. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Set `[]` to lint Storybook stories too. |

A `replacement` map lists, for each utility prefix, palette ranges and the token to suggest for them:

```ts
replacement: {
  bg: [{ "red-400...500": "danger" }, { "red-100...200": "danger-weak" }],
  text: [{ "green-400...600": "success-content" }],
}
```

- A map you supply replaces the default whole; a prefix you leave out gets no suggestion.
- A token is only suggested when your token stylesheets define it; otherwise the report still fires, without a suggestion.
- A map with the wrong value shape is a configuration error. Unknown prefix keys are accepted, but they match no classes and produce no suggestions.
- The default map assumes a `success` / `info` / `warning` / `danger` vocabulary with `-weak` and `-content` variants, for `bg-` and `text-`.

Setting options replaces the ones the recommended setup passed to this rule — see [Configuring rules](../../README.md#mechanism-ships-policy-is-supplied).

## Common fixes

- Replace the palette class with the semantic token that describes the intended role.
- If the role does not exist yet, add a token rather than choosing a nearby palette color.
- Keep mappings such as `red-500 -> danger` in project configuration when you want diagnostics to suggest the right token.
