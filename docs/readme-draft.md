# README draft

> **Draft.** This becomes the package `README.md` in Phase 6. It is written now as a
> design instrument: anything that cannot be explained here simply is a design problem,
> not a documentation problem. Items marked **[TBD]** are blocked on decisions listed at
> the end.

---

# @evil-martians/design-lint

Lint rules that keep colour in a Tailwind v4 codebase inside your design system.

Nine rules that catch raw colour values, palette classes used in place of semantic tokens,
inline colour that escapes theming, and colour classes forced onto design-system
components. Every rule is written and maintained here — no third-party rule packages, so
every diagnostic appears under one namespace. Runs on [Oxlint](https://oxc.rs) or ESLint,
from one install.

```
src/components/Badge.tsx:14:22
  bg-red-500 — spectral colour class; use a design token instead — try bg-danger
src/components/Card.tsx:8:16
  color in style= — inline colour bypasses the token system; use a colour class,
  or set a --color-* custom property instead
```

## Requirements

- Tailwind CSS **v4** — rules resolve against your `@theme` block, not a JS config
- `.js`, `.jsx`, `.ts`, `.tsx`. Four of the nine rules are JSX-specific and need React or
  another JSX framework; the other five work on any JavaScript or TypeScript
- **`oxlint` >= 1.55.0** — JS plugins reached alpha there. Declared as a peer dependency.
- **Node >= 22.18, or >= 24** — required to execute an `oxlint.config.ts`. If you are on
  an older Node, use the `.oxlintrc.json` form below instead, which has no such
  requirement.

## Install

```bash
npm i -D @evil-martians/design-lint oxlint
```

## Setup

Create `oxlint.config.ts` in your project root:

```ts
import { defineConfig } from "oxlint";
import { designLint } from "@evil-martians/design-lint/preset";

export default defineConfig(
  designLint({
    tokenFiles: ["src/styles.css"],
    componentsDirectory: "src/components/ui",
  }),
);
```

Then:

```bash
npx oxlint
```

That is the whole setup. The preset enables all nine rules, wires up the Tailwind entry
point, and pulls in its own dependencies — you do not configure them.

> **Do not also have an `.oxlintrc.json`.** Oxlint errors if both exist.

### What the two options mean

| Option | Meaning |
| --- | --- |
| `tokenFiles` | Your Tailwind entry CSS — where `@theme` and your `--color-*` tokens live. Rules read the token vocabulary from here, so adding a token needs no config change. These files are exempt from raw-colour checks; they are the source of truth. |
| `componentsDirectory` | Where your design-system components live. Colour classes passed to these components via `className` are flagged, because they should be variants instead. Omit it to disable that rule, or pass `components: ["Button", "Badge"]` if your components are not in one directory. |

## The rules

| Rule | Catches |
| --- | --- |
| `no-raw-color` | `#f00`, `rgb(…)`, `oklch(…)` in `bg-[#ff0000]`, SVG attributes, and string constants |
| `no-spectral-color` | `bg-red-500`, `text-blue-200` — palette classes where a token belongs |
| `no-style-color` | `style={{ color }}` and every other colour property in a `style` prop |
| `no-opacity-modifier` | `bg-primary/50` — use a token with the opacity baked in |
| `no-dark-variant` | `dark:` — theming belongs in CSS custom properties |
| `no-undefined-token` | `bg-primry` — a colour class that resolves to no CSS |
| `token-constraints` | Tokens used on the wrong property, e.g. `text-` with a surface token |
| `no-useless-hover` | `hover:` on elements that cannot be hovered meaningfully |
| `no-component-color-override` | `<Button className="bg-primary">` — use a variant |

Every rule has a **contract** in [`docs/rules/`](./docs/rules/) stating exactly what it
promises to catch, what it deliberately allows, and **what it knowingly does not look
at**. The blind spots are asserted by this package's test suite, so they are guarantees
rather than aspirations. Read the contract before filing a bug — the answer is often
there, on purpose.

## Configuring policy

The rules ship with sensible defaults but no opinions of their own. Which tokens are
allowed where, and which palette classes map to which token, is **your** design system's
policy — so it lives in a JSON file your designers can edit without touching TypeScript.

Create `design-lint.config.json` next to your `oxlint.config.ts`:

```json
{
  "token-constraints": {
    "allowed": {
      "text": ["*foreground*", "*content*", "primary", "link*"],
      "border": ["border*", "input", "ring"]
    },
    "denied": { "*": ["*-foreground", "*-content"] }
  },
  "no-spectral-color": {
    "replacement": {
      "bg": [{ "red-400...600": "danger" }, { "green-400...600": "success" }]
    }
  }
}
```

It is discovered automatically. A [JSON Schema](./schema.json) ships with the package, so
editors autocomplete and validate it.

`replacement` maps palette ranges to your token names, which turns a bare complaint into
`bg-red-500 — try bg-danger`. It is optional; without it the rule still fires, it just
cannot suggest.

## Turning rules off

Per line:

```tsx
{/* oxlint-disable-next-line design/no-spectral-color */}
<div className="bg-red-500" />
```

Whole rule, in `oxlint.config.ts`:

```ts
export default defineConfig({
  ...designLint({ tokenFiles: ["src/styles.css"] }),
  rules: { "design/no-dark-variant": "off" },
});
```

> ### ⚠️ Changing a rule's severity discards its configuration
>
> Oxlint **replaces** rule options rather than merging them. Writing
> `"design/token-constraints": "error"` to change severity silently wipes the options the
> preset supplied — the rule stays enabled and catches **nothing**, with exit code 0.
>
> To change severity while keeping configuration, pass both:
>
> ```ts
> rules: { "design/token-constraints": ["error", designLintOptions.tokenConstraints] }
> ```
>
> This differs from ESLint flat config, where options merge. Rules in this package fail
> loudly when required options are missing, which catches most cases — but severity-only
> overrides are the one shape that can slip through.

## What is not covered yet

**Stylesheets are not linted.** The rules cover `.js`, `.jsx`, `.ts` and `.tsx` only, so
raw colours in `.css` files, `@apply` directives, `.dark &` selectors and
`@media (prefers-color-scheme: dark)` blocks pass without comment.

This is deferred, not a blind spot — planned work, not a decision to ignore it. Each
affected contract carries a `Deferred: CSS surface` section describing what it will cover
when CSS lands.

Your token stylesheets are still **read** — that is where the token vocabulary and the
Tailwind design system come from. Being read is not the same as being linted.

The one place the boundary runs through a single rule: `bg-[light-dark(…)]` is a class
string in a `.tsx` file and *is* checked; `light-dark()` in a CSS declaration is not.

## Using ESLint instead

The same rules run under ESLint v9 flat config:

```js
import designLint from "@evil-martians/design-lint/eslint";

export default [
  designLint({ tokenFiles: ["src/styles.css"] }),
];
```

Identical diagnostics — same positions, messages, and severities. Under ESLint you also
get `meta.docs.url`, so each diagnostic links to its contract; Oxlint does not surface
that, so on Oxlint the message text carries everything you need.

## Editor support

Oxlint's language server has run JS plugin rules since **1.44.0**, so diagnostics appear
in the editor alongside built-in ones. **[TBD — capability confirmed from the changelog,
but not yet exercised end-to-end with this package's rules.]**

Quick-fix suggestions are editor-only: they never appear in CLI output. Every suggestion
this package offers also states its replacement in the message text, so nothing is lost
on the terminal.

---

## Decisions this draft is blocked on

Writing this surfaced four, in rough order of how visible they are to a user:

1. **The rule namespace.** Every diagnostic and every disable comment contains it. Drafted
   as `design/`; alternatives `design-lint/`, `ds/`. It is public API — changing it later
   breaks every suppression comment in every consuming project.
2. **The package name.** `@evil-martians/design-lint` is a placeholder.
3. **Editor support.** Named as unverified rather than promised. If it does not work, the
   pitch changes materially — CLI-only linting is a much weaker product.
4. **How policy reaches rules.** This draft assumes an auto-discovered
   `design-lint.config.json`, keeping the designer-editable property the proof of concept
   has. The alternative — policy as arguments to the factory in `oxlint.config.ts` — is
   fewer moving parts but puts design decisions in a TypeScript file. Recommend the JSON.

Two things the draft deliberately does *not* do, both worth confirming:

- It does not name any dependency beyond `oxlint` itself. Nothing to explain: every rule
  reports under `design/`, so the rules table and the terminal now agree. This was a
  documented leak while five rules came from `oxlint-tailwindcss`; owning all nine closed
  it.
- It does not explain the token system, only how to lint against one. That seems right,
  but it means the package assumes a reader who already has semantic tokens.
