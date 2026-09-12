/**
 * token-constraints — a declared semantic token used where its policy forbids it.
 *
 * The policy is `allowed` / `denied` lists keyed by colour prefix (`text`, `bg`, `border`, …)
 * or by variant family (`hover:`, `focus:` — any key ending in `:`). A prefix is governed by
 * the first key *present* in `allowed[key] → denied[key] → denied["*"]`, never by whether the
 * list is empty: `allowed: { text: [] }` bans every `text-` token, `denied: { bg: [] }` opts
 * `bg-` out of the fallback. An allow list shields its prefix from `denied["*"]`, which is
 * what lets `-foreground` tokens be banned off surfaces yet allowed on `text-`. Every side of
 * a border (`border-t`, `border-x`, `border-be`, …) borrows the `border` key unless it has one
 * of its own. Variant families are additive to the prefix policy and to each other. A key in
 * both lists, or `"*"` in `allowed`, is a configuration error rather than a precedence rule.
 *
 * Only classes whose colour part is a declared token are judged; the rest belong to other
 * rules. The baseline fixture is illustrative and deliberately smaller than the recommended
 * policy, and the fixture theme declares the tokens the cases name.
 */

/**
 * Each fixture is the whole configuration, as a consumer's options are — naming only
 * `denied` leaves every prefix without an allow list; the recommended policy never leaks in.
 */
const options = {
  // What every case runs under unless it names another.
  baseline: { allowed: {"text":["*foreground*","primary","link*"],"border":["border*","input","ring"],"hover:":["*-hover"]}, denied: {"*":["*-foreground"]} },
  // A prefix's own deny list replaces the `"*"` fallback rather than adding to it.
  "deny-text-warning": { denied: {"*":["*-foreground"],"text":["warning"]} },
  // `*` matches every colour part: in `denied` it bans every token.
  "deny-all": { denied: {"*":["*"]} },
  // A present but empty allow list is a total ban for its prefix.
  "empty-text-allow": { allowed: {"text":[]} },
  // The baseline plus a `focus:` family — the mechanism is not special to `hover:`.
  "focus-policy": { allowed: {"text":["*foreground*","primary","link*"],"border":["border*","input","ring"],"hover:":["*-hover"],"focus:":["*-focus"]}, denied: {"*":["*-foreground"]} },
  // An empty deny list opts `bg-` out of the fallback.
  "bg-opt-out": { denied: {"*":["*-foreground"],"bg":[]} },
  // One side of a border with a list of its own; the other sides keep `border`'s.
  "border-top-own-list": { allowed: {"border":["border*"],"border-t":["primary"]} },
  // `"*"` in an allow list permits every declared token for its prefix.
  "allow-all-text": { allowed: {"text":["*"]} },
};

