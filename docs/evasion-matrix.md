# Evasion-route matrix

> **Migration scaffolding — delete in Phase 6.** This is the audit trail for
> [Phase 2](./migration-plan.md#phase-2--build-the-evasion-corpus): proof that every
> syntactic route to a forbidden thing has been considered against every rule. The
> dispositions themselves live in the contracts, as executed case blocks. Nothing here is
> a second source of truth, and nothing here outlives the migration.

Phase 2 asks one question, twelve times, of nine rules: **if someone wanted to write the
forbidden thing anyway, could this route carry it past the rule?** A cell is answered when
the contract contains a case block for it, or when the route cannot structurally reach that
rule.

| Disposition | Meaning | Asserted by |
| --- | --- | --- |
| **catch** | The rule reports | a `caught` block |
| **allow** | The rule is silent, deliberately, and another rule may report | an `allowed` block |
| **blind** | The rule is silent and cannot see it — a declared limit | a `blindspot` block |
| **n/a** | The route cannot reach this rule at all | prose, no block — there is nothing to execute |

## Token family — the broad sweep

`no-spectral-color` · `no-opacity-modifier` · `no-dark-variant` · `no-undefined-token` ·
`token-constraints` · `no-raw-color`

These rules are context-free: they ask "is this string a forbidden class?" and never need to
know which element it lands on. Decision **A7** gives them every string literal and every
static template-literal segment in the file. So most of the route list collapses — a
`twMerge()` argument and a `cva()` variant and an object-map value are one string literal
each, and the sweep does not parse the wrapper. The routes that stay interesting are the
ones where the literal *stops being a literal*.

| Route | spectral | opacity | dark | undefined | constraints | raw-color |
| --- | --- | --- | --- | --- | --- | --- |
| String literal | catch | catch | catch | catch | catch | catch |
| Static template literal | catch | catch | catch | catch | catch | catch |
| Dynamic template literal | **catch** | catch | catch | allow | allow | blind |
| `cn` / `clsx` / `twMerge` | catch | catch | catch | catch | catch | catch |
| `cva` / `tv` | catch | catch | catch | catch | catch | catch |
| Variable indirection (definition) | catch | catch | catch | catch | catch | catch |
| Variable indirection (use site) | blind | blind | blind | blind | blind | blind |
| Object lookup map | catch | catch | catch | catch | catch | catch |
| Array join | catch | catch | catch | catch | catch | catch |
| String concatenation | blind | blind | blind | blind | blind | blind |
| Props spread | catch | catch | catch | catch | catch | catch |
| Multi-line JSX | catch | catch | catch | catch | catch | catch |
| `.ts` constants file | catch | catch | catch | catch | catch | catch |

Three rows carry the whole phase for this family:

- **Dynamic template literal.** `no-spectral-color` owns the prefix-adjacent diagnostic for
  the family (**A7b**), so `` `text-${tone}` `` reports once, there, and the other rules stay
  silent by design rather than by omission — `token-constraints` keeps the cases in an
  `allowed` block precisely so the coverage is visible from its own contract. The exceptions
  are `no-opacity-modifier` and `no-dark-variant`, whose subject (`/`, `dark:`) is statically
  present even when the colour is not, so they catch their own. `no-raw-color` is blind: no
  literal, nothing to report.
- **Variable indirection.** The definition is caught, the use site is not. This is the shape
  of the sweep, stated the same way in all six contracts, and it is why the `.ts` constants
  surface is worth having.
- **String concatenation.** The one route the sweep cannot follow, blind in all six. Closing
  it means reassembling `"bg-" + tone + "-500"`, which is dataflow analysis; the family draws
  the line at *literal present or not*.

## JSX family — the precise walk

`no-component-color-override` · `no-useless-hover` · `no-style-color`

These rules are context-dependent: a class on `<Button>` means something different from the
same class on `<div>`, and a `style` object means nothing at all until it is attached to an
element. Every route is therefore a separate extraction question, and the answers are much
less uniform. This is where the corpus earns its cost.

| Route | component-override | useless-hover | style-color |
| --- | --- | --- | --- |
| String literal | catch | catch | catch |
| Static template literal | catch | catch | catch |
| Dynamic template literal | catch | catch | catch |
| `cn` / `clsx` / `twMerge` | catch | catch | n/a |
| `cva` / `tv` | allow | blind | n/a |
| Variable indirection | blind | blind | blind |
| Object lookup map | blind | blind | blind |
| Array join | blind | blind | n/a |
| String concatenation | blind | blind | catch |
| Props spread | blind | blind | blind |
| Multi-line JSX | catch | catch | catch |
| `.ts` constants file | n/a | n/a | n/a |

Where the two families diverge, and why:

- **`cva()` splits three ways, and each answer is structural.** For the token rules a variant
  map is a bag of strings, so it is caught. For `no-component-color-override` it is *allowed* —
  a `cva()` call is not a JSX element, and declaring variants is the behaviour that rule pushes
  people toward, so both halves of the answer agree (**B3**). For `no-useless-hover` it is
  *blind*: the class is real and the element it lands on is unknown, which is a limit rather
  than an endorsement.
- **Composition helpers are followed; arbitrary expressions are not.** `cn` / `clsx` /
  `classNames` / `cx` / `twMerge` / `twJoin` / `tw` are unwrapped to any depth, including
  conditionals, arrays and object keys inside them. A runtime `.join()`, a `+`, or a
  `className` arriving through a spread is blind — the literal exists and the token rules still
  read it, but its landing site does not, so the question these rules ask cannot be answered.
- **`.ts` constants are unreachable, not missed.** A JSX element and a `style` prop cannot
  exist outside `.tsx` / `.jsx` (**B1**), so scanning those files with a JSX rule is pure cost.
- **`no-style-color` has a different subject**, and four cells say so. Class-string routes
  cannot carry a `style` prop at all. String concatenation *is* caught, because this rule
  reports the **property**, not the value: `color: "r" + "ed"` and `color: computeColor()` are
  the same violation, and the literal inside belongs to `no-raw-color`.

## What the enumeration changed

Every cell above now has a case block or a sentence. Thirty-two had no case exercising them
when the phase began, counted by a mechanical scan over the fenced blocks: twenty-seven
gained one here, four are recorded as unreachable in prose, and one — variable indirection
under `token-constraints` — turned out to be covered already, by a member-expression case
the scan did not recognise. The additions were routes, not new policy — each one follows from a decision already made in
Phase 1, which is the expected result when the contracts are sound. Specifically:

- Five token contracts gained the wrapper routes their sweep already covered but never
  demonstrated: static template literal, `twMerge`, `tv`, array join, props spread, and an
  attribute on a line of its own. `token-constraints` gained the three it was missing.
- The token contracts that documented a use-site blind spot only through an object map gained
  the bare-variable form alongside it.
- `no-component-color-override` gained multi-line elements — the attribute's position on the
  page is irrelevant to a walk that resolves `className` on the element, and the contract now
  says so in executable form.
- `no-useless-hover` gained the three composition routes the walk does *not* follow, as a
  blind spot, with a note on which of them the token rules still see.
- `no-style-color` gained a dynamic and a concatenated value, plus the section that records
  which routes are unreachable here rather than unhandled.

## Findings that need a decision

**Three mechanisms are in use for one policy: excluding files.** This crosses all nine
contracts and it is mechanism, not policy, so it cannot be settled by a preset default.

| Contract | How it excludes Storybook |
| --- | --- |
| `no-dark-variant`, `no-opacity-modifier`, `no-spectral-color`, `no-undefined-token` | an `ignoreGlobs` rule option |
| `token-constraints`, `no-raw-color` | an `exclude` rule option |
| `no-component-color-override`, `no-useless-hover`, `no-style-color` | a preset `overrides` glob, explicitly *not* rule logic |

The nine contracts were agreed independently and drifted. Two of the three spellings are the
same idea under different names, and the third is a different idea altogether — it puts the
exclusion in the host's config, where it costs the rule nothing and cannot be wiped by the
options-replace footgun. That footgun is the argument for picking it: a consumer who writes
`"design/no-spectral-color": "error"` to bump a severity silently discards `ignoreGlobs`
along with every other option, and stories start reporting.

Against it: `overrides` support for JS-plugin rules is **not** among the eight capabilities
Phase 0 verified. It needs an hour of spike before nine contracts are rewritten around it.

Recommendation: **one mechanism, the preset `overrides` glob, verified first.** Rule options
then carry no glob lists at all, with one exception that is not file policy —
`no-raw-color`'s `tokenFiles`, which is an input the rule needs for other reasons and whose
whole-file exemption is decision **A11**.
