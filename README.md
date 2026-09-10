# @evil-martians/design-lint

Nine lint rules that keep colour in a Tailwind v4 codebase resolving through design tokens,
for [Oxlint](https://oxc.rs/docs/guide/usage/linter).

A colour written as `#0a7cff`, as `bg-blue-500`, as `style={{ color }}`, or as
`dark:bg-slate-800` is invisible to the design system: nothing links it to a token, so the
day the brand blue moves, that one value stays behind. These rules find each of those
routes and say which token to use instead.

```
npm install --save-dev @evil-martians/design-lint oxlint
```

```ts
// oxlint.config.ts — auto-discovered. `.oxlintrc.json` must NOT also exist.
import { defineConfig } from "oxlint";
import { designLint } from "@evil-martians/design-lint/preset";

export default defineConfig(
  await designLint({
    tokenFiles: ["src/styles.css"],
    componentSources: ["@/components/ui/*"],
  }),
);
```

That is the whole setup. `tokenFiles` are the stylesheets your `--color-*` tokens are
defined in; they are an **input**, read once, never a linted surface. `componentSources` are
the import globs your design-system components come from — pass `[]` if the project has no
such library, which turns `no-component-color-override` off, since it watches components by
where they were imported from and has nothing to watch without them.

```
src/App.tsx:5:46: error design(no-spectral-color): bg-red-500 — spectral color class; use bg-danger instead
src/App.tsx:8:21: error design(no-undefined-token): text-nonesuch generates no CSS — nonesuch is not defined; check the spelling, or add --color-nonesuch to src/styles.css
```

## The rules

| Rule | Catches |
| --- | --- |
| [`no-raw-color`](./docs/rules/no-raw-color.md) | a colour written as a literal — `#f00`, `rgb(…)`, `red`, `bg-[#f00]` — instead of a token |
| [`no-spectral-color`](./docs/rules/no-spectral-color.md) | a palette class (`bg-red-500`) where a semantic one belongs |
| [`no-undefined-token`](./docs/rules/no-undefined-token.md) | a token-shaped class that resolves to nothing — usually a typo |
| [`token-constraints`](./docs/rules/token-constraints.md) | tokens used outside the roles they were defined for |
| [`no-style-color`](./docs/rules/no-style-color.md) | colour applied through the React `style` prop |
| [`no-opacity-modifier`](./docs/rules/no-opacity-modifier.md) | `/50` opacity modifiers deriving a colour instead of naming one |
| [`no-dark-variant`](./docs/rules/no-dark-variant.md) | `dark:` variants, where the token system already handles theming |
| [`no-useless-hover`](./docs/rules/no-useless-hover.md) | a `hover:` colour on an element that cannot be interacted with |
| [`no-component-color-override`](./docs/rules/no-component-color-override.md) | colour classes imposed on a design-system component from outside |

**Every rule ships its contract.** [`docs/rules/`](./docs/rules/) holds one document per
rule saying what it promises to catch, what it deliberately allows, and — the part worth
reading — what it **cannot** see. Those documents are not prose about the rules: their
examples are executed as the rule's test suite, so a promise and a declared blind spot are
both assertions. If a rule misses something, the contract either already says so or the
contract is wrong.

## Mechanism ships, policy is supplied

The package knows *how* to find a colour that bypasses the token system. It does not know
which tokens your project has, which components own their own colour, or which palette
families map to which semantic names. Every one of those is an option with a recommended
default, so a project that disagrees configures a rule rather than forking one.

```ts
await designLint({
  tokenFiles: ["src/styles.css"],
  componentSources: ["@/components/ui/*"],
  preset: "minimal",   // the five rules that need no settled token vocabulary
});
```

Individual rules are configured the ordinary way, after the factory's config is spread:

```ts
export default defineConfig({
  ...(await designLint({ tokenFiles: ["src/styles.css"] })),
  rules: {
    "design/no-dark-variant": ["error", { flagNonColorUtilities: false }],
  },
});
```

> **Rule options replace, they do not merge.** Restating a rule to change only its severity
> wipes every option the preset set for it. Each rule carries the recommended policy in its
> own `defaultOptions`, so this degrades to the right behaviour rather than to silence — but
> if you configured a rule, restate the options alongside the severity.

## What it does not do

Stated plainly, because a linter's gaps matter more than its catches:

- **`.css` files are not linted.** `@apply` lists and CSS declarations carry colour too, and
  today nothing checks them. This is deferred work with written contracts, not a decision
  that it does not matter — each affected rule has a `Deferred: CSS surface` section.
- **Nothing is type-aware, and nothing follows a value across statements.** A class string
  is caught where it is written. `const s = { color: "red" }; <div style={s} />` is not
  caught, and the contracts declare it.
- **Suggestions do not appear in CLI output**, and Oxlint does not surface `meta.docs.url`.
  So every rule puts what you need — the offending class, the token to use instead — in the
  message text itself. The editor quick-fix is an addition to that, never a substitute.

## Requirements

Node 20+, `oxlint` 1.82+ and `tailwindcss` 4+ as peers. JS plugins load under `jsPlugins`;
`plugins` is reserved for Oxlint's built-in Rust rules and rejects this package.

## License

MIT
