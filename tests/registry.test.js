import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";

describe("module registry", () => {
  it("publishes sixteen uniquely named, mountable modules", () => {
    expect(modules).toHaveLength(16);
    expect(new Set(modules.map(({ name }) => name))).toHaveProperty("size", 16);
    expect(modules.every(({ mount, selector }) => typeof mount === "function" && selector)).toBe(true);
  });
});
