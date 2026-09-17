/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createScrollAlignment } from "../src/core/scroll-alignment/index.js";
import { parallax } from "../src/modules/parallax.js";
import { scrollHighlight } from "../src/modules/scroll-highlight.js";
import { scrollTravel } from "../src/modules/scroll-travel.js";
import { liquidFill } from "../src/modules/liquid-fill.js";

beforeEach(() => { document.body.innerHTML = ""; });

function services() {
  const tween = { kill: vi.fn(), scrollTrigger: { kill: vi.fn() } };
  const gsap = { set: vi.fn(), to: vi.fn(() => tween), fromTo: vi.fn(() => tween) };
  const ScrollTrigger = { refresh: vi.fn() };
  return { gsap, ScrollTrigger, reducedMotion: () => false, scrollAlignment: createScrollAlignment({ gsap, ScrollTrigger }) };
}

describe("existing module scroll contracts", () => {
  it("plans parallax using target size, authored scrub, and actual tween duration", () => {
    document.body.innerHTML = '<div data-motion-alignment="auto" data-motion-scrub="1.7"><div data-motion-target="parallax"></div></div>';
    const root = document.body.firstElementChild;
    let height = 400;
    Object.defineProperty(root.firstElementChild, "offsetHeight", { get: () => height });
    const context = services();
    const build = vi.spyOn(context.scrollAlignment, "build");
    const cleanup = parallax.mount(root, context);
    const built = build.mock.results[0].value;
    const to = context.gsap.fromTo.mock.calls[0][2];
    expect(built.plan().facts.maxTravel).toBe(60);
    expect(built.plan().facts.duration).toBe(to.duration);
    expect(to.scrollTrigger.scrub).toBe(1.7);
    height = 800;
    expect(built.plan().facts.maxTravel).toBe(120);
    cleanup();
    root.removeAttribute("data-motion-scrub");
    parallax.mount(root, context);
    const automatic = build.mock.results[1].value;
    expect(automatic.scrollTrigger.scrub).toBe(automatic.plan().scrub);
    expect(automatic.scrollTrigger.scrub).not.toBe(1.5);
  });

  it("plans highlight duration and stagger using the authored tween values", () => {
    document.body.innerHTML = '<div data-motion-alignment="auto" data-motion-duration="0.8" data-motion-stagger="0.1"></div>';
    const root = document.body.firstElementChild;
    const context = services();
    context.SplitText = { create: () => ({ words: [document.createElement("span"), document.createElement("span")], revert: vi.fn() }) };
    const build = vi.spyOn(context.scrollAlignment, "build");
    scrollHighlight.mount(root, context);
    expect(context.gsap.fromTo.mock.calls[0][2].duration).toBe(0.8);
    expect(build.mock.results[0].value.plan().facts.duration).toBeCloseTo(0.9);
  });

  it.each([scrollTravel, liquidFill])("recalculates $name range after container resize and preserves explicit end", (module) => {
    document.body.innerHTML = '<section><h2>BRANDA</h2></section>';
    const container = document.body.firstElementChild;
    const root = container.firstElementChild;
    let height = 600;
    Object.defineProperty(container, "offsetHeight", { get: () => height });
    const context = services();
    const cleanup = module.mount(root, context);
    const config = module === scrollTravel ? context.gsap.fromTo.mock.calls[0][2] : context.gsap.to.mock.calls[0][1];
    expect(config.scrollTrigger.end()).toBe("+=600");
    height = 900;
    expect(config.scrollTrigger.end()).toBe("+=900");
    root.setAttribute("data-motion-end", "bottom bottom");
    expect(config.scrollTrigger.end()).toBe("bottom bottom");
    cleanup();
    expect(root.textContent).toBe("BRANDA");
  });
});
