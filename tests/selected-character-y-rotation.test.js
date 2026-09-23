/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { selectedCharacterYRotation } from "../src/modules/selected-character-y-rotation.js";

function createGsap() {
  let timelineOptions = null;
  let tween = null;

  const gsap = {
    timeline: vi.fn((options = {}) => {
      timelineOptions = options;
      const timeline = {
        scrollTrigger: options.scrollTrigger,
        kill: vi.fn(),
        fromTo: vi.fn((targets, from, to) => {
          tween = { targets, from, to };
          return timeline;
        })
      };
      return timeline;
    })
  };

  return {
    gsap,
    getTimelineOptions: () => timelineOptions,
    getTween: () => tween
  };
}

describe("selected-character-y-rotation drivers", () => {
  it("binds rotation directly to scroll progress in scroll mode", () => {
    document.body.innerHTML = `
      <section class="trigger">
        <h2
          data-motion="selected-character-y-rotation"
          data-motion-driver="scroll"
          data-motion-trigger=".trigger"
          data-motion-letters="AB"
          data-motion-rotation-y="-180"
          data-motion-scrub="0.7"
        >AB</h2>
      </section>
    `;

    const element = document.querySelector("h2");
    const trigger = document.querySelector(".trigger");
    const context = createGsap();

    selectedCharacterYRotation.mount(element, {
      gsap: context.gsap,
      reducedMotion: () => false
    });

    const options = context.getTimelineOptions();
    const tween = context.getTween();

    expect(options.scrollTrigger.trigger).toBe(trigger);
    expect(options.scrollTrigger.start).toBe("top 82%");
    expect(options.scrollTrigger.end).toBe("top 55%");
    expect(options.scrollTrigger.scrub).toBe(0.7);
    expect(tween.from.rotationY).toBe(-180);
    expect(tween.to.rotationY).toBe(0);
    expect(tween.to.clearProps).toBeUndefined();
  });

  it("keeps load mode timed and clears its finished transforms", () => {
    document.body.innerHTML = `
      <h2
        data-motion="selected-character-y-rotation"
        data-motion-driver="load"
        data-motion-letters="AB"
        data-motion-delay="0.2"
      >AB</h2>
    `;

    const element = document.querySelector("h2");
    const context = createGsap();

    selectedCharacterYRotation.mount(element, {
      gsap: context.gsap,
      reducedMotion: () => false
    });

    expect(context.getTimelineOptions()).toEqual({ delay: 0.2 });
    expect(context.getTween().to.clearProps).toBe("transform");
  });
});
