import { describe, expect, it } from "vitest";

import { inFamily, parseClass, splitOpacity, splitVariants } from "../../src/policy/variants.js";

describe("splitVariants", () => {
  it("splits stacked variants", () => {
    expect(splitVariants("md:dark:hover:bg-primary")).toEqual({
      variants: ["md", "dark", "hover"],
      base: "bg-primary",
    });
  });

  it("leaves a class with no variant alone", () => {
    expect(splitVariants("bg-primary")).toEqual({ variants: [], base: "bg-primary" });
  });

  // The regression that motivated a real parser: the proof of concept split on the last
  // colon and turned this into `var(--x)]`.
  it("does not split inside an arbitrary value", () => {
    expect(splitVariants("bg-[image:var(--x)]")).toEqual({
      variants: [],
      base: "bg-[image:var(--x)]",
    });
    expect(splitVariants("hover:text-[color:var(--brand)]")).toEqual({
      variants: ["hover"],
      base: "text-[color:var(--brand)]",
    });
  });

  it("does not split inside an arbitrary variant", () => {
    expect(splitVariants("[@media(hover:hover)]:flex")).toEqual({
      variants: ["[@media(hover:hover)]"],
      base: "flex",
    });
  });
});

describe("splitOpacity", () => {
  it("splits a modifier off a colour utility", () => {
    expect(splitOpacity("bg-primary/50")).toEqual({ base: "bg-primary", opacity: "50" });
  });

  it("leaves a utility with no modifier alone", () => {
    expect(splitOpacity("bg-primary")).toEqual({ base: "bg-primary", opacity: null });
  });

  it("ignores a slash inside brackets", () => {
    expect(splitOpacity("bg-[url(a/b.png)]")).toEqual({
      base: "bg-[url(a/b.png)]",
      opacity: null,
    });
  });
});

describe("inFamily", () => {
  it.each(["hover", "group-hover", "peer-hover", "has-hover", "group-hover/nav"])(
    "%s belongs to the hover family",
    (segment) => {
      expect(inFamily(segment, "hover")).toBe(true);
    },
  );

  it.each(["[@media(hover:hover)]", "not-hover", "focus", "hovered"])(
    "%s does not",
    (segment) => {
      expect(inFamily(segment, "hover")).toBe(false);
    },
  );

  // The mechanism is general: `"focus:"` covers focus, group-focus and peer-focus with no
  // new code, which is the whole point of families over exact segments.
  it("generalises to any family", () => {
    expect(inFamily("group-focus", "focus")).toBe(true);
    expect(inFamily("peer-checked", "checked")).toBe(true);
  });
});

describe("parseClass", () => {
  it("takes a class apart", () => {
    expect(parseClass("md:group-hover/nav:!bg-primary/50")).toEqual({
      variants: ["md", "group-hover/nav"],
      base: "bg-primary",
      important: true,
      opacity: "50",
    });
  });

  it("accepts important in either position", () => {
    expect(parseClass("dark:bg-primary!").important).toBe(true);
    expect(parseClass("dark:!bg-primary").important).toBe(true);
  });

  it("keeps an arbitrary value intact through every decoration", () => {
    expect(parseClass("hover:bg-[image:var(--x)]/80")).toEqual({
      variants: ["hover"],
      base: "bg-[image:var(--x)]",
      important: false,
      opacity: "80",
    });
  });
});
