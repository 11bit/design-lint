---
rule: no-useless-hover
legacy-id: 10
status: draft
disposition: custom
bias: false-negatives
files: ["*.tsx"]
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

This rule is deliberately quiet where interactivity is invisible at the call site. It
reports only on a **closed list of intrinsic HTML elements that are never interactive**,
and never on a capitalized component — see [Declared blind spots](#declared-blind-spots)
and [Open questions](#open-questions) for why.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## Promises to catch

A `hover:` variant appearing in a class string that statically reaches the `className` of a
non-interactive intrinsic element.

**One report per element**, not per offending class. The element is the defect; the
individual classes are symptoms of it. The report names the first offending class.

### The non-interactive tag list

The rule reports only on these tags. It is a closed list, so a tag outside it is never
reported — that is what makes the promise below complete rather than aspirational.

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

The `interactiveElements` option removes further names from this list; the shipped
`colors.json` sets it to `["tr", "td", "th"]`.

```tsx caught
<div className="hover:bg-primary" />

<span className="hover:text-primary" />

<p className="hover:bg-muted" />

<li className="hover:bg-accent" />

<h2 className="hover:text-link" />

<img className="hover:opacity-80" />

<svg className="hover:fill-primary" />
```

### Every form the `hover` variant takes

The variant must be recognised as a variant, by segment, not as a substring.

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

<div className="not-hover:bg-primary" />

<div className="[&:hover]:bg-primary" />

<div className="md:[&:hover]:bg-primary" />
```

`not-hover:` is caught for the same reason as `hover:` — the element's appearance is still
conditioned on being hovered, so the affordance is still being promised. `[&:hover]:` is
the arbitrary-variant spelling of exactly the same selector and must not be an escape
hatch.

### Class strings reached through composition

The `className` value may be any of these shapes. Every string literal that can reach the
attribute is scanned.

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
is over that element too, and the hover styling has a real target.

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
```

### `group-hover:` and `peer-hover:` — the sanctioned idiom

These variants do not claim the element is hoverable. They say "restyle me when *that*
element is hovered", which is precisely the correct construction for a non-interactive
descendant of an interactive ancestor, or a sibling of an interactive peer. They are never
reported by this rule.

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

### `hover:` outside a class channel

The rule inspects `className` only. `hover:` occurring in prose, data attributes, or a
media-feature query is not a variant.

```tsx allowed
<div title="hover: to preview" />

<div data-tooltip="hover: me" aria-label="hover: me" />

<div className="[@media(hover:hover)]:bg-primary" />

<div className="supports-[hover:hover]:bg-primary" />

<div className="pointer-fine:bg-primary" />
```

### Tags exempted by configuration

With the shipped `interactiveElements: ["tr", "td", "th"]`, table rows and cells carry an
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

So the rule reports on intrinsic tags only, and says so out loud.

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
The tag they land on is unknown at the definition site. This rule is JSX-scoped by design.

```tsx blindspot
const row = cva("rounded-md", {
  variants: { tone: { muted: "hover:bg-muted" } },
});
```

### The `class` attribute

Only `className` is inspected. `class` is not a React prop; if a Preact or Solid surface
ever lands in this codebase, that is a change to this contract, not an oversight in it.

```tsx blindspot
<div class="hover:bg-primary" />
```

### `:hover` written in CSS

Outside the JS surface entirely, and outside Oxlint's reach — Oxlint JS plugins do not
parse CSS.

```tsx blindspot
const css = ".card:hover { background: var(--color-primary); }";
```

## Relationship to other rules

- **`token-constraints`** also matches on the `hover:` variant, to require that
  `hover:`-scoped colors use a `*-hover` suffixed token. It has the identical substring
  bug (`rawTok.includes("hover:")`). The decision this contract takes — `hover`,
  `group-hover`, and `peer-hover` are three *different* variants and must be matched by
  segment, never by substring — binds both rules. See
  [Open questions](#open-questions) 1, marked **[cross-rule]**.
- **`no-component-color-override`** is JSX-scoped like this rule but keyed on the
  component set, which is capitalized by construction. Since this rule never reports on a
  capitalized tag, the two never fire on the same element.
- **`no-style-color`** governs the `style` channel. Hover cannot be expressed inline at
  all, which is part of that rule's rationale; there is no overlap.
- **`no-dark-variant`** is the other variant-shaped rule. It bans a variant outright; this
  one bans a variant *in a context*. They share no logic.

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
output never renders suggestions.

## Open questions

Each blocks `status: agreed`.

1. **[cross-rule] Are `group-hover:` and `peer-hover:` in scope?**
   This contract says no, unconditionally, and treats the current substring match as a
   false-positive bug. The idiom is the *recommended* construction for exactly the
   situation the rule exists to fix, so reporting it teaches the wrong lesson.
   *Recommendation: out of scope here, and matched by segment rather than substring in
   both rules.* The consequence for `token-constraints` is separate and needs its own
   answer: does `group-hover:bg-primary` have to satisfy `allowed["hover:"]`
   (`*-hover` suffixed tokens)? *Recommendation there: yes* — the token still styles a
   hover state and should still name a hover token — but that must be a deliberate
   decision in that contract, not a side effect of this one.

2. **Should unrecognised capitalized components be flagged?**
   The alternative to the closed intrinsic-tag list is to flag every component not on an
   interactive allow-list, which is what the current implementation does.
   *Recommendation: keep the blind spot.* An allow-list of interactive components is
   unmaintainable and, worse, fails silently in the direction this project has decided is
   unacceptable — a new interactive component is a false positive, and a new
   non-interactive one is a false negative, and neither is visible. A closed
   non-interactive intrinsic list fails in neither direction, because membership is a
   fact about HTML rather than about this codebase.
   If we want the coverage anyway, the honest version is a separate, explicitly
   opt-in option (`nonInteractiveComponents: [...]`) rather than a default.

3. **Does an interactive JSX ancestor in the same expression exempt its descendants?**
   This contract says yes ([Deliberately allows](#deliberately-allows)). It is cheap on an
   AST — walk `node.parent` — and it removes a whole class of correct-but-flagged code
   (`<button><span className="hover:underline">`).
   *Recommendation: keep it.* The counter-argument is real: `hover:` on the span fires only
   when the pointer is over the span, which is subtly different from hovering the button,
   and `group-hover:` expresses the intent better. But that is a style preference, not a
   broken affordance, and this rule is about broken affordances.

   The exemption is **lexical and stops at the component boundary**, which leaves one
   known false positive:

   ```tsx
   function Row({ children }) {
     return <div className="hover:bg-muted">{children}</div>;
   }
   ```

   `Row` is reported, and may nonetheless be rendered inside a `<button>` by every one of
   its callers. This is the one place the rule flags something it cannot prove is wrong,
   and it is accepted rather than declared: the same shape is also the single most common
   *genuine* instance of the defect, and `// oxlint-disable-next-line` at the definition
   costs one line and documents the intent for the next reader. If it turns out to be
   noisy in practice, the fix is to require an interactivity signal on the wrapper (a
   handler, `role`, or `asChild`) rather than to stop reporting.

4. **Should `interactiveElements` also accept component names?**
   The option is currently documented as "additional HTML tags". Under this contract
   components are never flagged anyway, so component entries would be inert.
   *Recommendation: keep it tag-only and say so in `colors.schema.json`.* Reopen only if
   open question 2 resolves the other way.

5. **[cross-rule] Are Storybook files excluded?**
   The current runner skips them wholesale via `isStorybookFile`. Unclear whether that was
   intent or convenience. For this rule specifically, stories are where non-interactive
   demo markup is most common and least harmful.
   *Recommendation: drop the hard-coded path check and express the exclusion as an
   `oxlint` `overrides` entry*, so the decision is visible in config rather than compiled
   into a rule. This must be answered the same way for all nine contracts.

6. **[cross-rule] Do the custom rules apply to `.ts` as well as `.tsx`?**
   For this rule the answer is forced — `.ts` cannot contain JSX, so there is nothing to
   scan. *Recommendation for this rule: `.tsx` only.* The general question, and the
   `.ts` object-literal coverage regression behind it, is raised in
   [`no-style-color.md`](./no-style-color.md) open question 5 and must be settled once
   across all nine contracts.

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
| `<div title="hover: to preview" />` | caught (false positive — every quoted attribute is scanned) | allowed |
| ``<div className={`hover:bg-primary`} />`` | missed (template literals are not scanned) | caught |
| `<div className="[&:hover]:bg-primary" />` | missed | caught |
| `<div className="not-hover:bg-primary" />` | caught | caught |
| `<div onMouseEnter={fn} className="hover:bg-primary" />` | caught (handler list omits it) | allowed |
| `<div onFocus={fn} className="hover:bg-primary" />` | caught (handler list omits it) | allowed |
| `<div role={computedRole} className="hover:bg-primary" />` | caught (role regex requires a quoted literal) | allowed |
| `<div as="button" className="hover:bg-primary" />` | caught | allowed |
| `<button><span className="hover:underline" /></button>` | caught | allowed |
| `<Card className="hover:bg-primary" />` | caught | blind spot |
| `<Dialog.Trigger className="hover:bg-primary" />` | allowed (`.Trigger` / `.Close` suffix) | blind spot |
| `<Comp className="hover:bg-primary" />` | allowed (hard-coded name) | blind spot |
| `<form className="hover:bg-muted" />` | caught | allowed (outside the closed list) |
| `<tr className="hover:bg-muted" />` | allowed (hard-coded, config-independent) | allowed (via `interactiveElements`) |
| `<td className="hover:bg-muted" />`, `interactiveElements: []` | caught | caught |
| `<div className="hover:bg-a hover:text-b" />` | 1 report | 1 report |
| `<div className={cn("hover:bg-primary")} />` | caught | caught |
| `<div className="md:hover:bg-primary" />` | caught | caught |

The `TableRow` and `Comp` special cases and the `.Trigger` / `.Close` suffix heuristic all
disappear, subsumed by the decision not to report on capitalized tags at all. The
`interactiveElements` option survives unchanged and becomes the only configuration
surface.
