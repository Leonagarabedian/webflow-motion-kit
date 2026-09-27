import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";

describe("scroll-media-mask-switch", () => {
  it("is registered as a reusable composition module", () => {
    const module = modules.find(({ name }) => name === "scroll-media-mask-switch");

    expect(module).toBeTruthy();
    expect(module.category).toBe("composition");
    expect(module.selector).toBe('[data-motion~="scroll-media-mask-switch"]');
    expect(typeof module.mount).toBe("function");
  });
});
