/**
 * no-style-color — colour must not be applied through the React `style` prop.
 *
 * A colour-carrying key in a `style` object reports whatever its value, and the object is
 * found however the prop is written. Setting a CSS custom property inline is the escape
 * hatch and never reports. A shorthand that can carry a colour reports on its key alone by
 * default; `shorthandProperties: "value"` narrows it to a value that visibly carries one.
 */

/** Option sets a case can run under. `baseline` is the rule's own defaults. */
const options = {
  baseline: {},
  // A shorthand reports only when its value visibly carries a colour.
  "shorthand-values": { shorthandProperties: "value" },
  // A static value containing `var(--…)` anywhere passes.
  "token-values": { allowTokenValues: true },
};

export default {
  rule: "no-style-color",
  cases: [

    // ── Promises to catch ──

    // Properties whose only job is to set a colour. Always reported, whatever the value:
    // `borderColor: token` is as wrong as `color: "red"`, because the property is what
    // defeats the token system — the literal inside it is no-raw-color's. Two in one object
    // are two reports.
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ color: "red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ backgroundColor: "blue" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ borderColor: token }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ outlineColor: "#fff" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ caretColor: "red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ accentColor: "red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ textDecorationColor: "red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ textEmphasisColor: "red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ columnRuleColor: "red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ scrollbarColor: "dark" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<svg><stop style={{ stopColor: "red" }} /></svg>`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 21, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ borderTopColor: x, borderInlineStartColor: y }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 32 },
        { id: "colorInStyleProp", line: 1, column: 34, endLine: 1, endColumn: 59 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<svg><rect style={{ fill: "red", stroke: "blue" }} /></svg>`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 21, endLine: 1, endColumn: 32 },
        { id: "colorInStyleProp", line: 1, column: 34, endLine: 1, endColumn: 48 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<svg><filter style={{ floodColor: "red", lightingColor: "blue" }} /></svg>`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 23, endLine: 1, endColumn: 40 },
        { id: "colorInStyleProp", line: 1, column: 42, endLine: 1, endColumn: 63 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-only properties",
      code: `<div style={{ WebkitTextFillColor: "red", WebkitTextStrokeColor: "blue" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 41 },
        { id: "colorInStyleProp", line: 1, column: 43, endLine: 1, endColumn: 72 },
      ],
    },

    // Properties that may carry a colour among other values, reported on the key alone by
    // default — so `listStyle: "none"` and `backdropFilter: "blur(4px)"` report too. They
    // are rare in a Tailwind codebase and cheap to disable; the next group is the quieter mode.
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ background: "red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ border: "1px solid red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ borderTop: "1px solid red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ outline: "1px solid red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ boxShadow: "0 0 4px rgba(0,0,0,.5)" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 50 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ textShadow: "0 0 4px red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ textDecoration: "underline red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 46 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ columnRule: "1px solid red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ backgroundImage: "linear-gradient(red, blue)" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 60 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ borderImage: "linear-gradient(red, blue) 1" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 58 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ filter: "drop-shadow(0 0 4px red)" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 49 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ borderInline: "1px solid red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 44 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ textEmphasis: "filled red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ WebkitTextStroke: "1px red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ caret: "red" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ borderImageSource: "linear-gradient(red, blue)" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 62 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ listStyleImage: "url(/dot.svg)" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 46 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<ul style={{ listStyle: "none" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 14, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ maskImage: "url(/mask.png)" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Colour-capable shorthands",
      code: `<div style={{ backdropFilter: "blur(4px)" }} />`,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 42 },
      ],
    },

    // With `shorthandProperties: "value"` a shorthand reports only when its value visibly
    // carries a colour, recognised exactly as no-raw-color recognises one, so the two rules
    // never disagree about one declaration. A value it cannot read passes — a real miss, and
    // the mode's bargain. `var()`, `currentColor`, `transparent` and the cascade keywords do
    // not count as a colour here, so a shorthand naming a token passes whatever
    // `allowTokenValues` says. A colour-only property is unaffected.
    {
      kind: "caught",
      group: "shorthandProperties: value",
      code: `<div style={{ border: "1px solid red" }} />`,
      options: options["shorthand-values"],
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "shorthandProperties: value",
      code: `<div style={{ boxShadow: "0 0 4px rgba(0,0,0,.5)" }} />`,
      options: options["shorthand-values"],
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 50 },
      ],
    },
    {
      kind: "caught",
      group: "shorthandProperties: value",
      code: `<div style={{ backgroundImage: "linear-gradient(red, blue)" }} />`,
      options: options["shorthand-values"],
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 60 },
      ],
    },
    {
      kind: "allowed",
      group: "shorthandProperties: value",
      code: `<div style={{ filter: "blur(4px)" }} />`,
      options: options["shorthand-values"],
    },
    {
      kind: "allowed",
      group: "shorthandProperties: value",
      code: `<div style={{ boxShadow: "none" }} />`,
      options: options["shorthand-values"],
    },
    {
      kind: "allowed",
      group: "shorthandProperties: value",
      code: `<div style={{ borderTop: "1px solid" }} />`,
      options: options["shorthand-values"],
    },
    {
      kind: "allowed",
      group: "shorthandProperties: value",
      code: `<div style={{ boxShadow: shadowVar }} />`,
      options: options["shorthand-values"],
    },
    {
      kind: "allowed",
      group: "shorthandProperties: value",
      code: `<div style={{ backgroundImage: "url(/hero.png)" }} />`,
      options: options["shorthand-values"],
    },
    {
      kind: "allowed",
      group: "shorthandProperties: value",
      code: `<div style={{ border: "1px solid var(--color-border)" }} />`,
      options: options["shorthand-values"],
    },
    {
      kind: "allowed",
      group: "shorthandProperties: value",
      code: `<div style={{ border: "1px solid currentColor" }} />`,
      options: options["shorthand-values"],
    },
    {
      kind: "allowed",
      group: "shorthandProperties: value",
      code: `<div style={{ outline: "2px solid transparent" }} />`,
      options: options["shorthand-values"],
    },
    {
      kind: "allowed",
      group: "shorthandProperties: value",
      code: `<div style={{ borderTop: "1px solid inherit" }} />`,
      options: options["shorthand-values"],
    },
    {
      kind: "caught",
      group: "shorthandProperties: value",
      code: `<div style={{ color: computeColor() }} />`,
      options: options["shorthand-values"],
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 36 },
      ],
    },

    // The property is found however the object or the prop is written: shorthand, computed
    // and quoted keys (a kebab-case key is reported as written), a value of any kind, through
    // `as` / `satisfies` / `!`, and down every branch of a choice between objects. Each
    // offending property is its own report.
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ color }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 20 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ ["color"]: x }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ "color": "red" }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ 'backgroundColor': "red" }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ "background-color": "red" }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ color: cond ? a : b }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ transform: active ? { scale: 1 } : {}, color: "red" }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 54, endLine: 1, endColumn: 66 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ color: \`#\${hex}\` }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ color: "r" + "ed" }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div
  style={{
    fontWeight: "bold",
    color: "red",
  }}
/>`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 4, column: 5, endLine: 4, endColumn: 17 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ "--brand": x, color: "red" } as React.CSSProperties} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 29, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ color: "red" } satisfies CSSProperties} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={{ color: "red" }!} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 27 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={cond ? { color: "red" } : undefined} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 22, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={cond && { color: "red" }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 23, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div style={cond ? { color: "red" } : { backgroundColor: "blue" }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 22, endLine: 1, endColumn: 34 },
        { id: "colorInStyleProp", line: 1, column: 41, endLine: 1, endColumn: 64 },
      ],
    },
    {
      kind: "caught",
      group: "Syntactic forms",
      code: `<div
  style={{
    color: "red",
    backgroundColor: "blue",
  }}
/>`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 3, column: 5, endLine: 3, endColumn: 17 },
        { id: "colorInStyleProp", line: 4, column: 5, endLine: 4, endColumn: 28 },
      ],
    },

    // ── Deliberately allowed ──

    // Nothing here applies a colour.
    {
      kind: "allowed",
      group: "Non-colour properties",
      code: `<div style={{ fontWeight: "bold" }} />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Non-colour properties",
      code: `<div style={{ width: 10, transform: "translateX(4px)" }} />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Non-colour properties",
      code: `<div style={{ transform: active ? { scale: 1 } : {} }} />`,
      options: options.baseline,
    },

    // Named for colour, applying none: `colorScheme`, `forcedColorAdjust` and the SVG
    // rendering hints.
    {
      kind: "allowed",
      group: "Named for colour, applying none",
      code: `<div style={{ colorScheme: "dark" }} />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Named for colour, applying none",
      code: `<div style={{ colorInterpolation: "sRGB" }} />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Named for colour, applying none",
      code: `<div style={{ colorInterpolationFilters: "sRGB" }} />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Named for colour, applying none",
      code: `<div style={{ colorRendering: "auto" }} />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Named for colour, applying none",
      code: `<div style={{ printColorAdjust: "exact" }} />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Named for colour, applying none",
      code: `<div style={{ forcedColorAdjust: "none" }} />`,
      options: options.baseline,
    },

    // Setting a custom property inline is the supported way to feed a runtime colour into
    // CSS, where variants and theming still apply — the fix the diagnostic points people at.
    {
      kind: "allowed",
      group: "Custom properties, the escape hatch",
      code: `<div style={{ "--color-brand": userColor }} className="bg-[--color-brand]" />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Custom properties, the escape hatch",
      code: `<div style={{ "--chart-series-1": series.color }} />`,
      options: options.baseline,
    },

    // An identical object anywhere else is not this rule's concern: a `style` object reaches
    // an element only as a JSX attribute. Its literals are no-raw-color's.
    {
      kind: "allowed",
      group: "Colour outside a style prop",
      code: `const styles = { color: "red" };`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Colour outside a style prop",
      code: `const theme = { color: "red", backgroundColor: "blue" };`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "Colour outside a style prop",
      code: `<Chart options={{ color: "red" }} />`,
      options: options.baseline,
    },

    // The key decides, never the text of the value.
    {
      kind: "allowed",
      group: "\"color\" only inside a value",
      code: `<div style={{ fontFamily: "color-scheme-font" }} />`,
      options: options.baseline,
    },
    {
      kind: "allowed",
      group: "\"color\" only inside a value",
      code: `<div style={{ content: '"color:"' }} />`,
      options: options.baseline,
    },

    // ── Blind spots ── not caught, by decision. Asserted, so one that starts reporting fails.

    // The object is not at the call site. Following values across statements is something
    // this linter deliberately does not do: every answer to "how many levels, which scopes"
    // would be arbitrary.
    {
      kind: "blindspot",
      group: "Indirect style values",
      code: `const s = { color: "red" };
<div style={s} />;`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Indirect style values",
      code: `<div style={{ ...spread }} />;`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Indirect style values",
      code: `<div style={props.style} />;`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Indirect style values",
      code: `<div {...props} />;`,
      options: options.baseline,
    },

    // Outside JSX entirely.
    {
      kind: "blindspot",
      group: "Imperative DOM manipulation",
      code: `element.style.color = "red";`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Imperative DOM manipulation",
      code: `element.style.setProperty("color", "red");`,
      options: options.baseline,
    },
    {
      kind: "blindspot",
      group: "Imperative DOM manipulation",
      code: `Object.assign(element.style, { color: "red" });`,
      options: options.baseline,
    },

    // Tagged-template CSS (styled-components, Emotion) is out of scope; supporting it would be
    // a new rule, not an extension of this one.
    {
      kind: "blindspot",
      group: "CSS-in-JS",
      code: `const Box = styled.div\`
  color: red;
\`;`,
      options: options.baseline,
    },

    // ── allowTokenValues ──

    // `var()` in a colour property reports by default. It uses a token, but it still cannot
    // carry a variant and still beats every class in the cascade, and the custom-property
    // escape hatch already covers the need. `allowTokenValues: true` skips any static string
    // containing `var(--…)` anywhere — any custom property, a literal fallback, a value mixing
    // a literal colour with a `var()`. An interpolated value still reports: it cannot be read.
    {
      kind: "caught",
      group: "allowTokenValues",
      code: `<div style={{ color: "var(--color-primary)" }} />`,
      options: options.baseline,
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 44 },
      ],
    },
    {
      kind: "allowed",
      group: "allowTokenValues",
      code: `<div style={{ color: "var(--color-primary)" }} />`,
      options: options["token-values"],
    },
    {
      kind: "allowed",
      group: "allowTokenValues",
      code: `<div style={{ color: "var(--spacing-4)" }} />`,
      options: options["token-values"],
    },
    {
      kind: "allowed",
      group: "allowTokenValues",
      code: `<div style={{ color: "var(--brand, red)" }} />`,
      options: options["token-values"],
    },
    {
      kind: "allowed",
      group: "allowTokenValues",
      code: `<div style={{ boxShadow: "0 0 4px red, 0 0 8px var(--color-ring)" }} />`,
      options: options["token-values"],
    },
    {
      kind: "caught",
      group: "allowTokenValues",
      code: `<div style={{ color: \`var(--color-\${tone})\` }} />`,
      options: options["token-values"],
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 44 },
      ],
    },
    {
      kind: "caught",
      group: "allowTokenValues",
      code: `<div style={{ color: "red" }} />`,
      options: options["token-values"],
      reports: [
        { id: "colorInStyleProp", line: 1, column: 15, endLine: 1, endColumn: 27 },
      ],
    },
  ],
};
