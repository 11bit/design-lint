# The rules

Nine rules, one contract each. A contract is a specification and a test corpus in the same
file: its prose says what the rule promises, and its fenced `caught` / `allowed` /
`blindspot` blocks are executed against the rule by
[the harness](../../test/harness/README.md). A promise nobody can point at as a passing
assertion is not a promise.

| Rule | Catches |
| --- | --- |
| [`no-style-color`](./no-style-color.md) | colour applied through the React `style` prop |
| [`no-raw-color`](./no-raw-color.md) | a colour written as a literal instead of a token |
| [`no-spectral-color`](./no-spectral-color.md) | a spectral palette class where a semantic one belongs |
| [`no-undefined-token`](./no-undefined-token.md) | a token-shaped class that resolves to no token |
| [`token-constraints`](./token-constraints.md) | tokens used outside the roles they were defined for |
| [`no-opacity-modifier`](./no-opacity-modifier.md) | `/50` opacity modifiers on colour classes |
| [`no-dark-variant`](./no-dark-variant.md) | `dark:` variants, which the token system handles |
| [`no-useless-hover`](./no-useless-hover.md) | a `hover:` colour that changes nothing |
| [`no-component-color-override`](./no-component-color-override.md) | colour classes imposed on a design-system component from outside |

## How the surface divides

Three questions, and every rule answers one of them:

- **The `style` prop.** `no-style-color` alone. A `style` object reaches an element only as
  a JSX attribute, so nothing else can carry one.
- **Every class string in the file.** The six token rules use `sweepVisitors` from
  [`src/extract`](../../src/extract/index.js): every string literal and every static
  template segment, wherever it sits — a `cn()` argument, a `cva()` variant map, a `.ts`
  constants file. Breadth is the point.
- **The class strings that reach *this* element.** The three JSX rules use
  `classSourcesOfElement`, which resolves one element's `className` and unwraps composition
  helpers to any depth. A class on `<Button>` means something a class on `<div>` does not.

Both extractors refuse to follow identifiers, member expressions, `+` concatenation and
unknown calls. That line — *is the literal present or not* — is drawn once, in one module,
and every contract's blind spots are drawn along it.

## Writing a rule

**The contract is the specification, and it already exists.** Read it first, implement
against it, and change it only when it is wrong — as prose, with the reasoning, in the same
commit as the code. Its corpus is already red on every promise the rule has yet to keep.

- **A rule is a pure function of its input.** No filesystem reads, no path derived from the
  package's own location, nothing global. Everything external — token sets, component
  sources, replacement maps — arrives through `options`, so the same rule works in a project
  shaped nothing like this one. Discovery that must touch disk happens once at plugin-module
  load, never inside `create()`, or `RuleTester` stops working.
- **Shared questions get one answer.** Which classes exist is `src/extract`; which
  properties apply a colour, which prefixes take a colour, what a token resolves to, how a
  class splits into variants is `src/policy`. If a second rule needs a question answered,
  move the answer there rather than writing it twice — the proof of concept's coverage
  differed rule by rule for exactly this reason.
- **Options cross a JSON boundary; resolved inputs are bound instead.** Oxlint hands a
  plugin its options from Rust as JSON, so a method does not survive the trip and a `Set`
  arrives as `{}`. What a consumer writes — a replacement map, a list of prefixes, a
  boolean — is JSON and travels as options. What a consumer cannot write by hand — the
  resolved design system, the token set — is built once at load from the `tokenFiles` or
  `entryPoint` they did write, and bound around `create` by `bindResolved` in
  `src/plugin.js`. A rule reads both from `context.options[0]` and never knows the
  difference; `test/harness/options.js` is the corpus's stand-in for that load step. Bound
  values are defaults, so anything the caller supplied for the same key still wins.
- **`messageId` plus `data`, never an interpolated string.** The message text is the only
  channel a rule can rely on: suggestions do not render in CLI output and `meta.docs.url` is
  dead under Oxlint. Anything the reader needs — the offending property, the token to use
  instead — goes in the message via `data`, and into a suggestion only *in addition*.
- **`meta.defaultOptions` carries the recommended policy**, so a consumer who wipes the
  preset's options by writing `"design/<rule>": "error"` lands on the right behaviour rather
  than on nothing. Options replace, they do not merge.
- **Report at the smallest node that identifies the violation** — the property, the class
  token, the attribute — not the element or the file. Locations are asserted in
  [`test/harness/locations.test.js`](../../test/harness/locations.test.js), and a rule
  cannot be marked implemented without a fixture there.
- **Fail loudly, never quietly.** A rule missing a required option throws; it does not
  return early and report nothing. A configuration whose machinery does not exist yet
  throws too. Silence is indistinguishable from a clean codebase.
- **Never order a destructive suggestion first.** The first suggestion is the one people
  accept without reading.

## Landing a rule

1. The rule in `src/rules/<id>.js`, registered in `src/rules/index.js` under the id that
   appears in diagnostics and in `oxlint-disable` comments.
2. Its contract's frontmatter flipped to `status: implemented`, which stops the harness
   inverting the `caught` cases and starts requiring them for real.
3. Its number in `test/harness/baseline.json` driven to `0`.
4. A fixture in `test/harness/locations.test.js`: full spans, nothing on line 1, violations
   on more than one line.
5. `npm test` green — the whole suite, not one file. Every other rule's blind spots are
   assertions too, and a rule that starts reporting one of them fails there.
