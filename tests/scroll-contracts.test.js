/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveScrollContract, phaseScrollDistance, scrollMode, viewportScroll } from "../src/core/scroll-alignment/contract.js";
import { scrollContracts } from "../src/modules/scroll/contracts.js";
import * as organized from "../src/modules/scroll/index.js";
import { modules } from "../src/modules/registry.js";
import { heroFrameTransition as referenceFrame } from "./fixtures/legacy-hero-frame-transition.js";
import { heroHeartTransition as referenceHeart } from "./fixtures/legacy-hero-heart-transition.js";
import { heroSlitTransition as referenceSlit } from "./fixtures/legacy-hero-slit-transition.js";
import { syncedFade } from "../src/modules/scroll/synced-fade.js";

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("scroll ownership contracts", () => {
  it("keeps 37 uniquely named modules and the same registered module objects", () => {
    expect(scrollContracts).toHaveLength(37);
    expect(new Set(scrollContracts.map(entry => entry.name)).size).toBe(37);
    const available = Object.values(organized);
    for (const contract of scrollContracts) {
      const module = available.find(module => module.name === contract.name);
      expect(module, contract.name).toBeDefined();
      expect(module.selector).toBe('[data-motion~="' + contract.name + '"]');
      if (contract.name !== "statement-compression") {
        expect(modules.find(entry => entry.name === contract.name)).toBe(module);
      }
    }
  });

  it.each(["", "legacy", "manual"])("preserves legacy config, callbacks, animation and pin identity in %s mode", mode => {
    const root = document.createElement("section");
    if (mode) root.setAttribute("data-motion-alignment", mode);
    const config = { start: "top top", end: () => "+=2500", pin: root, scrub: 1, animation: {}, onUpdate: vi.fn(), onRefresh: vi.fn() };
    const auto = vi.fn(() => { throw new Error("Auto must not run"); });
    expect(resolveScrollContract(root, config, auto)).toBe(config);
    expect(auto).not.toHaveBeenCalled();
  });

  it("adds manual range overrides with end, pixel distance, then vh priority", () => {
    const root = document.createElement("section");
    const legacy = { start: "top top", end: "bottom bottom", scrub: 0.75 };
    root.setAttribute("data-motion-scroll-vh", "300");
    root.setAttribute("data-motion-scroll-distance", "1800");
    expect(resolveScrollContract(root, legacy, vi.fn()).end()).toBe("+=1800");
    root.setAttribute("data-motion-end", "bottom 20%");
    expect(resolveScrollContract(root, legacy, vi.fn()).end).toBe("bottom 20%");
    root.removeAttribute("data-motion-end");
    root.removeAttribute("data-motion-scroll-distance");
    expect(resolveScrollContract(root, legacy, vi.fn()).end()).toBe("+=3000");
  });

  it("uses module geometry in auto while preserving structural pin and callbacks", () => {
    const root = document.createElement("section");
    root.setAttribute("data-motion-alignment", "auto");
    root.setAttribute("data-motion-start", "top 99%");
    root.setAttribute("data-motion-end", "bottom 1%");
    root.setAttribute("data-motion-scrub", "1.4");
    const update = vi.fn();
    const refresh = vi.fn();
    let distance = 900;
    const legacy = { start: "top top", end: "+=2500", pin: root, onUpdate: update, onRefresh: refresh };
    const config = resolveScrollContract(root, legacy, () => viewportScroll(root, 0.7, () => distance));
    expect(config.pin).toBe(root);
    expect(config.onUpdate).toBe(update);
    expect(config.onRefresh).toBe(refresh);
    expect(config.scrub).toBe(1.4);
    expect(config.end()).toBe("+=900");
    distance = 1700;
    expect(config.end()).toBe("+=1700");
  });

  it("recognizes shorthand, manual alias and existing aligned mode", () => {
    const root = document.createElement("div");
    root.setAttribute("data-motion-align", "auto");
    expect(scrollMode(root)).toBe("auto");
    root.setAttribute("data-motion-alignment", "manual");
    expect(scrollMode(root)).toBe("legacy");
    root.setAttribute("data-motion-alignment", "aligned");
    expect(scrollMode(root)).toBe("aligned");
  });

  it("phase pacing responds to measured travel, phase fractions and viewport size", () => {
    const root = document.createElement("section");
    expect(phaseScrollDistance(root, [{ start: 0, end: 0.25, travel: 800 }])).toBe(3200);
    expect(phaseScrollDistance(root, [{ start: 0, end: 0.5, travel: 800 }])).toBe(1600);
    root.setAttribute("data-motion-scroll-factor", "0.5");
    expect(phaseScrollDistance(root, [{ start: 0, end: 0.25, travel: 800 }])).toBe(1600);
  });
});

