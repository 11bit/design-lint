# Porting the proof of concept's tests — the per-case record

Phase 5 step 2 asks for the surviving proof-of-concept tests to be ported into the
contracts, and warns against doing it on autopilot: *"anything they assert that a contract
does not is either a gap in the contract or behaviour the contracts deliberately changed —
decide per case."*

This is that decision, for all 160 cases. **The answer is that 157 of them are already in
the corpus**, so the port moves almost nothing. That is a claim about coverage, and a claim
about coverage is worthless unasserted — so it was made mechanically, by matching every
`const el = ...` snippet in the ten proof-of-concept test files against the executable cases
the harness extracts from the nine contracts, and then reading every non-match by hand. This
document is the second half: the hand reading.

> This document is disposable. It exists to justify not doing a piece of work, and it goes
> with the plan and the proof of concept in Phase 6.

## The numbers

| Rule | Matched automatically | Read by hand | Corpus cases |
| --- | --- | --- | --- |
| `no-style-color` | 9/12 | 3 | 60 |
| `no-dark-variant` | 7/11 | 4 | 47 |
| `no-opacity-modifier` | 7/11 | 4 | 57 |
| `no-spectral-color` | 7/19 | 12 | 75 |
| `no-undefined-token` | 7/9 | 2 | 45 |
| `token-constraints` | 21/23 | 2 | 142 |
| `no-useless-hover` | 15/20 | 5 | 112 |
| `no-component-color-override` | 10/17 | 7 | 108 |
| `no-raw-color` | 15/20 | 5 | 86 |
| **Total** | **98/142** | **44** | **732** |

Plus 18 in `linter.test.ts`, which the plan already disposes of as orchestrator tests.

**The matcher is deliberately crude** — whitespace-collapsed substring matching in both
directions. It over-reports misses, which is the safe direction: a false miss costs a minute
of reading, a false match would silently drop a case. All 44 are below.

## The plan's arithmetic was stale

The plan said "port the 72 surviving PoC tests" in two places while its own disposition
table said 122. The table is right and the prose predates it: 160 − 18 orchestrator −
20 CSS-deferred = 122, and the table says in as many words that the 50 cases once slated
for deletion with the delegated rules now port too. 72 + 50 = 122. Both numbers are now
moot, but the corrected one is 122.

## What the 44 turned out to be

### Present in the corpus in an equivalent form — 41

The matcher missed these on wording, not on substance.

| Proof-of-concept case | Where the corpus has it |
| --- | --- |
| `hover:dark:bg-primary` | `dark:hover:bg-card`, `hover:dark:bg-card`, `group-hover:dark:text-foreground`, `lg:dark:focus-visible:ring-primary` — the corpus varies the position of `dark:` in the chain, which is the property being asserted |
| `dark:bg-primary dark:text-muted` (2 reports) | same string, as a `count=2` block |
| `bg-primary`, `hover:bg-primary` allowed | `bg-card text-card-foreground border-border` — the same promise, on tokens the fixture theme defines |
| `bg-primary/50 …` ×4 (4 reports) | same string, as a `count=4` block |
| `w-1/2` allowed | `w-1/2 h-1/3 basis-2/3 top-1/4`, plus `translate-x-1/2`, `aspect-16/9` |
| `text-sm` allowed (opacity, spectral) | `text-sm/6 text-lg/7 text-base/loose`, `text-sm text-center text-balance` |
| `bg-cover` allowed (spectral, constraints) | `bg-cover bg-no-repeat bg-center` |
| spectral hint in/out of range, prefix with no entry | two `messageId`s — `spectralColorWithReplacement` and `spectralColor` — which *is* the in-range/out-of-range split, specified rather than sampled |
| `text-green-400/500/600`, `bg-blue-500`, `bg-green-100/200/700` | the corpus varies family and scale across its own caught blocks; the range logic is the `replacement` option's, and the contract pins it as an option rather than as instances |
| `bg-red-500` allowed under `no-undefined-token` | the contract's partition section — a spectral class resolves, so this rule is silent by construction |
| `hover:text-primary` reported by `token-constraints` | the `hover:` family cases, which decision **A2** rewrote after the proof of concept was written |
| `<a>`, `<Button>`, `<TableRow>`, `href={url}`, `Dialog.Close` allowed | `<a href="/x">`, bare `<a>`, `href` on a div, `Dialog.Trigger`, `Dialog.Content`, and the rule that a capitalized component is never reported — a stronger model than the proof of concept's allow-list |
| `cn("bg-primary", extra)` on a watched component | six `cn()` shapes, including `cn(className, "bg-primary")` |
| `` `bg-${color}` ``, `` `text-${color}` ``, `` `bg-red-${shade}` `` | all three verbatim, under [Interpolated colors](./rules/no-component-color-override.md) (decision **A7b**) |
| `` `red-${500}` `` allowed | the same section — the prefix must be a colour prefix |
| `rounded-md px-4 text-sm` allowed on a watched component | the non-colour-utility allowed block |
| `hsla()`, `oklab()`, `lch()` in arbitrary values | the recognised-function table and the detection regex, which name all nine functions rather than sampling three |
| `style={{ color: "var(--color-primary)" }}` allowed | the custom-property escape hatch, in both this contract and `no-style-color`'s |
| `style={{ fontSize: "1rem" }}` allowed | `no-style-color`'s non-colour-property block; `no-raw-color` does not own the property |
| `--color-primary` in a `style` prop | `"--color-brand": userColor`, `"--chart-series-1": series.color` |
| multi-line `style` blocks | the multi-line `fontWeight` / `color` case and the `count=2` case |

### Superseded — 9

One `color-lint-ignore` test per rule. Inline disable directives are the runner's job, not a
rule's, and Phase 0 verified `oxlint` handles them including `eslint-disable-next-line`. The
`color-lint-ignore` comment itself does not survive the migration.

### Deferred with the CSS surface — 20

`no-raw-color`'s `.css` cases, exactly as the plan's disposition table already says.

### A genuine gap, and it is in the harness rather than a contract — 1

The proof of concept asserted **where** a report lands:

```ts
it("reports color on a continuation line of a multi-line style block", () => {
  // <div\n  style={{\n    color: "red",\n  }}\n/>
  expect(result[0].line).toBe(3);
});
```

**The corpus asserts counts and nothing else** — `errors: c.count` in
`test/harness/corpus.test.js`. Across all 732 cases, no case asserts a line or a column, so
a rule that reported every violation on line 1 of the file would be green.

That mattered enough to test for in the proof of concept because it scanned braces and lines
by hand, and reporting against the wrong line was a live failure mode. An AST rule reporting
on the property node gets the location right nearly by construction — but "nearly by
construction" is what the corpus exists to stop anyone saying.

This is a decision about the contract format, which ships, so it is not made here. The two
shapes are a `line=` fence attribute the harness turns into `errors: [{ line }]`, or a
handful of location assertions kept outside the corpus as ordinary rule tests.

## What this means for step 2

There is nothing to port. The corpus was built from the evasion matrix rather than from the
proof of concept, and it turns out to subsume it — which is the outcome the plan predicted in
principle ("these tests are a starting corpus, not proof of coverage… Phase 2 supersedes them
as the coverage instrument") without predicting it would be quite this complete.

The step's real output is the one gap above. Everything else it was going to do has already
been done by a better instrument.
