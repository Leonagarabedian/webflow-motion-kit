import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";

describe("module registry", () => {
  it("publishes twenty-four uniquely named, mountable modules", () => {
    expect(modules).toHaveLength(24);
    expect(new Set(modules.map(({ name }) => name))).toHaveProperty("size", 24);
    expect(modules.every(({ mount, selector }) => typeof mount === "function" && selector)).toBe(true);
  });
});
