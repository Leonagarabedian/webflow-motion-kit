import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";

describe("module registry", () => {
  it("publishes twenty-five uniquely named, mountable modules", () => {
    expect(modules).toHaveLength(25);
    expect(new Set(modules.map(({ name }) => name))).toHaveProperty("size", 25);
    expect(modules.every(({ mount, selector }) => typeof mount === "function" && selector)).toBe(true);
    expect(modules.every(({ category }) => ["primitive", "component", "composition"].includes(category))).toBe(true);
  });
});
