/**
 * Variant parsing, shared by every rule that reads a class.
 *
 * A class decomposes as `variant:variant:[!]prefix-colorPart[!][/opacity]`, and getting the
 * decomposition wrong is the single most productive source of bugs in the proof of concept:
 * `hover:` matched as a substring also matched `group-hover:`, `peer-hover:` and
 * `[@media(hover:hover)]:`, while splitting on the *last* colon turned
 * `bg-[image:var(--x)]` into `var(--x)]`. One parser, four symptoms, so there is one parser
 * here (decision **A1**).
 *
 * The rule that makes it work is that a colon inside brackets is not a segment boundary. An
 * arbitrary value and an arbitrary variant both use them, and both are common enough that
 * "split on colons" is wrong rather than merely imprecise.
 */

/**
 * Split a class into its variant segments and the utility they decorate.
 *
 * @param {string} className
 * @returns {{ variants: string[], base: string }}
 */
export function splitVariants(className) {
  const variants = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < className.length; i++) {
    const char = className[i];
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth = Math.max(0, depth - 1);
    else if (char === ":" && depth === 0) {
      variants.push(className.slice(start, i));
      start = i + 1;
    }
  }

  return { variants, base: className.slice(start) };
}

/** Tailwind accepts `!` in either position; both mean the same thing and neither is a class. */
export function stripImportant(base) {
  if (base.startsWith("!")) return { base: base.slice(1), important: true };
  if (base.endsWith("!")) return { base: base.slice(0, -1), important: true };
  return { base, important: false };
}

/**
 * Split a trailing opacity modifier off a utility.
 *
 * The slash has to be at bracket depth zero: `bg-[image:var(--x)]` and
 * `bg-[url(a/b.png)]` both contain one that is not a modifier.
 */
export function splitOpacity(base) {
  let depth = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    const char = base[i];
    if (char === "]" || char === ")") depth++;
    else if (char === "[" || char === "(") depth = Math.max(0, depth - 1);
    else if (char === "/" && depth === 0) {
      return { base: base.slice(0, i), opacity: base.slice(i + 1) };
    }
  }
  return { base, opacity: null };
}

/** `group-hover/nav` names a group; the name is not part of the variant. */
export function stripGroupName(segment) {
  const slash = segment.indexOf("/");
  return slash === -1 ? segment : segment.slice(0, slash);
}

/**
 * Does a variant segment belong to a family?
 *
 * A policy key ending in `:` names a **family**, not an exact segment (decision **A3**), so
 * `"hover:"` governs `hover`, `group-hover`, `peer-hover` and `has-hover` alike. Which
 * element is hovered is irrelevant to the question a token policy asks — which token a
 * hover-triggered colour may use.
 *
 * Two carve-outs, both deliberate:
 *
 * - An **arbitrary variant** — `[@media(hover:hover)]` — is a device capability, not an
 *   element state.
 * - A **negated** variant — `not-hover` — is the inverse state, where a `-hover` token
 *   would read backwards.
 *
 * This is the *token policy* predicate. `no-useless-hover` asks a different question — is
 * styling conditional on hovering **this** element — and needs its own predicate over
 * `hover`, `not-hover` and `[&:hover]`. Neither set contains the other, which is exactly
 * why one shared predicate cannot serve both.
 */
export function inFamily(segment, family) {
  if (segment.startsWith("[")) return false;
  const name = stripGroupName(segment);
  if (name.startsWith("not-")) return false;
  return name === family || name.endsWith(`-${family}`);
}

/** A policy key like `"hover:"` names the family `hover`. */
export function familyOfKey(key) {
  return key.endsWith(":") ? key.slice(0, -1) : null;
}

/**
 * The full decomposition, for rules that need more than one part of it.
 *
 * @param {string} className
 * @returns {{ variants: string[], base: string, important: boolean, opacity: string | null }}
 */
export function parseClass(className) {
  const { variants, base: withDecorations } = splitVariants(className);
  const { base: withoutImportant, important } = stripImportant(withDecorations);
  const { base, opacity } = splitOpacity(withoutImportant);
  return { variants, base, important, opacity };
}
