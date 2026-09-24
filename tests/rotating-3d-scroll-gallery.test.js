/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rotating3dScrollGallery } from "../src/modules/scroll/rotating-3d-scroll-gallery.js";

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function scene(attributes = "") {
  document.body.innerHTML = `
    <section data-motion="rotating-3d-scroll-gallery" ${attributes}>
      <div data-motion-target="rotate-wrap">
        <div data-motion-target="rotate-item"></div>
      </div>
      <div data-motion-target="rotate-wrap">
        <div data-motion-target="rotate-item"></div>
      </div>
      <div data-motion-target="gallery-marquee">
        <div data-motion-target="gallery-marquee-track">A / B / C</div>
      </div>
    </section>
  `;

  const root = document.body.firstElementChild;
  const [firstWrap, secondWrap] = root.querySelectorAll('[data-motion-target="rotate-wrap"]');
  const [firstItem, secondItem] = root.querySelectorAll('[data-motion-target="rotate-item"]');
  const marqueeTrack = root.querySelector('[data-motion-target="gallery-marquee-track"]');

  Object.defineProperty(marqueeTrack, "offsetWidth", { configurable: true, value: 600 });

  firstItem.getBoundingClientRect = () => ({
    top: 900,
    bottom: 1100,
    left: 0,
    right: 300,
    width: 300,
    height: 200
  });
  secondItem.getBoundingClientRect = () => ({
    top: 1300,
    bottom: 1500,
    left: 0,
    right: 300,
    width: 300,
    height: 200
  });
  root.getBoundingClientRect = () => ({
    top: 500,
    bottom: 2500,
    left: 0,
    right: 1000,
    width: 1000,
    height: 2000
  });

  return { root, firstWrap, secondWrap, firstItem, secondItem, marqueeTrack };
}

function context({ reduced = false } = {}) {
  const sets = [];
  const fromTos = [];
  const zValues = [];
  const cleanups = [];

  const tweenFor = (vars) => ({
    kill: vi.fn(),
    scrollTrigger: {
      kill: vi.fn(),
      vars: vars?.scrollTrigger
    }
  });

  const gsap = {
    set: vi.fn((target, vars) => sets.push([target, vars])),
    fromTo: vi.fn((target, from, to) => {
      fromTos.push({ target, from, to });
      return tweenFor(to);
    }),
    quickSetter: vi.fn(() => (value) => zValues.push(value)),
    matchMedia: () => ({
      add: (_queries, callback) => {
        cleanups.push(
          callback({
            conditions: {
              width: true,
              reduceMotion: reduced
            }
          })
        );
      },
      revert: () => {
        while (cleanups.length) cleanups.pop()?.();
      }
    }),
    utils: {
      random: vi.fn((min, max) => (min + max) / 2)
    }
  };

  const ScrollTrigger = {
    refresh: vi.fn()
  };

  return {
    gsap,
    ScrollTrigger,
    reducedMotion: () => reduced,
    logger: console,
    sets,
    fromTos,
    zValues
  };
}

describe("rotating-3d-scroll-gallery", () => {
  it("recreates the Variation 2 wrapper path and source-faithful item timing", () => {
    const { root, firstWrap, secondWrap, firstItem, marqueeTrack } = scene();
    const ctx = context();

    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    const firstWrapSet = ctx.sets.find(([target]) => target === firstWrap)?.[1];
    const secondWrapSet = ctx.sets.find(([target]) => target === secondWrap)?.[1];

    expect(firstWrapSet.x).toBeCloseTo(0);
    expect(secondWrapSet.x).toBeCloseTo(Math.sin(0.45) * 200);
    expect(firstWrapSet.perspective).toBe(900);

    const itemTween = ctx.fromTos.find(({ target }) => target === firstItem);
    expect(itemTween.from.rotationX).toBe(265);
    expect(itemTween.from.rotationY).toBe(0);
    expect(itemTween.from.rotationZ).toBe(0);
    expect(itemTween.to.rotationX).toBe(-265);
    expect(itemTween.to.rotationY).toBe(-0);
    expect(itemTween.to.rotationZ).toBe(-0);
    expect(itemTween.to.ease).toBe("none");
    expect(itemTween.to.scrollTrigger.start).toBe("top bottom+=20%");
    expect(itemTween.to.scrollTrigger.end).toBe("bottom top-=20%");
    expect(itemTween.to.scrollTrigger.scrub).toBe(true);

    itemTween.to.scrollTrigger.onUpdate({ progress: 0 });
    itemTween.to.scrollTrigger.onUpdate({ progress: 0.5 });
    itemTween.to.scrollTrigger.onUpdate({ progress: 1 });
    expect(ctx.zValues[0]).toBeCloseTo(0);
    expect(ctx.zValues[1]).toBeCloseTo(-300);
    expect(ctx.zValues[2]).toBeCloseTo(0);

    const marqueeTween = ctx.fromTos.find(({ target }) => target === marqueeTrack);
    expect(marqueeTween.to.scrollTrigger.start).toBe("top bottom");
    expect(marqueeTween.to.scrollTrigger.end).toBe("bottom top");
    expect(marqueeTween.from.x()).toBe(1000);
    expect(marqueeTween.to.x()).toBe(-600);

    cleanup();
  });

  it("supports measured auto ranges without changing the visual animation", () => {
    const { root, firstItem, marqueeTrack } = scene('data-motion-alignment="auto"');
    const ctx = context();

    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    const itemTween = ctx.fromTos.find(({ target }) => target === firstItem);
    expect(itemTween.to.scrollTrigger.start()).toBeCloseTo(-60);
    expect(itemTween.to.scrollTrigger.end()).toBeCloseTo(1260);

    const marqueeTween = ctx.fromTos.find(({ target }) => target === marqueeTrack);
    expect(marqueeTween.to.scrollTrigger.start()).toBeCloseTo(-300);
    expect(marqueeTween.to.scrollTrigger.end()).toBeCloseTo(2500);

    cleanup();
  });

  it("exposes the source parameters as root attributes", () => {
    const { root, secondWrap, firstItem } = scene(
      'data-motion-amplitude="0.1" data-motion-angle-step="1" ' +
      'data-motion-perspective="1200" data-motion-depth="-450" ' +
      'data-motion-depth-power="2" data-motion-rotation-x-min="100" ' +
      'data-motion-rotation-x-max="200"'
    );
    const ctx = context();

    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    const secondWrapSet = ctx.sets.find(([target]) => target === secondWrap)?.[1];
    expect(secondWrapSet.x).toBeCloseTo(Math.sin(1) * 100);
    expect(secondWrapSet.perspective).toBe(1200);

    const itemTween = ctx.fromTos.find(({ target }) => target === firstItem);
    expect(itemTween.from.rotationX).toBe(150);

    itemTween.to.scrollTrigger.onUpdate({ progress: 0.5 });
    expect(ctx.zValues.at(-1)).toBeCloseTo(-450);

    cleanup();
  });

  it("keeps the layout static for reduced motion", () => {
    const { root } = scene();
    const ctx = context({ reduced: true });

    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    expect(ctx.fromTos).toHaveLength(0);
    expect(
      ctx.sets.some(([, vars]) =>
        vars.rotationX === 0 &&
        vars.rotationY === 0 &&
        vars.rotationZ === 0 &&
        vars.z === 0
      )
    ).toBe(true);

    cleanup();
  });
});