function captureHero(module, mode, attributes = "") {
  const targets = ["intro", "frame", "side-left", "side-right", "overlay-dark", "bg-copy-left", "bg-copy-right"];
  document.body.innerHTML = '<section data-motion-alignment="' + mode + '" ' + attributes + '>' + targets.map(role => '<div data-motion-target="' + role + '"></div>').join("") + '</section>';
  const root = document.body.firstElementChild;
  Object.defineProperty(root.querySelector('[data-motion-target="frame"]'), "offsetWidth", { value: 1440 });
  Object.defineProperty(root.querySelector('[data-motion-target="frame"]'), "offsetHeight", { value: 1000 });
  let config;
  let mediaCleanup;
  const progress = [];
  const sets = [];
  const tweens = [];
  const makeTween = () => {
    const index = tweens.length;
    const tween = { progress: value => { progress.push([index, value]); return tween; }, kill: vi.fn() };
    tweens.push(tween);
    return tween;
  };
  const targetLabel = target => Array.isArray(target) ? target.map(targetLabel) : target?.getAttribute?.("data-motion-target") || target?.getAttribute?.("data-motion-generated") || target?.tagName;
  const context = {
    MorphSVGPlugin: {},
    Flip: { getState: vi.fn(() => ({})), from: vi.fn(makeTween) },
    ScrollTrigger: { create: value => { config = value; return { kill: vi.fn() }; } },
    gsap: {
      set: (target, vars) => sets.push([targetLabel(target), vars]),
      to: vi.fn(makeTween),
      fromTo: vi.fn(makeTween),
      getProperty: (_target, property) => property === "rotation" ? 16 : 1,
      matchMedia: () => ({ add: (_queries, callback) => { mediaCleanup = callback({ conditions: { desktop: true, reduceMotion: false } }); }, revert: () => mediaCleanup?.() }),
      utils: { clamp: (min, max, value) => Math.max(min, Math.min(max, value)) }
    }
  };
  const cleanup = module.mount(root, context);
  progress.length = 0;
  sets.length = 0;
  const trace = [];
  for (const value of [0, 0.12, 0.25, 0.32, 0.45, 0.52, 0.55, 0.6, 0.65, 0.72, 0.75, 0.78, 0.9, 1]) {
    config.onUpdate({ progress: value });
    trace.push({ progress: progress.splice(0), sets: sets.splice(0) });
  }
  const result = { trace, start: config.start, end: typeof config.end === "function" ? config.end() : config.end, pinIsRoot: config.pin === root, scrub: config.scrub };
  cleanup();
  return result;
}

describe("customized heroes preserve the GitHub legacy reference", () => {
  it.each([
    ["hero-frame-transition", referenceFrame, 2500],
    ["hero-heart-transition", referenceHeart, 5000],
    ["hero-slit-transition", referenceSlit, 5000]
  ])("%s preserves default and authored legacy ranges and every sampled phase", (name, reference, distance) => {
    const module = Object.values(organized).find(module => module.name === name);
    const original = captureHero(reference, "legacy");
    const legacy = captureHero(module, "legacy");
    const auto = captureHero(module, "auto");
    expect(legacy).toEqual(original);
    expect(legacy.end).toBe("+=" + distance);
    expect(auto.trace).toEqual(original.trace);
    expect(auto.pinIsRoot).toBe(true);
    expect(auto.end).not.toBe(legacy.end);
    expect(captureHero(module, "legacy", 'data-motion-scroll-vh="330" data-motion-start="top 10%"').trace)
      .toEqual(captureHero(reference, "legacy", 'data-motion-scroll-vh="330" data-motion-start="top 10%"').trace);
    expect(captureHero(module, "legacy", 'data-motion-end="bottom 20%"').end).toBe("bottom 20%");
  });
});

it("a follower picks up a recreated parent instead of stale progress", () => {
  const root = document.createElement("div");
  root.setAttribute("data-motion-fade-sync-trigger-id", "owner");
  document.body.appendChild(root);
  let frame;
  vi.stubGlobal("requestAnimationFrame", callback => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  let parent = { progress: 0.25 };
  const gsap = { set: vi.fn() };
  const cleanup = syncedFade.mount(root, { gsap, reducedMotion: () => false, ScrollTrigger: { getById: () => parent } });
  frame();
  expect(gsap.set).toHaveBeenLastCalledWith(root, { opacity: 0.75, y: 0 });
  parent = { progress: 0.8 };
  frame();
  expect(gsap.set).toHaveBeenLastCalledWith(root, { opacity: expect.closeTo(0.2), y: 0 });
  cleanup();
});
