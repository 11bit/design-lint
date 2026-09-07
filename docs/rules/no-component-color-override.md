---
rule: no-component-color-override
legacy-id: 11
status: draft
disposition: custom
bias: false-positives
files: ["*.tsx"]
---

# no-component-color-override

**Design-system components own their color. Do not repaint one through `className`.**

A component in `componentsDirectory` is not a styled `<div>`; it is a decision. Its colors
live in a variant map, which is a small, reviewable catalogue of the appearances the design
system has agreed to have. `<Badge variant="danger">` is a thing the system knows about:
it has a name, it appears in Storybook, it changes when the token changes, and a designer
can find every instance of it.

`<Badge className="bg-red-500">` is none of those. It creates a tenth badge appearance
that exists in exactly one file, is invisible to anyone reading the variant map, and
resolves against the component's own classes through `twMerge` in an order the call site
cannot see — so it may not even win. Repeated across a codebase, this is how a design
system stops describing the product.

The fix is always the same shape: **use an existing variant, or add one.** That is a
conversation with the design system, which is the point.

Non-color utilities passed through `className` are a different matter — spacing, layout,
and sizing are the caller's business by construction, and the rule leaves them alone. See
[Open questions](#open-questions) 1.

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

## What counts as a color class

A class is a color class when its utility prefix is one of the color-valued Tailwind
prefixes —

`bg` · `text` · `border` (including the directional forms `border-t`, `border-r`,
`border-b`, `border-l`, `border-x`, `border-y`, `border-s`, `border-e`) · `divide` ·
`outline` · `ring` · `ring-offset` · `shadow` · `inset-shadow` · `fill` · `stroke` ·
`caret` · `accent` · `decoration` · `placeholder` · `from` · `via` · `to`

— **and** its value is one of:

1. a semantic token name derived from `colorTokenFiles` (`primary`, `danger-weak`, …);
2. a spectral family with a shade (`red-500`, `slate-50`);
3. a CSS-wide color keyword Tailwind ships (`white`, `black`, `transparent`, `current`,
   `inherit`);
4. an arbitrary value that is a raw color literal or a color custom property
   (`[#ff0000]`, `[rgb(1_2_3)]`, `[oklch(0.7_0.1_20)]`, `[var(--color-primary)]`,
   `[--color-primary]`);
5. an interpolation, where the static text preserves the prefix but the value is computed
   (`` `bg-${tone}` ``) — see [Interpolated colors](#interpolated-colors).

A prefix without a color value — `text-sm`, `border-2`, `shadow-md`, `divide-y`,
`from-0%`, `text-[14px]` — is not a color class.

## Promises to catch

A color class that statically reaches the `className` attribute of a **watched component**.

The watched set arrives as the `uiComponents` option, discovered once at plugin-module
load from `componentsDirectory` (`src/components/ui`). It must contain **every exported
component identifier** in that directory, resolved recursively — not one name per file.
`card.tsx` exports `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, and all
five are watched. The examples below use `Button`, `Badge`, and `Card` as watched names,
and `Chart` as an unwatched one.

**One report per offending class**, so an element carrying two of them reports twice.

### A color class in a className

```tsx caught
<Button className="bg-primary" />

<Button className='bg-primary' />

<Button className={"bg-primary"} />

<Badge className="text-destructive" />

<Badge className="bg-red-500" />

<Card className="border-primary" />

<Button className="ring-primary" />

<Button className="outline-danger" />

<Button className="fill-primary" />

<Button className="stroke-primary" />

<Button className="shadow-primary" />

<Button className="decoration-primary" />

<Button className="placeholder-muted" />

<Card className="from-primary" />

<Card className="via-info to-success" />
```

### Directional and compound color prefixes

```tsx caught
<Card className="border-t-primary" />

<Card className="border-x-primary" />

<Card className="border-s-danger" />

<Button className="ring-offset-primary" />

<Card className="divide-muted" />
```

### Color keywords and arbitrary values

```tsx caught
<Button className="bg-white" />

<Button className="text-black" />

<Button className="bg-transparent" />

<Button className="text-current" />

<Button className="bg-[#ff0000]" />

<Button className="text-[rgb(255_0_0)]" />

<Button className="bg-[oklch(0.7_0.1_20)]" />

<Button className="bg-[var(--color-primary)]" />

<Button className="bg-[--color-primary]" />

<Button className="shadow-[0_0_4px_#000]" />
```

### Variants, opacity, and important modifiers

A variant does not change the fact that a color is being applied — it only narrows when.

```tsx caught
<Button className="hover:bg-primary" />

<Button className="focus-visible:ring-primary" />

<Button className="md:dark:text-primary" />

<Button className="group-hover:bg-primary" />

<Button className="data-[state=open]:bg-primary" />

<Button className="bg-primary/50" />

<Button className="!bg-primary" />

<Button className="bg-primary!" />

<Button className="hover:bg-red-500/80" />
```

### Class strings reached through composition

Every string literal that can reach the attribute is scanned, at any nesting depth.
Recognised helpers: `cn`, `clsx`, `classNames`, `cx`, `twMerge`, `twJoin`, `tw`.

```tsx caught
<Button className={cn("bg-primary")} />

<Button className={cn("rounded-md", "bg-primary")} />

<Button className={clsx("bg-primary", extra)} />

<Button className={twMerge(base, "bg-primary")} />

<Button className={cn(isActive && "bg-primary")} />

<Button className={isActive ? "bg-primary" : "bg-muted"} />

<Button className={cn({ "bg-primary": isActive })} />

<Button className={cn(["p-2", "bg-primary"])} />

<Button className={cn(base, cn("p-2", clsx("bg-primary")))} />
```

**This resolves the migration plan's open question about `cn(className, "bg-primary")`.**
The literal argument is caught; what the incoming `className` prop happens to hold is a
[declared blind spot](#color-arriving-through-props).

```tsx caught
<Button className={cn(className, "bg-primary")} />
```

### Template literals

Static template literals are treated exactly like string literals. In a template with
expressions, every static quasi is scanned.

```tsx caught
<Button className={`bg-primary`} />

<Button className={`rounded-md bg-primary`} />

<Button className={`rounded-md bg-primary ${extra}`} />

<Button className={`${base} text-destructive`} />
```

### Interpolated colors

A color prefix immediately followed by an interpolation is a color being applied to the
component — the value is unknowable, but the channel is not, and that is what this rule
polices. It reports under a distinct `messageId` ([Message](#message)).

```tsx caught
<Button className={`bg-${tone}`} />

<Button className={`text-${tone}`} />

<Button className={`bg-red-${shade}`} />

<Button className={`border-t-${tone}`} />

<Button className={cn(`bg-${tone}`, "p-2")} />
```

### Namespaced components

A member-expression tag matches when the full name or its root object is watched, so
compound components are covered whether they are imported flat or as a namespace.

```tsx caught
<Card.Header className="bg-primary" />

<CardHeader className="bg-primary" />
```

### Multiple offences

```tsx caught count=2
<Button className="bg-primary text-destructive" />
```

```tsx caught count=2
<Button className={cn("bg-primary", `text-${tone}`)} />
```

```tsx caught count=2
<Button className="bg-primary">
  <Badge className="bg-red-500" />
</Button>
```

## Deliberately allows

### Anything that is not a watched component

```tsx allowed
<div className="bg-primary" />

<span className="text-destructive" />

<Chart className="bg-primary" />

<MotionDiv className="bg-red-500" />
```

### Non-color utilities on a watched component

Spacing, layout, sizing, radius, and typography scale are the call site's job. The design
system does not own where a button sits.

```tsx allowed
<Button className="px-4 py-2" />

<Button className="rounded-md" />

<Button className="text-sm font-medium" />

<Button className="shadow-md" />

<Button className="border-2" />

<Button className="divide-y" />

<Button className="flex items-center gap-2" />

<Button className="w-full max-w-sm" />

<Button className="absolute top-0 z-10" />

<Card className="from-0% to-100%" />
```

### Arbitrary values that are not colors

```tsx allowed
<Button className="text-[14px]" />

<Button className="bg-[url('/hero.png')]" />

<Button className="w-[calc(100%-2rem)]" />

<Button className="shadow-[0_0_4px_var(--spacing-1)]" />
```

### Color on a non-`className` prop

The `className` channel is the one this rule owns. A component that chooses to expose
color as a prop has made that an intentional part of its API.

```tsx allowed
<Button variant="destructive" />

<Badge tone="danger" />

<Chart color="#ff0000" />

<Button style={{ color: "red" }} />
```

`style` is deliberately not inspected here — see
[Relationship to other rules](#relationship-to-other-rules).

### Variant definitions

A `cva()` / `tv()` call is where the design system *declares* its colors. It is not a JSX
element, and this rule is JSX-scoped, so definitions stay quiet even when they name the
same classes a call site would be reported for.

```tsx allowed
const badge = cva("inline-flex rounded", {
  variants: {
    tone: {
      danger: "bg-danger text-danger-content",
      success: "bg-success text-success-content",
    },
  },
  compoundVariants: [{ tone: "danger", outline: true, class: "border-danger" }],
});
```

## Declared blind spots

Not caught, by decision. Each is either statically undecidable or belongs to a different
rule. Listing them here means a future change that *starts* catching one will fail its
assertion and force this document to be updated.

### Variable and object-map indirection

The class string does not appear at the call site. Resolving it requires cross-statement
or cross-module dataflow that this rule does not attempt.

```tsx blindspot
const cls = "bg-primary";
<Button className={cls} />;

const TONE = { danger: "bg-red-500", ok: "bg-green-500" };
<Button className={TONE[tone]} />;

<Button className={styles.card} />;

<Button className={getClasses(tone)} />;
```

The object-map case is the one the current line-wise scanner catches by accident, by
extracting every string literal in the file rather than by connecting it to an element.
That is a coincidence, not coverage: the same scan cannot tell whether the map is used on
a `<Button>` or a `<div>`. The `.ts` half of this question is
[cross-rule](#open-questions) and is settled for the *token* rules, not here.

### Color arriving through props

```tsx blindspot
<Button className={className} />;

<Button className={props.className} />;

<Button {...props} />;

<Button {...rest} className={cn(className)} />;
```

A component that forwards `className` down to a watched component is passing along a
decision made by *its* caller. Reporting at the forwarding site would blame the wrong
file; reporting at the original caller requires knowing that the prop reaches a watched
component, which is cross-module analysis.

### Fully dynamic class construction

Where no static text survives to identify a color prefix, there is nothing to match.

```tsx blindspot
<Button className={`${prefix}-primary`} />;

<Button className={"bg" + "-" + tone} />;

<Button className={parts.join(" ")} />;
```

### Aliased or shadowed component identifiers

Matching is by the identifier at the JSX tag. An import alias renames the component out of
the watched set; a local declaration can rename an unrelated component into it.

```tsx blindspot
import { Button as Btn } from "@/components/ui/button";
<Btn className="bg-primary" />;
```

### Runtime-selected component types

```tsx blindspot
const C = condition ? Button : Card;
<C className="bg-primary" />;

<Slot className="bg-primary" />;
```

### Color reaching the component through CSS

A CSS module class, a global stylesheet rule, or an `@apply` block targeting the
component's rendered element is outside the JS surface. Oxlint JS plugins do not parse CSS;
that surface belongs to Stylelint.

```tsx blindspot
import cardStyles from "./card.module.css";
<Card className={cardStyles.tinted} />;
```

### `.ts` files

This rule keys on JSX opening elements, which `.ts` cannot contain. Class maps living in
`.ts` constants files are therefore invisible to it by construction, and are covered — if
at all — by the token rules. See [Open questions](#open-questions) 5.

## Relationship to other rules

- **`no-style-color`** owns the `style` channel, for every element, and its contract states
  explicitly that the two rules do not overlap. This rule therefore does **not** inspect
  `style` on watched components — a divergence from the current implementation, which
  reports raw colors in `style=` a second time under this rule's id. Under the split,
  `<Button style={{ color: "#f00" }} />` reports from `no-style-color` and
  `no-raw-css-color`, and not from here.
- **`no-spectral-color`**, **`no-undefined-token`**, **`token-constraints`**, and
  **`no-raw-css-color`** fire on the *class*, wherever it appears. This rule fires on the
  *channel* — a design-system component's `className`. The two are orthogonal and
  double-reporting is correct: `<Button className="bg-red-500" />` is both a forbidden
  class and a forbidden mechanism, and fixing only one of them leaves a real defect.
  `<Button className="bg-primary" />` uses a perfectly good token and reports once, from
  here only.
- **`no-useless-hover`** is the other JSX-scoped custom rule. It never reports on a
  capitalized tag, and every watched component is capitalized, so the two cannot fire on
  the same element. `<Button className="hover:bg-primary" />` is this rule's business
  only.
- **`oxlint-tailwindcss`** extracts `cva()` fully, so the token rules *do* see variant
  maps. This rule deliberately does not. That divergence is the substance of
  [Open questions](#open-questions) 3 and is intentional: a `cva()` call is where a
  variant is defined, and defining variants is the behaviour this rule exists to push
  people toward.

## Message

Two message ids, because the dynamic case cannot name a class that exists.

```
messageId: colorOnComponent
data:      { token, component }
text:      "{{token}} overrides color on <{{component}}> — design-system components own
            their color; use an existing variant, or add one"
```

```
messageId: dynamicColorOnComponent
data:      { prefix, component }
text:      "{{prefix}}-* is interpolated into className on <{{component}}> — a computed
            color class cannot be checked or found later; move the choice into a variant"
```

`prefix` is the static text preceding the interpolation, with its trailing `-` removed:
`` `bg-${tone}` `` → `bg`, `` `bg-red-${shade}` `` → `bg-red`.

No autofix. The replacement is a variant name, which requires reading the component's
variant map and deciding which appearance was actually intended.

No suggestion. Offering "remove the class" would be destructive and would be applied
without prompting as index 0 by `oxlint --fix-suggestions`. Offering a *list* of the
component's variants was considered and rejected for v1: it would require the plugin to
parse each component's `cva()` map at load time, and a suggestion is invisible on the CLI
anyway, so the same information would have to be duplicated into the message text —
at which point the message becomes unreadably long for a component with ten variants.
Revisit once editor integration is verified in Phase 5.

## Open questions

Each blocks `status: agreed`.

1. **Should *non-color* classes passed to a watched component be flagged too?**
   The rule is named for color, and today only color tokens fire. But `rounded-full`,
   `shadow-lg`, and `text-xs` on a `<Button>` are the same category of defect — an
   appearance that exists outside the variant catalogue — while `mt-4`, `w-full`, and
   `absolute` genuinely are the caller's business.
   *Recommendation: color-only for v1.* The line between "appearance the system owns" and
   "placement the caller owns" is real but not crisply expressible as a prefix list, and
   getting it wrong makes the rule unusable rather than merely incomplete. Colors have the
   property that makes the rule tractable: they are the thing tokens exist for, and there
   is never a call-site reason to pick one. If we want more later, the honest form is a
   second rule with its own contract, not a widened predicate here.

2. **How is the watched set derived — filenames, or exported identifiers?**
   The current discovery maps `card.tsx` → `Card` and stops, so `<CardHeader>`,
   `<CardTitle>`, `<DialogFooter>`, and every other compound member is unwatched. Since
   compound members are precisely the parts people reach for `className` on, this is the
   rule's largest live hole.
   *Recommendation: exported identifiers, recursively.* Discovery runs once at
   plugin-module load, so the cost is a one-time directory read, and it removes an entire
   silent gap rather than declaring it. This changes `componentsDirectory`'s documented
   meaning in `colors.schema.json` and should be recorded there.

3. **[cross-rule] Are `cva()` / `tv()` variant maps in scope?**
   This contract says no, deliberately, and diverges from `oxlint-tailwindcss`, which
   extracts them for the token rules. The plan flags this divergence as needing to be a
   decision rather than an accident, and this is the decision for the JSX-scoped half.
   *Recommendation: keep the divergence, and state it in `docs/rules/README.md`* so the
   split — token rules see `cva()`, JSX-scoped rules do not — is documented once rather
   than rediscovered per rule. `token-constraints` must answer the same question for
   itself; the two answers are allowed to differ, but not silently.

4. **Does the rule run on the files inside `componentsDirectory` itself?**
   A design-system component routinely composes another one —
   `<Button className="bg-transparent" />` inside `dropdown-menu.tsx` is common in
   shadcn-derived code. Those are still overrides, but they are overrides *by the system,
   on itself*, which is where variants get authored in the first place.
   *Recommendation: exempt `componentsDirectory` via an `oxlint` `overrides` entry, not a
   path check inside the rule.* Same reasoning as the Storybook question: exclusions
   belong in visible config.

5. **[cross-rule] Do the custom rules apply to `.ts` as well as `.tsx`?**
   For this rule the answer is forced — no JSX in `.ts`, so `.tsx` only. But the
   underlying coverage regression Phase 0 found (`oxlint-tailwindcss` does not see
   `const c = { danger: "bg-red-500" }` in a `.ts` constants file, while the current
   scanner does) is the same hole as this rule's
   [object-map blind spot](#variable-and-object-map-indirection), approached from the
   token side. Whatever Phase 4 decides for the token rules determines whether that map
   is caught anywhere at all.
   *Recommendation for this rule: `.tsx` only, and do not try to close the map hole here.*
   Raised identically in [`no-style-color.md`](./no-style-color.md) open question 5 and in
   [`no-useless-hover.md`](./no-useless-hover.md) open question 6; it must be settled once
   across all nine contracts.

6. **[cross-rule] Are Storybook files excluded?**
   Stories are where `<Badge className="bg-red-500">` is most likely to be a deliberate
   illustration of something the design system does *not* offer.
   *Recommendation: drop `isStorybookFile` and express the exclusion as `oxlint`
   `overrides`.* Same answer as [`no-useless-hover.md`](./no-useless-hover.md) open
   question 5; they should be resolved together.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

For migration reference. The current rule extracts JSX opening tags with a hand-rolled
scanner, brace-scans `className=` values, matches the tag name against a set of PascalCase
names derived one-per-`.tsx`-file from `componentsDirectory`, and additionally reports raw
color strings found in `style=` on the same elements.

| Case | Today | Under this contract |
| --- | --- | --- |
| `<Button className="bg-primary" />` | caught | caught |
| `<Button className={cn("bg-primary", extra)} />` | caught | caught |
| ``<Button className={`bg-${tone}`} />`` | caught | caught |
| `<Button className="bg-primary text-destructive" />` | 2 reports | 2 reports |
| `<CardHeader className="bg-primary" />` | missed (only `Card` is discovered) | caught |
| `<Card.Header className="bg-primary" />` | missed (tag name is `Card.Header`) | caught |
| `<Button className="bg-[#ff0000]" />` | missed (no `-` in the value part) | caught |
| `<Button className="bg-[var(--color-primary)]" />` | missed | caught |
| `<Button className="bg-white" />` | missed unless `--color-white` is literally in `styles.css` | caught |
| `<Button className="border-t-primary" />` | missed (`t-primary` is not a token) | caught |
| ``<Button className={cn("p-2", `bg-${tone}`)} />`` | missed (a backtick argument is only scanned when it is the *first* thing in the expression) | caught |
| `<Button className={cn({ "bg-primary": on })} />` | caught (any quoted string in the expression) | caught |
| `<Button className="text-sm shadow-md border-2" />` | allowed | allowed |
| `<Button className="text-[14px]" />` | allowed | allowed |
| `<Button className="bg-[url('/hero.png')]" />` | allowed | allowed |
| `<Button style={{ color: "#f00" }} />` | caught here **and** by `no-style-color` | not caught here; `no-style-color` owns it |
| `cva()` variant map naming `bg-danger` | allowed | allowed |
| `const cls = "bg-primary"; <Button className={cls} />` | missed | blind spot |

Two behavioural removals are worth calling out because they are not oversights:

- **The `style=` half is deleted.** `no-style-color.md` states that the two rules do not
  overlap and that this one owns the `className` channel only. Keeping the `style` scan
  would make `<Button style={{ color: "#f00" }} />` report three times under three rule
  ids for one mistake.
- **`isColorToken`'s empty-`colorPart` shortcut becomes an explicit message.** Today
  `` `bg-${tone}` `` reports the class as the literal string `bg-`, which reads as a typo.
  Under this contract it reports under `dynamicColorOnComponent` with `prefix: "bg"`.
