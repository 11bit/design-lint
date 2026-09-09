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

## What the harness cannot do yet

A block can vary the rule's `options`, but not the **semantic token set** — that is derived
by `/policy` from the stylesheets in `tokenFiles`, and `/policy` does not exist until Phase
3. One block in `token-constraints` already needs it (`options=focus-policy` assumes a
`primary-focus` token). So `/policy`'s public interface has to accept a resolved token set
directly, not only a list of paths, or the corpus cannot express a case like that without a
fixture stylesheet per variation.
