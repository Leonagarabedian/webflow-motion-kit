import { describe, expect, it } from "vitest";
import { buildFrameSources, coverRect } from "../src/advanced/image-sequence.js";
import { createAdvancedPackage } from "../src/advanced/shared/runtime.js";

describe("advanced image sequence helpers", () => {
  it("builds padded frame URLs", () => {
    const element = document.createElement("div");
    element.setAttribute("data-advanced-src", "/frames/frame-{index}.webp");
    element.setAttribute("data-advanced-frame-count", "3");
    element.setAttribute("data-advanced-frame-start", "1");
    element.setAttribute("data-advanced-frame-pad", "3");
    expect(buildFrameSources(element)).toEqual([
      "/frames/frame-001.webp",
      "/frames/frame-002.webp",
      "/frames/frame-003.webp"
    ]);
  });

  it("calculates a centered cover crop", () => {
    expect(coverRect(200, 100, 100, 100)).toEqual({
      height: 100,
      width: 200,
      x: -50,
      y: 0
    });
  });
});

describe("advanced package runtime", () => {
  it("mounts idempotently and destroys scoped instances", async () => {
    document.body.innerHTML = '<div data-advanced="fake"></div>';
    let mounts = 0;
    let cleanups = 0;
    const api = createAdvancedPackage({
      mount: () => {
        mounts += 1;
        return () => {
          cleanups += 1;
        };
      },
      name: "fake-test",
      selector: '[data-advanced="fake"]'
    });
    await Promise.resolve();
    api.init().init();
    expect(mounts).toBe(1);
    api.destroy();
    expect(cleanups).toBe(1);
  });
});
