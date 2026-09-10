/**
 * Policy: the questions the rules ask about a design system, answered once.
 *
 * This is an entry point rather than an internal directory because the answers outlive any
 * one rule. A project writing its own check — a codemod, a report, a rule this package does
 * not have — should ask the same "is this a colour class?" as the nine do, rather than
 * growing a tenth answer to it.
 *
 * Everything here is a pure function of what it is handed. `loadDesignSystem` is the one
 * exception and says so: it is the single place in the package that touches a filesystem.
 */

export { designSystemPolicy } from "./design-system.js";
export { classShaped, colorPrefixOf, isClassList } from "./class-list.js";
export {
  DEFAULT_IGNORED_VALUES,
  NAMED_COLORS,
  SYSTEM_COLORS,
  firstRawColor,
  rawColorsIn,
  wholeValueColor,
} from "./color.js";
export { globToRegExp, ignoredFile } from "./ignore.js";
export { loadDesignSystem, loadPalette, readTokenFiles } from "./load.js";
export { colorProperty, isCustomProperty, normalizeProperty } from "./properties.js";
export { classTokens, tokensOf } from "./tokenize.js";
export { projectTokens, resolveTokenSet } from "./tokens.js";
export {
  familyOfKey,
  inFamily,
  parseClass,
  splitOpacity,
  splitVariants,
  stripGroupName,
  stripImportant,
} from "./variants.js";
