/**
 * no-dark-variant — theming happens in the token stylesheets, and nowhere else.
 *
 * The rule reports a `dark:` or `not-dark:` variant segment, and any `light-dark()` call, in
 * any string of a `.js`, `.jsx`, `.ts` or `.tsx` file — a class, a `style` value, CSS written
 * as a string, even prose. `dark` is matched as a variant segment (split on `:` outside
 * brackets), never as a substring. It takes the widest reading: `dark:` on a non-colour
 * utility is still a theme fork. The same offences in a `.css` file are deferred until CSS is
 * linted; those cases are recorded at the end and never run.
 */
export default {
  rule: "no-dark-variant",
  cases: [

    // Every string in the file is read, so text that merely mentions the syntax reports too.
    // It is rare, and `oxlint-disable-next-line` is the answer where it happens.
    {
      kind: "caught",
      group: "Any string, prose included",
      code: `<button aria-label="Mode dark:on" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 26, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Any string, prose included",
      code: `const hint = "Use light-dark() for this";`,
      reports: [
        { id: "lightDarkFunction", line: 1, column: 19, endLine: 1, endColumn: 31 },
      ],
    },

    // As the only variant
    {
      kind: "caught",
      group: "As the only variant",
      code: `<div className="dark:bg-primary" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "As the only variant",
      code: `<div className="dark:text-foreground" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "As the only variant",
      code: `<div className="dark:border-slate-700" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },

    // Position in a stacked chain is irrelevant, and so is what else is in it: segmentation,
    // not a regex, finds `dark`. `not-dark:` is the same fork seen from the other side.
    {
      kind: "caught",
      group: "Anywhere in a stacked variant chain",
      code: `<div className="md:dark:text-muted" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Anywhere in a stacked variant chain",
      code: `<div className="dark:hover:bg-card" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Anywhere in a stacked variant chain",
      code: `<div className="hover:dark:bg-card" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Anywhere in a stacked variant chain",
      code: `<div className="group-hover:dark:text-foreground" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 49 },
      ],
    },
    {
      kind: "caught",
      group: "Anywhere in a stacked variant chain",
      code: `<div className="lg:dark:focus-visible:ring-primary" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 51 },
      ],
    },
    {
      kind: "caught",
      group: "Anywhere in a stacked variant chain",
      code: `<div className="dark:[&>svg]:text-muted" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Anywhere in a stacked variant chain",
      code: `<div className="not-dark:bg-card" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Anywhere in a stacked variant chain",
      code: `<div className="group-hover/nav:dark:text-foreground" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 53 },
      ],
    },

    // Taken deliberately. `dark:` is a theme branch whatever it modifies, and exempting layout
    // utilities would make the boundary a per-utility judgement. The known cost is the
    // light/dark logo swap (`dark:hidden` beside `hidden dark:block`), answered with
    // `oxlint-disable` or a `<ThemedImage>`. These report under `darkVariantNonColor`, since no
    // token replaces them. Two forks in one string are two reports.
    {
      kind: "caught",
      group: "On non-colour utilities",
      code: `<div className="dark:hidden" />`,
      reports: [
        { id: "darkVariantNonColor", line: 1, column: 17, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "On non-colour utilities",
      code: `<img className="dark:block hidden" src="/logo-dark.svg" />`,
      reports: [
        { id: "darkVariantNonColor", line: 1, column: 17, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "On non-colour utilities",
      code: `<div className="dark:border-0 dark:shadow-none" />`,
      reports: [
        { id: "darkVariantNonColor", line: 1, column: 17, endLine: 1, endColumn: 30 },
        { id: "darkVariantNonColor", line: 1, column: 31, endLine: 1, endColumn: 47 },
      ],
    },

    // The important modifier in either position, and every wrapper a class string travels in:
    // `cn`, `clsx`, `cva`, `tv`, `twMerge`, object constants, arrays, spread props. Each is one
    // string literal to the rule, which never needs to understand the wrapper.
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `<div className="dark:!bg-primary" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `<div className="dark:bg-primary!" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `<div className={cn("dark:text-muted", extra)} />`,
      reports: [
        { id: "darkVariant", line: 1, column: 21, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `<div className={clsx(isCompact && "dark:bg-card")} />`,
      reports: [
        { id: "darkVariant", line: 1, column: 36, endLine: 1, endColumn: 48 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `const panel = cva("rounded", {
  variants: { tone: { a: "dark:bg-card", b: "dark:bg-popover" } },
});`,
      reports: [
        { id: "darkVariant", line: 2, column: 27, endLine: 2, endColumn: 39 },
        { id: "darkVariant", line: 2, column: 46, endLine: 2, endColumn: 61 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `const themeClass = { night: "dark:bg-black", day: "bg-white" };`,
      reports: [
        { id: "darkVariant", line: 1, column: 30, endLine: 1, endColumn: 43 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `<div className={\`dark:bg-card\`} />`,
      reports: [
        { id: "darkVariant", line: 1, column: 18, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `<div className={twMerge("p-2", "dark:bg-card")} />`,
      reports: [
        { id: "darkVariant", line: 1, column: 33, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `<div className={tv({ base: "dark:bg-card" })} />`,
      reports: [
        { id: "darkVariant", line: 1, column: 29, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `const joined = ["dark:bg-card", "p-2"].join(" ");`,
      reports: [
        { id: "darkVariant", line: 1, column: 18, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `const spreadProps = { className: "dark:bg-card" };
<div {...spreadProps} />;`,
      reports: [
        { id: "darkVariant", line: 1, column: 35, endLine: 1, endColumn: 47 },
      ],
    },
    {
      kind: "caught",
      group: "With important, and in every authoring position",
      code: `<div
  className="dark:bg-card"
/>`,
      reports: [
        { id: "darkVariant", line: 2, column: 14, endLine: 2, endColumn: 26 },
      ],
    },

    // A template literal's complete classes are checked like any other string's; only the
    // class an interpolation runs into is left alone (see the blind spot below).
    {
      kind: "caught",
      group: "A complete class beside an interpolation",
      code: `<div className={\`dark:bg-card \${extra}\`} />`,
      reports: [
        { id: "darkVariant", line: 1, column: 18, endLine: 1, endColumn: 30 },
      ],
    },

    // Banned outright, tokens on both sides or not: a `--color-*` token already resolves per
    // theme, so `light-dark()` does the job a second time where the token file cannot see it.
    // In a class, a `style` value or CSS written as a string alike. `no-raw-color` separately
    // judges the arguments, so a literal pair reports under both rules.
    {
      kind: "caught",
      group: "`light-dark()` in a class, a style value, or CSS in a string",
      code: `<div className="bg-[light-dark(var(--color-fg),var(--color-fg-dark))]" />`,
      reports: [
        { id: "lightDarkFunction", line: 1, column: 17, endLine: 1, endColumn: 70 },
      ],
    },
    {
      kind: "caught",
      group: "`light-dark()` in a class, a style value, or CSS in a string",
      code: `<div className="text-[light-dark(#000,#fff)]" />`,
      reports: [
        { id: "lightDarkFunction", line: 1, column: 17, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "`light-dark()` in a class, a style value, or CSS in a string",
      code: `<div style={{ color: "light-dark(#000, #fff)" }} />`,
      reports: [
        { id: "lightDarkFunction", line: 1, column: 23, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "`light-dark()` in a class, a style value, or CSS in a string",
      code: `const panel = css\`color: light-dark(#000, #fff);\`;`,
      reports: [
        { id: "lightDarkFunction", line: 1, column: 26, endLine: 1, endColumn: 42 },
      ],
    },

    // One report per offending class, not per string.
    {
      kind: "caught",
      group: "Every offending class reports separately",
      code: `<div className="dark:bg-primary dark:text-muted" />`,
      reports: [
        { id: "darkVariant", line: 1, column: 17, endLine: 1, endColumn: 32 },
        { id: "darkVariant", line: 1, column: 33, endLine: 1, endColumn: 48 },
      ],
    },

    // Allowed: `dark` inside a utility body is a token name, never a variant segment — a token
    // may legitimately be named for a dark surface.
    {
      kind: "allowed",
      group: "`dark` as a token segment, not a variant",
      code: `<div className="bg-dark-muted" />`,
    },
    {
      kind: "allowed",
      group: "`dark` as a token segment, not a variant",
      code: `<div className="text-darkness" />`,
    },
    {
      kind: "allowed",
      group: "`dark` as a token segment, not a variant",
      code: `<div className="border-dark" />`,
    },

    // Allowed: `dark` on its own is how the theme gets applied. Something has to set it, and
    // banning it would ban the design system's own switch.
    {
      kind: "allowed",
      group: "The theme root class itself",
      code: `<html className="dark" />`,
    },
    {
      kind: "allowed",
      group: "The theme root class itself",
      code: `<div className={theme === "dark" ? "dark" : ""} />`,
    },

    // Allowed: theme state as data, and an arbitrary variant keyed on it, are not `dark:`.
    {
      kind: "allowed",
      group: "Theme state expressed as data, not as a variant",
      code: `<html data-theme="dark" />`,
    },
    {
      kind: "allowed",
      group: "Theme state expressed as data, not as a variant",
      code: `<div className="[data-theme=dark]:sr-only" />`,
    },

    // Allowed: semantic tokens — the fix the rule points to.
    {
      kind: "allowed",
      group: "Semantic tokens, which are the fix",
      code: `<div className="bg-card text-card-foreground border-border" />`,
    },

    // Blind spot: a class with an interpolation in it is not checked, because the rule can't
    // know what it becomes. Every rule in the package draws this line in the same place.
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`dark:\${utility}\`} />`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`\${theme}:bg-card\`} />`,
    },

    // Blind spot: `+` is not a template literal. The bare `"dark:"` the rule would see is a
    // fragment with no class attached, and reporting it would report a fragment, not a defect.
    {
      kind: "blindspot",
      group: "Concatenated classes",
      code: `<div className={"dark:" + utility} />`,
    },

    // Blind spot: the string is caught where it is written, not where it is used.
    {
      kind: "blindspot",
      group: "Use sites with no literal of their own",
      code: `<div className={THEME_CLASSES[mode]} />;`,
    },
    {
      kind: "blindspot",
      group: "Use sites with no literal of their own",
      code: `<div className={themeClass} />;`,
    },

    // Blind spot: the same fork written as control flow. A real problem and a different one —
    // this rule matches a variant token, not a ternary on the theme.
    {
      kind: "blindspot",
      group: "Theme branching in JavaScript",
      code: `<div className={isDark ? "bg-black" : "bg-white"} />;`,
    },
    {
      kind: "blindspot",
      group: "Theme branching in JavaScript",
      code: `const bg = useTheme() === "dark" ? "bg-card" : "bg-popover";`,
    },

    // Blind spot, by decision: these are class strings the rule reads, and it declines to model
    // arbitrary variants. Not the same as the deferred `.dark &` selector in a `.css` file.
    {
      kind: "blindspot",
      group: "The variant reconstructed from an arbitrary selector",
      code: `<div className="[.dark_&]:bg-card" />`,
    },
    {
      kind: "blindspot",
      group: "The variant reconstructed from an arbitrary selector",
      code: `<div className="[@media(prefers-color-scheme:dark)]:bg-card" />`,
    },

    // Deferred: the CSS surface. The linter reads JS and TS only, so these are unenforced and
    // recorded so that adding CSS is an implementation task, not a fresh design argument.
    // The promise is asymmetric: `.dark &`, `prefers-color-scheme` and `light-dark()` report in
    // a component stylesheet and stay silent inside the token stylesheets, where they are how
    // the theme is defined.
    {
      kind: "deferred",
      lang: "css",
      group: "`@apply` class lists",
      code: `.panel {
  @apply dark:bg-card;
}`,
    },
    {
      kind: "deferred",
      lang: "css",
      group: "`light-dark()` in a declaration value",
      code: `.panel {
  color: light-dark(#000, #fff);
}

.card {
  background: light-dark(var(--color-fg), var(--color-fg-dark));
}`,
    },
    {
      kind: "deferred",
      lang: "css",
      group: "`.dark &` selectors and `prefers-color-scheme` blocks",
      code: `.panel {
  background: var(--color-white);
}

.dark .panel {
  background: var(--color-slate-900);
}

@media (prefers-color-scheme: dark) {
  .panel {
    background: var(--color-slate-900);
  }
}`,
    },
    {
      kind: "deferred",
      lang: "css",
      group: "`light-dark()` inside the token-definition files",
      code: `@theme {
  --color-fg: light-dark(oklch(0.2 0 0), oklch(0.98 0 0));
}`,
    },
  ],
};
