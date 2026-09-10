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
 * A token also carries `range`, the span of the class itself in the file, so a diagnostic
 * lands on `bg-red-500` and not on the string that happens to hold it. Every rule wants
 * that, and before it lived here every rule recovered it the same way — by searching the
 * node's raw text for the token and walking a cursor forward past earlier matches. Eight
 * copies of one search is how two of them come to disagree about a class that appears
 * twice.
 *
 * `range` is `null` when the offsets cannot be trusted rather than approximately right:
 * an escape makes raw and cooked text different lengths, so every offset after it would be
 * wrong. A rule with no range reports at the node instead, which is the same fallback the
 * hand-written searches used when they failed to find the token.
 *
 * @typedef {{
 *   text: string | null,
 *   dynamic: boolean,
 *   head: string,
 *   tail: string,
 *   node: object,
 *   range: [number, number] | null,
 * }} ClassToken
 */

const WHITESPACE = /\s+/;
const NON_SPACE_RUN = /\S+/g;

/** The non-whitespace runs of a segment, each with its offset inside that segment. */
function piecesOf(text) {
  const pieces = [];
  NON_SPACE_RUN.lastIndex = 0;
  let match;
  while ((match = NON_SPACE_RUN.exec(text))) pieces.push({ text: match[0], at: match.index });
  return pieces;
}

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
        range: open.exact && open.start !== null ? [open.start, open.end] : null,
      });
    }
    open = null;
  };

  /** Extend the open token to cover a piece, or start one covering it. */
  const cover = (segment, piece) => {
    const start = segment.start === undefined ? null : segment.start + piece.at;
    const end = start === null ? null : start + piece.text.length;
    if (!open) open = { head: "", tail: "", dynamic: false, start, end, exact: segment.exact };
    else {
      // A dynamic token spans its hole: it starts at its head and ends at its tail, and the
      // interpolation in between is part of the class as written.
      if (open.start === null) open.start = start;
      open.end = end;
      open.exact = open.exact && segment.exact;
    }
  };

  for (const segment of source.segments) {
    const pieces = piecesOf(segment.text);
    const startsWithSpace = WHITESPACE.test(segment.text.charAt(0));
    const endsWithSpace = segment.text.length > 0 && WHITESPACE.test(segment.text.slice(-1));

    // Whitespace at the start of a segment closes whatever the previous hole left open.
    if (startsWithSpace) close();

    pieces.forEach((piece, i) => {
      if (i > 0) close();
      cover(segment, piece);
      if (open.dynamic) open.tail += piece.text;
      else open.head += piece.text;
    });

    if (endsWithSpace) close();

    if (segment.followedByExpression) {
      // The hole falls inside the token only if one is open; otherwise the next static
      // piece starts a fresh one and the interpolation stood alone.
      if (open) {
        open.dynamic = true;
        open.tail = "";
      } else {
        open = { head: "", tail: "", dynamic: true, start: null, end: null, exact: segment.exact };
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
