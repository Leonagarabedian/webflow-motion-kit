/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrollMarquee } from "../src/modules/scroll/scroll-marquee.js";

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
    <section data-motion="scroll-marquee" ${attributes}>
      <div data-motion-target="scroll-marquee-fixed">
        <div data-motion-target="scroll-marquee-track">
          ALPHA / BETA / GAMMA
        </div>
      </div>
    </section>
  `;

  const root = document.body.firstElementChild;
  const fixed = root.querySelector('[data-motion-target="scroll-marquee-fixed"]');
  const track = root.querySelector('[data-motion-target="scroll-marquee-track"]');

  root.getBoundingClientRect = () => ({
    top: 900,
    bottom: 2500,
    left: 0,
    right: 1000,
    width: 1000,
    height: 1600
  });

  return { root, fixed, track };
}

function context({ reduced = false } = {}) {
  const sets = [];
  const triggers = [];
  const tweens = [];
  const cleanups = [];

  const gsap = {
    set: vi.fn((target, vars) => sets.push([target, vars])),
    fromTo: vi.fn((target, from, to) => {
      const tween = {
        target,
        from,
        to,
        kill: vi.fn(),
        scrollTrigger: { kill: vi.fn() }
      };
      tweens.push(tween);
      return tween;
    }),
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
    })
  };

  const ScrollTrigger = {
    create: vi.fn((config) => {
      const trigger = { config, kill: vi.fn() };
      triggers.push(trigger);
      return trigger;
    })
  };

  return {
    gsap,
    ScrollTrigger,
    reducedMotion: () => reduced,
    logger: console,
    sets,
    triggers,
    tweens
  };
}

describe("scroll-marquee", () => {
  it("recreates the source fixed marquee travel and visibility range", () => {
    const { root, fixed, track } = scene();
    const ctx = context();

    const cleanup = scrollMarquee.mount(root, ctx);

    const tween = ctx.tweens[0];
    expect(tween.target).toBe(track);
    expect(tween.from.x).toBe("100vw");
    expect(tween.to.x).toBe("-100%");
    expect(tween.to.ease).toBe("none");
    expect(tween.to.scrollTrigger).toMatchObject({
      trigger: root,
      start: "top bottom",
      end: "bottom top",
      scrub: true
    });

    expect(
      ctx.sets.some(([target, vars]) => target === fixed && vars.autoAlpha === 0)
    ).toBe(true);

    const visibility = ctx.triggers[0];
    visibility.config.onEnter();
    expect(
      ctx.sets.some(([target, vars]) => target === fixed && vars.autoAlpha === 1)
    ).toBe(true);

    visibility.config.onLeave();
    expect(ctx.sets.at(-1)).toEqual([fixed, { autoAlpha: 0 }]);

    cleanup();
  });

  it("supports measured auto geometry", () => {
    const { root } = scene('data-motion-alignment="auto"');
    const ctx = context();

    const cleanup = scrollMarquee.mount(root, ctx);
    const tween = ctx.tweens[0];

    expect(tween.to.scrollTrigger.start()).toBe(100);
    expect(tween.to.scrollTrigger.end()).toBe(2500);

    cleanup();
  });

  it("allows authored direction/range overrides without changing the module", () => {
    const { root, track } = scene(
      'data-motion-from-x="-100%" data-motion-to-x="100vw" ' +
      'data-motion-start="top 80%" data-motion-end="bottom 20%" ' +
      'data-motion-scrub="0.6"'
    );
    const ctx = context();

    const cleanup = scrollMarquee.mount(root, ctx);
    const tween = ctx.tweens[0];

    expect(tween.target).toBe(track);
    expect(tween.from.x).toBe("-100%");
    expect(tween.to.x).toBe("100vw");
    expect(tween.to.scrollTrigger).toMatchObject({
      start: "top 80%",
      end: "bottom 20%",
      scrub: 0.6
    });

    cleanup();
  });

  it("keeps a static centered track for reduced motion", () => {
    const { root, track } = scene();
    const ctx = context({ reduced: true });

    const cleanup = scrollMarquee.mount(root, ctx);

    expect(ctx.tweens).toHaveLength(0);
    expect(
      ctx.sets.some(([target, vars]) => target === track && vars.x === 0)
    ).toBe(true);

    cleanup();
  });
});
