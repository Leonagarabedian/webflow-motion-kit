/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pinnedImageDepthZoom } from "../src/modules/pinned-image-depth-zoom.js";

function createGsap() {
  const toCalls = [];
  let scrollTriggerConfig = null;

  const timeline = {
    to: vi.fn((target, vars, position) => {
      toCalls.push({ target, vars, position });
      return timeline;
    }),
    kill: vi.fn(),
    scrollTrigger: { kill: vi.fn() }
  };

  const mm = {
    add: vi.fn((conditions, callback) => {
      callback({ conditions: { enabled: true, reduceMotion: false } });
    }),
    revert: vi.fn()
  };

  return {
    gsap: {
      set: vi.fn(),
      timeline: vi.fn((config) => {
        scrollTriggerConfig = config.scrollTrigger;
        return timeline;
      }),
      matchMedia: vi.fn(() => mm)
    },
    mm,
    timeline,
    toCalls,
    getScrollTriggerConfig: () => scrollTriggerConfig
  };
}

describe("pinned-image-depth-zoom", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section data-motion="pinned-image-depth-zoom">
        <div data-motion-target="background"></div>
        <div data-motion-target="depth-frame">
          <img data-motion-target="depth-media" alt="">
        </div>
      </section>
    `;

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1440
    });

    const root = document.querySelector('[data-motion="pinned-image-depth-zoom"]');
    root.getBoundingClientRect = () => ({
      top: 0,
      bottom: 1000,
      left: 0,
      right: 1440,
      width: 1440,
      height: 1000
    });
  });

  it("matches the GreenSock depth-zoom defaults", () => {
    const root = document.querySelector('[data-motion="pinned-image-depth-zoom"]');
    const media = root.querySelector('[data-motion-target="depth-media"]');
    const background = root.querySelector('[data-motion-target="background"]');
    const fake = createGsap();

    const cleanup = pinnedImageDepthZoom.mount(root, {
      gsap: fake.gsap,
      reducedMotion: () => false,
      logger: console
    });

    const config = fake.getScrollTriggerConfig();

    expect(config.trigger).toBe(root);
    expect(config.start).toBe("top top");
    expect(config.end).toBe("+=150%");
    expect(config.pin).toBe(root);
    expect(config.scrub).toBe(true);

    expect(fake.gsap.set).toHaveBeenCalledWith(
      root.querySelector('[data-motion-target="depth-frame"]'),
      expect.objectContaining({
        perspective: 500,
        transformStyle: "preserve-3d"
      })
    );

    expect(fake.toCalls[0]).toEqual({
      target: media,
      vars: expect.objectContaining({
        scale: 2,
        z: 350,
        ease: "power1.inOut"
      }),
      position: 0
    });

    expect(fake.toCalls[1]).toEqual({
      target: background,
      vars: expect.objectContaining({
        scale: 1.1,
        ease: "power1.inOut"
      }),
      position: 0
    });

    cleanup();
  });

  it("supports automatic viewport-based scroll geometry", () => {
    const root = document.querySelector('[data-motion="pinned-image-depth-zoom"]');
    root.setAttribute("data-motion-alignment", "auto");
    root.setAttribute("data-motion-scroll-vh", "180");

    const fake = createGsap();

    const cleanup = pinnedImageDepthZoom.mount(root, {
      gsap: fake.gsap,
      reducedMotion: () => false,
      logger: console
    });

    const config = fake.getScrollTriggerConfig();

    expect(typeof config.start).toBe("function");
    expect(config.start()).toBe(0);
    expect(typeof config.end).toBe("function");
    expect(config.end()).toBe("+=1800");

    cleanup();
  });

  it("works without a background target", () => {
    const root = document.querySelector('[data-motion="pinned-image-depth-zoom"]');
    root.querySelector('[data-motion-target="background"]').remove();
    const fake = createGsap();

    const cleanup = pinnedImageDepthZoom.mount(root, {
      gsap: fake.gsap,
      reducedMotion: () => false,
      logger: console
    });

    expect(fake.toCalls).toHaveLength(1);
    expect(fake.toCalls[0].vars.z).toBe(350);

    cleanup();
  });

  it("does nothing for reduced motion", () => {
    const root = document.querySelector('[data-motion="pinned-image-depth-zoom"]');
    const fake = createGsap();

    const cleanup = pinnedImageDepthZoom.mount(root, {
      gsap: fake.gsap,
      reducedMotion: () => true,
      logger: console
    });

    expect(cleanup).toBeUndefined();
    expect(fake.gsap.matchMedia).not.toHaveBeenCalled();
  });
});
