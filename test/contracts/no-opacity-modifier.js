/**
 * no-opacity-modifier — a colour class must not carry an opacity modifier.
 *
 * `bg-primary/50` is a colour no designer chose: derived at the call site, uncovered by any
 * contrast check, and drifting whenever `--color-primary` moves. Two gates keep the rule's
 * every-string breadth quiet: the class sits under a colour prefix, and its body is not
 * something Tailwind resolves to a *non*-colour. The second is a double negative on purpose —
 * `text-sm/6` resolves to a font size and is excluded, while a class that resolves to nothing
 * (`border-input` with no `--color-input`) still reports. A full-opacity modifier gets its own
 * message, `fullOpacityModifier`, because its fix is to delete it rather than add a token.
 */

// `baseline` is the rule's defaults; `allow-full-opacity` turns off the `/100` report only.
const options = {
  baseline: {  },
  "allow-full-opacity": { allowFullOpacity: true },
};

export default {
  rule: "no-opacity-modifier",
  cases: [

    // The colour's origin does not matter: a semantic token faded at the call site is as
    // derived as a palette class. Strings holding two or four classes report two or four times.
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<div className="bg-primary/50" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<div className="text-foreground/75" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<div className="border-input/20" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<div className="ring-primary/10" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<div className="divide-border/30" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<div className="placeholder-muted/60" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<div className="shadow-primary/25" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<div className="inset-ring-primary/30" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<div className="from-primary/40 to-accent/0" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 32 },
        { id: "opacityModifierOnColor", line: 1, column: 33, endLine: 1, endColumn: 44 },
      ],
    },
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<svg><path className="fill-primary/50 stroke-primary/50" /></svg>`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 23, endLine: 1, endColumn: 38 },
        { id: "opacityModifierOnColor", line: 1, column: 39, endLine: 1, endColumn: 56 },
      ],
    },
    {
      kind: "caught",
      group: "On semantic tokens",
      code: `<div className="outline-ring/50 decoration-link/40 caret-primary/80 accent-primary/70" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 32 },
        { id: "opacityModifierOnColor", line: 1, column: 33, endLine: 1, endColumn: 51 },
        { id: "opacityModifierOnColor", line: 1, column: 52, endLine: 1, endColumn: 68 },
        { id: "opacityModifierOnColor", line: 1, column: 69, endLine: 1, endColumn: 86 },
      ],
    },

    // These break no-spectral-color and no-raw-color too, and still break this rule — the
    // modifier is a separate defect from the colour it modifies.
    {
      kind: "caught",
      group: "On spectral and arbitrary colours",
      code: `<div className="bg-red-500/50" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "On spectral and arbitrary colours",
      code: `<div className="bg-[#ff0000]/50" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "On spectral and arbitrary colours",
      code: `<div className="bg-[--color-brand]/50" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },

    // A modifier is a bare number or any bracketed value; the rule does not second-guess the
    // brackets. `/100` is a no-op, so it reports under `fullOpacityModifier` ("delete it").
    // `allowFullOpacity` exempts that value however it is spelled, and nothing else.
    {
      kind: "caught",
      group: "Every modifier syntax",
      code: `<div className="bg-primary/5" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "Every modifier syntax",
      code: `<div className="bg-primary/[0.5]" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Every modifier syntax",
      code: `<div className="bg-primary/[50%]" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Every modifier syntax",
      code: `<div className="bg-primary/[var(--overlay-alpha)]" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 50 },
      ],
    },
    {
      kind: "caught",
      group: "Every modifier syntax",
      code: `<div className="bg-primary/[auto]" />`,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Every modifier syntax",
      code: `<div className="bg-primary/100" />`,
      reports: [
        { id: "fullOpacityModifier", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "allowed",
      group: "Every modifier syntax",
      code: `<div className="bg-primary/100" />`,
      options: options["allow-full-opacity"],
    },
    {
      kind: "allowed",
      group: "Every modifier syntax",
      code: `<div className="bg-primary/[100%]" />`,
      options: options["allow-full-opacity"],
    },
    {
      kind: "allowed",
      group: "Every modifier syntax",
      code: `<div className="bg-primary/[1]" />`,
      options: options["allow-full-opacity"],
    },
    {
      kind: "caught",
      group: "Every modifier syntax",
      code: `<div className="bg-primary/50" />`,
      options: options["allow-full-opacity"],
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 30 },
      ],
    },

    // Variants are stripped by segment, bracket depth respected, before the modifier is found,
    // so neither position in the chain nor an arbitrary variant's contents changes anything.
    {
      kind: "caught",
      group: "With variants and important",
      code: `<div className="hover:bg-primary/50" />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "With variants and important",
      code: `<div className="md:dark:focus-visible:ring-primary/40" />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 54 },
      ],
    },
    {
      kind: "caught",
      group: "With variants and important",
      code: `<div className="group-hover/nav:bg-primary/40" />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 46 },
      ],
    },
    {
      kind: "caught",
      group: "With variants and important",
      code: `<div className="[@media(hover:hover)]:bg-primary/50" />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 52 },
      ],
    },
    {
      kind: "caught",
      group: "With variants and important",
      code: `<div className="!bg-primary/50" />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "With variants and important",
      code: `<div className="bg-primary/50!" />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },

    // Every string literal and the static text of every template literal, wherever it sits:
    // the rule does not parse wrappers. A complete class beside an interpolation is still read.
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={cn("bg-primary/50", className)} />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 21, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const overlay = cva("fixed", {
  variants: { tone: { dim: "bg-black/50", dimmer: "bg-black/70" } },
});`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 2, column: 29, endLine: 2, endColumn: 40 },
        { id: "opacityModifierOnColor", line: 2, column: 52, endLine: 2, endColumn: 63 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const scrimClass = { light: "bg-white/60", dark: "bg-black/60" };`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 30, endLine: 1, endColumn: 41 },
        { id: "opacityModifierOnColor", line: 1, column: 51, endLine: 1, endColumn: 62 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={\`bg-primary/50 \${extra}\`} />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 18, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const scrim = "bg-black/50";`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 16, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={\`bg-primary/50\`} />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 18, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={twMerge("p-2", "bg-primary/50")} />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 33, endLine: 1, endColumn: 46 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={tv({ base: "bg-primary/50" })} />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 29, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const joined = ["bg-primary/50", "p-2"].join(" ");`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 18, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const spreadProps = { className: "bg-primary/50" };
<div {...spreadProps} />;`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 35, endLine: 1, endColumn: 48 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div
  className="bg-primary/50"
/>`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 2, column: 14, endLine: 2, endColumn: 27 },
      ],
    },

    // One report per class, located at the class.
    {
      kind: "caught",
      group: "Every offending class reports separately",
      code: `<div className="bg-primary/50 text-foreground/75 border-input/20 ring-primary/10" />`,
      options: options.baseline,
      reports: [
        { id: "opacityModifierOnColor", line: 1, column: 17, endLine: 1, endColumn: 30 },
        { id: "opacityModifierOnColor", line: 1, column: 31, endLine: 1, endColumn: 49 },
        { id: "opacityModifierOnColor", line: 1, column: 50, endLine: 1, endColumn: 65 },
        { id: "opacityModifierOnColor", line: 1, column: 66, endLine: 1, endColumn: 81 },
      ],
    },

    // Deliberately allowed from here on. A token with no modifier is the fix, not the defect.
    {
      kind: "allowed",
      group: "The same colour without a modifier",
      code: `<div className="bg-primary text-foreground border-input" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "The same colour without a modifier",
      code: `<div className="bg-primary-muted" />`,
      options: options.baseline,
    },

    // The `/` is a fraction on sizing, positioning and aspect utilities; no colour involved.
    {
      kind: "allowed",
      group: "Fractions on non-colour utilities",
      code: `<div className="w-1/2 h-1/3 basis-2/3 top-1/4" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Fractions on non-colour utilities",
      code: `<div className="translate-x-1/2 -translate-y-1/2" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Fractions on non-colour utilities",
      code: `<div className="aspect-16/9" />`,
      options: options.baseline,
    },

    // The dangerous near-miss: `text-` is a colour prefix and a font-size prefix. Asking
    // Tailwind what the class generates separates them; the rule never guesses from the prefix.
    {
      kind: "allowed",
      group: "text-<size>/<leading> is a font size and line height",
      code: `<div className="text-sm/6 text-lg/7 text-base/loose" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "text-<size>/<leading> is a font size and line height",
      code: `<div className="text-[14px]/[1.4]" />`,
      options: options.baseline,
    },

    // Not opacity syntax. If the class means nothing, no-undefined-token reports it.
    {
      kind: "allowed",
      group: "Non-numeric slash suffixes",
      code: `<div className="bg-primary/auto" />`,
      options: options.baseline,
    },

    // These fade a shadow's built-in default colour. The rule targets a modifier on a colour
    // you named; `lg` and `sm` are sizes.
    {
      kind: "allowed",
      group: "A shadow's own opacity",
      code: `<div className="shadow-lg/50 inset-shadow-sm/50 drop-shadow-lg/50 text-shadow-lg/50" />`,
      options: options.baseline,
    },

    // `opacity-50` fades the element and its children — a layering question, not a token one.
    {
      kind: "allowed",
      group: "Opacity on the element, not the colour",
      code: `<div className="opacity-50" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Opacity on the element, not the colour",
      code: `<div className="bg-primary opacity-50" />`,
      options: options.baseline,
    },

    // A colon inside brackets is not a variant boundary: `bg-[image:…]` is one class, and an
    // arbitrary variant with no modifier after it is just a variant.
    {
      kind: "allowed",
      group: "Colons inside brackets are not variants",
      code: `<div className="bg-[image:var(--hero)]" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Colons inside brackets are not variants",
      code: `<div className="[@media(hover:hover)]:bg-primary" />`,
      options: options.baseline,
    },

    // Blind spots from here on. `+` joins two unrelated expressions; nothing reassembles them.
    {
      kind: "blindspot",
      group: "String concatenation",
      code: `<div className={"bg-primary/" + alpha} />`,
      options: options.baseline,
    },

    // A class with an interpolation in it is never judged, by any rule in the package — the
    // rule can't know what it becomes. Choose between complete class names instead.
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`bg-primary/\${alpha}\`} />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`bg-\${tone}/50\`} />`,
      options: options.baseline,
    },

    // The string is caught where it is written, not where it is used.
    {
      kind: "blindspot",
      group: "Use sites with no literal of their own",
      code: `<div className={SCRIMS[mode]} />;`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Use sites with no literal of their own",
      code: `<div className={scrimClass} />;`,
      options: options.baseline,
    },

    // The same translucency without a modifier. Each belongs to another rule or to none.
    {
      kind: "blindspot",
      group: "Alpha reached by another mechanism",
      code: `<div className="bg-[color-mix(in_oklab,var(--color-primary)_50%,transparent)]" />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Alpha reached by another mechanism",
      code: `<div className="[--tw-bg-opacity:0.5] bg-primary" />`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Alpha reached by another mechanism",
      code: `<div style={{ backgroundColor: "rgb(0 0 0 / 50%)" }} />`,
      options: options.baseline,
    },

    // Not yet linted: the CSS surface. Recorded, never run. `@apply` is decided by the same two
    // gates; the token stylesheets, where a translucent token is defined on purpose, stay exempt.
    {
      kind: "deferred",
      lang: "css",
      group: "`@apply` class lists",
      code: `.scrim {
  @apply bg-primary/50;
}`,
    },
    {
      kind: "deferred",
      lang: "css",
      group: "The token-definition files, once `.css` is linted",
      code: `@theme {
  --color-scrim: color-mix(in oklab, var(--color-neutral-950) 50%, transparent);
}`,
    },
  ],
};
