---
rule: no-undefined-token
legacy-id: 12
status: agreed
disposition: off-the-shelf
bias: false-negatives
files: ["*.tsx", "*.ts", "*.css"]
---

# no-undefined-token

**A colour class must resolve to CSS.**

`text-warning-foreground` looks exactly like a design token. It is spelled like one, it
reads like one in review, and if `--color-warning-foreground` has never been defined it
produces no declaration at all — the element simply inherits, and nobody notices until the
one state that needed the emphasis ships without it. Tailwind does not warn: an
unrecognised candidate generates nothing and is discarded silently.

This is the only rule in the set that reports the *absence* of styling rather than the wrong
kind of it, and it is the one that keeps the others honest. `token-constraints` can only
constrain tokens that exist; `no-spectral-color` can only redirect you to a token that
exists. Without this rule, a typo is indistinguishable from compliance.

The rule is unusual in one further respect: its verdict comes from resolving the class
against the project's actual Tailwind design system, so it is only as correct as that
resolution. That is why its bias runs the other way from every other contract here.

**`bias: false-negatives`, and the reason is the strength of the claim.** Every other rule in
the set says "this class is forbidden", which a reader can verify by looking at it. This one
says "this class does nothing", which a reader cannot verify without running Tailwind. A
false positive here is therefore not noise — it is the rule confidently asserting something
false about working code, and one of those does more damage to its credibility than ten
missed typos. Wherever resolution is uncertain — arbitrary values, unresolved variants,
classes contributed by a plugin — the rule stays silent.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## Promises to catch

A class under a colour-carrying prefix that the Tailwind design system built from the
configured entry point generates no CSS for. Variants, the important modifier and the
opacity modifier are stripped before resolution: they change when a declaration applies, not
whether one exists. Stripping is **segment-aware** and respects bracket depth, so
`bg-[image:var(--x)]` is never split at its inner colon and `[@media(hover:hover)]:` is one
variant segment rather than two.

The rule is **context-free**: it asks "does this string resolve?" and never needs to know
which element the string reaches. It runs over the broad sweep — every string literal and
every static template literal in a `.tsx`, `.ts` or `.css` file, regardless of position.
`className` literals, `cn` / `clsx` / `twMerge` arguments, `cva` / `tv` variant maps and
`.ts` object-literal constants are all in, for free.

Of the four rules on this sweep, this one has the strongest claim on the `.ts` surface: a
constants file is where a token name is written once, far from the element it styles, and
where a typo survives longest.

Two gates keep the breadth quiet, and both come from `/policy`. The class must sit under a
**derived** colour-carrying prefix — derived from the Tailwind design system, which is how
`inset-ring-` and every per-side border family arrive without a hand-maintained list — and
it must fail to generate CSS. A string that is not a class satisfies neither.

`.css` is covered by the package's `/stylelint` entry point, which reads the same `/policy`
module and resolves against the same design system, so `@apply bg-danger-muted` gets the
same verdict as `className="bg-danger-muted"`.

### Token names that were never defined

```tsx caught
<div className="text-warning-foreground" />

<div className="bg-danger-muted" />

<div className="text-secondary" />

<div className="border-outline" />
```

### A defined stem with an undefined suffix

The most dangerous shape, because the stem being real makes the whole class look real.

```tsx caught
<div className="text-warning-typo" />

<div className="bg-primary-subtle" />
```

### Misspellings

```tsx caught
<div className="bg-primry" />

<div className="text-forground" />
```

### Under variants, important and opacity modifiers

The class is resolved with all three removed, so none of them hides an undefined token.

```tsx caught
<div className="hover:text-secondary" />

<div className="md:dark:bg-danger-muted" />

<div className="!bg-danger-muted" />

<div className="bg-danger-muted!" />

<div className="bg-danger-muted/50" />
```

### Wherever class strings are authored

```tsx caught
<div className={cn("text-secondary", className)} />
```

```tsx caught count=2
const alert = cva("p-2", {
  variants: { tone: { warn: "bg-warning-subtle", bad: "bg-danger-muted" } },
});
```

```tsx caught
const badgeColor = { danger: "bg-danger-muted", ok: "bg-success-muted" };
```

```tsx caught
<div className={`text-secondary ${extra}`} />

const tone = "text-secondary";
```

```tsx caught
<Chart palette="text-secondary" />
```

