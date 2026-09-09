import { describe, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { sweepProbe } from "./probe.js";

/**
 * The broad sweep, route by route.
 *
 * These are the same routes the evasion matrix enumerates, asked of extraction rather than
 * of a rule: not "is this reported?" but "is this string in front of the rule at all?".
 * Every token rule's coverage rests on the answers, which is why they are asserted here
 * once instead of nine times through nine sets of rule logic.
 */

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
});

const valid = [];
const invalid = [];

/** `sees(code)` with no tokens asserts the sweep finds nothing at all. */
function sees(code, ...tokens) {
  if (tokens.length === 0) valid.push({ code });
  else invalid.push({ code, errors: tokens.map((token) => ({ messageId: "token", data: { token } })) });
}

// Position is irrelevant: these are all just strings.
sees('<div className="bg-primary" />', "bg-primary");
sees('<div className="p-2 bg-primary" />', "p-2", "bg-primary");
sees("<div className='bg-primary' />", "bg-primary");
sees('<div className={"bg-primary"} />', "bg-primary");
sees("<div className={`bg-primary`} />", "bg-primary");
sees('const tone = "bg-primary";', "bg-primary");
sees('export const dangerText = "bg-primary";', "bg-primary");
sees('const map = { danger: "bg-primary", ok: "bg-success" };', "bg-primary", "bg-success");
sees('const list = ["bg-primary", "p-2"];', "bg-primary", "p-2");
// The `" "` separator is whitespace only, so it yields no token at all.
sees('const joined = ["bg-primary"].join(" ");', "bg-primary");
sees('const spreadProps = { className: "bg-primary" };', "bg-primary");
sees('<div className={cn("bg-primary", extra)} />', "bg-primary");
sees('<div className={clsx(isOn && "bg-primary")} />', "bg-primary");
sees('<div className={twMerge("p-2", "bg-primary")} />', "p-2", "bg-primary");
sees('<div className={tv({ base: "bg-primary" })} />', "bg-primary");
sees('const b = cva("p-2", { variants: { tone: { bad: "bg-primary" } } });', "p-2", "bg-primary");
sees('<div\n  className="bg-primary"\n/>', "bg-primary");
sees('element.classList.add("bg-primary");', "bg-primary");

// A hole is a token boundary when whitespace separates it, and part of the token when it
// does not. Every token rule depends on the difference.
sees("<div className={`bg-primary ${extra}`} />", "bg-primary");
sees("<div className={`rounded ${base} text-blue-200`} />", "rounded", "text-blue-200");
sees("<div className={`bg-${tone}-500`} />", "bg-|-500");
sees("<div className={`text-${x}`} />", "text-|");
sees("<div className={`bg-primary/${alpha}`} />", "bg-primary/|");
sees("<div className={`dark:${utility}`} />", "dark:|");
sees("<div className={`${base}`} />");
sees("<div className={`${base} ${modifier}`} />");

// An interpolation whose parts are static is not reassembled. Each literal arrives on its
// own, which is what every contract that meets this case promises.
sees('<div className={`text-${"mu"}${"ted"}`} />', "text-|", "mu", "ted");

// The cost of a context-free sweep, stated rather than hidden: strings that are not class
// names arrive too, and the rules' own gates are what keep them quiet.
sees('import { Button } from "@/components/ui/button";', "@/components/ui/button");
sees('<Chart palette="bg-primary" />', "bg-primary");
sees('const css = "color: #ff0000;";', "color:", "#ff0000;");

// Nothing to see.
sees("<div className={cls} />");
sees("<div className={CLASSES[tone]} />");
sees("<div className={props.className} />");
sees("<div {...rest} />");
sees("const n = 42;");

tester.run("broad sweep", sweepProbe, { valid, invalid });
