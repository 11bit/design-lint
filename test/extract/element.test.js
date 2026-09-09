import { describe, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

import { elementProbe } from "./probe.js";

/**
 * The precise walk, route by route.
 *
 * The question here is narrower than the sweep's and much harder: not "is this string in
 * the file?" but "does it land on *this* element?". Half of these cases assert that the
 * answer is *no* — every blind spot the three JSX-scoped contracts declare is a line drawn
 * in this file, and a change that starts resolving one of them fails here first.
 */

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "tsx" } },
});

const valid = [];
const invalid = [];

function reaches(code, ...tokens) {
  if (tokens.length === 0) valid.push({ code });
  else invalid.push({ code, errors: tokens.map((token) => ({ messageId: "token", data: { token } })) });
}

function withHelpers(code, helpers, ...tokens) {
  const options = [{ helpers }];
  if (tokens.length === 0) valid.push({ code, options });
  else
    invalid.push({
      code,
      options,
      errors: tokens.map((token) => ({ messageId: "token", data: { token } })),
    });
}

// The shapes a className is written in.
reaches('<Button className="bg-primary" />', "bg-primary");
reaches("<Button className='bg-primary' />", "bg-primary");
reaches('<Button className={"bg-primary"} />', "bg-primary");
reaches("<Button className={`bg-primary`} />", "bg-primary");
reaches("<Button className={`rounded-md bg-primary ${extra}`} />", "rounded-md", "bg-primary");
reaches("<Button className={`bg-${tone}`} />", "bg-|");
reaches('<Button\n  data-testid="b"\n  className="bg-primary"\n/>', "bg-primary");

// Composition helpers, in any position and to any depth.
reaches('<Button className={cn("p-2", "bg-primary")} />', "p-2", "bg-primary");
reaches('<Button className={clsx("bg-primary", extra)} />', "bg-primary");
reaches('<Button className={twMerge(base, "bg-primary")} />', "bg-primary");
reaches('<Button className={twJoin("bg-primary")} />', "bg-primary");
reaches('<Button className={cx("bg-primary")} />', "bg-primary");
reaches('<Button className={tw("bg-primary")} />', "bg-primary");
reaches('<Button className={classNames("bg-primary")} />', "bg-primary");
reaches('<Button className={cn(isOpen && "bg-primary")} />', "bg-primary");
reaches('<Button className={cn(cond ? "bg-primary" : "bg-muted")} />', "bg-primary", "bg-muted");
reaches('<Button className={cond ? "bg-primary" : "bg-muted"} />', "bg-primary", "bg-muted");
reaches('<Button className={cn({ "bg-primary": isOpen })} />', "bg-primary");
reaches('<Button className={cn(["p-2", "bg-primary"])} />', "p-2", "bg-primary");
reaches('<Button className={cn("p-2", cn("bg-primary", cn("text-danger")))} />', "p-2", "bg-primary", "text-danger");
reaches("<Button className={cn(`bg-primary ${extra}`)} />", "bg-primary");
reaches('<Button className={`${cn("bg-primary")} p-2`} />', "p-2", "bg-primary");

// Each element is resolved on its own, outermost first.
reaches(
  '<div className="bg-outer">\n  <Button className="bg-inner" />\n</div>',
  "bg-outer",
  "bg-inner",
);

// Declared blind spots. The literal exists — the token rules still see every one of these
// through the sweep — but nothing connects it to this element.
reaches('const cls = "bg-primary";\n<Button className={cls} />;');
reaches("<Button className={CLASSES[variant]} />");
reaches("<Button className={styles.card} />");
reaches("<Button className={props.className} />");
reaches('<Button className={["p-2", "bg-primary"].join(" ")} />');
reaches('<Button className={"bg-" + tone} />');
reaches('const spreadProps = { className: "bg-primary" };\n<Button {...spreadProps} />;');
reaches("<Button {...rest} />");

// `cva()` and `tv()` are where a component declares its variants, not where a class lands
// on an element. The sweep sees inside them; this does not.
reaches('<Button className={cva("bg-primary")} />');
reaches('<Button className={tv({ base: "bg-primary" })} />');
reaches('const badge = cva("bg-primary", { variants: { tone: { bad: "text-danger" } } });');

// `class` is not a React prop.
reaches('<div class="bg-primary" />');

// Nothing at all.
reaches("<Button />");
reaches('<Button variant="destructive" />');
reaches('<Button style={{ color: "red" }} />');

// A project whose helper is called something else names it, rather than forking this.
withHelpers('<Button className={myCn("bg-primary")} />', ["myCn"], "bg-primary");
withHelpers('<Button className={cn("bg-primary")} />', ["myCn"]);

tester.run("precise walk", elementProbe, { valid, invalid });
