import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";

describe("scroll-aperture-window", () => {
  it("is registered as a reusable composition module", () => {
    const module = modules.find(({ name }) => name === "scroll-aperture-window");

    expect(module).toBeTruthy();
    expect(module.category).toBe("composition");
    expect(module.selector).toBe('[data-motion~="scroll-aperture-window"]');
    expect(typeof module.mount).toBe("function");
  });
});
