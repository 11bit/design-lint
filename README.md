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
    componentSources: ["@/components/ui/*"], // as your imports spell it
  }),
);
```

That is the whole setup. `tokenFiles` are the stylesheets your `--color-*` tokens are
defined in; they are an **input**, read once, never a linted surface. `componentSources` are
the import globs your design-system components come from — pass `[]` if the project has no
such library, which turns `no-component-color-override` off, since it watches components by
where they were imported from and has nothing to watch without them.

**Spell `componentSources` the way your imports are written.** The patterns are matched
against each import exactly as it appears in the file, not against the folder it resolves
to. If your code imports `#/components/ui/button`, write `#/components/ui/*` — even if `@/*`
points at the same folder. A shadcn project records this as `aliases.ui` in
`components.json`. A pattern that matches none of your imports makes the rule watch
nothing, and it cannot tell you: it reports nothing, which looks exactly like a clean
codebase. Relative imports into the folder (`../components/ui/sonner`) are not matched
either — see the
[rule guide](./docs/rules/no-component-color-override.md).

```
src/App.tsx:5:46: error design(no-spectral-color): bg-red-500 — spectral color class; use bg-danger instead
src/App.tsx:8:21: error design(no-undefined-token): text-nonesuch generates no CSS — nonesuch is not defined; check the spelling, or add --color-nonesuch to src/styles.css
```

## The rules

| Rule | Catches |
| --- | --- |
| [`no-raw-color`](./docs/rules/no-raw-color.md) | a colour written as a literal — `#f00`, `rgb(…)`, `red`, `bg-[#f00]` — instead of a token |
| [`no-spectral-color`](./docs/rules/no-spectral-color.md) | a palette class (`bg-red-500`) where a semantic one belongs |
| [`no-undefined-token`](./docs/rules/no-undefined-token.md) | a class under a colour prefix (`bg-`, `text-`, `border-`…) that generates no CSS — usually a mistyped token |
| [`token-constraints`](./docs/rules/token-constraints.md) | a semantic token on a utility or variant its policy forbids (`bg-muted-foreground`) |
| [`no-style-color`](./docs/rules/no-style-color.md) | colour applied through the React `style` prop |
| [`no-opacity-modifier`](./docs/rules/no-opacity-modifier.md) | `/50` opacity modifiers deriving a colour instead of naming one |
| [`no-dark-variant`](./docs/rules/no-dark-variant.md) | `dark:` variants and `light-dark()`, where the token system already handles theming |
| [`no-useless-hover`](./docs/rules/no-useless-hover.md) | `hover:` styling on an element the user cannot interact with |
| [`no-component-color-override`](./docs/rules/no-component-color-override.md) | colour classes passed to a design-system component through `className` |

**Every rule has a guide and a contract.** [`docs/rules/`](./docs/rules/) holds one guide
per rule: what it reports, what it allows, and how to fix a report.
[`test/contracts/`](./test/contracts/) holds its contract — every case it promises to
catch, every case it deliberately allows, and every case it **cannot** see, each one an
executed test. If a rule misses something, the contract either already says so or the
contract is wrong.

## Mechanism ships, policy is supplied

The package knows *how* to find a colour that bypasses the token system. It does not know
which tokens your project has, which components own their own colour, or which palette
families map to which semantic names. The first two you supply — `tokenFiles` and
`componentSources` above. Everything else, from the palette-to-token map to which tokens
may go on which utilities, is a rule option with a recommended default, so a project that
disagrees configures a rule rather than forking one.

```ts
await designLint({
  tokenFiles: ["src/styles.css"],
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

> **Restating a rule replaces the options the preset gave it.** Writing
> `"design/no-raw-color": "warn"` drops what `designLint()` passed that rule. Every rule
> falls back to its recommended policy, so the checks do not change, with two exceptions:
> messages name `src/styles.css` rather than your first token file, and
> `no-component-color-override` throws, because `componentSources` has no default. The
> token set and design system are not options, so an override never touches them. If you
> configured a rule, restate its options alongside the severity.

## What it does not do

Stated plainly, because a linter's gaps matter more than its catches:

- **`.css` files are not linted.** `@apply` lists and CSS declarations carry colour too, and
  today nothing checks them. This is deferred work with written contracts, not a decision
  that it does not matter — each affected rule's contract records its CSS cases as
  `deferred`.
- **Nothing is type-aware, and nothing follows a value across statements.** A class string
  is caught where it is written. `const s = { color: "red" }; <div style={s} />` is not
  caught, and the contracts declare it.
- **A class built by interpolation is not checked.** `` `bg-${tone}` `` could become
  anything, so no rule guesses. Complete classes in the same template still are —
  `` `bg-red-500 ${extra}` `` is caught. To have a dynamic choice checked, choose between
  complete class names: `{ danger: "bg-danger", ok: "bg-success" }[tone]`.
- **Suggestions do not appear in CLI output**, and Oxlint does not surface `meta.docs.url`.
  So every rule puts what you need — the offending class, the token to use instead — in the
  message text itself. The editor quick-fix is an addition to that, never a substitute.

## Requirements

Node 20+ and `oxlint` 1.82+. The design system is built by **`@tailwindcss/node`**, the engine `@tailwindcss/vite`, `@tailwindcss/postcss` and the Tailwind CLI run on, found from your project so the linter and your build agree on which classes exist. If you use one of those, it is already installed — under pnpm too, where it is found through the build tool. Otherwise add it: `npm install --save-dev @tailwindcss/node`. JS plugins load under `jsPlugins`;
`plugins` is reserved for Oxlint's built-in Rust rules and rejects this package.

## License

MIT
