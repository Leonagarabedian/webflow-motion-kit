import { readFileSync } from "node:fs";
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

  it("keeps the public API generic", () => {
    const source = readFileSync(
      new URL("../src/modules/scroll/scroll-aperture-window.js", import.meta.url),
      "utf8"
    );

    expect(source).toContain('"parallax-layer"');
    expect(source).toContain("motion-parallax-y-to");
    expect(source).not.toContain('"sky"');
    expect(source).not.toContain("motion-sky");
    expect(source).not.toContain("Jesko");
  });
});
