import { describe, expect, it } from "vitest";
import { modules } from "../src/modules/registry.js";
import {
  SCROLL_DUAL_STICKY_MEDIA_REVEAL_DEFAULTS
} from "../src/modules/scroll/scroll-dual-sticky-media-reveal.js";

describe("scroll-dual-sticky-media-reveal", () => {
  it("is registered as a composition module", () => {
    const module = modules.find(({ name }) => name === "scroll-dual-sticky-media-reveal");

    expect(module).toBeTruthy();
    expect(module.category).toBe("composition");
    expect(module.selector).toBe('[data-motion~="scroll-dual-sticky-media-reveal"]');
    expect(typeof module.mount).toBe("function");
  });

  it("preserves the verified source phase ranges", () => {
    expect(SCROLL_DUAL_STICKY_MEDIA_REVEAL_DEFAULTS).toMatchObject({
      backgroundStart: "top top",
      backgroundEnd: "center center",
      contentStart: "50% center",
      contentEnd: "85% bottom",
      contentScrub: 1.2,
      mediaStart: "25% center",
      mediaEnd: "85% bottom",
      mediaScrub: 1.2,
      handoffStart: "85% bottom",
      handoffEnd: "bottom bottom",
      handoffScrub: true
    });
  });

  it("preserves the verified media transform and mask endpoints", () => {
    expect(SCROLL_DUAL_STICKY_MEDIA_REVEAL_DEFAULTS).toMatchObject({
      mediaScaleFrom: 1,
      mediaScaleTo: 0.4,
      mediaYFrom: 0,
      mediaYTo: -15,
      primaryMaskFrom: "100% 150%",
      primaryMaskTo: "100% 0%",
      revealMaskFrom: "100% 0%",
      revealMaskTo: "100% 150%",
      revealMaskYFrom: "200%",
      revealMaskYTo: "50%",
      mediaEaseCurve: "0.5,0,0.75,0"
    });
  });
});
