import { describe, expect, it } from "vitest";
import { readBoolean, readList, readNumber, readString } from "../src/core/config.js";
import { motionTokens } from "../src/core/tokens.js";

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

  it("resolves shared motion-token aliases without breaking raw values", () => {
    const element = document.createElement("div");
    element.setAttribute("data-motion-duration", "standard");
    element.setAttribute("data-motion-stagger", "relaxed");
    element.setAttribute("data-motion-y", "reveal");
    element.setAttribute("data-motion-ease", "enter");

    expect(readNumber(element, "motion-duration", 2)).toBe(motionTokens.duration.standard);
    expect(readNumber(element, "motion-stagger", 2)).toBe(motionTokens.stagger.relaxed);
    expect(readNumber(element, "motion-y", 2)).toBe(motionTokens.distance.reveal);
    expect(readString(element, "motion-ease", "none")).toBe(motionTokens.easing.enter);
  });

  it("reads comma-separated configuration lists", () => {
    const element = document.createElement("div");
    element.dataset.scales = "1, .5, .2";
    expect(readList(element, "scales")).toEqual(["1", ".5", ".2"]);
  });
});
