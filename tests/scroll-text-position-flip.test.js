/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scrollTextPositionFlip } from "../src/modules/scroll/scroll-text-position-flip.js";
import { scrambleText } from "../src/modules/scroll/scramble-text.js";

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

function makeContext() {
  const activeCleanups = [];
  const gsap = {
    matchMedia: () => ({
      add: (_queries, callback) => {
        activeCleanups.push(
          callback({ conditions: { width: true, reduceMotion: false } })
        );
      },
      revert: () => {
        while (activeCleanups.length) activeCleanups.pop()?.();
      }
    })
  };

  const tween = () => ({
    kill: vi.fn(),
    scrollTrigger: { kill: vi.fn() }
  });

  const Flip = {
    getState: vi.fn(() => ({ captured: true })),
    to: vi.fn(tween),
    from: vi.fn(tween)
  };

  const ScrollTrigger = {
    maxScroll: vi.fn(() => 5000),
    refresh: vi.fn()
  };

  return {
    gsap,
    Flip,
    ScrollTrigger,
    reducedMotion: () => false,
    logger: console
  };
}

describe("scroll-text-position-flip", () => {
  it("captures any authored alternate class state and restores the source classes", () => {
    document.body.innerHTML = `
      <div
        class="copy source-a depth-a"
        data-motion="scroll-text-position-flip"
        data-motion-source-class="source-a depth-a"
        data-motion-alt-class="source-b depth-b">
        Neural glow
      </div>
    `;

    const element = document.body.firstElementChild;
    const context = makeContext();

    context.Flip.getState.mockImplementation((target, options) => {
      expect(target.classList.contains("source-a")).toBe(false);
      expect(target.classList.contains("depth-a")).toBe(false);
      expect(target.classList.contains("source-b")).toBe(true);
      expect(target.classList.contains("depth-b")).toBe(true);
      expect(options.props).toBe("opacity,filter,width");
      return { captured: true };
    });

    const cleanup = scrollTextPositionFlip.mount(element, context);

    expect(element.classList.contains("source-a")).toBe(true);
    expect(element.classList.contains("depth-a")).toBe(true);
    expect(element.classList.contains("source-b")).toBe(false);
    expect(element.classList.contains("depth-b")).toBe(false);

    expect(context.Flip.to).toHaveBeenCalledWith(
      { captured: true },
      expect.objectContaining({
        ease: "expo.inOut",
        scrollTrigger: expect.objectContaining({
          trigger: element,
          start: "clamp(bottom bottom-=10%)",
          end: "clamp(center center)",
          scrub: true
        })
      })
    );

    expect(context.Flip.from).toHaveBeenCalledWith(
      { captured: true },
      expect.objectContaining({
        ease: "expo.inOut",
        scrollTrigger: expect.objectContaining({
          trigger: element,
          start: "clamp(center center)",
          end: "clamp(top top)",
          scrub: true
        })
      })
    );

    cleanup();
  });

  it("allows an alternate modifier without requiring a source class", () => {
    document.body.innerHTML = `
      <div
        class="copy"
        data-motion="scroll-text-position-flip"
        data-motion-alt-class="is-lower-right">
        Signal
      </div>
    `;

    const element = document.body.firstElementChild;
    const context = makeContext();

    context.Flip.getState.mockImplementation((target) => {
      expect(target.classList.contains("copy")).toBe(true);
      expect(target.classList.contains("is-lower-right")).toBe(true);
      return {};
    });

    const cleanup = scrollTextPositionFlip.mount(element, context);

    expect(element.classList.contains("copy")).toBe(true);
    expect(element.classList.contains("is-lower-right")).toBe(false);

    cleanup();
  });

  it("uses measured viewport geometry in auto alignment mode", () => {
    document.body.innerHTML = `
      <div
        class="copy pos-a"
        data-motion="scroll-text-position-flip"
        data-motion-alignment="auto"
        data-motion-source-class="pos-a"
        data-motion-alt-class="pos-b">
        Quantum waves
      </div>
    `;

    const element = document.body.firstElementChild;
    element.getBoundingClientRect = () => ({
      top: 1000,
      bottom: 1100,
      left: 0,
      right: 300,
      width: 300,
      height: 100
    });

    const context = makeContext();
    const cleanup = scrollTextPositionFlip.mount(element, context);

    const enter = context.Flip.to.mock.calls[0][1].scrollTrigger;
    const returning = context.Flip.from.mock.calls[0][1].scrollTrigger;

    expect(enter.start()).toBe(200);
    expect(enter.end()).toBe(550);
    expect(returning.start()).toBe(550);
    expect(returning.end()).toBe(1000);

    cleanup();
  });

  it("preserves authored inline styles after cleanup", () => {
    document.body.innerHTML = `
      <div
        class="copy pos-a"
        style="opacity:.75"
        data-motion="scroll-text-position-flip"
        data-motion-source-class="pos-a"
        data-motion-alt-class="pos-b">
        Beacon
      </div>
    `;

    const element = document.body.firstElementChild;
    const context = makeContext();
    const cleanup = scrollTextPositionFlip.mount(element, context);

    element.setAttribute("style", "transform: translate3d(20px, 0, 0)");
    cleanup();

    expect(element.getAttribute("style")).toBe("opacity:.75");
  });
});

describe("scramble-text scroll replay", () => {
  it("can replay on enter-back without changing the existing default", () => {
    document.body.innerHTML = `
      <div
        data-motion="scramble-text"
        data-motion-event="scroll"
        data-motion-on-enter-back="true">
        Neural glow
      </div>
    `;

    const element = document.body.firstElementChild;
    const restart = vi.fn();
    const kill = vi.fn();
    let triggerConfig;

    const gsap = {
      to: vi.fn(() => ({ restart, kill }))
    };
    const ScrollTrigger = {
      create: vi.fn((config) => {
        triggerConfig = config;
        return { kill: vi.fn() };
      })
    };

    const cleanup = scrambleText.mount(element, {
      gsap,
      ScrollTrigger,
      reducedMotion: () => false,
      supportsHover: () => true,
      scrollAlignment: {}
    });

    expect(triggerConfig.once).toBe(false);
    expect(triggerConfig.onEnterBack).toBeTypeOf("function");

    triggerConfig.onEnter();
    triggerConfig.onEnterBack();

    expect(restart).toHaveBeenCalledTimes(2);
    cleanup();
  });
});