The last one is the accepted cost of a context-free sweep: a string that looks exactly like
an undefined colour token, in a position where it may never reach a `className`. It reports
anyway. The alternative — a precise walk — would cost the `.ts` constants surface, which is
the more valuable half; `oxlint-disable` is the escape hatch.

```css caught
.alert {
  @apply bg-danger-muted;
}
```

### Every offending class reports separately

```tsx caught count=2
<div className="text-secondary bg-danger-muted" />
```

## Deliberately allows

### Tokens that resolve

```tsx allowed
<div className="text-warning bg-primary border-input" />

<div className="text-success-content" />
```

### Palette classes

They resolve, so this rule is silent on them. Wanting them gone is `no-spectral-color`'s
job, and the two must not both report the same class — "this does not exist" and "this
exists and is forbidden" cannot both be true.

```tsx allowed
<div className="bg-red-500 text-slate-50" />
```

### Non-colour utilities that resolve

The gate is "generates CSS", not "is a colour". `bg-cover` and `text-sm` are perfectly real.

```tsx allowed
<div className="bg-cover bg-no-repeat" />

<div className="text-sm text-center" />

<div className="border-2 ring-2 shadow-lg" />
```

### Classes with no colour-carrying prefix

Out of scope. A rule that reported every unresolved class in the project is a different,
much larger rule.

```tsx allowed
<div className="rounded-warning" />

<div className="gap-4 flex" />
```

### Arbitrary values

`bg-[--color-brand]` resolves to `var(--color-brand)` whether or not that property is
defined — no static check can tell. Raw literals inside brackets belong to
`no-raw-css-color`.

```tsx allowed
<div className="bg-[#ff0000]" />

<div className="bg-[--color-brand]" />

<div className="text-[var(--color-brand)]" />
```

### Strings that cannot be a class

The broad sweep hands the rule every string in the file; the gates discard the ones that
cannot be a colour class. A path is a single whitespace-delimited token that starts with `/`,
so no prefix matches it.

```tsx allowed
<img src="/bg-hero.png" />

fetch("/api/border-radius");
```

Prose is the one shape where the broad sweep pulls against `bias: false-negatives`: a
sentence containing a hyphenated word under a colour prefix — `"text-heavy layouts"` —
tokenises to `text-heavy`, which resolves to nothing and would report. For the rule that
asserts *"this class does nothing"*, a false positive is the linter confidently calling
working prose broken, which is precisely the failure the bias exists to prevent.

**Mitigated in `/policy` by an all-segments test.** A string is treated as a class list only
when *every* whitespace-separated segment is class-shaped. This costs nothing on the
surfaces the sweep exists for and removes the prose shape entirely:

```
"text-heavy layouts"     → "layouts" is not class-shaped → not a class list → silent
"bg-primary text-white"  → every segment class-shaped    → class list      → checked
"text-heavy"             → single class-shaped segment   → class list      → reported
```

The residual is a single-word string that is class-shaped and undefined — `"text-heavy"`
alone, with no sentence around it. That is indistinguishable from a real typo'd class by
construction, and reporting it is correct behaviour rather than a false positive.

The alternative — narrowing the sweep itself — was rejected: it would cost the `.ts`
constants surface, which is the reason the sweep exists.

## Declared blind spots

Not caught, by decision.

### Dynamic composition

The class does not exist in the source, so there is nothing to resolve — this rule cannot
say "generates no CSS" about a class it has not seen. The defect is real and it is reported:
`` `text-${tone}` `` has a colour prefix against an interpolation, so `no-spectral-color`
reports it once under `dynamicColorClass` (owned by `token-constraints`). Adding a second report here would name the same
character span twice with the same fix.

```tsx blindspot
<div className={`text-${tone}`} />

<div className={"bg-" + tone + "-muted"} />
```

### Use sites with no literal of their own

The broad sweep catches the string where it is *written*, which is what closes the `.ts`
constants gap. What it cannot do is report the place the string is *used*, because no class
appears there.

```tsx blindspot
<div className={TONES[kind]} />;
```

### Undefined variants

`hovr:bg-primary` generates nothing either, but variants are stripped before resolution and
this is a rule about colour *tokens*. Unknown variants are a separate concern with a
separate diagnostic.

```tsx blindspot
<div className="hovr:bg-primary" />

<div className="darkk:bg-primary" />
```

