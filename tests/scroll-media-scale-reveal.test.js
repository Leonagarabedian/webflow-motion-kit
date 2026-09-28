import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";
import {
  SCROLL_MEDIA_SCALE_REVEAL_DEFAULTS
} from "../src/modules/scroll/scroll-media-scale-reveal.js";

describe("scroll-media-scale-reveal", () => {
  it("is registered as a reusable composition module", () => {
    const module = modules.find(({ name }) => name === "scroll-media-scale-reveal");

    expect(module).toBeTruthy();
    expect(module.category).toBe("composition");
    expect(module.selector).toBe('[data-motion~="scroll-media-scale-reveal"]');
    expect(typeof module.mount).toBe("function");
  });

  it("preserves the four independent source scroll ranges", () => {
    expect(SCROLL_MEDIA_SCALE_REVEAL_DEFAULTS).toMatchObject({
      backgroundStart: "top top",
      backgroundEnd: "center center",
      backgroundScrub: true,
      primaryStart: "25% center",
      primaryEnd: "85% bottom",
      primaryScrub: 1.2,
      contentStart: "50% center",
      contentEnd: "85% bottom",
      contentScrub: 1.2,
      handoffStart: "85% bottom",
      handoffEnd: "bottom bottom",
      handoffScrub: true
    });
  });

  it("uses the source transform and mask endpoints without requiring source class names", () => {
    expect(SCROLL_MEDIA_SCALE_REVEAL_DEFAULTS).toMatchObject({
      primaryScaleFrom: 1,
      primaryScaleTo: 0.4,
      primaryYFrom: 0,
      primaryYTo: -15,
      primaryMaskFrom: "100% 150%",
      primaryMaskTo: "100% 0%",
      revealMaskFrom: "100% 0%",
      revealMaskTo: "100% 150%",
      revealMaskYFrom: "200%",
      revealMaskYTo: "50%",
      primaryOpacityFrom: 1,
      primaryOpacityTo: 1,
      revealOpacityFrom: 1,
      revealOpacityTo: 1,
      primaryEaseCurve: "0.5,0,0.75,0"
    });
  });
});
