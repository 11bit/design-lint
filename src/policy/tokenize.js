/**
 * A **class token** is one whitespace-delimited candidate class, recovered from a class
 * source.
 *
 * Splitting on whitespace is the easy half. The half that matters is what happens at an
 * interpolation: in `` `rounded ${base} text-blue-200` `` the hole is a token boundary and
 * both neighbours are ordinary complete classes, while in `` `bg-${tone}-500` `` the hole is
 * *inside* a token and neither neighbour is a class at all. Every rule needs that
 * distinction and none of them should have to derive it, so it is drawn once, here.
 *
 * A dynamic token keeps its static pieces: `head` is the text before the first hole, which
 * is what a rule tests when it asks "is this a colour prefix against an interpolation?"
 * (decision **A7b**), and `tail` is the text after the last one.
 *
 * @typedef {{
 *   text: string | null,
 *   dynamic: boolean,
 *   head: string,
 *   tail: string,
 *   node: object,
 * }} ClassToken
 */

const WHITESPACE = /\s+/;

/**
 * @param {import("../extract/sources.js").ClassSource} source
 * @returns {ClassToken[]}
 */
export function classTokens(source) {
  const tokens = [];

  /** The token being built across segments and holes, or null between tokens. */
  let open = null;

  const close = () => {
    if (!open) return;
    // A hole with no static text on either side — `${cls}` on its own — is not a candidate
    // class in any rule's sense. There is nothing to test it against, and every rule that
    // meets one declares it a blind spot, so it is dropped rather than carried.
    if (open.dynamic ? open.head || open.tail : open.head) {
      tokens.push({
        text: open.dynamic ? null : open.head,
        dynamic: open.dynamic,
        head: open.head,
        tail: open.tail,
        node: source.node,
      });
    }
    open = null;
  };

  for (const segment of source.segments) {
    const pieces = segment.text.split(WHITESPACE);
    const startsWithSpace = WHITESPACE.test(segment.text.charAt(0));
    const endsWithSpace = segment.text.length > 0 && WHITESPACE.test(segment.text.slice(-1));

    // Whitespace at the start of a segment closes whatever the previous hole left open.
    if (startsWithSpace) close();

    pieces.forEach((piece, i) => {
      if (i > 0) close();
      if (!piece) return;
      if (!open) open = { head: "", tail: "", dynamic: false };
      if (open.dynamic) open.tail += piece;
      else open.head += piece;
    });

    if (endsWithSpace) close();

    if (segment.followedByExpression) {
      // The hole falls inside the token only if one is open; otherwise the next static
      // piece starts a fresh one and the interpolation stood alone.
      if (open) {
        open.dynamic = true;
        open.tail = "";
      } else {
        open = { head: "", tail: "", dynamic: true };
      }
    }
  }

  close();
  return tokens;
}

/** Every token of every source, in source order. */
export function tokensOf(sources) {
  return sources.flatMap(classTokens);
}
