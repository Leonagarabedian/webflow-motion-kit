import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";

describe("module registry", () => {
  it("publishes twenty-three uniquely named, mountable modules", () => {
    expect(modules).toHaveLength(23);
    expect(new Set(modules.map(({ name }) => name))).toHaveProperty("size", 23);
    expect(modules.every(({ mount, selector }) => typeof mount === "function" && selector)).toBe(true);
  });
});
