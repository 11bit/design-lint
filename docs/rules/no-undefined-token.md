---
rule: no-undefined-token
legacy-id: 12
status: implemented
disposition: custom
bias: false-negatives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
---

# no-undefined-token

Do not use color token classes that do not exist.

A class such as `text-warning-foreground` looks correct in review, but if the design system never defined `--color-warning-foreground`, it produces no color at all. The UI then falls back silently, and the missing state may go unnoticed until it ships.

This rule catches token-like color classes that do not resolve to real CSS.

## Reports

This rule reports color utilities whose token name is missing or misspelled.

```tsx
<div className="text-warning-foreground" />
<div className="bg-danger-muted" />
<div className="border-outline" />
<div className="bg-primry" />
<div className="text-forground" />
```

Variants and modifiers do not hide the problem.

```tsx
<div className="hover:text-secondary" />
<div className="md:bg-danger-muted" />
<div className="!bg-danger-muted" />
<div className="bg-danger-muted/50" />
```

## Where it looks

This rule reads strings written where a class list goes:

- a `className` or `class` attribute, including everything inside its expression;
- the value of a `className` property, such as a props object spread onto an element;
- the arguments of `cn`, `clsx`, `classNames`, `cx`, `twMerge`, `twJoin`, `tw`, `cva` and `tv`, at any depth, including object keys and variant values.

```tsx
<div className={cn("p-2", isOpen && "bg-primry")} />
const alert = cva("p-2", { variants: { tone: { danger: "bg-danger-muted" } } });
```

Strings anywhere else are not read, even when they contain classes. This keeps the rule from treating ordinary text as broken Tailwind. Many non-class strings look like color classes: `attributeName="stroke-opacity"` on an SVG element, an object key such as `"shadow-color"`, or a test title that mentions `text-mono`. Reporting those as "generates no CSS" would say something false about working code.

That also means a class typo outside the positions above is not reported by this rule:

```tsx
const tone = { danger: "bg-danger-muted", ok: "bg-success" }; // not checked
const base = "flex text-primry";                              // not checked
```

The other rules in this set still read those strings. To have a class checked by this rule, write it in one of the positions above. For a set of variants, use `cva()`.

## Allows

Defined tokens are allowed.

```tsx
<div className="bg-primary text-primary-foreground border-border" />
```

Non-color utilities are allowed.

```tsx
<div className="text-sm border-2 shadow-md" />
```

Arbitrary values are not the subject of this rule.

```tsx
<div className="bg-[#ff0000]" />
<div className="text-[14px]" />
```

## Options

Every option has a default, so the rule works without any.

| Option | Default | What it does |
| --- | --- | --- |
| `colorPrefixes` | `[]` | Extra utility prefixes to check, added to the ones Tailwind reports — for example a utility from a Tailwind plugin. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Stories are skipped by default; set `[]` to lint them. |

Setting options replaces the ones the recommended setup passed to this rule — see [Configuring rules](../../README.md#mechanism-ships-policy-is-supplied).

## Common fixes

- Correct the spelling of the token.
- Add the missing token if the design role is real.
- Use an existing token if the intended role is already named differently.
