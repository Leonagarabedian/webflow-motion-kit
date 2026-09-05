import { describe, expect, it, vi } from "vitest";
import { heroFrameTransition } from "../src/modules/hero-frame-transition.js";

describe("hero frame transition", () => {
  it("builds a scrubbed pinned transition between authored frame states", () => {
    document.body.innerHTML = `
      <section data-motion="hero-frame-transition">
        <div data-motion-target="sticky">
          <div data-motion-target="intro"></div>
          <div data-motion-target="frame"></div>
          <div data-motion-target="side-left"></div>
          <div data-motion-target="side-right"></div>
        </div>
      </section>
    `;

    let mediaCleanup;
    const killed = vi.fn();
    const flipTween = () => ({ kill: killed });
    const Flip = {
      from: vi.fn(flipTween),
      getState: vi.fn(() => ({}))
    };
    const scrollTrigger = { kill: killed };
    const timeline = {
      add: vi.fn().mockReturnThis(),
      duration: vi.fn().mockReturnThis(),
      kill: killed,
      scrollTrigger: null
    };
    const ScrollTrigger = { create: vi.fn(() => scrollTrigger) };
    const gsap = {
      matchMedia: () => ({
        add: (_conditions, callback) => {
          mediaCleanup = callback({
            conditions: { desktop: true, reduceMotion: false }
          });
        },
        revert: () => mediaCleanup?.()
      }),
      timeline: vi.fn(() => timeline)
    };

    const root = document.querySelector('[data-motion="hero-frame-transition"]');
    const targets = [...root.querySelectorAll("[data-motion-target]")].filter(
      (target) => target.getAttribute("data-motion-target") !== "sticky"
    );
    const cleanup = heroFrameTransition.mount(root, { Flip, gsap, ScrollTrigger });

    expect(targets.every((target) => target.classList.contains("is-frame-b"))).toBe(true);
    expect(Flip.from).toHaveBeenCalledTimes(2);
    expect(ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        animation: timeline,
        pin: root.querySelector('[data-motion-target="sticky"]'),
        pinSpacing: true,
        scrub: 1,
        start: "top top",
        trigger: root
      })
    );

    cleanup();
    expect(targets.every((target) => !target.classList.contains("is-frame-b"))).toBe(true);
  });

  it("does not animate on reduced motion", () => {
    document.body.innerHTML = `
      <section data-motion="hero-frame-transition">
        <div data-motion-target="frame"></div>
      </section>
    `;

    const Flip = { from: vi.fn(), getState: vi.fn() };
    const gsap = {
      matchMedia: () => ({
        add: (_conditions, callback) =>
          callback({ conditions: { desktop: true, reduceMotion: true } }),
        revert: vi.fn()
      })
    };

    heroFrameTransition.mount(
      document.querySelector('[data-motion="hero-frame-transition"]'),
      { Flip, gsap, ScrollTrigger: { create: vi.fn() } }
    );

    expect(Flip.getState).not.toHaveBeenCalled();
  });
});
