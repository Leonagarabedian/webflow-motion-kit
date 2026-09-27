import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";

describe("sticky-stage-runway", () => {
  it("is registered as a reusable primitive", () => {
    const module = modules.find(({ name }) => name === "sticky-stage-runway");

    expect(module).toBeTruthy();
    expect(module.category).toBe("primitive");
    expect(module.selector).toBe('[data-motion~="sticky-stage-runway"]');
    expect(typeof module.mount).toBe("function");
  });
});
