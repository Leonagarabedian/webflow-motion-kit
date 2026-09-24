/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rotating3dScrollGallery } from "../src/modules/scroll/rotating-3d-scroll-gallery.js";

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  vi.stubGlobal("requestAnimationFrame", (callback) => {
    callback();
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function scene(variant = "2", attributes = "") {
  document.body.innerHTML = `
    <section data-motion="rotating-3d-scroll-gallery"
             data-motion-variant="${variant}"
             ${attributes}>
      <div data-motion-target="gallery-marquee">
        <div data-motion-target="gallery-marquee-track">A / B / C</div>
      </div>
      <div data-motion-target="rotate-wrap">
        <div data-motion-target="rotate-item"></div>
      </div>
      <div data-motion-target="rotate-wrap">
        <div data-motion-target="rotate-item"></div>
      </div>
    </section>
  `;

  const root = document.body.firstElementChild;
  const wraps = [...root.querySelectorAll('[data-motion-target="rotate-wrap"]')];
  const items = [...root.querySelectorAll('[data-motion-target="rotate-item"]')];
  const marquee = root.querySelector('[data-motion-target="gallery-marquee"]');
  const marqueeTrack = root.querySelector('[data-motion-target="gallery-marquee-track"]');

  Object.defineProperty(marqueeTrack, "offsetWidth", {
    configurable: true,
    value: 600
  });

  items[0].getBoundingClientRect = () => ({
    top: 900,
    bottom: 1100,
    left: 0,
    right: 300,
    width: 300,
    height: 200
  });
  items[1].getBoundingClientRect = () => ({
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

  return { root, wraps, items, marquee, marqueeTrack };
}

function context({ reduced = false } = {}) {
  const sets = [];
  const triggers = [];
  const transforms = new Map();
  const filters = new Map();
  const matchMediaCleanups = [];
  const tickerCallbacks = new Set();

  const gsap = {
    set: vi.fn((target, vars) => sets.push([target, vars])),
    fromTo: vi.fn((target, from, to) => ({
      target,
      from,
      to,
      kill: vi.fn(),
      scrollTrigger: { kill: vi.fn() }
    })),
    quickSetter: vi.fn((target, property) => {
      if (property === "css") {
        return (value) => transforms.set(target, value);
      }
      if (property === "filter") {
        return (value) => filters.set(target, value);
      }
      return vi.fn();
    }),
    matchMedia: () => ({
      add: (_queries, callback) => {
        matchMediaCleanups.push(
          callback({
            conditions: {
              width: true,
              reduceMotion: reduced
            }
          })
        );
      },
      revert: () => {
        while (matchMediaCleanups.length) matchMediaCleanups.pop()?.();
      }
    }),
    utils: {
      random: vi.fn((min, max) => (min + max) / 2),
      interpolate: (a, b, p) => a + (b - a) * p
    },
    ticker: {
      add: vi.fn((callback) => tickerCallbacks.add(callback)),
      remove: vi.fn((callback) => tickerCallbacks.delete(callback))
    }
  };

  const ScrollTrigger = {
    create: vi.fn((config) => {
      const trigger = {
        config,
        kill: vi.fn(),
        getVelocity: vi.fn(() => 0)
      };
      triggers.push(trigger);
      return trigger;
    }),
    refresh: vi.fn()
  };

  return {
    gsap,
    ScrollTrigger,
    reducedMotion: () => reduced,
    logger: console,
    sets,
    triggers,
    transforms,
    filters,
    tickerCallbacks
  };
}

function itemTrigger(ctx, item) {
  return ctx.triggers.find((entry) => entry.config.trigger === item);
}

describe("rotating-3d-scroll-gallery source variants", () => {
  it("Variation 1 uses the shallow landscape tumble", () => {
    const { root, wraps, items } = scene("1");
    const ctx = context();
    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    expect(ctx.sets.find(([target]) => target === wraps[1])?.[1].x)
      .toBeCloseTo(Math.sin(0.45) * 200);

    const trigger = itemTrigger(ctx, items[0]);
    trigger.config.onUpdate({ progress: 0 });
    expect(ctx.transforms.get(items[0])).toMatchObject({
      rotationX: 95,
      rotationY: 0,
      rotationZ: 0
    });
    expect(ctx.transforms.get(items[0]).z).toBeCloseTo(0);

    trigger.config.onUpdate({ progress: 0.5 });
    expect(ctx.transforms.get(items[0])).toMatchObject({
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      z: -50
    });

    trigger.config.onUpdate({ progress: 1 });
    expect(ctx.transforms.get(items[0])).toMatchObject({
      rotationX: -95,
      z: expect.closeTo(0)
    });

    cleanup();
  });

  it("Variation 2 uses the multi-turn tumble and sharp -300px depth pulse", () => {
    const { root, items } = scene("2");
    const ctx = context();
    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    const trigger = itemTrigger(ctx, items[0]);
    expect(trigger.config.start).toBe("top bottom+=20%");
    expect(trigger.config.end).toBe("bottom top-=20%");

    trigger.config.onUpdate({ progress: 0 });
    expect(ctx.transforms.get(items[0]).rotationX).toBe(265);

    trigger.config.onUpdate({ progress: 0.5 });
    expect(ctx.transforms.get(items[0])).toMatchObject({
      rotationX: 0,
      z: -300
    });

    trigger.config.onUpdate({ progress: 1 });
    expect(ctx.transforms.get(items[0]).rotationX).toBe(-265);

    cleanup();
  });

  it("Variation 3 has no sine offset and resolves from dark/desaturated into focus at center", () => {
    const { root, wraps, items } = scene("3");
    const ctx = context();
    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    expect(ctx.sets.find(([target]) => target === wraps[1])?.[1].x).toBe(0);

    const trigger = itemTrigger(ctx, items[0]);

    trigger.config.onUpdate({ progress: 0 });
    expect(ctx.transforms.get(items[0])).toMatchObject({
      rotationX: 90,
      yPercent: -39
    });
    expect(ctx.transforms.get(items[0]).z).toBeCloseTo(0);
    expect(ctx.filters.get(items[0])).toBe("saturate(0) brightness(0)");

    trigger.config.onUpdate({ progress: 0.5 });
    expect(ctx.transforms.get(items[0])).toMatchObject({
      rotationX: expect.closeTo(0),
      z: -800,
      yPercent: 1
    });
    expect(ctx.filters.get(items[0])).toBe("saturate(1) brightness(1)");

    trigger.config.onUpdate({ progress: 1 });
    expect(ctx.transforms.get(items[0]).rotationX).toBeCloseTo(-90);

    cleanup();
  });

  it("Variation 4 rotates primarily on Y and applies velocity blur/saturation", () => {
    const { root, wraps, items } = scene("4");
    const ctx = context();
    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    expect(ctx.sets.find(([target]) => target === wraps[1])?.[1].x)
      .toBeCloseTo(Math.sin(1) * 200);

    const trigger = itemTrigger(ctx, items[0]);
    trigger.config.onUpdate({ progress: 0 });
    expect(ctx.transforms.get(items[0])).toMatchObject({
      rotationX: 0,
      rotationY: 245,
      rotationZ: 0
    });
    expect(ctx.transforms.get(items[0]).z).toBeCloseTo(0);

    trigger.config.onUpdate({ progress: 0.5 });
    expect(ctx.transforms.get(items[0])).toMatchObject({
      rotationY: 0,
      z: -150
    });

    const velocityTrigger = ctx.triggers.find(
      (entry) =>
        entry.config.trigger === root &&
        typeof entry.config.onUpdate === "function"
    );
    velocityTrigger.config.onUpdate({
      getVelocity: () => 2400
    });

    vi.spyOn(performance, "now").mockReturnValue(50);
    for (const ticker of ctx.tickerCallbacks) ticker();

    expect(ctx.filters.get(items[0])).toContain("blur(");
    expect(ctx.filters.get(items[0])).toContain("saturate(");

    cleanup();
  });

  it("Variation 5 holds the fully resolved image at the middle", () => {
    const { root, wraps, items } = scene("5");
    const ctx = context();
    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    expect(ctx.sets.find(([target]) => target === wraps[1])?.[1].x)
      .toBeCloseTo(Math.sin(0.9) * 50);

    const trigger = itemTrigger(ctx, items[0]);

    trigger.config.onUpdate({ progress: 0 });
    expect(ctx.transforms.get(items[0])).toMatchObject({
      scaleX: 1.6,
      scaleY: 0.5,
      rotationX: -175,
      rotationZ: 50
    });
    expect(ctx.transforms.get(items[0]).z).toBeCloseTo(0);
    expect(ctx.filters.get(items[0])).toBe("blur(12px) brightness(0)");

    trigger.config.onUpdate({ progress: 0.45 });
    const heldA = ctx.transforms.get(items[0]);
    trigger.config.onUpdate({ progress: 0.55 });
    const heldB = ctx.transforms.get(items[0]);

    expect(heldA).toEqual(heldB);
    expect(heldA).toMatchObject({
      scaleX: 1,
      scaleY: 1,
      rotationX: 0,
      rotationZ: 0,
      z: -750
    });
    expect(ctx.filters.get(items[0])).toMatch(/^blur\(.+px\) brightness\(1\)$/);

    cleanup();
  });
});

describe("shared rotating gallery contract", () => {
  it("supports measured auto geometry", () => {
    const { root, items } = scene("2", 'data-motion-alignment="auto"');
    const ctx = context();
    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    const trigger = itemTrigger(ctx, items[0]);
    expect(trigger.config.start()).toBeCloseTo(-60);
    expect(trigger.config.end()).toBeCloseTo(1260);

    cleanup();
  });

  it("scopes the fixed marquee to the active gallery and preserves the source travel", () => {
    const { root, marquee, marqueeTrack } = scene("2");
    const ctx = context();
    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    expect(
      ctx.sets.some(([target, vars]) => target === marquee && vars.autoAlpha === 0)
    ).toBe(true);

    const visibility = ctx.triggers.find(
      (entry) =>
        entry.config.trigger === root &&
        typeof entry.config.onEnter === "function"
    );
    visibility.config.onEnter();

    expect(
      ctx.sets.some(([target, vars]) => target === marquee && vars.autoAlpha === 1)
    ).toBe(true);

    const marqueeTween = ctx.gsap.fromTo.mock.calls.find(
      ([target]) => target === marqueeTrack
    );
    expect(marqueeTween[1].x()).toBe(1000);
    expect(marqueeTween[2].x()).toBe(-600);
    expect(marqueeTween[2].scrollTrigger.start).toBe("top bottom");
    expect(marqueeTween[2].scrollTrigger.end).toBe("bottom top");

    cleanup();
  });

  it("keeps media static for reduced motion", () => {
    const { root, items } = scene("5");
    const ctx = context({ reduced: true });
    const cleanup = rotating3dScrollGallery.mount(root, ctx);

    expect(ctx.triggers).toHaveLength(0);
    expect(ctx.transforms.has(items[0])).toBe(false);

    cleanup();
  });
});
