import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";

describe("scroll-layer-handoff", () => {
  it("is registered as a reusable composition module", () => {
    const module = modules.find(({ name }) => name === "scroll-layer-handoff");

    expect(module).toBeTruthy();
    expect(module.category).toBe("composition");
    expect(module.selector).toBe('[data-motion~="scroll-layer-handoff"]');
    expect(typeof module.mount).toBe("function");
  });
});
