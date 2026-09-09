
# legend
(generic)/(tailwnd) - scope of the rule, generic = applies to all code, tailwnd = applies to tailwind classes only
(exists) - already exist in the world

# JS/TS/HTML
- (generic) No colors in style="" prop
- (tailwnd) (exists config) no hex (or other) raw colors in tailwind classes like bg-[#ff0000]
- (tailwnd) (exists config) no opacity modifiers on color classes (bg-destructive/5)
- (tailwnd) (exists config) no spectral color classes (bg-red-600)
- (tailwnd) token constraints - allow/deny list per color prefix. So `border-$color` will accept only colors approved for borders
- (tailwnd) (exists config) no dark variant (dark:bg-*). use css custom properties instead ==(we need a recomendation how)==
- (tailwnd) no-useless-hover - disable hower styels on non-interactive elements (is it really a problem???)
- (tailwnd) no-component-color-override - do not pass color classes to components via className prop
- (tailwnd) (exists tailwindcss) no-undefined-token - check that color class resolves to a tailwind design system


# CSS
- no hex (or other) raw colors in css files
- ==no opacity modifiers in css?==
-
