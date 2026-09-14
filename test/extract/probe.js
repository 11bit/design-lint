import { classSourcesOfElement, inClassPosition, sweepVisitors } from "../../src/extract/index.js";
import { classTokens } from "../../src/policy/tokenize.js";

/**
 * Probe rules: rules that exist only to say what the extractor saw.
 *
 * The extractor is tested through the linter rather than against a parser of its own, so
 * the AST under test is the AST the real rules will get. A probe reports one diagnostic per
 * extracted token, which makes `RuleTester`'s ordered `errors` array an exact assertion on
 * extraction output — the token that was found, in the order it was found — without any
 * rule logic in the way.
 *
 * A token is rendered as its text, or as `head|tail` when a hole falls inside it, so the
 * distinction between "a class" and "a prefix against an interpolation" is visible in the
 * assertion rather than implied by it.
 */
export function render(token) {
  return token.dynamic ? `${token.head}|${token.tail}` : token.text;
}

const meta = {
  type: "problem",
  schema: [{ type: "object", additionalProperties: true }],
  messages: { token: "{{token}}" },
};

/** Reports every token the broad sweep finds, anywhere in the file. */
export const sweepProbe = {
  meta,
  create(context) {
    return sweepVisitors((source) => {
      for (const token of classTokens(source)) {
        context.report({ node: source.node, messageId: "token", data: { token: render(token) } });
      }
    });
  },
};

/** Reports every token the broad sweep finds in a string written where a class list goes. */
export const positionProbe = {
  meta,
  create(context) {
    return sweepVisitors((source) => {
      if (!inClassPosition(source.node)) return;
      for (const token of classTokens(source)) {
        context.report({ node: source.node, messageId: "token", data: { token: render(token) } });
      }
    });
  },
};

/** Reports every token that statically reaches a JSX element's `className`. */
export const elementProbe = {
  meta,
  create(context) {
    const helpers = context.options?.[0]?.helpers;
    return {
      JSXOpeningElement(node) {
        for (const source of classSourcesOfElement(node, helpers ? { helpers } : {})) {
          for (const token of classTokens(source)) {
            context.report({
              node: source.node,
              messageId: "token",
              data: { token: render(token) },
            });
          }
        }
      },
    };
  },
};
