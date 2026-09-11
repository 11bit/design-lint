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

Non-token color values are handled by other rules.

```tsx
<div className="bg-red-500" />
<div className="bg-[#ff0000]" />
<div className="bg-nonexistent" />
```

## Configuration

This rule is intentionally policy-driven. Your configuration defines allowed and denied token patterns for utilities and variants.

Typical policy examples:

- Text utilities may use foreground tokens.
- Background utilities may not use foreground tokens.
- Border utilities may use border-like tokens.
- Hover variants may require tokens ending in `-hover`.

## Common fixes

- Use the token that matches the utility's role.
- Add a new role-specific token when the visual state is real but unnamed.
- Adjust the project policy only when the design system intentionally changes.
