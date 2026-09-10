# The contract harness

The nine contracts in `docs/rules/` are specifications and test corpora in the same file.
This directory is what makes the second half true: it extracts the fenced blocks and runs
them, so a promise and a declared blind spot are assertions rather than prose.

```
npm test
```

## The contract format

A fence line is a language, then attributes. A bare word is the block's tag; `key=value`
pairs carry the rest. An untagged block is prose and is ignored.

| Tag | Meaning | Executed as |
| --- | --- | --- |
| `caught` | the rule reports | an invalid case, one error per case unless `count=` says otherwise |
| `allowed` | the rule is silent, deliberately | a valid case |
| `blindspot` | the rule is silent and cannot see it | a valid case |
| `deferred` | a surface we have chosen not to lint yet | **not executed** — counted only |
| `preamble` | prepended to every case in the file | not a case |

Within a block, **blank-line-separated groups are separate cases**. `count=N` says one case
reports N times; without it a case reports once.

```` ```tsx caught count=2 ```` · ```` ```tsx allowed options=deny-all ````

`options=<name>` names a fixture defined earlier in the same contract:

```` ```json options=deny-all ````

Fixtures replace keys rather than merging into them, because that is what Oxlint does with
consumer options — the corpus should not be able to express a configuration a consumer
cannot. A contract that defines any fixture must define `baseline`, which every block
without an explicit `options=` then runs under.

## What each file does

| File | Job |
| --- | --- |
| `contracts.js` | parses the contracts: frontmatter, blocks, cases, fixtures |
| `parse.test.js` | every case parses, checked under a rule that never reports |
| `corpus.test.js` | every case runs against its real rule |
| `contracts.test.js` | structural checks — rule/contract pairing, tags, fixtures, self-contradiction |
| `coverage.test.js` | how many promises are still unmet, against `baseline.json` |
| `locations.test.js` | where each rule points — the one thing the corpus does not assert |
| `options.js` | options the corpus needs that a contract should not have to name, such as paths |

## While the rules are stubs

`caught` cases cannot pass yet, so they run **inverted**: the test asserts the rule fails to
report, and `baseline.json` records how many. Phase 5 implements a rule, flips its contract
to `status: implemented`, and the inversion goes away — every `caught` case then has to hold
for real. Nothing has to be re-tagged; the contract's own status is the switch.

`allowed` and `blindspot` cases are ordinary assertions from day one. A stub satisfies them
trivially, which is the point: a blind spot that quietly starts reporting later fails here.

Two gotchas are worth knowing before touching this code, because both cost an hour to
rediscover:

- **`eslintCompat: true` and `parserOptions.lang: "tsx"` are mandatory.** Without the first,
  columns are 0-based; without the second, nothing parses.
- **Vitest runs a `describe` callback at collection, not when `run()` is called.** Swapping
  `RuleTester.it` around each `run()` therefore does nothing — by collection time it holds
  whatever was assigned last. The pending/normal switch travels in the test case's *name*
  instead, where one dispatcher can read it.

## Locations live outside the corpus

A case asserts `errors: count` and nothing more, so nothing in the corpus says *where* a
rule points — a rule reporting every violation on line 1 would be green across all of it.
`locations.test.js` is that assertion, deliberately kept out of the contract format:

- An expectation carrying a location must also carry a `messageId` or a `message`.
  `errors: [{ line }]` is refused outright, so locations in contracts would mean message
  ids in contracts — and contracts ship as specifications, where a rule's message ids are
  internals.
- Expectations are positional. A `count=3` case would need three ordered entries and a
  defined report order.
- Most cases are a single line, where a line assertion says nothing.
- A contract with a `preamble` has it prepended to every case, so any line number in one
  would be an offset into harness plumbing.

What keeps the file honest is that **a rule whose contract says `status: implemented` must
have a fixture here**, and the fixture must be one a lazy rule could not satisfy: every
expectation a full span, nothing on line 1, violations on more than one line. Both are
tests, so neither is a convention anyone has to remember.

## Where the design system comes from

`theme.css` is a probe surface, not a palette — it exists so prefix derivation can ask
Tailwind what it generates. A rule whose contract is written in token names it does not
have resolves **its own** design system in `options.js` rather than widening the shared
one, because widening moves every other rule's verdicts: `danger-muted` is `no-undefined`'s
running example of an undefined token and `no-spectral-color`'s example of a defined one.
Three rules do this today, each documented where it builds one.


Five rules need a resolved design system or token set, and no rule may read a file to get
one. `options.js` resolves both once from `test/fixtures/theme.css` — the most expensive
thing the suite does — and hands them to rules under `designSystem` and `tokens`, the same
two keys the plugin module fills in at load. A contract that needs to vary either per case
does it in an `options=` fixture block, which is why `/policy` accepts an already-resolved
token set and not only a list of paths.