### Tokens defined outside the resolver's reach

A `--color-*` added by a Tailwind plugin, or in a stylesheet not reachable from the entry
point's import graph, resolves as undefined and would be a false positive. The rule's
contract is "no CSS from *this* entry point"; keeping the entry point complete is a
configuration responsibility, not something the rule can detect.

### Failure to build the design system, or to be given one

If the design system cannot be loaded — or if the entry point was never supplied — the rule
must **error out**, not fall silent. A rule that reports nothing looks identical to a
codebase with no violations, and this is the one rule in the set whose entire output depends
on an external resolution step succeeding. It is also the gate for `token-constraints`, so a
silent failure here quietly weakens two rules rather than one.

This is a promise about the failure mode rather than a case, and it is stated here because
the current implementation does the opposite. Distribution makes it sharper rather than
softer, because it adds a second, likelier way to arrive at no design system:

> **Rule options replace, they do not merge.** A consumer writing
> `"…/no-undefined-token": "error"` — to bump a severity, nothing more — wipes the preset's
> options entirely. Under a rule that returns early on absent options, the result is a rule
> that appears enabled, reports nothing, and exits 0. For a rule whose whole output is an
> absence, and which gates another rule, that failure is indistinguishable from success.

So: **absent or unresolvable required options are a thrown error at plugin-module load**, not
an early return, not a warning. `defaultOptions` carries a usable baseline so the common case
still works, and the error names the missing key. Falling over loudly is the cheapest
diagnostic this rule can offer, and the only one that cannot be mistaken for a clean run.

## Relationship to other rules

This rule shares a surface with three others, and the boundaries are what keep any given
class from being reported twice for contradictory reasons.

- **`no-spectral-color`** — the two **partition** the set of classes under a colour prefix.
  Every such class is undefined (this rule), or defined and spectral (that rule), or defined
  and semantic (neither). `bg-red-500` resolves, so this rule is quiet; `bg-danger-muted`
  does not resolve, so that rule finds no palette family and is quiet. The partition is a
  design property, not a coincidence, and a change to either rule that breaks it produces a
  class reported as both nonexistent and forbidden.
- **`token-constraints`** — strictly downstream. That rule returns immediately unless the
  class body is a *known* semantic token, so an undefined token never reaches a constraint
  check. This rule is the gate: without it, `text-warning-typo` passes `token-constraints`
  cleanly by virtue of not being a token at all.
- **`no-raw-css-color`** — owns everything inside `[…]`, which this rule skips. The two
  never see the same class body.
- **`no-opacity-modifier`** and **`no-dark-variant`** — orthogonal. They inspect the
  modifier, this rule the class it modifies. `dark:bg-danger-muted/50` reports from all
  three, and each report names a different, independently fixable defect.

Ordering matters for the reader, not for the engine: all rules run, and the diagnostics are
independent. But a `bg-danger-muted` that gets one report from here and one from
`token-constraints` would be a bug in the partition, not thoroughness.

## Message

```
messageId: undefinedColorToken
data:      { className, token, tokenFile }
text:      "{{className}} generates no CSS — {{token}} is not defined; check the spelling,
            or add --color-{{token}} to {{tokenFile}}"
```

One message id, not two. `text-smm` generates no CSS, matches a colour prefix, and gets
"add `--color-smm`" — wrong advice for a font-size typo. The alternative is a second id
chosen by a heuristic on whether the body looks token-shaped, and a heuristic guessing
whether `smm` was meant to be a token will be wrong often enough to be worse than a slightly
over-general second clause. The message therefore leads with "check the spelling", which is
correct in both cases, and offers the token hint after it.

No autofix. A suggestion per near-miss token is offered where the design system provides
typo candidates, ordered by edit distance; none of them is destructive, so any may sit at
index 0.

### Acceptance criterion (Phase 4)

**The typo candidate must reach the message text via `data`.** Suggestions do not render in
any CLI output format, and `meta.docs.url` is dead under Oxlint, so the message text is the
only channel. `oxlint-tailwindcss`'s `no-unknown-classes` provides candidates natively; if it
emits them only as a suggestion, the CLI experience is *worse* than today's, which prints the
token name and the `--color-*` hint inline.

This is a criterion, not a preference. If the message text cannot be made to carry the
candidate, Phase 4 records `adopted-with-narrowed-contract` and says so explicitly — it does
not adopt quietly.

