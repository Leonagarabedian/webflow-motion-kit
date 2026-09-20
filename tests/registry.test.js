import { describe, expect, it } from "vitest";
import { stationaryTypographyNames } from "../src/modules/stationary-text-policy.js";
import { modules } from "../src/modules/registry.js";

describe("module registry", () => {
  it("publishes unique mountable modules and registers every stationary typography module", () => {
    expect(modules.length).toBeGreaterThan(0);
    expect(modules.map(({ name }) => name)).toEqual(expect.arrayContaining(stationaryTypographyNames));
    expect(new Set(modules.map(({ name }) => name))).toHaveProperty("size", modules.length);
    expect(modules.every(({ mount, selector }) => typeof mount === "function" && selector)).toBe(true);
    expect(modules.every(({ category }) => ["primitive", "component", "composition", "typography", "interaction"].includes(category))).toBe(true);
  });
});
