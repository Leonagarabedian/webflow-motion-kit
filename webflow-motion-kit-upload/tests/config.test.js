import { describe, expect, it } from "vitest";
import { readBoolean, readNumber, readString } from "../src/core/config.js";

describe("data attribute configuration", () => {
  it("reads typed values and falls back safely", () => {
    const element = document.createElement("div");
    element.dataset.duration = "1.25";
    element.dataset.enabled = "false";

    expect(readNumber(element, "duration", 2)).toBe(1.25);
    expect(readNumber(element, "missing", 2)).toBe(2);
    expect(readBoolean(element, "enabled", true)).toBe(false);
    expect(readString(element, "missing", "fallback")).toBe("fallback");
  });
});
