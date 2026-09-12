/**
 * no-undefined-token — a class under a colour-carrying prefix must generate CSS.
 *
 * The only rule that reports an *absence*: `text-warning-foreground` reads like a token, and
 * if `--color-warning-foreground` was never defined Tailwind discards it silently. Its bias
 * is false negatives, because the claim "this class does nothing" is one a reader cannot
 * check by eye, so a false positive asserts something false about working code. Hence the
 * silence on arbitrary values and on classes built by interpolation. Each word of a string
 * is judged on its own, and with no token stylesheets the linter refuses to start rather
 * than let this rule fall silent — a promise about failure, so it is not a case here.
 *
 * The harness runs this corpus against a sparse palette — `primary`, `foreground`,
 * `warning`, `input`, `success-content`, `success-muted` — so `danger-muted` is undefined
 * here while it is defined for other rules (`test/harness/options.js`).
 */
export default {
  rule: "no-undefined-token",
  cases: [

    // The rule's reason to exist: names that read like tokens and resolve to nothing.
    {
      kind: "caught",
      group: "Token names that were never defined",
      code: `<div className="text-warning-foreground" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Token names that were never defined",
      code: `<div className="bg-danger-muted" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Token names that were never defined",
      code: `<div className="text-secondary" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Token names that were never defined",
      code: `<div className="border-outline" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Token names that were never defined",
      code: `<div className="inset-ring-nonesuch" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },

    // The most dangerous shape: a real stem makes the whole class look real.
    {
      kind: "caught",
      group: "A defined stem with an undefined suffix",
      code: `<div className="text-warning-typo" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "A defined stem with an undefined suffix",
      code: `<div className="bg-primary-subtle" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 34 },
      ],
    },

    // A near-miss of a defined token names it: `bg-primry` → did you mean `bg-primary`?
    {
      kind: "caught",
      group: "Misspellings",
      code: `<div className="bg-primry" />`,
      reports: [
        { id: "undefinedColorTokenWithCandidate", line: 1, column: 17, endLine: 1, endColumn: 26 },
      ],
    },
    {
      kind: "caught",
      group: "Misspellings",
      code: `<div className="text-forground" />`,
      reports: [
        { id: "undefinedColorTokenWithCandidate", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },

    // Variants, `!` and `/opacity` are stripped before resolving: they change when a
    // declaration applies, never whether one exists, so none of them hides a typo. The span
    // still covers them — they are part of the class the author edits.
    {
      kind: "caught",
      group: "Under variants, important and opacity modifiers",
      code: `<div className="hover:text-secondary" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "Under variants, important and opacity modifiers",
      code: `<div className="md:dark:bg-danger-muted" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Under variants, important and opacity modifiers",
      code: `<div className="!bg-danger-muted" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Under variants, important and opacity modifiers",
      code: `<div className="bg-danger-muted!" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Under variants, important and opacity modifiers",
      code: `<div className="bg-danger-muted/50" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },

    // The rule reads every string literal and the static text of every template, wherever
    // it sits. `ok: "bg-success-muted"` is the control in the object map: same shape as
    // `danger-muted`, but defined, so only the stylesheet tells them apart. `<Chart
    // palette=…>` is the accepted cost of reading every string — it may never reach a
    // `className` — and is what keeps `.ts` constants files covered.
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={cn("text-secondary", className)} />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 21, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const alert = cva("p-2", {
  variants: { tone: { warn: "bg-warning-subtle", bad: "bg-danger-muted" } },
});`,
      reports: [
        { id: "undefinedColorToken", line: 2, column: 30, endLine: 2, endColumn: 47 },
        { id: "undefinedColorToken", line: 2, column: 56, endLine: 2, endColumn: 71 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const badgeColor = { danger: "bg-danger-muted", ok: "bg-success-muted" };`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 31, endLine: 1, endColumn: 46 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={\`text-secondary \${extra}\`} />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 18, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const tone = "text-secondary";`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 15, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<Chart palette="text-secondary" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={\`text-secondary\`} />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 18, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={twMerge("p-2", "text-secondary")} />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 33, endLine: 1, endColumn: 47 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={tv({ base: "text-secondary" })} />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 29, endLine: 1, endColumn: 43 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const joined = ["text-secondary", "p-2"].join(" ");`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 18, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const spreadProps = { className: "text-secondary" };
<div {...spreadProps} />;`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 35, endLine: 1, endColumn: 49 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div
  className="text-secondary"
/>`,
      reports: [
        { id: "undefinedColorToken", line: 2, column: 14, endLine: 2, endColumn: 28 },
      ],
    },

    // One report per offending class, each at its own span.
    {
      kind: "caught",
      group: "Every offending class reports separately",
      code: `<div className="text-secondary bg-danger-muted" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 31 },
        { id: "undefinedColorToken", line: 1, column: 32, endLine: 1, endColumn: 47 },
      ],
    },

    // Defined tokens resolve, so there is nothing to say.
    {
      kind: "allowed",
      group: "Tokens that resolve",
      code: `<div className="text-warning bg-primary border-input" />`,
    },
    {
      kind: "allowed",
      group: "Tokens that resolve",
      code: `<div className="text-success-content" />`,
    },

    // Palette classes resolve. Wanting them gone is no-spectral-color's job; the two rules
    // partition colour classes, and one class must never be both "does not exist" and
    // "exists and is forbidden".
    {
      kind: "allowed",
      group: "Palette classes",
      code: `<div className="bg-red-500 text-slate-50" />`,
    },

    // The gate is "generates CSS", not "is a colour": `bg-cover` and `text-sm` are real.
    {
      kind: "allowed",
      group: "Non-colour utilities that resolve",
      code: `<div className="bg-cover bg-no-repeat" />`,
    },
    {
      kind: "allowed",
      group: "Non-colour utilities that resolve",
      code: `<div className="text-sm text-center" />`,
    },
    {
      kind: "allowed",
      group: "Non-colour utilities that resolve",
      code: `<div className="border-2 ring-2 shadow-lg" />`,
    },

    // Out of scope. Reporting every unresolved class in a project is a different rule.
    {
      kind: "allowed",
      group: "Classes with no colour-carrying prefix",
      code: `<div className="rounded-warning" />`,
    },
    {
      kind: "allowed",
      group: "Classes with no colour-carrying prefix",
      code: `<div className="gap-4 flex" />`,
    },

    // Brackets are skipped: `bg-[--color-brand]` becomes `var(--color-brand)` whether or not
    // the property exists, which no static check can tell. Raw literals in brackets are
    // no-raw-color's.
    {
      kind: "allowed",
      group: "Arbitrary values",
      code: `<div className="bg-[#ff0000]" />`,
    },
    {
      kind: "allowed",
      group: "Arbitrary values",
      code: `<div className="bg-[--color-brand]" />`,
    },
    {
      kind: "allowed",
      group: "Arbitrary values",
      code: `<div className="text-[var(--color-brand)]" />`,
    },

    // A path is one token starting with `/`, so no prefix matches it.
    {
      kind: "allowed",
      group: "Strings that cannot be a class",
      code: `<img src="/bg-hero.png" />`,
    },
    {
      kind: "allowed",
      group: "Strings that cannot be a class",
      code: `fetch("/api/border-radius");`,
    },

    // Each word is judged on its own. Checking a string only when every word is a Tailwind
    // class kept prose out, but switched the rule off beside `group`, `peer` or a project's
    // own `card` — most class strings. The cost is prose: `"text-heavy layouts"` reports,
    // rarely, and `oxlint-disable-next-line` is the answer.
    {
      kind: "caught",
      group: "Each word judged on its own",
      code: `<div className="group flex text-secondry" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 28, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "Each word judged on its own",
      code: `<div className="card bg-nonesuch" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 22, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Each word judged on its own",
      code: `const copy = "text-heavy layouts";`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 15, endLine: 1, endColumn: 25 },
      ],
    },

    // A class with an interpolation in it is not checked — the rule cannot know what it
    // becomes. Every rule draws this line in the same place. Complete classes beside the
    // hole still are.
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`text-\${tone}\`} />`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`bg-\${tone}-muted\`} />`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={"bg-" + tone + "-muted"} />`,
    },
    {
      kind: "caught",
      group: "A complete class beside an interpolation",
      code: `<div className={\`text-primry \${extra}\`} />`,
      reports: [
        { id: "undefinedColorTokenWithCandidate", line: 1, column: 18, endLine: 1, endColumn: 29 },
      ],
    },

    // The string is caught where it is written; the place it is used has no class in it.
    {
      kind: "blindspot",
      group: "Use sites with no literal of their own",
      code: `<div className={TONES[kind]} />;`,
    },
    {
      kind: "blindspot",
      group: "Use sites with no literal of their own",
      code: `<div className={tone} />;`,
    },

    // An unknown variant is stripped like any other, and variant typos are a separate
    // concern — so `hovr:bg-primary` passes. A token typo under one is still reported.
    {
      kind: "blindspot",
      group: "Undefined variants",
      code: `<div className="hovr:bg-primary" />`,
    },
    {
      kind: "blindspot",
      group: "Undefined variants",
      code: `<div className="darkk:bg-primary" />`,
    },
    {
      kind: "caught",
      group: "A token typo under an unknown variant",
      code: `<div className="hovr:bg-nonesuch" />`,
      reports: [
        { id: "undefinedColorToken", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },

    // Not yet linted: the CSS surface. `@apply` resolves through the same design system, so
    // the verdict is already decided; only the surface is missing. Recorded, never run.
    {
      kind: "deferred",
      lang: "css",
      group: "`@apply` class lists",
      code: `.alert {
  @apply bg-danger-muted;
}`,
    },
  ],
};
