/**
 * no-useless-hover — `hover:` styling on an element the user cannot interact with.
 *
 * Reports a **self-hover** class (`hover:`, `not-hover:`, `[&:hover]:`) that reaches the
 * `className` of an element provably non-interactive: a tag on a closed list of intrinsic
 * HTML elements, with no handler, interactive attribute, polymorphism or spread, and no
 * interactive or unknown JSX ancestor. `bias: false-negatives` — wherever interactivity is
 * invisible at the call site, above all a capitalized component, the rule stays silent.
 * `group-hover:` / `peer-hover:` share the `hover` family but name another target, and are
 * the recommended repair.
 */
const options = {
  // Every case without options of its own runs under the rule's defaults.
  baseline: {},
  // Opts a tag outside the closed list into reporting — see `nonInteractiveComponents`.
  "form-opt-in": { nonInteractiveComponents: ["form"] },
};

export default {
  rule: "no-useless-hover",
  cases: [

    // A self-hover class on a tag from the closed non-interactive list. Membership is a fact
    // about HTML, so the list ships with the rule; `a`, `button`, form controls, `dialog`,
    // media and custom elements are absent by design, and `tr` / `td` / `th` are exempted by
    // the default `interactiveElements`.
    {
      kind: "caught",
      group: "The non-interactive tag list",
      code: `<div className="hover:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "The non-interactive tag list",
      code: `<span className="hover:text-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 18, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "The non-interactive tag list",
      code: `<p className="hover:bg-muted" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 15, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "The non-interactive tag list",
      code: `<li className="hover:bg-accent" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 16, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "The non-interactive tag list",
      code: `<h2 className="hover:text-link" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 16, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "The non-interactive tag list",
      code: `<img className="hover:opacity-80" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "The non-interactive tag list",
      code: `<svg className="hover:fill-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 35 },
      ],
    },

    // Recognised by segment, never as a substring, anywhere in a stacked variant.
    // `[&:hover]:` and `not-hover:` are this rule's own additions: neither is in the shared
    // `hover` family `token-constraints` uses, but both condition the element on its own
    // pointer state — which is this rule's whole subject.
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="md:hover:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="dark:md:hover:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="max-lg:hover:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="focus-within:hover:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 46 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="hover:focus:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="!hover:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="hover:!bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="hover:bg-primary!" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="hover:bg-primary/50" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="[&:hover]:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="md:[&:hover]:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="not-hover:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "Every form the self-hover variant takes",
      code: `<div className="md:not-hover:bg-primary" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 40 },
      ],
    },

    // Only `className` is read, in every shape: literals, templates, conditionals, object
    // keys, and the arguments of `cn`, `clsx`, `classNames`, `cx`, `twMerge`, `twJoin` and
    // `tw`, at any depth.
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={"hover:bg-primary"} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 18, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={'hover:bg-primary'} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 18, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={\`hover:bg-primary\`} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 18, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={\`rounded-md hover:bg-primary \${extra}\`} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 29, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={cn("p-2", "hover:bg-primary")} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 28, endLine: 1, endColumn: 44 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={clsx("hover:bg-primary", extra)} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 23, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={twMerge(base, "hover:bg-primary")} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 32, endLine: 1, endColumn: 48 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={cn(isOpen && "hover:bg-primary")} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 31, endLine: 1, endColumn: 47 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={cond ? "hover:bg-primary" : "bg-muted"} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 25, endLine: 1, endColumn: 41 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={cn({ "hover:bg-primary": isOpen })} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 23, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div className={cn(["p-2", "hover:bg-primary"])} />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 29, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<div
  data-testid="card"
  className="hover:bg-primary"
/>`,
      reports: [
        { id: "hoverOnNonInteractive", line: 3, column: 14, endLine: 3, endColumn: 30 },
      ],
    },

    // One report per element, at its first offending class: the element is the defect, the
    // classes are symptoms of it.
    {
      kind: "caught",
      group: "One report per element",
      code: `<div className="hover:bg-primary">
  <span className="hover:text-primary" />
</div>`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 33 },
        { id: "hoverOnNonInteractive", line: 2, column: 20, endLine: 2, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "One report per element",
      code: `<div className="hover:bg-primary hover:text-primary md:hover:shadow-md" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 17, endLine: 1, endColumn: 33 },
      ],
    },

    // Allowed: the tag is itself a control.
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<button className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<a href="/x" className="hover:text-link" />`,
    },
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<a className="hover:text-link" />`,
    },
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<input className="hover:border-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<select className="hover:border-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<textarea className="hover:border-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<label className="hover:text-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<summary className="hover:bg-muted" />`,
    },
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<details className="hover:bg-muted" />`,
    },
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<option className="hover:bg-muted" />`,
    },
    {
      kind: "allowed",
      group: "Elements that are interactive by tag",
      code: `<dialog className="hover:bg-muted" />`,
    },

    // Any `on[A-Z]…` prop — pointer, keyboard, focus or drag — makes the element a target.
    // There is no fixed list of handler names.
    {
      kind: "allowed",
      group: "Elements made interactive by a handler prop",
      code: `<div onClick={handler} className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by a handler prop",
      code: `<div onMouseEnter={handler} className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by a handler prop",
      code: `<div onFocus={handler} className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by a handler prop",
      code: `<div onPointerUp={handler} className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by a handler prop",
      code: `<div onKeyDown={handler} className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by a handler prop",
      code: `<div onDragStart={handler} className="hover:bg-primary" />`,
    },

    // An interactive `role`, `href` / `to`, `tabIndex`, `contentEditable` or `draggable`. A
    // dynamic `role={…}` cannot be proved non-interactive, and the bias resolves that toward
    // silence.
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div role="button" className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div role="link" className="hover:text-link" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div role="menuitem" className="hover:bg-accent" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div role="tab" className="hover:bg-accent" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div role="option" className="hover:bg-accent" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div role="checkbox" className="hover:bg-accent" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div role={computedRole} className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div href={url} className="hover:text-link" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div to={route} className="hover:text-link" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div tabIndex={0} className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div contentEditable className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Elements made interactive by an attribute",
      code: `<div draggable className="hover:bg-primary" />`,
    },

    // Blind spot. Presence is enough: the attribute's value is never read, so any `role`,
    // `tabIndex`, `draggable` or `contentEditable` — and any `on…` prop, even `onLoad` on an
    // image — exempts the element. That errs toward silence, and lets through a few elements
    // that plainly are not interactive.
    {
      kind: "blindspot",
      group: "Attributes that exempt by presence alone",
      code: `<div role="presentation" className="hover:bg-primary" />`,
    },
    {
      kind: "blindspot",
      group: "Attributes that exempt by presence alone",
      code: `<div role="none" className="hover:bg-primary" />`,
    },
    {
      kind: "blindspot",
      group: "Attributes that exempt by presence alone",
      code: `<div tabIndex={-1} className="hover:bg-primary" />`,
    },
    {
      kind: "blindspot",
      group: "Attributes that exempt by presence alone",
      code: `<div draggable={false} className="hover:bg-primary" />`,
    },
    {
      kind: "blindspot",
      group: "Attributes that exempt by presence alone",
      code: `<img onLoad={track} className="hover:opacity-80" />`,
    },

    // `asChild`, `as` and `component` choose the tag at runtime, so the written tag proves
    // nothing.
    {
      kind: "allowed",
      group: "Polymorphic elements",
      code: `<div asChild className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Polymorphic elements",
      code: `<div as="button" className="hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Polymorphic elements",
      code: `<div as={Link} className="hover:text-link" />`,
    },
    {
      kind: "allowed",
      group: "Polymorphic elements",
      code: `<div component={Link} className="hover:text-link" />`,
    },

    // An enclosing JSX element at any depth exempts the element when it is interactive — or
    // when its interactivity is unknown: a component, a tag off the closed list, a spread.
    // "Interactive" is the reporting test read the other way, so the two halves cannot drift.
    // `hover:` on the span is subtly not hovering the button, and `group-hover:` says it
    // better, but that is style rather than a broken affordance. The walk is lexical: a
    // wrapper component its callers render inside a `<button>` still reports — the one
    // accepted false positive, answered by `oxlint-disable-next-line` at the definition.
    {
      kind: "allowed",
      group: "Descendants of an interactive element",
      code: `<button>
  <span className="hover:underline">Save</span>
</button>`,
    },
    {
      kind: "allowed",
      group: "Descendants of an interactive element",
      code: `<a href="/x">
  <div className="hover:bg-primary" />
</a>`,
    },
    {
      kind: "allowed",
      group: "Descendants of an interactive element",
      code: `<div role="button">
  <span className="hover:text-primary" />
</div>`,
    },
    {
      kind: "allowed",
      group: "Descendants of an interactive element",
      code: `<button>
  <span>
    <em className="hover:underline">Save</em>
  </span>
</button>`,
    },
    {
      kind: "allowed",
      group: "Descendants of an interactive element",
      code: `<Card>
  <span className="hover:underline">Save</span>
</Card>`,
    },
    {
      kind: "allowed",
      group: "Descendants of an interactive element",
      code: `<div {...props}>
  <span className="hover:underline">Save</span>
</div>`,
    },
    {
      kind: "allowed",
      group: "Descendants of an interactive element",
      code: `<form>
  <p className="hover:text-primary" />
</form>`,
    },

    // In the `hover` family, but the target is another element — an ancestor, a sibling, or
    // for `has-hover:` a descendant. The recommended repair, never reported.
    {
      kind: "allowed",
      group: "`group-hover:` and `peer-hover:` — the sanctioned idiom",
      code: `<div className="group-hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "`group-hover:` and `peer-hover:` — the sanctioned idiom",
      code: `<div className="peer-hover:text-primary" />`,
    },
    {
      kind: "allowed",
      group: "`group-hover:` and `peer-hover:` — the sanctioned idiom",
      code: `<div className="md:group-hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "`group-hover:` and `peer-hover:` — the sanctioned idiom",
      code: `<div className="group-hover/item:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "`group-hover:` and `peer-hover:` — the sanctioned idiom",
      code: `<div className="peer-hover/input:border-primary" />`,
    },
    {
      kind: "allowed",
      group: "`group-hover:` and `peer-hover:` — the sanctioned idiom",
      code: `<div className="group-has-hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "`group-hover:` and `peer-hover:` — the sanctioned idiom",
      code: `<div className="has-hover:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "`group-hover:` and `peer-hover:` — the sanctioned idiom",
      code: `<button className="group">
  <span className="group-hover:underline">Save</span>
</button>`,
    },

    // A device capability, not an element state.
    {
      kind: "allowed",
      group: "Variants outside the `hover` family",
      code: `<div className="[@media(hover:hover)]:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Variants outside the `hover` family",
      code: `<div className="supports-[hover:hover]:bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Variants outside the `hover` family",
      code: `<div className="pointer-fine:bg-primary" />`,
    },

    // Variants apply left to right. After `*:`, `**:`, or an arbitrary selector continuing
    // past `&` (`[&_a]:`, `[&>li]:`), `hover` is each of those elements' own hover. A `hover`
    // before the move is still the element's, and reports.
    {
      kind: "allowed",
      group: "`hover:` after a variant that moves to other elements",
      code: `<ul className="*:hover:bg-muted" />`,
    },
    {
      kind: "allowed",
      group: "`hover:` after a variant that moves to other elements",
      code: `<div className="**:hover:underline" />`,
    },
    {
      kind: "allowed",
      group: "`hover:` after a variant that moves to other elements",
      code: `<nav className="[&_a]:hover:underline" />`,
    },
    {
      kind: "allowed",
      group: "`hover:` after a variant that moves to other elements",
      code: `<ul className="[&>li]:hover:bg-muted" />`,
    },
    {
      kind: "caught",
      group: "`hover:` after a variant that moves to other elements",
      code: `<ul className="hover:*:bg-muted" />`,
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 16, endLine: 1, endColumn: 32 },
      ],
    },

    // `hover:` in prose or a data attribute is never parsed as a variant.
    {
      kind: "allowed",
      group: "`hover:` outside a class channel",
      code: `<div title="hover: to preview" />`,
    },
    {
      kind: "allowed",
      group: "`hover:` outside a class channel",
      code: `<div data-tooltip="hover: me" aria-label="hover: me" />`,
    },

    // The default `interactiveElements: ["tr", "td", "th"]`. A row-level highlight is a
    // deliberate data-table affordance — this design system's policy, not a fact about HTML,
    // which is why it is an option rather than a hole in the closed list.
    {
      kind: "allowed",
      group: "Tags exempted by configuration",
      code: `<tr className="hover:bg-muted" />`,
    },
    {
      kind: "allowed",
      group: "Tags exempted by configuration",
      code: `<td className="hover:bg-muted" />`,
    },
    {
      kind: "allowed",
      group: "Tags exempted by configuration",
      code: `<th className="hover:bg-muted" />`,
    },

    // Never reported by default: the list is closed. `nonInteractiveComponents` opts a tag in.
    {
      kind: "allowed",
      group: "Tags outside the closed list",
      code: `<form className="hover:bg-muted" />`,
    },
    {
      kind: "allowed",
      group: "Tags outside the closed list",
      code: `<fieldset className="hover:bg-muted" />`,
    },
    {
      kind: "allowed",
      group: "Tags outside the closed list",
      code: `<canvas className="hover:bg-muted" />`,
    },
    {
      kind: "allowed",
      group: "Tags outside the closed list",
      code: `<video className="hover:opacity-80" />`,
    },
    {
      kind: "allowed",
      group: "Tags outside the closed list",
      code: `<my-widget className="hover:bg-primary" />`,
    },

    // Blind spot. The ancestor walk passes through prop values, so the icon counts as inside
    // the button although the component decides where it renders.
    {
      kind: "blindspot",
      group: "An element passed through an interactive element's prop",
      code: `<button icon={<span className="hover:underline" />} />`,
    },

    // The most important blind spot. A component's interactivity lives in another file —
    // behind `asChild`, a `Slot`, a conditional element type. Flagging every unknown
    // component would report most real `hover:` usage; an allow-list of interactive
    // components would silently miss every one not on it. The closed intrinsic list fails in
    // neither direction, and `nonInteractiveComponents` makes opting in a choice.
    {
      kind: "blindspot",
      group: "Capitalized components",
      code: `<Card className="hover:bg-primary" />`,
    },
    {
      kind: "blindspot",
      group: "Capitalized components",
      code: `<Badge className="hover:bg-primary" />`,
    },
    {
      kind: "blindspot",
      group: "Capitalized components",
      code: `<Dialog.Trigger className="hover:bg-primary" />`,
    },
    {
      kind: "blindspot",
      group: "Capitalized components",
      code: `<Dialog.Content className="hover:bg-primary" />`,
    },
    {
      kind: "blindspot",
      group: "Capitalized components",
      code: `<Comp className="hover:bg-primary" />`,
    },
    {
      kind: "blindspot",
      group: "Capitalized components",
      code: `<MotionDiv className="hover:bg-primary" />`,
    },

    // The spread may well carry `onClick`. Flagging would be a guess the author has no cheap
    // way to disprove.
    {
      kind: "blindspot",
      group: "Interactivity arriving through spread props",
      code: `<div {...props} className="hover:bg-primary" />;`,
    },
    {
      kind: "blindspot",
      group: "Interactivity arriving through spread props",
      code: `<div {...handlers} className="hover:bg-primary" />;`,
    },
    {
      kind: "blindspot",
      group: "Interactivity arriving through spread props",
      code: `const handlers = useHoverProps();
<div {...handlers} className="hover:bg-primary" />;`,
    },

    // No variable indirection is resolved, as in the other JSX rules: bounded and honest
    // beats the slide toward dataflow analysis.
    {
      kind: "blindspot",
      group: "Class strings that do not appear at the call site",
      code: `const cls = "hover:bg-primary";
<div className={cls} />;`,
    },
    {
      kind: "blindspot",
      group: "Class strings that do not appear at the call site",
      code: `<div className={styles.card} />;`,
    },
    {
      kind: "blindspot",
      group: "Class strings that do not appear at the call site",
      code: `<div className={CLASSES[variant]} />;`,
    },
    {
      kind: "blindspot",
      group: "Class strings that do not appear at the call site",
      code: `<div className={\`\${base} \${modifier}\`} />;`,
    },

    // A runtime `join`, a `+`, or a `className` arriving through a spread leaves nothing tied
    // to this element. The token rules still read the `join` and spread strings; what is
    // lost is only whether the element under them is interactive.
    {
      kind: "blindspot",
      group: "Class strings assembled outside a recognised helper",
      code: `<div className={["p-2", "hover:bg-primary"].join(" ")} />;`,
    },
    {
      kind: "blindspot",
      group: "Class strings assembled outside a recognised helper",
      code: `<div className={"hover:" + "bg-primary"} />;`,
    },
    {
      kind: "blindspot",
      group: "Class strings assembled outside a recognised helper",
      code: `const spreadProps = { className: "hover:bg-primary" };
<div {...spreadProps} />;`,
    },

    // A class with an interpolation in it is judged by no rule in the package; complete
    // classes in the same template still are.
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`hover:\${utility}\`} />;`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`hover:bg-\${tone}\`} />;`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<div className={\`md:hover:\${utility}\`} />;`,
    },

    // Checking that the `group` ancestor is itself interactive would work only when marker
    // and consumer share an expression — a rule that works sometimes, silently.
    {
      kind: "blindspot",
      group: "`group` / `peer` markers on a non-interactive ancestor",
      code: `<div className="group">
  <div className="group-hover:bg-primary" />
</div>`,
    },

    // A variant map defines classes; the element they land on is unknown there.
    {
      kind: "blindspot",
      group: "`cva()` / `tv()` variant maps",
      code: `const row = cva("rounded-md", {
  variants: { tone: { muted: "hover:bg-muted" } },
});`,
    },

    // `class` is not a React prop. A Preact or Solid surface would be a change to this
    // contract, not an oversight in it.
    {
      kind: "blindspot",
      group: "The `class` attribute",
      code: `<div class="hover:bg-primary" />`,
    },

    // Outside the JS surface: CSS files are not linted yet.
    {
      kind: "blindspot",
      group: "`:hover` written in CSS",
      code: `const css = ".card:hover { background: var(--color-primary); }";`,
    },

    // The opt-in for the capitalized-component blind spot. Any tag name works: with
    // `["form"]`, a bare `<form>` reports; the same code is silent under the defaults.
    {
      kind: "caught",
      group: "`nonInteractiveComponents`",
      code: `<form className="hover:bg-muted" />`,
      options: options["form-opt-in"],
      reports: [
        { id: "hoverOnNonInteractive", line: 1, column: 18, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "allowed",
      group: "`nonInteractiveComponents`",
      code: `<form className="hover:bg-muted" />`,
      options: options.baseline,
    },
  ],
};
