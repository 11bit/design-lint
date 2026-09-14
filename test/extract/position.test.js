import { describe, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { positionProbe } from "./probe.js";

/**
 * Class positions: which strings the sweep finds are written where a class list goes.
 *
 * The answer comes from the syntax around a string and never from its text, so every case
 * below pairs a position with a string that would pass any colour-prefix test. What is
 * asserted is the position alone.
 */

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
});

const valid = [];
const invalid = [];

/** `sees(code)` with no tokens asserts nothing in the file is in a class position. */
function sees(code, ...tokens) {
  if (tokens.length === 0) valid.push({ code });
  else invalid.push({ code, errors: tokens.map((token) => ({ messageId: "token", data: { token } })) });
}

// Attributes: `className` and `class`, and everything inside the expression.
sees('<div className="bg-primary" />', "bg-primary");
sees('<div class="bg-primary" />', "bg-primary");
sees("<div className={`bg-primary ${extra}`} />", "bg-primary");
sees('<div className={isOn ? "bg-primary" : "bg-muted"} />', "bg-primary", "bg-muted");
sees('<div className={format("bg-primary")} />', "bg-primary");

// Class helpers, as arguments to any depth: object keys, variant values, compound variants.
sees('const a = cn("p-2", isOn && "bg-primary");', "p-2", "bg-primary");
sees('const a = clsx({ "bg-primary": isOn });', "bg-primary");
sees('const a = twMerge(cn("bg-primary"));', "bg-primary");
sees('const a = tv({ base: "bg-primary" });', "bg-primary");
sees('const a = cva("p-2", { variants: { tone: { bad: "bg-primary" } } });', "p-2", "bg-primary");
sees('const a = cva("", { compoundVariants: [{ tone: "bad", class: "bg-primary" }] });', "bad", "bg-primary");

// A `className` or `class` property: its value, and only its value.
sees('const props = { className: "bg-primary" };', "bg-primary");
sees('const props = { "className": "bg-primary" };', "bg-primary");

// Everywhere else, whatever the string holds.
sees('const tone = "bg-primary";');
sees('const map = { danger: "bg-primary", ok: "bg-success" };');
sees('const joined = ["bg-primary", "p-2"].join(" ");');
sees('<Chart palette="bg-primary" />');
sees('<animate attributeName="stroke-opacity" />');
sees('const theme = { "shadow-color": shadow };');
sees('it("keeps a text-mono size", () => {});');
sees('const a = utils.cn("bg-primary");');
sees('const props = { ["className"]: "bg-primary" };');

tester.run("class positions", positionProbe, { valid, invalid });
