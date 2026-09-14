---
rule: token-constraints
legacy-id: 5
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# token-constraints

Use each semantic color token only in the roles it was designed for.

A token can be valid and still be wrong in a particular place. `muted-foreground` is a text color, not a background. `border` is a line color, not body text. Tailwind may compile `bg-muted-foreground` or `text-border`, but the result is still a design-system mistake.

This rule enforces your project's token policy: which tokens may be used with which utility prefixes and interaction states.

## Reports

This rule reports semantic tokens used outside the allowed role for their utility or state.

Examples of violations a project may choose to forbid:

```tsx
<div className="bg-muted-foreground" />
<div className="text-border" />
<div className="fill-warning-foreground" />
<div className="hover:bg-primary" />
```

The exact answer depends on project policy. For example, a team may require hover-state colors to use hover-specific tokens:

```tsx
<button className="hover:bg-primary" />        // report
<button className="hover:bg-primary-hover" />  // allow
```

## Allows

A token is allowed when it matches the policy for the utility and state.

```tsx
<div className="text-muted-foreground" />
<div className="bg-muted" />
<div className="border-border" />
<button className="hover:bg-primary-hover" />
```

A token policy applies only to classes that set color. If your theme has both a `card` shadow and a `card` color, `shadow-card` is still a shadow utility, not a use of the `card` color token.

```tsx
<div className="hover:shadow-card" />
```

Non-token color values are handled by other rules.

```tsx
<div className="bg-red-500" />
<div className="bg-[#ff0000]" />
<div className="bg-nonexistent" />
```

## Options

This rule is intentionally policy-driven. Your configuration defines allowed and denied token patterns for utilities and variants.

Typical policy examples:

- Text utilities may use foreground tokens.
- Background utilities may not use foreground tokens.
- Border utilities may use border-like tokens.
- Hover variants may require tokens ending in `-hover`.

| Option | Default | What it does |
| --- | --- | --- |
| `allowed` | the recommended policy below | For each key, the only token patterns that may be used there |
| `denied` | the recommended policy below | For each key, token patterns that must not be used there |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. `[]` lints stories too |

**Keys** are either a utility prefix — `text`, `bg`, `border`, `ring-offset`, … — or a variant
family ending in `:` — `hover:`, `focus:`. `border` also covers every side of a border
(`border-t`, `border-x`, `border-s`, …) unless that side has a key of its own. A variant
family covers its related variants too: `hover:` also applies to `group-hover:` and
`peer-hover:`.

**Patterns** match the token name: `primary` exactly, `link*` starts with, `*-foreground`
ends with, `*foreground*` contains, and `*` matches every token.

**How a class is judged.** For its utility prefix, the rule uses `allowed[prefix]` if that
key exists, otherwise `denied[prefix]`, otherwise `denied["*"]` — the fallback for prefixes
with no policy of their own. An allow list therefore also shields its prefix from the
fallback. If the class has a variant with a policy, that policy must be satisfied as well.
An empty list still counts: `allowed: { text: [] }` bans every token after `text-`, and
`denied: { bg: [] }` exempts `bg-` from the fallback.

Writing either `allowed` or `denied` replaces the whole recommended policy, both lists —
nothing from it is mixed back in. Setting only `ignoreGlobs` keeps it. A key in both lists,
or `"*"` in `allowed`, is a configuration error.

The recommended policy, written out:

```ts
"design/token-constraints": ["error", {
  allowed: {
    text: ["*foreground*", "*content*", "primary", "link*"],
    border: ["border*", "input", "ring"],
    "hover:": ["*-hover"],
  },
  denied: { "*": ["*-foreground", "*-content"] },
}]
```

Setting options replaces the ones the recommended setup passed to this rule — see [Configuring rules](../../README.md#mechanism-ships-policy-is-supplied).

## Common fixes

- Use the token that matches the utility's role.
- Add a new role-specific token when the visual state is real but unnamed.
- Adjust the project policy only when the design system intentionally changes.
