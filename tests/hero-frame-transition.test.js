import { describe, expect, it, vi } from "vitest";
import { heroFrameTransition } from "../src/modules/hero-frame-transition.js";

describe("hero frame transition", () => {
  it("uses authored target-state classes and restores the original state", () => {
    document.body.innerHTML = `
      <section data-motion="hero-frame-transition">
        <div data-motion-target="intro"></div>
        <div data-motion-target="frame"></div>
        <div data-motion-target="side-left"></div>
        <div data-motion-target="side-right"></div>
      </section>
    `;

    let mediaCleanup;
    const Flip = {
      from: vi.fn(() => ({ kill: vi.fn() })),
      getState: vi.fn(() => ({}))
    };
    const gsap = {
      delayedCall: (_delay, callback) => {
        callback();
        return { kill: vi.fn() };
      },
      matchMedia: () => ({
        add: (_conditions, callback) => {
          mediaCleanup = callback({
            conditions: { desktop: true, reduceMotion: false }
          });
        },
        revert: () => mediaCleanup?.()
      })
    };

    const root = document.querySelector('[data-motion="hero-frame-transition"]');
    const targets = [...root.querySelectorAll("[data-motion-target]")];
    const cleanup = heroFrameTransition.mount(root, { Flip, gsap });

    expect(targets.every((target) => target.classList.contains("is-frame-b"))).toBe(true);
    expect(Flip.from).toHaveBeenCalledTimes(2);

    cleanup();
    expect(targets.every((target) => !target.classList.contains("is-frame-b"))).toBe(true);
  });
});
