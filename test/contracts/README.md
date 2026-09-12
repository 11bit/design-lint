# The contracts

One contract per rule: every case it promises to catch, every case it deliberately allows,
every case it cannot see, and every case it will cover once CSS is linted. A promise nobody
can point at as a passing assertion is not a promise, so each one is a test.

The user-facing guide for a rule is in `docs/rules/`. This is the specification the rule is
written against — read it first when changing a rule, and change it in the same commit.

```
npm test
```

## A contract is data

`<rule>.js` exports a plain object. Nothing in it knows about Oxlint, Vitest or RuleTester,
so a second linter — Stylelint for the CSS surface, say — can run the same cases through an
adapter of its own.

```js
export default {
  rule: "no-raw-color",
  preamble: "…",              // optional: prepended to every case
  cases: [
    { kind: "caught", group: "Tailwind arbitrary values",
      code: `<div className="bg-[#ff0000]" />`,
      reports: [{ id: "rawColorValue", line: 1, column: 17, endLine: 1, endColumn: 29 }] },
    { kind: "blindspot", group: "A literal as a var() fallback",
      code: `<div className="bg-[var(--brand,#f00)]" />` },
    { kind: "deferred", lang: "css", group: "@apply", code: `.a { @apply bg-[#f00]; }` },
  ],
};
```

| `kind` | Meaning | Run as |
| --- | --- | --- |
| `caught` | the rule reports exactly `reports` | invalid — message id and full span asserted |
| `allowed` | silent, by decision | valid |
| `blindspot` | silent, because the rule cannot see it | valid — a blind spot that starts reporting fails |
| `deferred` | a surface not linted yet (CSS) | never run; recorded so the plan is written down |

- `reports` positions are 1-based and relative to the case's own `code`, not the preamble.
- `options`, when present, is written over the rule's defaults — the way a consumer's config
  reaches it. A contract that shares options between cases keeps them in a local
  `options` object and names each one.
- `group` names the part of the contract a case belongs to; it appears in test names.
- A case's reasoning lives in the comment above its group. Keep it: a blind spot without its
  reason is indistinguishable from a bug.

## Files

| File | Job |
| --- | --- |
| `index.js` | the list of contracts, the case schema, and helpers every adapter needs |
| `oxlint.js` | what the Oxlint adapter adds to a case: the options it runs under |
| `oxlint.test.js` | runs every contract through Oxlint's `RuleTester`, plus structural checks |

The extraction test (`test/extract/corpus.test.js`) and the story-file test
(`test/rules/ignore-globs.test.js`) read the same contracts.

## Adding a case

Write the case, run `npx vitest run test/contracts`, and for a `caught` case copy the
message id and span from the failure into `reports` — after checking the span covers what
the author has to edit. RuleTester needs `eslintCompat: true` (1-based columns) and
`parserOptions.lang: "tsx"`; the adapter sets both.
