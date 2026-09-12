/**
 * no-spectral-color — Tailwind's stock palette must not colour anything; a semantic token must.
 *
 * Detection is a subtraction: a class is spectral when its colour is a `--color` name, under a
 * colour-carrying prefix, that the project did not define — the namespace minus what a bare
 * `@import "tailwindcss"` defines. So `bg-brand` is the project's and a redefined
 * `--color-red-500` is still palette. `bias: false-positives`. The `replacement` map only picks
 * the token a message names, and only one the project defines — the fixture has `danger-muted`
 * and none of the default map's tokens, which is why every report here is `spectralColor`.
 */
export default {
  rule: "no-spectral-color",
  cases: [

    // The palette reaches an element through every utility that takes a colour, and none is a
    // lesser violation than `bg-`. Each class in a paint or gradient set is its own report with
    // its own fix.
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="bg-red-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="text-blue-200" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="border-slate-300" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="ring-blue-400" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="ring-offset-blue-200" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="inset-ring-emerald-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="divide-green-100" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="placeholder-gray-400" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="caret-rose-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<input className="accent-violet-600" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 19, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="outline-amber-400" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<span className="decoration-red-400" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 18, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="shadow-red-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="inset-shadow-zinc-700" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="text-shadow-sky-300" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<svg><path className="fill-green-600 stroke-green-800" /></svg>`,
      reports: [
        { id: "spectralColor", line: 1, column: 23, endLine: 1, endColumn: 37 },
        { id: "spectralColor", line: 1, column: 38, endLine: 1, endColumn: 54 },
      ],
    },
    {
      kind: "caught",
      group: "Every colour-carrying prefix",
      code: `<div className="from-blue-500 via-purple-500 to-pink-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 30 },
        { id: "spectralColor", line: 1, column: 31, endLine: 1, endColumn: 45 },
        { id: "spectralColor", line: 1, column: 46, endLine: 1, endColumn: 57 },
      ],
    },

    // Every stock family at every step, the neutrals included — `bg-gray-100` is the commonest
    // violation and the least noticed. No family list is kept, so one a Tailwind release adds
    // is caught without a change here.
    {
      kind: "caught",
      group: "Every palette family",
      code: `<div className="bg-red-50 bg-orange-100 bg-amber-200 bg-yellow-300" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 26 },
        { id: "spectralColor", line: 1, column: 27, endLine: 1, endColumn: 40 },
        { id: "spectralColor", line: 1, column: 41, endLine: 1, endColumn: 53 },
        { id: "spectralColor", line: 1, column: 54, endLine: 1, endColumn: 67 },
      ],
    },
    {
      kind: "caught",
      group: "Every palette family",
      code: `<div className="bg-lime-400 bg-green-500 bg-emerald-600 bg-teal-700" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 28 },
        { id: "spectralColor", line: 1, column: 29, endLine: 1, endColumn: 41 },
        { id: "spectralColor", line: 1, column: 42, endLine: 1, endColumn: 56 },
        { id: "spectralColor", line: 1, column: 57, endLine: 1, endColumn: 68 },
      ],
    },
    {
      kind: "caught",
      group: "Every palette family",
      code: `<div className="bg-cyan-800 bg-sky-900 bg-blue-950 bg-indigo-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 28 },
        { id: "spectralColor", line: 1, column: 29, endLine: 1, endColumn: 39 },
        { id: "spectralColor", line: 1, column: 40, endLine: 1, endColumn: 51 },
        { id: "spectralColor", line: 1, column: 52, endLine: 1, endColumn: 65 },
      ],
    },
    {
      kind: "caught",
      group: "Every palette family",
      code: `<div className="text-violet-500 text-purple-500 text-fuchsia-500 text-pink-500 text-rose-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 32 },
        { id: "spectralColor", line: 1, column: 33, endLine: 1, endColumn: 48 },
        { id: "spectralColor", line: 1, column: 49, endLine: 1, endColumn: 65 },
        { id: "spectralColor", line: 1, column: 66, endLine: 1, endColumn: 79 },
        { id: "spectralColor", line: 1, column: 80, endLine: 1, endColumn: 93 },
      ],
    },
    {
      kind: "caught",
      group: "Every palette family",
      code: `<div className="border-slate-200 border-gray-200 border-zinc-200 border-neutral-200 border-stone-200" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 33 },
        { id: "spectralColor", line: 1, column: 34, endLine: 1, endColumn: 49 },
        { id: "spectralColor", line: 1, column: 50, endLine: 1, endColumn: 65 },
        { id: "spectralColor", line: 1, column: 66, endLine: 1, endColumn: 84 },
        { id: "spectralColor", line: 1, column: 85, endLine: 1, endColumn: 101 },
      ],
    },

    // A class is caught when it ends in a stock colour and the text before it starts with a
    // colour-carrying utility, so per-side and compound prefixes need no listing.
    // `divide-x-red-500` generates no CSS — `divide-x-*` takes a width — and reports anyway:
    // the intent is unmistakable and `bias: false-positives` breaks the tie.
    {
      kind: "caught",
      group: "Compound and nested prefixes",
      code: `<div className="border-t-red-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Compound and nested prefixes",
      code: `<div className="divide-x-red-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Compound and nested prefixes",
      code: `<div className="inset-ring-red-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Compound and nested prefixes",
      code: `<div className="border-x-slate-200 border-s-slate-200" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 35 },
        { id: "spectralColor", line: 1, column: 36, endLine: 1, endColumn: 54 },
      ],
    },

    // The colour is the forbidden thing, so nothing attached to it makes it acceptable.
    // `bg-red-500/50` also reports under no-opacity-modifier: two things are wrong with it.
    {
      kind: "caught",
      group: "Variants, important and opacity modifiers",
      code: `<div className="hover:bg-red-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, important and opacity modifiers",
      code: `<div className="md:dark:hover:text-blue-200" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 44 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, important and opacity modifiers",
      code: `<div className="group-hover:border-slate-300" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, important and opacity modifiers",
      code: `<div className="[&>*]:text-red-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, important and opacity modifiers",
      code: `<div className="!bg-red-500" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, important and opacity modifiers",
      code: `<div className="bg-red-500!" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, important and opacity modifiers",
      code: `<div className="bg-red-500/50" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, important and opacity modifiers",
      code: `<div className="bg-black/50" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 28 },
      ],
    },

    // `white` and `black` are palette values with the scale left off, and `text-white` on a
    // themed surface is what `*-foreground` tokens exist for. They are the noisiest line in
    // the contract, so they alone have a switch, `flagFixedColors`, on by default.
    {
      kind: "caught",
      group: "Unscaled white and black",
      code: `<div className="bg-white text-black" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 25 },
        { id: "spectralColor", line: 1, column: 26, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Unscaled white and black",
      code: `<div className="border-white/20" />`,
      reports: [
        { id: "spectralColor", line: 1, column: 17, endLine: 1, endColumn: 32 },
      ],
    },

    // Context-free: every string literal and the static text of every template literal,
    // whatever surrounds it — `cn()` arguments, `cva()` maps, `.ts` constants, a spread props
    // object. The accepted cost is a palette class that never reaches a `className`, which
    // reports anyway; `oxlint-disable` is the escape hatch.
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={cn("bg-red-500", className)} />`,
      reports: [
        { id: "spectralColor", line: 1, column: 21, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={clsx(isOn && "text-blue-600")} />`,
      reports: [
        { id: "spectralColor", line: 1, column: 31, endLine: 1, endColumn: 44 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={\`bg-red-500 \${extra}\`} />`,
      reports: [
        { id: "spectralColor", line: 1, column: 18, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={\`rounded \${base} text-blue-200\`} />`,
      reports: [
        { id: "spectralColor", line: 1, column: 34, endLine: 1, endColumn: 47 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const tone = "bg-red-500";`,
      reports: [
        { id: "spectralColor", line: 1, column: 15, endLine: 1, endColumn: 25 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const chartSeries = ["text-blue-500"];`,
      reports: [
        { id: "spectralColor", line: 1, column: 23, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const button = cva("rounded", {
  variants: {
    tone: { bad: "bg-red-500", worse: "text-rose-600" },
  },
});`,
      reports: [
        { id: "spectralColor", line: 3, column: 19, endLine: 3, endColumn: 29 },
        { id: "spectralColor", line: 3, column: 40, endLine: 3, endColumn: 53 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const badgeColor = { danger: "bg-red-500", ok: "bg-green-500" };`,
      reports: [
        { id: "spectralColor", line: 1, column: 31, endLine: 1, endColumn: 41 },
        { id: "spectralColor", line: 1, column: 49, endLine: 1, endColumn: 61 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={\`bg-red-500\`} />`,
      reports: [
        { id: "spectralColor", line: 1, column: 18, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={twMerge("p-2", "bg-red-500")} />`,
      reports: [
        { id: "spectralColor", line: 1, column: 33, endLine: 1, endColumn: 43 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div className={tv({ base: "bg-red-500" })} />`,
      reports: [
        { id: "spectralColor", line: 1, column: 29, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const joined = ["bg-red-500", "p-2"].join(" ");`,
      reports: [
        { id: "spectralColor", line: 1, column: 18, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `const spreadProps = { className: "bg-red-500" };
<div {...spreadProps} />;`,
      reports: [
        { id: "spectralColor", line: 1, column: 35, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "Wherever class strings are authored",
      code: `<div
  className="bg-red-500"
/>`,
      reports: [
        { id: "spectralColor", line: 2, column: 14, endLine: 2, endColumn: 24 },
      ],
    },

    // A name the project defined is the project's, however it is spelled.
    {
      kind: "allowed",
      group: "Semantic tokens",
      code: `<div className="bg-primary text-primary-foreground" />`,
    },
    {
      kind: "allowed",
      group: "Semantic tokens",
      code: `<div className="bg-success-weak text-success-content" />`,
    },

    // The same prefixes take sizes, alignment and positions. Those are not colours, so the
    // subtraction never sees them.
    {
      kind: "allowed",
      group: "Non-colour utilities that share a colour prefix",
      code: `<div className="text-sm text-center text-balance" />`,
    },
    {
      kind: "allowed",
      group: "Non-colour utilities that share a colour prefix",
      code: `<div className="bg-cover bg-no-repeat bg-center" />`,
    },
    {
      kind: "allowed",
      group: "Non-colour utilities that share a colour prefix",
      code: `<div className="border-2 divide-x ring-2 shadow-lg outline-none" />`,
    },
    {
      kind: "allowed",
      group: "Non-colour utilities that share a colour prefix",
      code: `<div className="from-0% via-50% to-100%" />`,
    },

    // `transparent`, `current` and `inherit` defer to the cascade or to nothing. They are
    // keywords Tailwind handles itself rather than theme colours, and no semantic token for
    // them is worth inventing.
    {
      kind: "allowed",
      group: "transparent, current and inherit",
      code: `<div className="bg-transparent border-transparent" />`,
    },
    {
      kind: "allowed",
      group: "transparent, current and inherit",
      code: `<svg><path className="fill-current stroke-current" /></svg>`,
    },
    {
      kind: "allowed",
      group: "transparent, current and inherit",
      code: `<div className="text-inherit" />`,
    },

    // Not a real class, so it paints nothing. It is no-undefined-token's, which reports it as
    // generating no CSS.
    {
      kind: "allowed",
      group: "A palette family name with no scale",
      code: `<div className="text-red" />`,
    },
    {
      kind: "allowed",
      group: "A palette family name with no scale",
      code: `<div className="bg-slate" />`,
    },

    // Raw literals are no-raw-color's, even a hex that matches a palette step; reporting them
    // here too would put two rules with two fixes on one span.
    {
      kind: "allowed",
      group: "Arbitrary values",
      code: `<div className="bg-[#ef4444]" />`,
    },
    {
      kind: "allowed",
      group: "Arbitrary values",
      code: `<div className="text-[--color-brand]" />`,
    },

    // A family with no prefix is not a class, and a path is a single token that starts with
    // neither.
    {
      kind: "allowed",
      group: "Strings that are not classes",
      code: `const chartSeries = ["slate-500", "500"];`,
    },
    {
      kind: "allowed",
      group: "Strings that are not classes",
      code: `fetch("/assets/blue-500.png");`,
    },

    // A class with an interpolation in it is not checked — the rule can't know what it
    // becomes. Complete classes in the same template are (`bg-red-500 ${extra}` above). Every
    // rule draws the line here; a lookup of complete class names is the checkable form.
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`bg-\${tone}-500\`} />`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`text-\${x}\`} />`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`border-t-\${side}\`} />`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`bg-red-\${step}\`} />`,
    },

    // `+` joins two unrelated expressions, and reassembling them would be tracking values
    // across expressions, which no rule here does.
    {
      kind: "blindspot",
      group: "String concatenation",
      code: `<div className={"bg-" + tone} />`,
    },
    {
      kind: "blindspot",
      group: "String concatenation",
      code: `<div className={["bg", family, "500"].join("-")} />`,
    },

    // The string is caught where it is written, not where it is used, which is why `.ts`
    // constants are covered. A definition outside the linted files is invisible at the use.
    {
      kind: "blindspot",
      group: "Use sites with no literal of their own",
      code: `<div className={TONES[kind]} />;`,
    },
    {
      kind: "blindspot",
      group: "Use sites with no literal of their own",
      code: `<div className={toneFromServer} />;`,
    },

    // `--color-brand: var(--color-red-500)` makes `bg-brand` spectral in effect and semantic in
    // name. That is the intended escape hatch — the fork sits in one reviewable file — so the
    // question moves to design review.
    {
      kind: "blindspot",
      group: "The palette re-exported under a semantic name",
      code: `<div className="bg-brand" />`,
    },

    // Not yet linted: the CSS surface. Recorded, never run. `@apply` of a palette class is the
    // same violation as a `className`; token stylesheets will be exempt wholesale, since a
    // semantic token has to be defined as something.
    {
      kind: "deferred",
      lang: "css",
      group: "@apply class lists",
      code: `.card {
  @apply bg-red-500 text-slate-50;
}`,
    },
    {
      kind: "deferred",
      lang: "css",
      group: "Token stylesheets, once CSS is linted",
      code: `@theme {
  --color-danger: var(--color-red-500);
}`,
    },
  ],
};
