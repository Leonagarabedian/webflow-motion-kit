import { describe, expect, it, vi } from "vitest";
import { heroFrameTransition } from "../src/modules/hero-frame-transition.js";

describe("hero frame transition", () => {
  it("maps one pinned ScrollTrigger progress into authored frame phases", () => {
    document.body.innerHTML = `
      <section data-motion="hero-frame-transition">
        <div data-motion-target="intro"></div>
        <div data-motion-target="frame"></div>
        <div data-motion-target="side-left"></div>
        <div data-motion-target="side-right"></div>
      </section>
    `;

    let mediaCleanup;
    let triggerConfig;
    const killed = vi.fn();
    const frameFlip = { progress: vi.fn().mockReturnThis(), kill: killed };
    const sideFlip = { progress: vi.fn().mockReturnThis(), kill: killed };
    const Flip = {
      from: vi.fn().mockReturnValueOnce(frameFlip).mockReturnValueOnce(sideFlip),
      getState: vi.fn(() => ({}))
    };
    const ScrollTrigger = {
      create: vi.fn((config) => {
        triggerConfig = config;
        return { kill: killed };
      })
    };
    const gsap = {
      matchMedia: () => ({
        add: (_conditions, callback) => {
          mediaCleanup = callback({
            conditions: { desktop: true, reduceMotion: false }
          });
        },
        revert: () => mediaCleanup?.()
      }),
      utils: {
        clamp: (min, max, value) => Math.min(max, Math.max(min, value))
      }
    };

    const root = document.querySelector('[data-motion="hero-frame-transition"]');
    const targets = [...root.querySelectorAll("[data-motion-target]")];
    const cleanup = heroFrameTransition.mount(root, { Flip, gsap, ScrollTrigger });

    expect(targets.every((target) => target.classList.contains("is-frame-b"))).toBe(true);
    expect(Flip.from).toHaveBeenCalledTimes(2);
    expect(ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: root,
        pin: root,
        pinSpacing: true,
        scrub: 1,
        start: "top top",
        onUpdate: expect.any(Function)
      })
    );

    triggerConfig.onUpdate({ progress: 0 });
    expect(frameFlip.progress).toHaveBeenLastCalledWith(0);
    expect(sideFlip.progress).toHaveBeenLastCalledWith(0);

    triggerConfig.onUpdate({ progress: 0.72 });
    expect(frameFlip.progress).toHaveBeenLastCalledWith(1);
    expect(sideFlip.progress).toHaveBeenLastCalledWith(
      (0.72 - 0.62) / (0.92 - 0.62)
    );

    triggerConfig.onUpdate({ progress: 1 });
    expect(frameFlip.progress).toHaveBeenLastCalledWith(1);
    expect(sideFlip.progress).toHaveBeenLastCalledWith(1);

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
