/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { lineReveal } from "../src/modules/line-reveal.js";

function createContext() {
  let tweenArgs = null;
  const gsap = {
    set: vi.fn(),
    fromTo: vi.fn((targets, from, to) => {
      tweenArgs = { targets, from, to };
      return { kill: vi.fn() };
    })
  };
  const SplitText = {
    create: vi.fn((element, config) => {
      const lineA = document.createElement("span");
      const lineB = document.createElement("span");
      config.onSplit({ lines: [lineA, lineB] });
      return { revert: vi.fn() };
    })
  };
  return { gsap, SplitText, getTweenArgs: () => tweenArgs };
}

describe("line reveal horizontal controls", () => {
  it("supports an optional horizontal offset without changing the default vertical reveal contract", () => {
    document.body.innerHTML = `
      <h2 data-motion="line-reveal"
          data-motion-x-px="120"
          data-motion-y-px="0"
          data-motion-delay="0.15"
          data-motion-duration="0.8"
          data-motion-stagger="0.05">
        Founder copy
      </h2>
    `;

    const element = document.querySelector('[data-motion="line-reveal"]');
    const context = createContext();

    lineReveal.mount(element, {
      ...context,
      reducedMotion: () => false,
      scrollAlignment: null
    });

    const tween = context.getTweenArgs();
    expect(tween.from.x).toBe(120);
    expect(tween.from.y).toBe(0);
    expect(tween.to.x).toBe(0);
    expect(tween.to.y).toBe(0);
    expect(tween.to.delay).toBe(0.15);
    expect(tween.to.duration).toBe(0.8);
    expect(tween.to.stagger).toBe(0.05);
  });
});
