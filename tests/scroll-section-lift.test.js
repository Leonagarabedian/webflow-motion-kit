import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";

describe("scroll-section-lift", () => {
  it("is registered as a reusable scroll module", () => {
    const module = modules.find(({ name }) => name === "scroll-section-lift");

    expect(module).toBeTruthy();
    expect(module.category).toBe("scroll");
    expect(module.selector).toBe('[data-motion~="scroll-section-lift"]');
    expect(typeof module.mount).toBe("function");
  });
});