## Configuration

Mechanism ships; policy is supplied. Every value below is a `recommended` preset default the
consuming project overrides in its own config — none is a fact baked into the rule.

| Option | `recommended` | Overriding it |
| --- | --- | --- |
| `entryPoint` | `"src/styles.css"` | The Tailwind entry point the design system is built from. **Required.** An absent or unloadable entry point is a thrown error, never a silent no-op — see [Failure to build the design system](#failure-to-build-the-design-system-or-to-be-given-one). |
| `colorPrefixes` | derived from the design system | An array *adds* utility prefixes a Tailwind plugin introduces. It does not replace the derived set — hand-maintaining that set is the bug this option exists to avoid. |
| `ignoreGlobs` | `["**/*.stories.@(ts\|tsx)"]` | Files the rule skips. Storybook is excluded by default; a project that treats stories as production code sets this to `[]`. |

Note what is *not* configurable: whether an undefined token is a violation. Every other rule
in this family bans something a project might legitimately want; this one reports styling
that does not exist. There is no policy position on the other side of it.

### Distribution

- **The rule reads no files at rule-evaluation time and derives no path from its own
  location.** The design system is built once at plugin-module load from the `entryPoint`
  the consumer supplied — never inside `create()`, never from a path relative to the
  package. This keeps `RuleTester` usable and avoids a per-file filesystem hit.
- **`settings.tailwindcss.entryPoint` is mandatory** for `oxlint-tailwindcss`, and
  `settings` is **not inherited through `extends`** — a preset that ships it yields
  `entryPoint is required`. The consumer supplies it in its own config. This rule is the one
  that fails hardest without it, which is why the requirement is repeated here rather than
  left to the README.
- **Rule options replace, they do not merge — and this rule is the worst place for it.**
  Bumping a severity wipes `entryPoint`, and a rule whose output is an absence cannot signal
  that by reporting less. It signals it by refusing to start. To change severity alone,
  restate the options.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

The current rule finds a prefix from `TAILWIND_COLOR_PREFIXES`, skips class bodies starting
with `[`, and asks `ds.candidatesToCss([tok])` whether the class produces output. The design
system is built once at startup from `tokenFiles[0]` — a path read from a file the
script locates relative to its own directory.

| Case | Today | Under this contract |
| --- | --- | --- |
| `text-warning-foreground`, `bg-danger-muted` | caught | caught |
| `hover:` / `md:dark:` / `!` / `/50` forms | caught (all stripped before resolution) | caught |
| `bg-red-500`, `bg-cover`, `text-sm` | allowed | allowed |
| `rounded-warning` (no colour prefix) | allowed | allowed |
| `bg-[#ff0000]`, `bg-[--color-brand]` | allowed | allowed |
| `inset-ring-nonesuch` | missed — prefix absent from `TAILWIND_COLOR_PREFIXES` | caught — the prefix set is derived |
| `` className={`text-${tone}`} `` | missed — template literals are never extracted | blind spot here; reported once by `no-spectral-color` |
| `` className={`text-secondary ${x}`} `` | missed — same reason | caught |
| `bg-[image:var(--x)]` | resolved as `var(--x)]` — `normalizeTwToken` splits on the last `:` | allowed, explicitly; segmentation is bracket-depth aware |
| `const tone = "text-secondary"` | caught at the literal | caught at the literal; the *use site* is the blind spot |
| `<Chart palette="text-secondary" />` | caught | caught — the broad sweep is context-free by design |
| **Design system fails to load** | **rule silently no-ops; every undefined token passes** | hard error |
| **Required option absent** | not applicable — config came from a fixed path | hard error at plugin-module load |

The silent no-op is the most consequential gap in the current implementation. `index.js`
builds the resolver with `.catch(() => null)` and the rule returns `null` when
`isValidTailwindCandidate` is absent. A missing dependency, an unresolvable `@import`, or a
Tailwind upgrade therefore turns the rule off with no output and no exit code — and because
it is the gate for `token-constraints`, it turns off part of that rule's coverage too.

Distribution adds a second route to the same failure that the proof of concept never had: a
consumer restating a severity wipes the options. Both routes end in the same place and both
must end in a thrown error, which is why the failure mode is a promise in this contract
rather than an implementation detail.
