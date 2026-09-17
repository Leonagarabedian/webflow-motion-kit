/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { footerReveal, morphNarrative, servicesCenterShift, themeSwitch, flipRelocation, scrollTravel, liquidFill, brandLoad } from "../src/modules/scroll/index.js";

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
});

const scenes = [
  [footerReveal, '<div data-motion-target="footer-label"></div><div data-motion-target="footer-column"><div data-motion-target="footer-item"></div></div><div data-motion-target="footer-legal"></div>', "top 88%", undefined],
  [morphNarrative, '<svg><path data-motion-target="morph-source"></path><path data-motion-morph-shape></path><path data-motion-morph-shape></path></svg>', "top top", "bottom bottom"],
  [servicesCenterShift, '<div class="services-intro"></div><div class="services-list"><div class="services-row"></div><div class="services-row"></div></div>', "top 88%", "top 28%"],
  [themeSwitch, '<div></div>', "top 50%", "bottom top"],
  [flipRelocation, '<div><div data-flip-item></div></div><div data-flip-target></div>', "top top", "bottom bottom"],
  [scrollTravel, 'BRANDA', "top top", "+=600"],
  [liquidFill, 'BRANDA', "top top", "+=600"],
  [brandLoad, 'BRANDA', "top 88%", undefined]
];

function mount(module, scene, mode, attributes = "") {
  document.body.innerHTML = '<section data-motion-alignment="' + mode + '" ' + attributes + '><div data-motion-on-view="true">' + scene + '</div></section>';
  const section = document.body.firstElementChild;
  const root = section.firstElementChild;
  root.setAttribute("data-motion-alignment", mode);
  if (attributes) {
    const authored = section.attributes;
    for (const attribute of authored) if (attribute.name !== "data-motion-alignment") root.setAttribute(attribute.name, attribute.value);
  }
  let height = 600;
  Object.defineProperty(section, "offsetHeight", { get: () => height });
  Object.defineProperty(root, "offsetHeight", { get: () => height });
  let config;
  let mediaCleanup;
  const tween = { kill: vi.fn(), progress: vi.fn(), scrollTrigger: { kill: vi.fn() } };
  const timeline = { ...tween, to: vi.fn().mockReturnThis(), fromTo: vi.fn().mockReturnThis() };
  const gsap = {
    set: vi.fn(),
    to: vi.fn((_target, vars) => { if (vars.scrollTrigger) config = vars.scrollTrigger; return tween; }),
    fromTo: vi.fn((_target, _from, vars) => { if (vars.scrollTrigger) config = vars.scrollTrigger; return tween; }),
    timeline: vi.fn(vars => { config = vars.scrollTrigger; return timeline; }),
    getProperty: () => 0,
    killTweensOf: vi.fn(),
    matchMedia: () => ({ add: (_queries, callback) => { mediaCleanup = callback({ conditions: { desktop: true, reduceMotion: false } }); }, revert: () => mediaCleanup?.() })
  };
  const context = { gsap, reducedMotion: () => false, Flip: { getState: () => ({}), from: () => tween }, ScrollTrigger: { create: vars => { config = vars; return { kill: vi.fn() }; }, refresh: vi.fn() } };
  const cleanup = module.mount(root, context);
  return { config, root, gsap, timeline, cleanup, resize: next => { height = next; } };
}

describe("each non-renderer scroll owner has explicit controls", () => {
  it.each(scenes)("$0.name keeps its existing legacy start/end defaults", (module, scene, start, end) => {
    const mounted = mount(module, scene, "legacy");
    expect(mounted.config, module.name).toBeDefined();
    expect(mounted.config.start).toBe(start);
    const actual = typeof mounted.config.end === "function" ? mounted.config.end() : mounted.config.end;
    expect(actual).toBe(end);
    mounted.cleanup?.();
  });

  it.each(scenes)("$0.name exposes module geometry in auto and accepts manual input", (module, scene) => {
    const automatic = mount(module, scene, "auto");
    expect(typeof automatic.config.end).toBe("function");
    const span = automatic.config.end();
    expect(span).toMatch(/^\+=/);
    expect(Number(span.slice(2))).toBeGreaterThan(0);
    automatic.cleanup?.();
    const manual = mount(module, scene, "manual", 'data-motion-start="top 12%" data-motion-end="bottom 24%"');
    expect(manual.config.start).toBe("top 12%");
    expect(manual.config.end).toBe("bottom 24%");
    manual.cleanup?.();
  });
});
