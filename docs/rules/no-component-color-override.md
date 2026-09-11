---
rule: no-component-color-override
legacy-id: 11
status: implemented
disposition: custom
bias: false-positives
files: ["*.tsx", "*.jsx"]
---

# no-component-color-override

**Design-system components own their color. Do not repaint one through `className`.**

A component imported from a configured component source is not a styled `<div>`; it is a
decision. Its colors live in a variant map, which is a small, reviewable catalogue of the
appearances the design system has agreed to have. `<Badge variant="danger">` is a thing the
system knows about: it has a name, it appears in Storybook, it changes when the token
changes, and a designer can find every instance of it.

`<Badge className="bg-red-500">` is none of those. It creates a tenth badge appearance
that exists in exactly one file, is invisible to anyone reading the variant map, and
resolves against the component's own classes through `twMerge` in an order the call site
cannot see — so it may not even win. Repeated across a codebase, this is how a design
system stops describing the product.

The fix is always the same shape: **use an existing variant, or add one.** That is a
conversation with the design system, which is the point.

Non-color utilities passed through `className` are a different matter — spacing, layout,
and sizing are the caller's business by construction, and the rule leaves them alone by
default. See [Configuration](#configuration).

> Case convention: within each fenced block, blank-line-separated groups are separate
> cases. `caught` blocks assert the rule reports; `allowed` and `blindspot` blocks assert
> it does not.

**Case preamble.** Because a component is watched by *where it was imported from*, a case
consisting of a bare JSX element would watch nothing. Every case in this contract is
therefore executed with the block below prepended, and with
`componentSources: ["@/components/ui/*"]`. `Button`, `Badge`, `Card`, and `CardHeader` are
watched; `Chart` and any identifier the preamble does not bind are not. A case that brings
its own `import` adds to these bindings rather than replacing them.

```tsx preamble
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chart } from "@/components/chart";
```

## What counts as a color class

A class is a color class when its utility prefix is one of the color-valued Tailwind
prefixes and its value is a color.

**The prefix set is derived, not hand-listed.** `/policy` builds it from the Tailwind
design system resolved through `settings.tailwindcss.entryPoint`, which is why the
directional border families, `inset-ring`, `inset-shadow`, and `text-shadow` are all
present without anyone maintaining a constant. At the time of writing that set is:

`bg` · `text` · `border` (including the directional forms `border-t`, `border-r`,
`border-b`, `border-l`, `border-x`, `border-y`, `border-s`, `border-e`) · `divide` ·
`outline` · `ring` · `ring-offset` · `inset-ring` · `shadow` · `inset-shadow` ·
`text-shadow` · `fill` · `stroke` · `caret` · `accent` · `decoration` · `placeholder` ·
`from` · `via` · `to`

A value is a color when it is one of:

1. a semantic token name from the resolved design system (`primary`, `danger-weak`, …);
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

## How a component becomes watched

**A JSX element is watched when its identifier was imported from a path matching a
configured `componentSources` pattern.** Nothing is read from disk, no directory is
scanned, and no path is derived from the plugin's own location — the information the rule
needs is already in the file being linted.

```tsx
componentSources: ["@/components/ui/*"]

import { Card, CardHeader } from "@/components/ui/card";
```

Three properties follow, and each replaces something that used to be a hole:

- **Compound members are free.** `CardHeader` is a named import like any other, so the
  one-PascalCase-name-per-filename limit — the rule's largest live gap, which left
  `<CardHeader>`, `<DialogFooter>`, and every other compound member unwatched — simply does
  not arise.
- **Nothing has to be kept in sync.** An explicit name list drifts the moment someone adds
  a component; a directory scan requires the consumer to have that directory, and this
  package ships to projects that do not.
- **Import path, not identifier name, is the key.** An alias is followed (the binding is
  what matters, not the spelling), and a locally declared `Button` that was never imported
  is not watched.

Precedent: `eslint-plugin-primer-react` resolves components the same way.

## Promises to catch

A color class that statically reaches the `className` attribute of a watched component.

The rule uses the **precise AST walk** (`/policy`'s context-dependent extractor), not the
broad string sweep the token rules get: a class on `<Button>` means something different
from the same class on `<div>`, so extraction has to know which element it is looking at.
The walk resolves `className` on a specific element and unwraps `cn()` / `clsx()` /
`twMerge()` arguments **in any position**, at any nesting depth, including template
literals.

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
```

A `via` and a `to` in one string are two colour classes, and the promise above is one
report per offending class — so this case reports twice, not once.

```tsx caught count=2
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
This rule takes no interest in *which* variant: unlike `token-constraints` and
`no-useless-hover`, it never asks whether a segment belongs to the `hover` family, because
a colour reaching a watched component's `className` is the defect regardless of the
condition attached to it.

```tsx caught
<Button className="hover:bg-primary" />

<Button className="focus-visible:ring-primary" />

<Button className="md:dark:text-primary" />

<Button className="group-hover:bg-primary" />

<Button className="not-hover:bg-primary" />

<Button className="data-[state=open]:bg-primary" />

<Button className="bg-primary/50" />

<Button className="!bg-primary" />

<Button className="bg-primary!" />

<Button className="hover:bg-red-500/80" />
```

### Class strings reached through composition

Recognised helpers: `cn`, `clsx`, `classNames`, `cx`, `twMerge`, `twJoin`, `tw`.

```tsx caught
<Button className={cn("bg-primary")} />

<Button className={cn("rounded-md", "bg-primary")} />

<Button className={clsx("bg-primary", extra)} />

<Button className={twMerge(base, "bg-primary")} />

<Button className={cn(isActive && "bg-primary")} />

<Button className={cn({ "bg-primary": isActive })} />

<Button className={cn(["p-2", "bg-primary"])} />

<Button className={cn(base, cn("p-2", clsx("bg-primary")))} />
```

Both arms of a conditional statically reach the element — the walk takes the consequent and
the alternate, because it has no idea which one runs — so a conditional between two colour
classes is two offending classes and two reports.

```tsx caught count=2
<Button className={isActive ? "bg-primary" : "bg-muted"} />
```

**This resolves the migration plan's open question about `cn(className, "bg-primary")`.**
The literal argument is caught; what the incoming `className` prop happens to hold is a
[declared blind spot](#color-arriving-through-props).

```tsx caught
<Button className={cn(className, "bg-primary")} />
```

### Multi-line elements

Where the attribute sits is irrelevant — the walk resolves `className` on the element, not
on the line.

```tsx caught
<Card
  className="bg-primary"
/>

<Card
  variant="outline"
  className={cn(
    "text-danger",
    className,
  )}
/>
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
polices. Dynamically assembled class names defeat every static guarantee the token system
offers, so this is the one hole it cannot tolerate. It reports under a distinct `messageId`
that names the escape hatch ([Message](#message)).

```tsx caught
<Button className={`bg-${tone}`} />

<Button className={`text-${tone}`} />

<Button className={`bg-red-${shade}`} />

<Button className={`border-t-${tone}`} />

<Button className={cn(`bg-${tone}`, "p-2")} />
```

The sanctioned repair — named in the message text — is a lookup of **complete** class
names, or a `--color-*` custom property. Complete names stay statically visible, so the
token rules still see them even where this rule's channel check cannot follow the lookup
(that step is the [object-map blind spot](#variable-and-object-map-indirection)):

```tsx
const TONES = { danger: "text-danger", ok: "text-success" };
<Button className={TONES[tone]} />;
```

### Aliased imports

Matching is by binding, not by spelling, so renaming a watched component at the import site
does not un-watch it.

```tsx caught
import { Button as Btn } from "@/components/ui/button";
<Btn className="bg-primary" />;
```

### Namespaced components

A member-expression tag matches when the object identifier is bound to a watched import, so
compound components are covered whether they are imported flat or as a namespace.

```tsx caught
<Card.Header className="bg-primary" />

<CardHeader className="bg-primary" />
```

### Inside the component library itself

**The rule applies everywhere. There is no library exemption.** A design-system component
composing another one is held to the same standard as any consumer: add a variant rather
than pass a colour class. The library cannot quietly exempt itself from the constraint it
exports, and every internal override becomes a visible decision rather than an invisible
one.

```tsx caught
// src/components/ui/alert.tsx
<Card className="bg-danger-weak" />
```

The cost is real and should be expected: `oxlint-disable` comments will cluster in library
files doing legitimate internal composition. That is the accepted price. Import-source
matching already removes part of the surface — a library file importing its sibling
relatively (`./button`) does not match `@/components/ui/*` and is not watched — so this
bites on alias and package-name imports within the library.

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

const Tooltip = styled.div``;
<Tooltip className="bg-primary" />;
```

`Chart` is imported from `@/components/chart`, which no `componentSources` pattern matches.
`MotionDiv` is not imported in this file at all. `Tooltip` is declared locally — a name
that happens to look like a design-system component is not one, because watching keys on
the import, not the identifier.

### Components imported by a non-matching path

A relative import does not match an alias pattern. This is the escape valve inside the
component library referred to above, and it is a consequence of import-source matching
rather than an exemption anyone has to maintain.

```tsx allowed
import { Separator } from "./separator";
<Separator className="bg-border" />;
```

### Non-color utilities on a watched component

Spacing, layout, sizing, radius, and typography scale are the call site's job by default.
The design system does not own where a button sits. A project that disagrees widens the
owned set through `ownedUtilities` ([Configuration](#configuration)); the default is empty.

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

A `cva()` / `tv()` call is where the design system *declares* its colors, and declaring
variants is the behaviour this rule exists to push people toward. It is also not a JSX
element, and this rule matches JSX elements by import binding, so definitions fall outside
it structurally as well as on the merits. Both halves of that answer point the same way,
which is why this needs no special-casing.

The token rules do see `cva()`, through the broad sweep — a variant defined with a spectral
colour is as wrong as one used inline. The divergence between the two families is
deliberate and documented once in `docs/rules/README.md` rather than rediscovered per rule.

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
or cross-module dataflow that this rule does not attempt — one level of indirection is
deliberately unresolved across all three JSX-scoped rules, because "how many levels, which
scopes" has no non-arbitrary answer and every choice gets re-argued in review.

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
a `<Button>` or a `<div>`. Under the two-extractor split, the token rules keep catching
`{ danger: "bg-red-500" }` as a forbidden *class*; nothing catches it as a forbidden
*channel*, and that is the accepted line.

### Dynamic `import()`

Watching depends on a static import binding. A component pulled in through `import()` — or
`React.lazy(() => import(…))` — has no import specifier the rule can match against a
pattern.

```tsx blindspot
const LazyCard = React.lazy(() => import("@/components/ui/card"));
<LazyCard className="bg-primary" />;
```

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

Where no static text survives to identify a color prefix, there is nothing to match. This
is the boundary of [Interpolated colors](#interpolated-colors): the rule flags a *prefix*
that survives interpolation, and cannot flag one that does not.

```tsx blindspot
<Button className={`${prefix}-primary`} />;

<Button className={"bg" + "-" + tone} />;

<Button className={parts.join(" ")} />;
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
that surface belongs to the `/stylelint` entry point, which reads the same `/policy` module
but has no notion of a JSX element to attribute the colour to.

```tsx blindspot
import cardStyles from "./card.module.css";
<Card className={cardStyles.tinted} />;
```

### Imports spelled differently from the pattern

The pattern is matched against the specifier as written, so an import that reaches the
component library by another route is not watched: a second alias for the same folder, or a
relative path from outside the library. This is accepted for now rather than intended — it
is what spelling-based matching cannot see. The fix is planned under
[Planned: matching where an import points](#planned-matching-where-an-import-points), and
these cases fail the day it lands.

```tsx blindspot
import { Sheet } from "#/components/ui/sheet";
<Sheet className="bg-primary" />;

import { Toaster } from "../components/ui/sonner";
<Toaster className="bg-primary" />;
```

### `.ts` files

This rule keys on JSX opening elements, which `.ts` cannot contain. Class maps living in
`.ts` constants files are therefore invisible to it by construction, and are covered — as
classes, not as channel violations — by the token rules' broad sweep.

## Planned: matching where an import points

Not implemented. Recorded here because it closes the blind spot above, and because it
changes this contract rather than extending it.

**Configure a folder, not a spelling.** `componentSources` would name the directory the
components live in — `src/components/ui` — and the rule would resolve each import to a file
before asking whether it lies inside that directory. `#/components/ui/button`,
`@/components/ui/button` and `../components/ui/sonner` would then be the same component,
because they are the same file.

- **Resolution happens at load, not in the rule.** The factory reads the project's alias
  maps once — `compilerOptions.paths` in tsconfig and `imports` in package.json — and binds
  them to the rule the way it binds the design system. The rule still reads no file.
- **The default comes from the project.** A shadcn project declares its component alias as
  `aliases.ui` in `components.json`; resolved through the alias maps, that is a folder, and
  no consumer has to spell anything.
- **A wrong setting becomes detectable.** A folder either exists or it does not, so the
  factory can throw on one that does not. A glob can only ever match nothing, silently.
- **A library exemption becomes expressible by location**, should one be wanted: a file
  inside the component folder styling its own components. Today's relative-import escape
  valve exempts by spelling, so it exempts nothing in a library that imports its siblings
  through an alias. Whether to exempt the library at all is still the question under
  [Inside the component library itself](#inside-the-component-library-itself); this makes
  either answer implementable.

What it costs: alias resolution (wildcard `paths`, `baseUrl`, `extends` chains, and
`imports` conditions), a resolved alias map in the harness alongside the design system, and
rewriting the cases in this contract that rely on the relative-import escape valve.

## Configuration

Mechanism ships; policy is supplied. The colour-prefix set, the colour-value predicate, the
import-binding resolution, and the precise AST walk are mechanism and are not configurable.
Everything below is policy, shipped as a `recommended` default that a consuming project
overrides.

| Option | Type | `recommended` default | Overriding it |
| --- | --- | --- | --- |
| `componentSources` | `string[]` (glob patterns) | **none — required** | Which import sources make a component watched, spelled as the imports are written |
| `ownedUtilities` | `string[]` (utility prefixes) | `[]` | Adds non-colour prefixes the design system also claims |
| `ignoreGlobs` | `string[]` (globs) | `["**/*.stories.@(js\|jsx\|ts\|tsx)"]` | Files the rule skips — see [below](#storybook-and-other-excluded-files) |

One further input arrives through `settings`, not options, because it is shared with every
other rule in the package: `settings.tailwindcss.entryPoint`, from which `/policy` derives
the colour-prefix set and the semantic token names. **The rule reads no filesystem and
derives no path from its own location** — every external fact reaches it as configured
input.

### `componentSources`

Glob patterns matched against the *import source string*, exactly as written in the file —
not against the folder it resolves to. A project whose code imports
`#/components/ui/button` writes `["#/components/ui/*"]`; a project using a workspace package
writes `["@acme/ui", "@acme/ui/*"]`. A shadcn project records its alias as `aliases.ui` in
`components.json`. Patterns are matched literally against the specifier, so
`@/components/ui/*` matches `@/components/ui/card` and not `./card` — which is the mechanism
behind the relative-import escape valve described under
[Inside the component library itself](#inside-the-component-library-itself).

**There is no default, and there cannot be one.** One folder can be reached through several
aliases — a tsconfig may map `@/*` and `#/*` to the same `./src/*` — and only the consumer
knows which spelling their code uses. A default of `@/components/ui/*` would be a guess, and
in a project importing through `#/` it would watch nothing and report nothing: the failure
this configuration exists to make loud. See [the footgun](#the-options-replace-footgun) below
for what the rule does when the option is absent.

A pattern that is valid but matches none of the project's imports is still silent, and so is
an import that reaches the library by another spelling — see
[Imports spelled differently from the pattern](#imports-spelled-differently-from-the-pattern)
and [Planned: matching where an import points](#planned-matching-where-an-import-points).

### `ownedUtilities`

The configured answer to "are non-colour classes on a watched component flagged?" The
`recommended` default is **no** — the option is empty. The line between "appearance the
system owns" and "placement the caller owns" is real but not crisply expressible in
general: `rounded-full` and `shadow-lg` on a `<Button>` are the same category of defect as
a colour, while `mt-4`, `w-full`, and `absolute` genuinely are the caller's business.
Colours have the property that makes the default tractable — they are the thing tokens
exist for, and there is never a call-site reason to pick one.

A project that has drawn its own line lists the extra prefixes:
`ownedUtilities: ["rounded", "shadow"]` makes `<Button className="rounded-full" />` report
under `colorOnComponent`. Listing a prefix whose value is not a colour is exactly what the
option is for; the rule stops requiring a colour value for prefixes named here.

### Storybook and other excluded files

Stories are where `<Badge className="bg-red-500">` is most likely to be a deliberate
illustration of something the design system does *not* offer. The rule skips any file
matching `ignoreGlobs`, which defaults to `["**/*.stories.@(js|jsx|ts|tsx)"]` — the same
option, with the same default, as every other rule in the package. A consumer lints stories
like anything else by setting it to `[]`. The default is carried in the rule's
`defaultOptions`, so a severity-only override does not bring stories back.

Note that no such exclusion exists for the component library. That is deliberate — see
[Inside the component library itself](#inside-the-component-library-itself).

### File scope

`.tsx` only, per the JSX rule family. A JSX element cannot syntactically exist in `.ts`, so
scanning `.ts` here is pure cost — nothing can match.

### The options-replace footgun

Oxlint **replaces** rule options rather than merging them. A consumer who writes

```jsonc
"design/no-component-color-override": "error"   // just bumping severity
```

wipes the preset's options entirely, leaving `componentSources` absent. The naive
implementation returns early with no watched components, so the rule appears enabled,
reports nothing, and exits 0 — a silent, total loss of coverage that looks like success.

**This rule therefore throws on an absent or empty `componentSources`**, naming the option
and the factory in the error, rather than returning early. Failing loudly is the entire
mitigation available at the rule level, and it is why the rule carries no default to fall
back on: a guessed alias would turn this throw back into silence. The factory requires the
option as well, and the README says how to spell it. The correct form of a severity bump is
to re-pass the options alongside it.

## Relationship to other rules

- **`no-style-color`** owns the `style` channel, for every element, and its contract states
  explicitly that the two rules do not overlap. This rule therefore does **not** inspect
  `style` on watched components — a divergence from the current implementation, which
  reports raw colors in `style=` a second time under this rule's id. Under the split,
  `<Button style={{ color: "#f00" }} />` reports from `no-style-color` and
  `no-raw-color`, and not from here.
- **`no-spectral-color`**, **`no-undefined-token`**, **`token-constraints`**, and
  **`no-raw-color`** fire on the *class*, wherever it appears. This rule fires on the
  *channel* — a design-system component's `className`. The two are orthogonal and
  double-reporting is correct: `<Button className="bg-red-500" />` is both a forbidden
  class and a forbidden mechanism, and fixing only one of them leaves a real defect.
  `<Button className="bg-primary" />` uses a perfectly good token and reports once, from
  here only.
- **`no-useless-hover`** is the other JSX-scoped custom rule, and the two consume the same
  precise AST walk. It reports on intrinsic tags only unless a project explicitly opts
  components in through its `nonInteractiveComponents` option, so by default the two never
  fire on the same element: `<Button className="hover:bg-primary" />` is this rule's
  business only.
- **The token rules see `cva()`; this rule does not.** Same package, different extractor,
  and the divergence is the intended one — see [Variant definitions](#variant-definitions).

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
            color class cannot be checked or found later; move the choice into a variant,
            or select between complete class names ({ danger: \"text-danger\" }) or
            --color-* custom properties"
```

`prefix` is the static text preceding the interpolation, with its trailing `-` removed:
`` `bg-${tone}` `` → `bg`, `` `bg-red-${shade}` `` → `bg-red`.

The second message names the escape hatch in its text rather than only reporting the
violation, and it has to: suggestions do not render in any CLI output format, and
`meta.docs.url` is dead under Oxlint, so the message is this rule's only channel to the
developer.

No autofix. The replacement is a variant name, which requires reading the component's
variant map and deciding which appearance was actually intended.

No suggestion. Offering "remove the class" would be destructive and would be applied
without prompting as index 0 by `oxlint --fix-suggestions`. Offering a *list* of the
component's variants was considered and rejected for v1: it would require the plugin to
parse each component's `cva()` map at load time — which now also means reading files the
rule is forbidden to read — and a suggestion is invisible on the CLI anyway, so the same
information would have to be duplicated into the message text, at which point the message
becomes unreadably long for a component with ten variants. Revisit once editor integration
is verified in Phase 5.

## Deltas from the current implementation

> **Migration scaffolding — delete in Phase 6.** This section, and any `currently missed`
> annotations in the case blocks above, exist only while the old linter does.

For migration reference. The current rule extracts JSX opening tags with a hand-rolled
scanner, brace-scans `className=` values, matches the tag name against a set of PascalCase
names derived one-per-`.tsx`-file from a `componentsDirectory` on disk, and additionally
reports raw color strings found in `style=` on the same elements.

| Case | Today | Under this contract |
| --- | --- | --- |
| `<Button className="bg-primary" />` | caught | caught |
| `<Button className={cn("bg-primary", extra)} />` | caught | caught |
| ``<Button className={`bg-${tone}`} />`` | caught (reported as the class `bg-`) | caught, under `dynamicColorOnComponent` |
| `<Button className="bg-primary text-destructive" />` | 2 reports | 2 reports |
| `<CardHeader className="bg-primary" />` | missed (only `Card` is discovered) | caught (a named import) |
| `<Card.Header className="bg-primary" />` | missed (tag name is `Card.Header`) | caught (root object is watched) |
| `<Button className="bg-[#ff0000]" />` | missed (no `-` in the value part) | caught |
| `<Button className="bg-[var(--color-primary)]" />` | missed | caught |
| `<Button className="bg-white" />` | missed unless `--color-white` is literally in `styles.css` | caught |
| `<Button className="border-t-primary" />` | missed (`t-primary` is not a token) | caught |
| ``<Button className={cn("p-2", `bg-${tone}`)} />`` | missed (a backtick argument is only scanned when it is the *first* thing in the expression) | caught |
| `<Button className={cn({ "bg-primary": on })} />` | caught (any quoted string in the expression) | caught |
| `import { Button as Btn }; <Btn className="bg-primary" />` | missed (name no longer matches a filename) | **caught** (binding, not spelling) |
| `const Button = styled.div; <Button className="bg-primary" />` | caught (name matches a filename) | **allowed** (never imported from a source) |
| `<Card className="bg-danger-weak" />` inside `src/components/ui/` | caught | caught — **no library exemption** |
| `import { Card } from "./card"; <Card className="bg-primary" />` | caught (name-based) | allowed (relative path matches no pattern) |
| `React.lazy(() => import("@/components/ui/card"))` | missed | blind spot |
| `<Button className="text-sm shadow-md border-2" />` | allowed | allowed (`ownedUtilities` is empty by default) |
| `<Button className="text-[14px]" />` | allowed | allowed |
| `<Button className="bg-[url('/hero.png')]" />` | allowed | allowed |
| `<Button style={{ color: "#f00" }} />` | caught here **and** by `no-style-color` | not caught here; `no-style-color` owns it |
| `cva()` variant map naming `bg-danger` | allowed | allowed |
| `const cls = "bg-primary"; <Button className={cls} />` | missed | blind spot |
| `*.stories.tsx` | skipped by a hard-coded `isStorybookFile` check | skipped by default, via the `ignoreGlobs` option |
| rule enabled with no options | silently watches nothing | **throws**, naming `componentSources` |

Three behavioural removals are worth calling out because they are not oversights:

- **The `style=` half is deleted.** `no-style-color.md` states that the two rules do not
  overlap and that this one owns the `className` channel only. Keeping the `style` scan
  would make `<Button style={{ color: "#f00" }} />` report three times under three rule
  ids for one mistake.
- **`componentsDirectory` is gone.** It was a filesystem convention baked into the rule,
  and a published package may neither read the filesystem nor assume a consumer's directory
  layout. `componentSources` replaces it with information already present in the linted
  file.
- **`isColorToken`'s empty-`colorPart` shortcut becomes an explicit message.** Today
  `` `bg-${tone}` `` reports the class as the literal string `bg-`, which reads as a typo.
  Under this contract it reports under `dynamicColorOnComponent` with `prefix: "bg"`.