export default {
  rule: "token-constraints",
  cases: [

    // The prefix has an allow list and the colour part matches no pattern in it. Every side of
    // a border is held to the `border` list.
    {
      kind: "caught",
      group: "Prefix allow-list failures",
      code: `<div className="text-muted" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix allow-list failures",
      code: `<div className="text-warning" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix allow-list failures",
      code: `<div className="text-border" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix allow-list failures",
      code: `<div className="border-primary" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix allow-list failures",
      code: `<div className="border-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix allow-list failures",
      code: `<div className="border-t-primary" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix allow-list failures",
      code: `<div className="border-x-primary" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix allow-list failures",
      code: `<div className="border-s-primary" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix allow-list failures",
      code: `<div className="border-be-muted" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 32 },
      ],
    },

    // The prefix has no allow list and the colour part matches a deny pattern — its own list,
    // or the `"*"` fallback when it has none.
    {
      kind: "caught",
      group: "Prefix deny-list matches",
      code: `<div className="bg-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix deny-list matches",
      code: `<div className="bg-warning-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix deny-list matches",
      code: `<div className="fill-primary-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix deny-list matches",
      code: `<div className="shadow-warning-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix deny-list matches",
      code: `<div className="from-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix deny-list matches",
      code: `<div className="text-warning" />`,
      options: options["deny-text-warning"],
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix deny-list matches",
      code: `<div className="bg-primary" />`,
      options: options["deny-all"],
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Prefix deny-list matches",
      code: `<div className="text-muted" />`,
      options: options["deny-all"],
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "An empty allow list bans its prefix",
      code: `<div className="text-primary" />`,
      options: options["empty-text-allow"],
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "An empty allow list bans its prefix",
      code: `<div className="text-foreground" />`,
      options: options["empty-text-allow"],
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 32 },
      ],
    },

    // The class carries a segment of a family with a policy, and the colour part fails it.
    // Families survive stacking, ordering, `!` and opacity, and a `hover:` key reaches `hover`,
    // `group-hover`, `peer-hover` and named groups alike — which element is hovered does not
    // change which token a hover colour may name.
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="hover:bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="hover:bg-muted" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="hover:text-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="hover:fill-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="md:hover:bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="hover:focus:bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="dark:md:hover:bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="hover:!bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="hover:bg-primary/80" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="data-[state=open]:hover:bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 51 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="group-hover:bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="peer-hover:bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="group-hover/nav:bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 43 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="peer-hover/input:text-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 49 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="md:group-hover:bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="group-hover:hover:bg-primary" />`,
      options: options.baseline,
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="focus:bg-primary" />`,
      options: options["focus-policy"],
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="focus:hover:bg-primary" />`,
      options: options["focus-policy"],
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="group-focus:bg-primary" />`,
      options: options["focus-policy"],
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Variant policy failures",
      code: `<div className="peer-focus:bg-primary" />`,
      options: options["focus-policy"],
      reports: [
        { id: "variantNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },

    // Every utility that takes a colour, including every side of a border. The prefix set is
    // asked of Tailwind, not listed by hand.
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="border-t-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="border-x-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="border-s-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="divide-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="placeholder-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="ring-offset-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="decoration-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 44 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="outline-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="caret-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="accent-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="stroke-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="via-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="to-muted-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },

    // Every string literal and the static text of every template literal is read, wherever it
    // sits — `cn()`, `cva()` (base, variants and compoundVariants), object maps in `.ts`
    // constants, bare constants. The rule needs no element to judge a class.
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `<div className='text-muted' />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `<div className={\`text-muted\`} />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 18, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `<div className={\`text-muted \${extra}\`} />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 18, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `<div className={cn("text-muted", extra)} />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 21, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `<div className={clsx(active && "text-muted")} />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 33, endLine: 1, endColumn: 43 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `<div className={twMerge("px-2", "text-muted")} />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 34, endLine: 1, endColumn: 44 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `<Badge className="text-muted" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 19, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `<div
  className="text-muted"
/>`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 2, column: 14, endLine: 2, endColumn: 24 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `<div className={cn(
  "text-muted",
)} />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 2, column: 4, endLine: 2, endColumn: 14 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `const badge = cva("text-muted", {
  variants: { tone: { warn: "text-warning" } },
  compoundVariants: [{ tone: "warn", class: "border-primary" }],
});`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 20, endLine: 1, endColumn: 30 },
        { id: "prefixNotAllowed", line: 2, column: 30, endLine: 2, endColumn: 42 },
        { id: "prefixNotAllowed", line: 3, column: 46, endLine: 3, endColumn: 60 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `const toneClass = {
  warn: "text-warning",
  bad: "bg-muted-foreground",
};`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 2, column: 10, endLine: 2, endColumn: 22 },
        { id: "prefixDenied", line: 3, column: 9, endLine: 3, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `const cls = "text-muted";`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 14, endLine: 1, endColumn: 24 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `const CLASSES = ["text-muted", "p-2"];`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 19, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `export const dangerText = "bg-muted-foreground";`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 28, endLine: 1, endColumn: 47 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `<div className={tv({ base: "text-muted" })} />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 29, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `const joined = ["text-muted", "p-2"].join(" ");`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 18, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic surface",
      code: `const spreadProps = { className: "text-muted" };
<div {...spreadProps} />;`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 35, endLine: 1, endColumn: 45 },
      ],
    },

    // One report per class per occurrence. A class failing both its prefix and a variant
    // policy reports once, for the first failure in resolution order — prefix first.
    {
      kind: "caught",
      group: "One report per class per occurrence",
      code: `<div className="text-muted bg-warning-foreground" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 27 },
        { id: "prefixDenied", line: 1, column: 28, endLine: 1, endColumn: 49 },
      ],
    },
    {
      kind: "caught",
      group: "One report per class per occurrence",
      code: `<div className="text-muted text-muted" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 27 },
        { id: "prefixNotAllowed", line: 1, column: 28, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "One report per class per occurrence",
      code: `<div className="hover:text-muted" />`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },

    // Tokens the baseline allows on their prefix.
    {
      kind: "allowed",
      group: "Tokens their policy permits",
      code: `<div className="text-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Tokens their policy permits",
      code: `<div className="text-foreground" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Tokens their policy permits",
      code: `<div className="text-muted-foreground" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Tokens their policy permits",
      code: `<div className="text-primary-foreground" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Tokens their policy permits",
      code: `<div className="text-link" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Tokens their policy permits",
      code: `<div className="text-link-hover" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Tokens their policy permits",
      code: `<div className="border-border" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Tokens their policy permits",
      code: `<div className="border-input" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Tokens their policy permits",
      code: `<div className="border-ring" />`,
      options: options.baseline,
    },

    // `bg-` and `fill-` have no allow list, so only the `"*"` deny list applies. An empty deny
    // list opts a prefix out of even that, and a side with its own key answers to it alone —
    // `border-t` is allowed `primary` while `border-b` and `border` still are not.
    {
      kind: "allowed",
      group: "Prefixes with no policy",
      code: `<div className="bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Prefixes with no policy",
      code: `<div className="bg-muted" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Prefixes with no policy",
      code: `<div className="bg-danger" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Prefixes with no policy",
      code: `<div className="fill-muted" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Prefixes with no policy",
      code: `<div className="stroke-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Prefixes with no policy",
      code: `<div className="bg-muted-foreground" />`,
      options: options["bg-opt-out"],
    },
    {
      kind: "allowed",
      group: "A side of a border with its own key",
      code: `<div className="border-t-primary" />`,
      options: options["border-top-own-list"],
    },
    {
      kind: "caught",
      group: "A side of a border with its own key",
      code: `<div className="border-b-primary" />`,
      options: options["border-top-own-list"],
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "A side of a border with its own key",
      code: `<div className="border-primary" />`,
      options: options["border-top-own-list"],
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },

    // A prefix with an allow list is governed by that list alone: `text-*-foreground` matches
    // `*foreground*` although `*-foreground` is in the fallback deny list. Without the shield,
    // the most common correct usage would be reported.
    {
      kind: "allowed",
      group: "The allow-list shield",
      code: `<div className="text-warning-foreground" />`,
      options: options.baseline,
    },

    // An allow list of `"*"` permits every token for its prefix — `text-muted` and
    // `text-warning`, which the baseline's text list rejects, pass.
    {
      kind: "allowed",
      group: "An allow list of \"*\"",
      code: `<div className="text-muted" />`,
      options: options["allow-all-text"],
    },
    {
      kind: "allowed",
      group: "An allow list of \"*\"",
      code: `<div className="text-warning" />`,
      options: options["allow-all-text"],
    },

    // A `*-hover` token under a hover-family segment, and any variant with no key of its own —
    // `focus:` has no policy under the baseline.
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="hover:bg-primary-hover" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="hover:text-link-hover" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="md:hover:bg-primary-hover" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="hover:bg-primary-hover/80" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="group-hover:bg-primary-hover" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="peer-hover:text-link-hover" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="group-hover/nav:bg-primary-hover" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="focus:bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="active:bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="disabled:bg-muted" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="dark:bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="md:bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="aria-expanded:bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="data-[state=open]:bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Variants that satisfy their policy, or have none",
      code: `<div className="[&>*]:bg-primary" />`,
      options: options.baseline,
    },

    // Outside the `hover` family by decision: `not-hover:` is the inverse, where a `*-hover`
    // token reads backwards; `[@media(hover:hover)]:` is a device capability, not a state; and
    // `focus-visible:` names a different state — membership is a suffix test, `-hover`. A
    // designer who wants one constrained names it as its own key.
    {
      kind: "allowed",
      group: "Segments outside the family",
      code: `<div className="not-hover:bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Segments outside the family",
      code: `<div className="focus-visible:bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Segments outside the family",
      code: `<div className="[@media(hover:hover)]:bg-primary" />`,
      options: options.baseline,
    },

    // Not a declared token, so not this rule's: palette classes, raw values and arbitrary
    // colours belong to no-spectral-color and no-raw-color.
    {
      kind: "allowed",
      group: "Classes whose colour part is not a semantic token",
      code: `<div className="bg-red-500" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Classes whose colour part is not a semantic token",
      code: `<div className="hover:bg-red-500" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Classes whose colour part is not a semantic token",
      code: `<div className="text-white" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Classes whose colour part is not a semantic token",
      code: `<div className="bg-[#ff0000]" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Classes whose colour part is not a semantic token",
      code: `<div className="text-[var(--color-primary)]" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Classes whose colour part is not a semantic token",
      code: `<div className="text-[color:var(--brand)]" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Classes whose colour part is not a semantic token",
      code: `<div className="bg-[--color-brand]" />`,
      options: options.baseline,
    },

    // A class with an interpolation in it is never judged, by this rule or any other; complete
    // classes in the same template are. Choosing between complete class names keeps the
    // choice visible, so the lookup below is read like any other string.
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`text-\${tone}\`} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`bg-\${tone}-500\`} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`hover:bg-\${tone}\`} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`px-2 text-\${tone}\`} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`text-\${"mu"}\${"ted"}\`} />`,
      options: options.baseline,
    },
    {
      kind: "caught",
      group: "Classes built by interpolation",
      code: `<div className={\`bg-muted-foreground \${extra}\`} />`,
      options: options.baseline,
      reports: [
        { id: "prefixDenied", line: 1, column: 18, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "allowed",
      group: "Classes built by interpolation",
      code: `const TONE_CLASSES = { danger: "bg-danger", ok: "bg-primary" };`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Classes built by interpolation",
      code: `<div className={TONE_CLASSES[tone]} />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Classes built by interpolation",
      code: `<div className={\`p-\${size}\`} />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Classes built by interpolation",
      code: `<div className={\`gap-\${n} rounded-md\`} />`,
      options: options.baseline,
    },

    // `cover`, `2`, `sm` and `0%` parse as a colour part but are not declared tokens.
    {
      kind: "allowed",
      group: "Not colour utilities at all",
      code: `<div className="rounded-md" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Not colour utilities at all",
      code: `<div className="flex items-center p-4" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Not colour utilities at all",
      code: `<div className="bg-cover bg-center" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Not colour utilities at all",
      code: `<div className="border-2 border-solid" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Not colour utilities at all",
      code: `<div className="text-sm font-medium" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Not colour utilities at all",
      code: `<div className="from-0% to-100%" />`,
      options: options.baseline,
    },

    // A match needs a colour prefix *and* a declared token, which prose and import paths do not
    // supply by accident.
    {
      kind: "allowed",
      group: "Strings that are not class names",
      code: `import { Badge } from "./components/text-primary";`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Strings that are not class names",
      code: `const label = "Muted text";`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Strings that are not class names",
      code: `const url = "https://example.com/border-primary";`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Strings that are not class names",
      code: `<Badge tone="muted" />`,
      options: options.baseline,
    },

    // A class assembled from parts — an interpolated prefix or variant, or `+` concatenation —
    // does not exist as a literal, so there is no colour part to test.
    {
      kind: "blindspot",
      group: "Composed class names with no visible prefix",
      code: `<div className={\`\${prefix}-muted-foreground\`} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Composed class names with no visible prefix",
      code: `<div className={\`\${tone}:bg-primary-hover\`} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Composed class names with no visible prefix",
      code: `<div className={"text-" + tone} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Composed class names with no visible prefix",
      code: `<div className={"bg-" + tone + "-500"} />`,
      options: options.baseline,
    },

    // Resolving these takes dataflow analysis the rule does not attempt. An object map whose
    // values are literals is caught; a class arriving from outside the file's literals is not.
    {
      kind: "blindspot",
      group: "Indirection through values",
      code: `<div className={styles.mutedLabel} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Indirection through values",
      code: `<div className={props.className} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Indirection through values",
      code: `<div className={tokens[key]} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Indirection through values",
      code: `<div {...rest} />`,
      options: options.baseline,
    },

    // `[&:hover]:` is a hover in effect, but no bracketed segment joins a family — recognising it
    // would mean parsing selectors. Unlike `[@media(hover:hover)]:`, this one is missed rather
    // than excluded. The prefix policy still applies.
    {
      kind: "blindspot",
      group: "Arbitrary variants that express a constrained state",
      code: `<div className="[&:hover]:bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Arbitrary variants that express a constrained state",
      code: `<div className="[&:focus-within]:bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Arbitrary variants that express a constrained state",
      code: `<div className="[&:hover]:bg-muted" />`,
      options: options.baseline,
    },

    // A class inside an HTML fragment is not a class-list string, so it is never split out.
    // Imperative `classList.add("…")` takes an ordinary string literal and is caught.
    {
      kind: "blindspot",
      group: "Classes inside HTML strings",
      code: `<div dangerouslySetInnerHTML={{ __html: '<p class="text-muted"></p>' }} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Classes inside HTML strings",
      code: `const row = '<td class="bg-muted-foreground"></td>';`,
      options: options.baseline,
    },
    {
      kind: "caught",
      group: "Imperative class manipulation",
      code: `element.classList.add("text-muted");`,
      options: options.baseline,
      reports: [
        { id: "prefixNotAllowed", line: 1, column: 24, endLine: 1, endColumn: 34 },
      ],
    },

    // Not yet linted: the CSS surface. When it lands, `@apply` is judged by the same policy —
    // one resolution order, one set of families — and the token stylesheets are exempt.
    // Recorded, never run.
    {
      kind: "deferred",
      lang: "css",
      group: "@apply in CSS",
      code: `/* Illustrative — not executed, not enforced today. */
.card-label {
  @apply text-muted;        /* will be reported: text allow-list failure */
}

.card-surface {
  @apply bg-muted-foreground; /* will be reported: deny-list match */
}`,
    },
  ],
};
