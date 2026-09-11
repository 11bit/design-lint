---
rule: no-useless-hover
legacy-id: 10
status: implemented
disposition: custom
bias: false-negatives
files: ["*.tsx", "*.jsx"]
---

# no-useless-hover

**`hover:` styling must not be applied to an element the user cannot interact with.**

A `hover:` variant is an affordance. It tells the user "this responds to you" before they
click, and it is the cheapest signal an interface has for distinguishing a control from
decoration. Spending that signal on a `<div>` that does nothing is a lie the design system
cannot detect at review time — the element looks alive in Figma, looks alive on hover, and
does nothing. It also degrades the signal everywhere else: once half the page lights up
under the pointer, lighting up stops meaning anything.

The two legitimate shapes are: put the `hover:` on the element that actually handles the
interaction, or — when the visual change belongs to a *descendant* of the interactive
element — use `group-hover:` / `peer-hover:`, which name their hover target explicitly.
Both are [Deliberately allowed](#deliberately-allows).

This rule is deliberately quiet where interactivity is invisible at the call site. By
default it reports only on a **closed list of intrinsic HTML elements that are never
interactive**, and never on a capitalized component — see
[Declared blind spots](#declared-blind-spots) for why, and
[Configuration](#configuration) for the option that opts back in.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## What counts as a hover variant

A class is split into its variant segments the same way in every rule of this package —
brackets are respected, so `[@media(hover:hover)]:` is one segment, and named group
suffixes are dropped, so `group-hover/nav` is `group-hover`. A segment belongs to the
**`hover` family** when it is `hover` or ends in `-hover`, with two deliberate carve-outs:

| Segment | In the `hover` family? | Reported by this rule? |
| --- | --- | --- |
| `hover` | yes | **yes** — the element claims its own hover state |
| `group-hover`, `group-hover/nav` | yes | no — the hover target is an ancestor |
| `peer-hover`, `peer-hover/input` | yes | no — the hover target is a sibling |
| `has-hover`, `group-has-hover` | yes | no — the hover target is a descendant |
| `not-hover` | **no** — the inverse | **yes** — rule-local, see below |
| `[@media(hover:hover)]` | **no** — a device capability, not an element state | no |
| `[&:hover]` | no (not a named segment) | **yes** — see below |

Family membership is shared with `token-constraints`, which uses it to decide *which token*
a hover-triggered colour may name. That question is about hover-triggered colour in
general, so the whole family binds there. This rule asks a narrower question — *does this
element promise that it responds to the pointer?* — so it reports on the **self-hover**
subset only. `group-hover:` and `peer-hover:` are one family with `hover:` and still name a
different element as the target, which is exactly why they are the recommended repair here
rather than a second offence.

`[&:hover]:` is a **rule-local addition**, not family membership: it is the arbitrary-variant
spelling of `&:hover`, it asserts the element's own hover state just as `hover:` does, and
it must not be an escape hatch from a rule whose entire subject is that assertion.

`not-hover:` is a **rule-local addition**, on the same footing as `[&:hover]:`. It sits
outside the shared `hover` family, and correctly so — that family exists to answer
*which token may a hover-triggered colour name*, and requiring a `-hover` token for the
**not**-hovered state reads backwards. But that argument is about token naming, and this
rule asks a different question. `not-hover:bg-primary` conditions the element's appearance
on the pointer, so the affordance is promised just as surely as with `hover:`.

The two rules therefore match two different sets, deliberately:

| Rule | Matches | Members |
| --- | --- | --- |
| `token-constraints` | the `hover` **family** | `hover`, `group-hover`, `peer-hover`, `has-hover` |
| `no-useless-hover` | **self-hover** variants | `hover`, `not-hover`, `[&:hover]` |

Neither set contains the other, which is why one shared set cannot serve both.
`no-dark-variant` resolves the identical question the same way, catching `not-dark:`.

## Promises to catch

A self-hover variant appearing in a class string that statically reaches the `className` of
a non-interactive intrinsic element.

The rule looks only at the classes that reach a specific element's `className`, not at
every string in the file the way the token rules do — a `hover:` class means something only
once it lands on an element. Two consequences:

- **Only `className` is inspected.** No other attribute is scanned, so
  `title="hover: to preview"` is not a class string and never reports.
- **Classes inside `cn()` / `clsx()` / `twMerge()` count**, in any argument position, at any
  nesting depth, including template literals.

**One report per element**, not per offending class. The element is the defect; the
individual classes are symptoms of it. The report names the first offending class.

### The non-interactive tag list

The rule reports only on these tags. It is a closed list, so a tag outside it is never
reported — that is what makes the promise below complete rather than aspirational.
Membership is a fact about HTML, not about any one codebase, which is why the list is
mechanism and ships with the rule.

- **Flow / sectioning** — `div`, `span`, `p`, `h1`–`h6`, `hgroup`, `section`, `article`,
  `aside`, `header`, `footer`, `main`, `nav`, `figure`, `figcaption`, `blockquote`,
  `address`
- **Lists** — `ul`, `ol`, `li`, `dl`, `dt`, `dd`
- **Inline / phrasing** — `em`, `strong`, `b`, `i`, `u`, `s`, `small`, `mark`, `sub`,
  `sup`, `code`, `kbd`, `samp`, `var`, `time`, `abbr`, `cite`, `q`, `pre`, `br`, `wbr`
- **Media / graphics** — `img`, `picture`, `svg`, `path`, `circle`, `rect`, `g`, `hr`
- **Tables** — `table`, `thead`, `tbody`, `tfoot`, `caption`, `colgroup`, `col`, `tr`,
  `td`, `th`

`a`, `button`, `input`, `select`, `textarea`, `option`, `optgroup`, `label`, `summary`,
`details`, `fieldset`, `legend`, `form`, `dialog`, `menu`, `iframe`, `embed`, `object`,
`audio`, `video`, `canvas`, `area`, `map`, and any custom element (a lowercase tag
containing `-`) are absent by design.

The `interactiveElements` option removes further names from this list; by default it is
`["tr", "td", "th"]`. See [Configuration](#configuration).

```tsx caught
<div className="hover:bg-primary" />

<span className="hover:text-primary" />

<p className="hover:bg-muted" />

<li className="hover:bg-accent" />

<h2 className="hover:text-link" />

<img className="hover:opacity-80" />

<svg className="hover:fill-primary" />
```

### Every form the self-hover variant takes

The variant is recognised by segment, never as a substring. Stacked variants are tested
per segment, so a `hover` segment anywhere in the stack reports.

```tsx caught
<div className="hover:bg-primary" />

<div className="md:hover:bg-primary" />

<div className="dark:md:hover:bg-primary" />

<div className="max-lg:hover:bg-primary" />

<div className="focus-within:hover:bg-primary" />

<div className="hover:focus:bg-primary" />

<div className="!hover:bg-primary" />

<div className="hover:!bg-primary" />

<div className="hover:bg-primary!" />

<div className="hover:bg-primary/50" />

<div className="[&:hover]:bg-primary" />

<div className="md:[&:hover]:bg-primary" />

<div className="not-hover:bg-primary" />

<div className="md:not-hover:bg-primary" />
```

### Class strings reached through composition

The `className` value may be any of these shapes. The precise walk follows nesting to any
depth.

```tsx caught
<div className={"hover:bg-primary"} />

<div className={'hover:bg-primary'} />

<div className={`hover:bg-primary`} />

<div className={`rounded-md hover:bg-primary ${extra}`} />

<div className={cn("p-2", "hover:bg-primary")} />

<div className={clsx("hover:bg-primary", extra)} />

<div className={twMerge(base, "hover:bg-primary")} />

<div className={cn(isOpen && "hover:bg-primary")} />

<div className={cond ? "hover:bg-primary" : "bg-muted"} />

<div className={cn({ "hover:bg-primary": isOpen })} />

<div className={cn(["p-2", "hover:bg-primary"])} />

<div
  data-testid="card"
  className="hover:bg-primary"
/>
```

Recognised composition helpers: `cn`, `clsx`, `classNames`, `cx`, `twMerge`, `twJoin`,
`tw`. Nesting is followed to any depth.

### Multiple elements, multiple reports

```tsx caught count=2
<div className="hover:bg-primary">
  <span className="hover:text-primary" />
</div>
```

One element with several offending classes is still a single report:

```tsx caught count=1
<div className="hover:bg-primary hover:text-primary md:hover:shadow-md" />
```

## Deliberately allows

### Elements that are interactive by tag

```tsx allowed
<button className="hover:bg-primary" />

<a href="/x" className="hover:text-link" />

<a className="hover:text-link" />

<input className="hover:border-primary" />

<select className="hover:border-primary" />

<textarea className="hover:border-primary" />

<label className="hover:text-primary" />

<summary className="hover:bg-muted" />

<details className="hover:bg-muted" />

<option className="hover:bg-muted" />

<dialog className="hover:bg-muted" />
```

### Elements made interactive by a prop

Any prop matching `on[A-Z]…` counts — not a fixed list of handler names. A pointer,
keyboard, focus, or drag handler all imply the element is a target.

```tsx allowed
<div onClick={handler} className="hover:bg-primary" />

<div onMouseEnter={handler} className="hover:bg-primary" />

<div onFocus={handler} className="hover:bg-primary" />

<div onPointerUp={handler} className="hover:bg-primary" />

<div onKeyDown={handler} className="hover:bg-primary" />

<div onDragStart={handler} className="hover:bg-primary" />
```

### Elements made interactive by an attribute

```tsx allowed
<div role="button" className="hover:bg-primary" />

<div role="link" className="hover:text-link" />

<div role="menuitem" className="hover:bg-accent" />

<div role="tab" className="hover:bg-accent" />

<div role="option" className="hover:bg-accent" />

<div role="checkbox" className="hover:bg-accent" />

<div role={computedRole} className="hover:bg-primary" />

<div href={url} className="hover:text-link" />

<div to={route} className="hover:text-link" />

<div tabIndex={0} className="hover:bg-primary" />

<div contentEditable className="hover:bg-primary" />

<div draggable className="hover:bg-primary" />
```

A dynamic `role={…}` is allowed rather than flagged: the rule cannot prove it is *not* an
interactive role, and `bias: false-negatives` resolves that in favour of silence.

### Polymorphic elements

An element whose tag is chosen at runtime is not the tag it is written as.

```tsx allowed
<div asChild className="hover:bg-primary" />

<div as="button" className="hover:bg-primary" />

<div as={Link} className="hover:text-link" />

<div component={Link} className="hover:text-link" />
```

### Descendants of an interactive element

When a lexically enclosing JSX element in the same expression is interactive, the pointer
is over that element too, and the hover styling has a real target. The rule walks up the
JSX tree and stays silent if **any ancestor at any depth** in the same expression is
interactive — by tag, by handler, by attribute, or by being polymorphic.

This removes a whole class of correct-but-flagged code. The counter-argument is real: `hover:` on the span fires only
when the pointer is over the span, which is subtly different from hovering the button, and
`group-hover:` expresses the intent better. But that is a style preference, not a broken
affordance, and this rule is about broken affordances.

```tsx allowed
<button>
  <span className="hover:underline">Save</span>
</button>

<a href="/x">
  <div className="hover:bg-primary" />
</a>

<div role="button">
  <span className="hover:text-primary" />
</div>

<button>
  <span>
    <em className="hover:underline">Save</em>
  </span>
</button>
```

"Interactive" here is the **opposite of the test that decides whether to report**, not
a second list. An element is reported only where non-interactivity can be *proved* — a tag
on the closed list, no handler, no interactive attribute, no polymorphism, no spread — so an
ancestor exempts its descendants whenever that proof fails for it. One test, read in both
directions, which is what keeps the two halves from drifting apart.

The consequence worth stating out loud is that an ancestor whose interactivity is *unknown*
exempts too: a capitalized component, a tag outside the closed list, an element carrying a
spread. That is the same answer the rule already gives when such an element carries the
`hover:` class itself — the [capitalized-component blind spot](#capitalized-components) and
the [spread blind spot](#interactivity-arriving-through-spread-props) — and giving a
different answer one level up would mean claiming `<Card>` is non-interactive in exactly the
position where the contract has already said it cannot know.

```tsx allowed
<Card>
  <span className="hover:underline">Save</span>
</Card>

<div {...props}>
  <span className="hover:underline">Save</span>
</div>

<form>
  <p className="hover:text-primary" />
</form>
```

The exemption is **lexical and stops at the component boundary**, which leaves one known
false positive — see [Accepted false positives](#accepted-false-positives).

### `group-hover:` and `peer-hover:` — the sanctioned idiom

These variants are in the `hover` family but do not claim the element is hoverable. They
say "restyle me when *that* element is hovered", which is precisely the correct
construction for a non-interactive descendant of an interactive ancestor, or a sibling of
an interactive peer. They are never reported by this rule.

```tsx allowed
<div className="group-hover:bg-primary" />

<div className="peer-hover:text-primary" />

<div className="md:group-hover:bg-primary" />

<div className="group-hover/item:bg-primary" />

<div className="peer-hover/input:border-primary" />

<div className="group-has-hover:bg-primary" />

<div className="has-hover:bg-primary" />

<button className="group">
  <span className="group-hover:underline">Save</span>
</button>
```

`has-hover:` / `group-has-hover:` are allowed for the same reason: the hover target is a
descendant, not this element.

### Variants outside the `hover` family

```tsx allowed
<div className="[@media(hover:hover)]:bg-primary" />

<div className="supports-[hover:hover]:bg-primary" />

<div className="pointer-fine:bg-primary" />
```

`[@media(hover:hover)]:` is a device capability rather than an element state, so it is
outside both the `hover` family and this rule's self-hover set. `supports-[…]` and
`pointer-fine:` are the same shape of thing.

### `hover:` outside a class channel

The rule inspects `className` only, so `hover:` occurring in prose or a data attribute is
never even parsed as a variant.

```tsx allowed
<div title="hover: to preview" />

<div data-tooltip="hover: me" aria-label="hover: me" />
```

### Tags exempted by configuration

With the default `interactiveElements: ["tr", "td", "th"]`, table rows and cells carry an
intentional row-level highlight and are exempt.

```tsx allowed
<tr className="hover:bg-muted" />

<td className="hover:bg-muted" />

<th className="hover:bg-muted" />
```

### Tags outside the closed list

```tsx allowed
<form className="hover:bg-muted" />

<fieldset className="hover:bg-muted" />

<canvas className="hover:bg-muted" />

<video className="hover:opacity-80" />

<my-widget className="hover:bg-primary" />
```

## Declared blind spots

Not caught, by decision. Each is either statically undecidable or belongs to a different
rule. Listing them here means a future change that *starts* catching one will fail its
assertion and force this document to be updated.

### Capitalized components

**The most important blind spot in this contract.** The interactivity of `<Card>`,
`<Badge>`, `<MenuRow>`, or `<Dialog.Trigger>` is not visible at the call site. It lives in
another file, behind `asChild`, behind a `Slot`, behind a conditional element type. A rule
that flagged every unrecognised component would report the majority of a real codebase's
`hover:` usage and be disabled within a week; a rule that maintained an allow-list of
"known interactive components" would silently miss every component not yet on the list —
the exact failure mode this contract exists to prevent.

So by default the rule reports on intrinsic tags only, and says so out loud. A closed
non-interactive intrinsic list fails in neither direction, because membership is a fact
about HTML rather than about this codebase; an interactive-component allow-list fails in
both, invisibly. A project that wants the coverage anyway names the components explicitly
through `nonInteractiveComponents` ([Configuration](#configuration)), which is opt-in
precisely so the failure mode is chosen rather than inherited.

```tsx blindspot
<Card className="hover:bg-primary" />

<Badge className="hover:bg-primary" />

<Dialog.Trigger className="hover:bg-primary" />

<Dialog.Content className="hover:bg-primary" />

<Comp className="hover:bg-primary" />

<MotionDiv className="hover:bg-primary" />
```

### Interactivity arriving through spread props

```tsx blindspot
<div {...props} className="hover:bg-primary" />;

<div {...handlers} className="hover:bg-primary" />;

const handlers = useHoverProps();
<div {...handlers} className="hover:bg-primary" />;
```

The element may well be receiving `onClick`. Flagging it would be a guess, and unlike a
missing `role` there is no cheap way for the author to prove otherwise.

### Class strings that do not appear at the call site

```tsx blindspot
const cls = "hover:bg-primary";
<div className={cls} />;

<div className={styles.card} />;

<div className={CLASSES[variant]} />;

<div className={`${base} ${modifier}`} />;
```

One level of variable indirection is deliberately not resolved, consistently with the other
JSX-scoped rules: bounded and honest beats the slide toward dataflow analysis, where "how
many levels, which scopes" has no non-arbitrary answer.

### Class strings assembled outside a recognised helper

The rule looks inside the composition helpers listed above, plus conditionals, arrays and
object keys inside them. It does not evaluate arbitrary expressions, so a runtime `join`, a
concatenation, or a `className` arriving through a spread leaves nothing to resolve against
this element — the literal exists, but its landing site does not.

```tsx blindspot
<div className={["p-2", "hover:bg-primary"].join(" ")} />;

<div className={"hover:" + "bg-primary"} />;

const spreadProps = { className: "hover:bg-primary" };
<div {...spreadProps} />;
```

The first and third strings are still checked by the token rules, which read every string
in the file without caring where it lands, so `hover:bg-primary` is not unlinted, it is only
unattributed — what is lost is the question *this* rule asks, whether the element under it is
interactive. The concatenation is invisible to both halves, and is the token family's
declared string-concatenation blind spot rather than a second hole here.

### `group` / `peer` markers on a non-interactive ancestor

`group-hover:` is allowed unconditionally. Verifying that the ancestor carrying `group` is
itself interactive would close a real hole, but the marker and its consumer routinely live
in different components, so the check would be right only when both happen to be in the
same expression — a rule that works sometimes, silently.

```tsx blindspot
<div className="group">
  <div className="group-hover:bg-primary" />
</div>
```

### `cva()` / `tv()` variant maps

A variant map is where classes are *defined*, not where they are attached to an element.
The tag they land on is unknown at the definition site. This rule judges classes on a JSX
element, by design, and a `cva()` call is not one.

```tsx blindspot
const row = cva("rounded-md", {
  variants: { tone: { muted: "hover:bg-muted" } },
});
```

### The `class` attribute

Only `className` is inspected. `class` is not a React prop; if a Preact or Solid surface
ever lands in a consuming codebase, that is a change to this contract, not an oversight in
it.

```tsx blindspot
<div class="hover:bg-primary" />
```

### `:hover` written in CSS

Outside the JS surface entirely: the rules lint JavaScript and TypeScript files, and CSS
files aren't linted yet.

```tsx blindspot
const css = ".card:hover { background: var(--color-primary); }";
```

## Accepted false positives

Distinct from a blind spot: this one the rule *does* report, knowing it may be wrong.

The ancestor exemption is lexical, so a wrapper component that renders an interactive
element is invisible to it:

```tsx
function Row({ children }) {
  return <div className="hover:bg-muted">{children}</div>;
}
```

`Row` is reported, and may nonetheless be rendered inside a `<button>` by every one of its
callers. This is the one place the rule flags something it cannot prove is wrong, and it is
accepted rather than declared: the same shape is also the single most common *genuine*
instance of the defect, and `// oxlint-disable-next-line` at the definition costs one line
and documents the intent for the next reader. If it turns out to be noisy in practice, the
fix is to require an interactivity signal on the wrapper (a handler, `role`, or `asChild`)
rather than to stop reporting.

## Configuration

Mechanism ships; policy is supplied. The closed intrinsic-tag list, what counts as a hover
variant, and the ancestor exemption are not configurable. Everything below is policy, with
a default that applies whether or not you use the recommended setup, and that a project
overrides.

| Option | Type | Default | Overriding it |
| --- | --- | --- | --- |
| `interactiveElements` | `string[]` | `["tr", "td", "th"]` | Removes further names from the non-interactive list, so they stop reporting |
| `nonInteractiveComponents` | `string[]` | `[]` | Opts named PascalCase components *into* reporting |

### `interactiveElements`

Names the elements a project treats as interactive despite the tag. Table rows and cells
are the default entry because a row-level hover highlight is a deliberate, near-universal
affordance in data tables — it is a policy of this design system, not a fact about HTML,
which is exactly why it is an option rather than a hole in the closed list.

The option accepts **both intrinsic tag names and PascalCase component names**. The config
*shape* is mechanism; what goes in it is policy. Component entries are inert while
`nonInteractiveComponents` is empty, which is the default state — they take effect only for
components that list has opted in. Where a name appears in both lists, `interactiveElements`
wins: silence is the tie-break under `bias: false-negatives`.

### `nonInteractiveComponents`

The opt-in for the [capitalized-component blind spot](#capitalized-components). Empty by
default, because a project that lists nothing gets a rule that fails in neither direction.
A project that lists `["Card", "Badge"]` accepts responsibility for keeping the list current
and for the false positives that follow when one of those components later gains an
`onClick` — a maintenance cost the default declines to impose.

### Storybook and other excluded files

Story files are where non-interactive demo markup is most common and least harmful. The
rule skips any file matching `ignoreGlobs`, which defaults to
`["**/*.stories.@(js|jsx|ts|tsx)"]` — the same option, with the same default, as every other
rule in the package. The glob is matched against the file path Oxlint reports. A consumer
lints stories like anything else by setting it to `[]`. Changing only the rule's severity
keeps the default, so it does not bring stories back.

### File scope

`.tsx` only, per the JSX rule family. A `hover:` class can only become an affordance by
landing on a JSX element, and JSX cannot syntactically exist in `.ts`, so scanning `.ts`
here is pure cost — nothing can match. Class strings in `.ts` constants files are the token
rules' surface, which read every string in a file.

### A severity-only override

A consumer who writes

```jsonc
"design/no-useless-hover": "error"   // just bumping severity
```

changes nothing else. Changing only this rule's severity keeps its behaviour: options you
don't write fall back to the defaults in the table, `interactiveElements: ["tr", "td",
"th"]` included, so `<tr className="hover:bg-muted">` stays silent. If you have configured
the rule, re-pass your options alongside the severity. The rule has **no required
option**, so there is no configuration under which it silently reports nothing.

## Relationship to other rules

- **`token-constraints`** matches on the same `hover` family, to require that
  hover-triggered colours use a `*-hover` suffixed token. Both rules read variants the same
  way, so `group-hover:` and `peer-hover:` are the same family as `hover:` in both. The
  rules differ in what they do with that: `token-constraints` applies to the whole family, because *which* element is hovered is irrelevant to which token a
  hover-triggered colour may name; this rule reports only the self-hover subset, because
  *which* element is hovered is the entire question it asks.
- **`no-component-color-override`** is JSX-scoped like this rule but keyed on components
  resolved by import source, which are capitalized by construction. Since this rule reports
  on capitalized tags only when `nonInteractiveComponents` is explicitly configured, the two
  overlap only in that opt-in configuration — and then they report different defects on the
  same element, correctly.
- **`no-style-color`** governs the `style` channel. Hover cannot be expressed inline at
  all, which is part of that rule's rationale; there is no overlap.
- **`no-dark-variant`** is the other variant-shaped rule. It bans a variant outright; this
  one bans a variant *in a context*. They split variants the same way and share nothing
  beyond that.

## Message

```
messageId: hoverOnNonInteractive
data:      { token, tag }
text:      "{{token}} on non-interactive <{{tag}}> — hover feedback promises an
            interaction this element does not offer; move it to the interactive
            element, or use group-hover: / peer-hover:"
```

No autofix. There are three correct repairs — delete the class, move it to the ancestor,
or rewrite it as `group-hover:` — and which one applies depends on intent the rule cannot
read.

No suggestion either. The only mechanically expressible option is "remove the class",
which is destructive; `oxlint --fix-suggestions` applies index 0 without prompting, and a
lone destructive suggestion would therefore be applied as if it were the answer. The
message already names both alternatives in text, which is where they have to be — CLI
output never renders suggestions, and Oxlint does not show a rule's documentation link
either, so the message is the only channel this rule has.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

For migration reference. The current rule extracts JSX opening tags with a hand-rolled
scanner, tests every `"…"` / `'…'` string *anywhere in the tag* for the substring
`hover:`, and treats an element as interactive via a closed tag allow-list plus four
attribute regexes.

| Case | Today | Under this contract |
| --- | --- | --- |
| `<div className="group-hover:bg-primary" />` | caught (false positive) | allowed |
| `<div className="peer-hover:bg-primary" />` | caught (false positive) | allowed |
| `<div className="[@media(hover:hover)]:bg-primary" />` | caught (false positive) | allowed |
| `<div title="hover: to preview" />` | caught (false positive — every quoted attribute is scanned) | allowed (only `className` is read) |
| ``<div className={`hover:bg-primary`} />`` | missed (template literals are not scanned) | caught |
| `<div className="[&:hover]:bg-primary" />` | missed | caught |
| `<div className="not-hover:bg-primary" />` | caught | caught — rule-local self-hover predicate |
| `<div onMouseEnter={fn} className="hover:bg-primary" />` | caught (handler list omits it) | allowed |
| `<div onFocus={fn} className="hover:bg-primary" />` | caught (handler list omits it) | allowed |
| `<div role={computedRole} className="hover:bg-primary" />` | caught (role regex requires a quoted literal) | allowed |
| `<div as="button" className="hover:bg-primary" />` | caught | allowed |
| `<button><span className="hover:underline" /></button>` | caught | allowed |
| `<button><span><em className="hover:underline" /></span></button>` | caught | allowed (any depth) |
| `<Card className="hover:bg-primary" />` | caught | blind spot (unless `nonInteractiveComponents` lists it) |
| `<Dialog.Trigger className="hover:bg-primary" />` | allowed (`.Trigger` / `.Close` suffix) | blind spot |
| `<Comp className="hover:bg-primary" />` | allowed (hard-coded name) | blind spot |
| `<form className="hover:bg-muted" />` | caught | allowed (outside the closed list) |
| `<tr className="hover:bg-muted" />` | allowed (hard-coded, config-independent) | allowed (via `interactiveElements`) |
| `<td className="hover:bg-muted" />`, `interactiveElements: []` | caught | caught |
| `<div className="hover:bg-a hover:text-b" />` | 1 report | 1 report |
| `<div className={cn("hover:bg-primary")} />` | caught | caught |
| `<div className="md:hover:bg-primary" />` | caught | caught |
| `*.stories.tsx` | skipped by a hard-coded `isStorybookFile` check | skipped by default, via the `ignoreGlobs` option |

The `TableRow` and `Comp` special cases and the `.Trigger` / `.Close` suffix heuristic all
disappear, subsumed by the decision not to report on capitalized tags by default. The
`interactiveElements` option survives, widened to accept component names, and is joined by
`nonInteractiveComponents`.
