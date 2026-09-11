---
rule: no-undefined-token
legacy-id: 12
status: implemented
disposition: custom
bias: false-negatives
files: ["*.tsx", "*.ts", "*.jsx", "*.js"]
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
> it does not. `deferred` blocks assert nothing — they document coverage that is planned but
> unimplemented; see [Deferred: CSS surface](#deferred-css-surface).

## Promises to catch

A class under a colour-carrying prefix that the Tailwind design system built from your token
stylesheets — the CSS files that define your `--color-*` tokens, which you name once when
you [set up the linter](../../README.md) — generates no CSS for. Variants, the important
modifier and the opacity modifier are stripped before resolution: they change when a
declaration applies, not whether one exists. Stripping is **segment-aware** and respects bracket depth, so
`bg-[image:var(--x)]` is never split at its inner colon and `[@media(hover:hover)]:` is one
variant segment rather than two.

The rule is **context-free**: it asks "does this string resolve?" and never needs to know
which element the string reaches. It checks every string literal and every static template
literal in a `.tsx`, `.ts`, `.jsx` or `.js` file, regardless of position. `className`
literals, `cn` / `clsx` / `twMerge` arguments, `cva` / `tv` variant maps and `.ts`
object-literal constants are all in, for free.

Of the rules that check every string in a file, this one has the strongest claim on `.ts`
files: a constants file is where a token name is written once, far from the element it
styles, and where a typo survives longest.

Two gates keep the breadth quiet. The class must sit under a **derived** colour-carrying
prefix — derived from the Tailwind design system, which is how
`inset-ring-` and every per-side border family arrive without a hand-maintained list — and
it must fail to generate CSS. A string that is not a class satisfies neither.

Stylesheets are not on this surface. `@apply bg-danger-muted` resolves to nothing exactly as
`className="bg-danger-muted"` does, and it will get the same verdict when the CSS surface
lands; today it is unenforced. See [Deferred: CSS surface](#deferred-css-surface).

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

One report, not two: `ok` is the control, as it is in the same case in
[`no-raw-color`](./no-raw-color.md). `success-muted` is a token this project defined and
`danger-muted` is not, which is the whole point of a rule whose subject is what the
stylesheet contains — two names of identical shape, and only the stylesheet can tell them
apart.

```tsx caught
<div className={`text-secondary ${extra}`} />

const tone = "text-secondary";
```

```tsx caught
<Chart palette="text-secondary" />
```

The last one is the accepted cost of checking every string regardless of where it sits: a
string that looks exactly like an undefined colour token, in a position where it may never
reach a `className`. It reports anyway. The alternative — checking only strings that reach a
`className` — would cost the `.ts` constants files, which are the more valuable half;
`oxlint-disable` is the escape hatch.

The remaining routes are the same string in a different wrapper, and the rule does not need
to understand the wrapper to see the string. A `twMerge()` argument, a `tv()` slot, an array joined at
runtime, a props object spread onto an element, and an attribute on a line of its own are
one string literal each.

```tsx caught
<div className={`text-secondary`} />

<div className={twMerge("p-2", "text-secondary")} />

<div className={tv({ base: "text-secondary" })} />

const joined = ["text-secondary", "p-2"].join(" ");

const spreadProps = { className: "text-secondary" };
<div {...spreadProps} />;

<div
  className="text-secondary"
/>
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
`no-raw-color`.

```tsx allowed
<div className="bg-[#ff0000]" />

<div className="bg-[--color-brand]" />

<div className="text-[var(--color-brand)]" />
```

### Strings that cannot be a class

The rule looks at every string in the file; the two gates discard the ones that cannot be a
colour class. A path is a single whitespace-delimited token that starts with `/`,
so no prefix matches it.

```tsx allowed
<img src="/bg-hero.png" />

fetch("/api/border-radius");
```

Prose is the one shape where checking every string pulls against `bias: false-negatives`: a
sentence containing a hyphenated word under a colour prefix — `"text-heavy layouts"` —
tokenises to `text-heavy`, which resolves to nothing and would report. For the rule that
asserts *"this class does nothing"*, a false positive is the linter confidently calling
working prose broken, which is precisely the failure the bias exists to prevent.

**Mitigated by an all-segments test.** A string is treated as a class list only when
*every* whitespace-separated segment is class-shaped. This costs nothing on the class
strings the rule exists for and removes the prose shape entirely:

```
"text-heavy layouts"     → "layouts" is not class-shaped → not a class list → silent
"bg-primary text-white"  → every segment class-shaped    → class list      → checked
"text-heavy"             → single class-shaped segment   → class list      → reported
```

```tsx allowed
const copy = "text-heavy layouts";
```

"Class-shaped" is itself a question only the design system can answer, which is why the test
asks Tailwind: `flex` and `layouts` are both plain words, and nothing short of Tailwind
distinguishes the one that generates CSS from the one that does not. A segment counts as
class-shaped when it generates CSS *or* sits under a colour-carrying prefix with something
after it — the second half is what keeps the undefined classes this rule exists for from
disqualifying their own string.

The residual is a single-word string that is class-shaped and undefined — `"text-heavy"`
alone, with no sentence around it. That is indistinguishable from a real typo'd class by
construction, and reporting it is correct behaviour rather than a false positive.

```tsx caught
const cls = "text-heavy";
```

The alternative — checking fewer strings — was rejected: it would cost the `.ts` constants
files, which are the reason the rule checks every string.

## Declared blind spots

Not caught, by decision.

### Dynamic composition

The class does not exist in the source, so there is nothing to resolve — this rule cannot
say "generates no CSS" about a class it has not seen. The defect is real and it is reported:
`` `text-${tone}` `` has a colour prefix against an interpolation, so `no-spectral-color`
reports it once under `dynamicColorClass`, which that rule owns. Adding a second report here
would name the same character span twice with the same fix.

```tsx blindspot
<div className={`text-${tone}`} />

<div className={"bg-" + tone + "-muted"} />
```

### Use sites with no literal of their own

The rule catches the string where it is *written*, which is what covers `.ts` constants
files. What it cannot do is report the place the string is *used*, because no class
appears there.

```tsx blindspot
<div className={TONES[kind]} />;

<div className={tone} />;
```

### Undefined variants

`hovr:bg-primary` generates nothing either, but variants are stripped before resolution and
this is a rule about colour *tokens*. Unknown variants are a separate concern with a
separate diagnostic.

```tsx blindspot
<div className="hovr:bg-primary" />

<div className="darkk:bg-primary" />
```

### Tokens defined outside your token stylesheets

A `--color-*` added by a Tailwind plugin, or in a stylesheet that is neither one of your
token stylesheets nor something they import, resolves as undefined and would be a false
positive. The rule's contract is "no CSS from *your token stylesheets*"; keeping them
complete is a configuration responsibility, not something the rule can detect.

### Failure to build the design system, or to be given one

If the design system cannot be loaded — or if the linter was never given your token
stylesheets — linting must **error out**, not fall silent. A rule that reports nothing
looks identical to a codebase with no violations, and this is the one rule in the set whose
entire output depends on Tailwind reading your stylesheets successfully. It is also the gate
for `token-constraints`, so a silent failure here quietly weakens two rules rather than one.

This is a promise about the failure mode rather than a case.

The linter reads your token stylesheets once, at startup, with the same Tailwind engine your
build uses, and every rule works from what it found: which colour tokens you define, and
which utilities take a colour. **Without token stylesheets the linter refuses to start**,
rather than run rules that can't tell a token from a typo, and a stylesheet that does not
exist stops it too, by name. There is no configuration under which this rule runs without
them — changing only its severity (`"…/no-undefined-token": "warn"`) leaves the tokens read
at startup untouched. Falling over loudly is the cheapest diagnostic this rule can offer,
and the only one that cannot be mistaken for a clean run.

## Deferred: CSS surface

Not a blind spot. A blind spot is something this contract has decided not to catch; what
follows is something it has decided not to catch **yet**. The linter reads `.js`, `.jsx`,
`.ts` and `.tsx` only, so the case below is unenforced today and is recorded so that adding
the CSS surface is an implementation task rather than a fresh design argument.

The example here is tagged `deferred`: it documents planned coverage, and nothing in this
section is checked today.

The distinction matters more for this rule than for its neighbours, because its subject is an
absence. "No report" already looks like "no violations", and the one thing this contract
refuses to do is let a gap in coverage read as a clean run — hence a named section rather
than silence.

### `@apply` class lists

A class list under `@apply` resolves — or fails to resolve — through the same design system,
so the verdict for `@apply bg-danger-muted` is already decided; only the surface is missing.
How the linter will read CSS files is not decided yet.

```css deferred
.alert {
  @apply bg-danger-muted;
}
```

**Your token stylesheets are not a linted surface.** The linter reads them at startup to
learn the tokens every verdict depends on. Nothing about narrowing the linted file set
touches that: they are an *input*, and they stay required.

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
- **`no-raw-color`** — owns everything inside `[…]`, which this rule skips. The two
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

messageId: undefinedColorTokenWithCandidate
data:      { className, token, tokenFile, candidates }
text:      "{{className}} generates no CSS — {{token}} is not defined; check the spelling —
            did you mean {{candidates}}? — or add --color-{{token}} to {{tokenFile}}"
```

**No id chosen by a heuristic on the class body.** `text-smm` generates no CSS, matches a
colour prefix, and gets "add `--color-smm`" — wrong advice for a font-size typo. The
tempting fix is a second id selected by guessing whether `smm` was meant to be a token, and
that guess will be wrong often enough to be worse than a slightly over-general second
clause. Both messages therefore lead with "check the spelling", which is correct in both
cases, and offer the token hint after it.

The second id is chosen by a *fact* rather than a guess: whether one of your tokens is a
near miss for the one written. `undefinedColorTokenWithCandidate` is the same sentence with
the candidates spliced into the clause the reader is already being pointed at. The
alternative — one message with a "did you mean" slot that is sometimes empty — leaves a
sentence whose punctuation is sometimes wrong. `no-spectral-color` carries the same pair
for the same reason.

Candidates come from the **semantic token set** — the colour tokens your token stylesheets
define, read at the same time as the design system — not from the design system's full
colour namespace,
which holds the spectral palette too. Answering `bg-red-40` with `bg-red-400` would hand the
author a class `no-spectral-color` then forbids, which is the partition between those two
rules breaking from the inside.

No autofix. A suggestion per near-miss token is offered where a candidate exists, ordered by
edit distance; none of them is destructive, so any may be listed first.

### Candidates are in the message text

**The near-miss tokens appear in the message itself, not only as editor suggestions.**
Suggestions do not render in any CLI output format, and Oxlint does not show a rule's
documentation link, so the message text is the only thing every reader sees. Offering
candidates only as a suggestion would leave someone reading terminal or CI output with
nothing but the token name. The editor quick-fix is an addition to the message, never a
substitute for it.

## Configuration

Mechanism ships; policy is supplied. Every value below is the rule's own default, which a
project overrides in its own config — none is a fact baked into the rule.

| Option | Default | Overriding it |
| --- | --- | --- |
| `entryPoint` | `"src/styles.css"` | Decides which file the hint tells you to add a token to ("add `--color-x` to …"); it doesn't change what the rule checks. The recommended setup fills it in with your first token stylesheet. The tokens themselves come from your token stylesheets, which no option of this rule affects — see [Failure to build the design system](#failure-to-build-the-design-system-or-to-be-given-one). |
| `colorPrefixes` | derived from the design system | An array *adds* utility prefixes a Tailwind plugin introduces. It does not replace the derived set — hand-maintaining that set is the bug this option exists to avoid. |
| `ignoreGlobs` | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips. Storybook is excluded by default; a project that treats stories as production code sets this to `[]`. |

Note what is *not* configurable: whether an undefined token is a violation. Every other rule
in this family bans something a project might legitimately want; this one reports styling
that does not exist. There is no policy position on the other side of it.

### Distribution

- **The rule reads no files of its own.** The linter reads your token stylesheets once, at startup, with the same Tailwind engine
  your build uses, and every rule works from what it found: which colour tokens you define,
  and which utilities take a colour. Linting a file costs no filesystem access.
- **Your token stylesheets are named once, when you set up the linter** — not per rule.
  This rule is the one that fails hardest without them, which is why the requirement is
  repeated here rather than left to the README.
- **Changing only this rule's severity keeps its behaviour.** Options you don't write fall
  back to the defaults in the table, and the tokens read at startup are unaffected. The one
  visible difference: the hint names `src/styles.css` instead of your stylesheet. To keep it
  naming yours, restate `entryPoint` alongside the severity.

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
| `@apply bg-danger-muted` in a `.css` file | caught — `linter.js` reads `.css` and extracts `@apply` lists | **deferred** — `.css` is not a linted surface for now; the promise is recorded, not the coverage |
| **Design system fails to load** | **rule silently no-ops; every undefined token passes** | hard error |
| **Linter set up without token stylesheets** | not applicable — config came from a fixed path | the linter refuses to start |

The silent no-op is the most consequential gap in the current implementation. `index.js`
builds the resolver with `.catch(() => null)` and the rule returns `null` when
`isValidTailwindCandidate` is absent. A missing dependency, an unresolvable `@import`, or a
Tailwind upgrade therefore turns the rule off with no output and no exit code — and because
it is the gate for `token-constraints`, it turns off part of that rule's coverage too.

Distribution could have added a second route to the same failure that the proof of concept
never had: a consumer changing only a severity and, with it, the rule's view of the tokens.
It does not — the tokens are read from your token stylesheets at startup, whatever the
rule's options say — and the route that remains, no token stylesheets at all, stops the
linter from starting. That is why the failure mode is a promise in this contract rather
than an implementation detail.
