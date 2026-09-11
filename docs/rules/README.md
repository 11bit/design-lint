# Rule guide

Design Lint keeps product code aligned with a token-based design system. These rules are written for teams that want colors, themes, and component appearances to be named and reviewed in one place instead of recreated at each call site.

| Rule | What it prevents |
| --- | --- |
| [`no-style-color`](./no-style-color.md) | Applying color through React's `style` prop |
| [`no-raw-color`](./no-raw-color.md) | Writing literal colors such as `#fff`, `rgb(...)`, or `red` in application code |
| [`no-spectral-color`](./no-spectral-color.md) | Using Tailwind palette classes such as `bg-red-500` instead of semantic tokens |
| [`no-undefined-token`](./no-undefined-token.md) | Using token-like color classes that do not exist |
| [`token-constraints`](./token-constraints.md) | Using a valid token in the wrong place, such as a text token as a background |
| [`no-opacity-modifier`](./no-opacity-modifier.md) | Deriving translucent colors with `/50`, `/75`, and similar modifiers |
| [`no-dark-variant`](./no-dark-variant.md) | Adding local dark-mode branches with `dark:` or `light-dark()` |
| [`no-useless-hover`](./no-useless-hover.md) | Styling hover states on elements that are not interactive |
| [`no-component-color-override`](./no-component-color-override.md) | Recoloring design-system components through `className` |

## The shared idea

Colors should be semantic. Code should say what a color means — `primary`, `danger`, `muted`, `border` — and the design system should decide what that means in each theme.

The rules cover three common ways this breaks down:

1. **A color is written directly.** Example: `#ff0000`, `red`, `rgb(...)`.
2. **A color bypasses the token vocabulary.** Example: `bg-red-500` or `bg-primary/50`.
3. **A token is used outside its intended role.** Example: `bg-muted-foreground`.

The goal is not to enforce a particular visual style. The goal is to keep design decisions named, searchable, themeable, and reviewable.
