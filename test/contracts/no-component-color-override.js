/**
 * no-component-color-override — the contract.
 *
 * A colour class that statically reaches the `className` of a design-system component is
 * reported: the component owns its colour through variants, so the fix is an existing variant
 * or a new one. A component is watched when its identifier was imported from a path matching
 * a `componentSources` pattern, matched against the specifier as written, unless its exported
 * name is listed in `ignore`. There is no library exemption. Every case runs with the
 * preamble below prepended and with `componentSources: ["@/components/ui/*"]`
 * (test/harness/options.js). One report per class.
 */
export default {
  rule: "no-component-color-override",
  // `Button`, `Card`, `CardHeader` and `Badge` are watched; `Chart` comes from a path no
  // pattern matches, so it is not. A case that brings its own `import` adds to these.
  preamble: `import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chart } from "@/components/chart";`,
  cases: [

    // Watched by import name, not by scope
    // Watching keys on the import, and within a file the match is by name rather than scope: once
    // `Button` is imported from a watched source, a `Button` parameter is watched too.
    {
      kind: "caught",
      group: "Watched by import name, not by scope",
      code: `function Toolbar({ Button }) {
  return <Button className="bg-primary" />;
}`,
      reports: [
        { id: "colorOnComponent", line: 2, column: 29, endLine: 2, endColumn: 39 },
      ],
    },

    // A color class in a className
    // Any colour-carrying prefix with a colour value. `via` and `to` in one string are two reports.
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Button className="bg-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Button className='bg-primary' />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Button className={"bg-primary"} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 21, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Badge className="text-destructive" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 19, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Badge className="bg-red-500" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 19, endLine: 1, endColumn: 29 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Card className="border-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 18, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Button className="ring-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Button className="outline-danger" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Button className="fill-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Button className="stroke-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Button className="shadow-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Button className="decoration-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 38 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Button className="placeholder-muted" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 37 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Card className="from-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 18, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "A color class in a className",
      code: `<Card className="via-info to-success" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 18, endLine: 1, endColumn: 26 },
        { id: "colorOnComponent", line: 1, column: 27, endLine: 1, endColumn: 37 },
      ],
    },

    // Directional and compound color prefixes
    // The prefix set is derived from the design system, so per-side borders and `ring-offset`
    // arrive without a hand-kept list.
    {
      kind: "caught",
      group: "Directional and compound color prefixes",
      code: `<Card className="border-t-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 18, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Directional and compound color prefixes",
      code: `<Card className="border-x-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 18, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Directional and compound color prefixes",
      code: `<Card className="border-s-danger" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 18, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Directional and compound color prefixes",
      code: `<Button className="ring-offset-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Directional and compound color prefixes",
      code: `<Card className="divide-muted" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 18, endLine: 1, endColumn: 30 },
      ],
    },

    // Color keywords and arbitrary values
    // Keywords, raw literals in brackets, and `--color-*` references in either bracket spelling —
    // `[var(--color-x)]`, `[--color-x]`, v4's `(--color-x)` — are colours.
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="bg-white" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="text-black" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="bg-transparent" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="text-current" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="bg-[#ff0000]" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="text-[rgb(255_0_0)]" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 39 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="bg-[oklch(0.7_0.1_20)]" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="bg-[var(--color-primary)]" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="bg-[--color-primary]" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="bg-(--color-primary)" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="text-(color:--color-danger)" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 47 },
      ],
    },
    {
      kind: "caught",
      group: "Color keywords and arbitrary values",
      code: `<Button className="shadow-[0_0_4px_#000]" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 41 },
      ],
    },

    // Variants, opacity, and important modifiers
    // A variant only narrows *when* a colour applies; the colour is still being applied. The span
    // is the whole class the author edits, variant and modifiers included.
    {
      kind: "caught",
      group: "Variants, opacity, and important modifiers",
      code: `<Button className="hover:bg-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, opacity, and important modifiers",
      code: `<Button className="focus-visible:ring-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 46 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, opacity, and important modifiers",
      code: `<Button className="md:dark:text-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, opacity, and important modifiers",
      code: `<Button className="group-hover:bg-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, opacity, and important modifiers",
      code: `<Button className="not-hover:bg-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 40 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, opacity, and important modifiers",
      code: `<Button className="data-[state=open]:bg-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 48 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, opacity, and important modifiers",
      code: `<Button className="bg-primary/50" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 33 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, opacity, and important modifiers",
      code: `<Button className="!bg-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, opacity, and important modifiers",
      code: `<Button className="bg-primary!" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Variants, opacity, and important modifiers",
      code: `<Button className="hover:bg-red-500/80" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 39 },
      ],
    },

    // Class strings reached through composition
    // `cn()` / `clsx()` / `twMerge()` are followed in any argument position, to any depth, and
    // both arms of a conditional are read.
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<Button className={cn("bg-primary")} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 24, endLine: 1, endColumn: 34 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<Button className={cn("rounded-md", "bg-primary")} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 38, endLine: 1, endColumn: 48 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<Button className={clsx("bg-primary", extra)} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 26, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<Button className={twMerge(base, "bg-primary")} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 35, endLine: 1, endColumn: 45 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<Button className={cn(isActive && "bg-primary")} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 36, endLine: 1, endColumn: 46 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<Button className={cn({ "bg-primary": isActive })} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 26, endLine: 1, endColumn: 36 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<Button className={cn(["p-2", "bg-primary"])} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 32, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<Button className={cn(base, cn("p-2", clsx("bg-primary")))} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 45, endLine: 1, endColumn: 55 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<Button className={isActive ? "bg-primary" : "bg-muted"} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 32, endLine: 1, endColumn: 42 },
        { id: "colorOnComponent", line: 1, column: 47, endLine: 1, endColumn: 55 },
      ],
    },
    {
      kind: "caught",
      group: "Class strings reached through composition",
      code: `<Button className={cn(className, "bg-primary")} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 35, endLine: 1, endColumn: 45 },
      ],
    },

    // Multi-line elements
    // Located at the class, not at the element spanning the lines.
    {
      kind: "caught",
      group: "Multi-line elements",
      code: `<Card
  className="bg-primary"
/>`,
      reports: [
        { id: "colorOnComponent", line: 2, column: 14, endLine: 2, endColumn: 24 },
      ],
    },
    {
      kind: "caught",
      group: "Multi-line elements",
      code: `<Card
  variant="outline"
  className={cn(
    "text-danger",
    className,
  )}
/>`,
      reports: [
        { id: "colorOnComponent", line: 4, column: 6, endLine: 4, endColumn: 17 },
      ],
    },

    // Template literals
    // Complete classes in a template's static text are checked, interpolation or not.
    {
      kind: "caught",
      group: "Template literals",
      code: `<Button className={\`bg-primary\`} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 21, endLine: 1, endColumn: 31 },
      ],
    },
    {
      kind: "caught",
      group: "Template literals",
      code: `<Button className={\`rounded-md bg-primary\`} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 32, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Template literals",
      code: `<Button className={\`rounded-md bg-primary \${extra}\`} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 32, endLine: 1, endColumn: 42 },
      ],
    },
    {
      kind: "caught",
      group: "Template literals",
      code: `<Button className={\`\${base} text-destructive\`} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 29, endLine: 1, endColumn: 45 },
      ],
    },

    // Aliased imports
    // The binding is followed, not the spelling: a renamed import is still watched.
    {
      kind: "caught",
      group: "Aliased imports",
      code: `import { Button as Btn } from "@/components/ui/button";
<Btn className="bg-primary" />;`,
      reports: [
        { id: "colorOnComponent", line: 2, column: 17, endLine: 2, endColumn: 27 },
      ],
    },

    // Namespaced components
    // `<Card.Header>` is watched through its root object; a named compound member through its
    // own import.
    {
      kind: "caught",
      group: "Namespaced components",
      code: `<Card.Header className="bg-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 25, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Namespaced components",
      code: `<CardHeader className="bg-primary" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 24, endLine: 1, endColumn: 34 },
      ],
    },

    // Inside the component library itself
    // No library exemption: a library component composing another is held to the same standard.
    // Sibling files importing relatively (`./button`) match no alias pattern, so are not watched.
    {
      kind: "caught",
      group: "Inside the component library itself",
      code: `// src/components/ui/alert.tsx
<Card className="bg-danger-weak" />`,
      reports: [
        { id: "colorOnComponent", line: 2, column: 18, endLine: 2, endColumn: 32 },
      ],
    },

    // Multiple offences
    // One report per offending class, across elements and composition helpers.
    {
      kind: "caught",
      group: "Multiple offences",
      code: `<Button className="bg-primary text-destructive" />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 30 },
        { id: "colorOnComponent", line: 1, column: 31, endLine: 1, endColumn: 47 },
      ],
    },
    {
      kind: "caught",
      group: "Multiple offences",
      code: `<Button className={cn("bg-primary", isError && "text-destructive")} />`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 24, endLine: 1, endColumn: 34 },
        { id: "colorOnComponent", line: 1, column: 49, endLine: 1, endColumn: 65 },
      ],
    },
    {
      kind: "caught",
      group: "Multiple offences",
      code: `<Button className="bg-primary">
  <Badge className="bg-red-500" />
</Button>`,
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 30 },
        { id: "colorOnComponent", line: 2, column: 21, endLine: 2, endColumn: 31 },
      ],
    },

    // Anything that is not a watched component
    // Allowed. An intrinsic element, a component from an unwatched path (`Chart`), one never
    // imported (`MotionDiv`), or one declared locally (`Tooltip`) is not a design-system component.
    {
      kind: "allowed",
      group: "Anything that is not a watched component",
      code: `<div className="bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Anything that is not a watched component",
      code: `<span className="text-destructive" />`,
    },
    {
      kind: "allowed",
      group: "Anything that is not a watched component",
      code: `<Chart className="bg-primary" />`,
    },
    {
      kind: "allowed",
      group: "Anything that is not a watched component",
      code: `<MotionDiv className="bg-red-500" />`,
    },
    {
      kind: "allowed",
      group: "Anything that is not a watched component",
      code: `const Tooltip = styled.div\`\`;
<Tooltip className="bg-primary" />;`,
    },

    // Components imported by a non-matching path
    // Allowed. A relative import does not match an alias pattern — the escape valve inside the
    // component library, falling out of import matching rather than kept as an exemption.
    {
      kind: "allowed",
      group: "Components imported by a non-matching path",
      code: `import { Separator } from "./separator";
<Separator className="bg-border" />;`,
    },

    // Non-color utilities on a watched component
    // Allowed. Spacing, layout, sizing, radius and type scale are the call site's by default;
    // `ownedUtilities` widens what the component owns. The default is empty.
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Button className="px-4 py-2" />`,
    },
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Button className="rounded-md" />`,
    },
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Button className="text-sm font-medium" />`,
    },
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Button className="shadow-md" />`,
    },
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Button className="border-2" />`,
    },
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Button className="divide-y" />`,
    },
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Button className="flex items-center gap-2" />`,
    },
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Button className="w-full max-w-sm" />`,
    },
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Button className="absolute top-0 z-10" />`,
    },
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Card className="from-0% to-100%" />`,
    },
    {
      kind: "allowed",
      group: "Non-color utilities on a watched component",
      code: `<Button className="rounded-full" />`,
    },

    // Owned utilities
    // `ownedUtilities` hands a non-colour prefix to the component: with `rounded` owned, a
    // radius on a watched component reports like a colour does.
    {
      kind: "caught",
      group: "Owned utilities",
      code: `<Button className="rounded-full" />`,
      options: { ownedUtilities: ["rounded"] },
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 32 },
      ],
    },
    {
      kind: "caught",
      group: "Owned utilities",
      code: `<Button className="rounded" />`,
      options: { ownedUtilities: ["rounded"] },
      reports: [
        { id: "colorOnComponent", line: 1, column: 20, endLine: 1, endColumn: 27 },
      ],
    },

    // Ignored components
    // `ignore` names components the rule skips, meant for ones that paint no colour of their own — an icon
    // drawn in `currentColor`, a layout wrapper — and a colour on their `className` is allowed.
    // The name is the one the module exports: a renamed import stays exempt, a component
    // renamed *to* a listed name does not become exempt, and a namespace member is its export.
    // A member is its own component, so listing `Card` leaves `<Card.Header>` watched. A
    // default import goes by its local name. Everything else on the page is still watched.
    {
      kind: "allowed",
      group: "Ignored components",
      code: `import { Icon } from "@/components/ui/icon";
<Icon className="text-primary" />;`,
      options: { ignore: ["Icon"] },
    },
    {
      kind: "allowed",
      group: "Ignored components",
      code: `import { Icon as Glyph } from "@/components/ui/icon";
<Glyph className="text-primary" />;`,
      options: { ignore: ["Icon"] },
    },
    {
      kind: "allowed",
      group: "Ignored components",
      code: `import * as UI from "@/components/ui/icon";
<UI.Icon className="text-primary" />;`,
      options: { ignore: ["Icon"] },
    },
    {
      kind: "allowed",
      group: "Ignored components",
      code: `import Icon from "@/components/ui/icon";
<Icon className="text-primary" />;`,
      options: { ignore: ["Icon"] },
    },
    {
      kind: "allowed",
      group: "Ignored components",
      code: `<Card.Header className="bg-primary" />`,
      options: { ignore: ["Card.Header"] },
    },
    {
      kind: "caught",
      group: "Ignored components",
      code: `import { Icon } from "@/components/ui/icon";
<Icon className="text-primary" />;`,
      reports: [
        { id: "colorOnComponent", line: 2, column: 18, endLine: 2, endColumn: 30 },
      ],
    },
    {
      kind: "caught",
      group: "Ignored components",
      code: `import { Button as Icon } from "@/components/ui/button";
<Icon className="bg-primary" />;`,
      options: { ignore: ["Icon"] },
      reports: [
        { id: "colorOnComponent", line: 2, column: 18, endLine: 2, endColumn: 28 },
      ],
    },
    {
      kind: "caught",
      group: "Ignored components",
      code: `<Card.Header className="bg-primary" />`,
      options: { ignore: ["Card"] },
      reports: [
        { id: "colorOnComponent", line: 1, column: 25, endLine: 1, endColumn: 35 },
      ],
    },
    {
      kind: "caught",
      group: "Ignored components",
      code: `import { Icon } from "@/components/ui/icon";
<Button className="bg-primary"><Icon className="text-primary" /></Button>;`,
      options: { ignore: ["Icon"] },
      reports: [
        { id: "colorOnComponent", line: 2, column: 20, endLine: 2, endColumn: 30 },
      ],
    },

    // Arbitrary values that are not colors
    // Allowed. A named colour in brackets is no-raw-color's to report; a variable outside
    // `--color-*` may not be a colour at all.
    {
      kind: "allowed",
      group: "Arbitrary values that are not colors",
      code: `<Button className="text-[14px]" />`,
    },
    {
      kind: "allowed",
      group: "Arbitrary values that are not colors",
      code: `<Button className="bg-[url('/hero.png')]" />`,
    },
    {
      kind: "allowed",
      group: "Arbitrary values that are not colors",
      code: `<Button className="w-[calc(100%-2rem)]" />`,
    },
    {
      kind: "allowed",
      group: "Arbitrary values that are not colors",
      code: `<Button className="shadow-[0_0_4px_var(--spacing-1)]" />`,
    },
    {
      kind: "allowed",
      group: "Arbitrary values that are not colors",
      code: `<Button className="text-(length:--spacing-4)" />`,
    },
    {
      kind: "allowed",
      group: "Arbitrary values that are not colors",
      code: `<Button className="text-[red]" />`,
    },
    {
      kind: "allowed",
      group: "Arbitrary values that are not colors",
      code: `<Button className="bg-[var(--brand)]" />`,
    },
    {
      kind: "allowed",
      group: "Arbitrary values that are not colors",
      code: `<Button className="bg-(--brand)" />`,
    },

    // Colour on a prop other than className
    // Allowed. `className` is the channel this rule owns. A colour prop is the component's chosen
    // API, and `style` is no-style-color's.
    {
      kind: "allowed",
      group: "Colour on a prop other than className",
      code: `<Button variant="destructive" />`,
    },
    {
      kind: "allowed",
      group: "Colour on a prop other than className",
      code: `<Badge tone="danger" />`,
    },
    {
      kind: "allowed",
      group: "Colour on a prop other than className",
      code: `<Chart color="#ff0000" />`,
    },
    {
      kind: "allowed",
      group: "Colour on a prop other than className",
      code: `<Button style={{ color: "red" }} />`,
    },

    // Variant definitions
    // Allowed. `cva()` / `tv()` is where the design system declares its colours — what this rule
    // pushes people toward — and it is not a JSX element. The token rules still check it.
    {
      kind: "allowed",
      group: "Variant definitions",
      code: `const badge = cva("inline-flex rounded", {
  variants: {
    tone: {
      danger: "bg-danger text-danger-content",
      success: "bg-success text-success-content",
    },
  },
  compoundVariants: [{ tone: "danger", outline: true, class: "border-danger" }],
});`,
    },

    // Variable and object-map indirection
    // Blind spot. The class never appears at the call site. One level of indirection is left
    // unresolved across all JSX-scoped rules, since 'how many levels' has no principled answer;
    // the token rules still report the map's strings as classes.
    {
      kind: "blindspot",
      group: "Variable and object-map indirection",
      code: `const cls = "bg-primary";
<Button className={cls} />;`,
    },
    {
      kind: "blindspot",
      group: "Variable and object-map indirection",
      code: `const TONE = { danger: "bg-red-500", ok: "bg-green-500" };
<Button className={TONE[tone]} />;`,
    },
    {
      kind: "blindspot",
      group: "Variable and object-map indirection",
      code: `<Button className={styles.card} />;`,
    },
    {
      kind: "blindspot",
      group: "Variable and object-map indirection",
      code: `<Button className={getClasses(tone)} />;`,
    },

    // Dynamic `import()`
    // Blind spot. Watching needs a static `import` specifier to match against a pattern.
    {
      kind: "blindspot",
      group: "Dynamic `import()`",
      code: `const LazyCard = React.lazy(() => import("@/components/ui/card"));
<LazyCard className="bg-primary" />;`,
    },

    // Color arriving through props
    // Blind spot. Forwarded `className` is the caller's decision: reporting here blames the wrong
    // file, and reporting at the caller is cross-module analysis.
    {
      kind: "blindspot",
      group: "Color arriving through props",
      code: `<Button className={className} />;`,
    },
    {
      kind: "blindspot",
      group: "Color arriving through props",
      code: `<Button className={props.className} />;`,
    },
    {
      kind: "blindspot",
      group: "Color arriving through props",
      code: `<Button {...props} />;`,
    },
    {
      kind: "blindspot",
      group: "Color arriving through props",
      code: `<Button {...rest} className={cn(className)} />;`,
    },

    // Classes built by interpolation
    // Blind spot. A class with an interpolation in it is not checked by any rule; complete classes
    // in the same template still are. Choose between complete class names to have a choice checked.
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<Button className={\`bg-\${tone}\`} />`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<Button className={\`text-\${tone}\`} />`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<Button className={\`bg-red-\${shade}\`} />`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<Button className={\`border-t-\${tone}\`} />`,
    },
    {
      kind: "blindspot",
      group: "Classes built by interpolation",
      code: `<Button className={cn(\`bg-\${tone}\`, "p-2")} />`,
    },

    // Fully dynamic class construction
    // Blind spot. A class assembled with `+`, `join`, or an interpolated prefix is not checked either.
    {
      kind: "blindspot",
      group: "Fully dynamic class construction",
      code: `<Button className={\`\${prefix}-primary\`} />;`,
    },
    {
      kind: "blindspot",
      group: "Fully dynamic class construction",
      code: `<Button className={"bg" + "-" + tone} />;`,
    },
    {
      kind: "blindspot",
      group: "Fully dynamic class construction",
      code: `<Button className={parts.join(" ")} />;`,
    },

    // Runtime-selected component types
    // Blind spot. A tag chosen at runtime — a variable, a `Slot` — carries no import to watch.
    {
      kind: "blindspot",
      group: "Runtime-selected component types",
      code: `const C = condition ? Button : Card;
<C className="bg-primary" />;`,
    },
    {
      kind: "blindspot",
      group: "Runtime-selected component types",
      code: `<Slot className="bg-primary" />;`,
    },

    // Color reaching the component through CSS
    // Blind spot. CSS modules and stylesheets are not read, and have no JSX element to report at.
    {
      kind: "blindspot",
      group: "Color reaching the component through CSS",
      code: `import cardStyles from "./card.module.css";
<Card className={cardStyles.tinted} />;`,
    },

    // Imports spelled differently from the pattern
    // Blind spot, accepted for now. A second alias for the same folder, or a relative path from
    // outside the library, is not matched by spelling. Planned: resolve imports through the
    // project's alias maps, at which point these start failing.
    {
      kind: "blindspot",
      group: "Imports spelled differently from the pattern",
      code: `import { Sheet } from "#/components/ui/sheet";
<Sheet className="bg-primary" />;`,
    },
    {
      kind: "blindspot",
      group: "Imports spelled differently from the pattern",
      code: `import { Toaster } from "../components/ui/sonner";
<Toaster className="bg-primary" />;`,
    },

    // Globs match one path segment
    // Blind spot. `*` matches within one path segment, so `@/components/ui/*` does not reach
    // `…/ui/chip/index`; `**` crosses segments.
    {
      kind: "blindspot",
      group: "Globs match one path segment",
      code: `import { Chip } from "@/components/ui/chip/index";
<Chip className="bg-primary" />;`,
    },
  ],
};
