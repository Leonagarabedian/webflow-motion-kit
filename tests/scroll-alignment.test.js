/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  analyzeMotion,
  computeAlignedStart,
  createScrollAlignment,
  planScrollAlignment,
  resolveSpan,
  SCROLL_ALIGNMENT_MODES
} from "../src/core/scroll-alignment/index.js";
import {
  getActiveBreakpoint,
  resolveBreakpointConfig
} from "../src/core/scroll-alignment/breakpoints.js";
import {
  normalizeProgressWindow,
  progressToLocal
} from "../src/core/scroll-alignment/timeline.js";
import { createAlignmentRefreshController } from "../src/core/scroll-alignment/refresh.js";

function rect({ top = 0, left = 0, width = 100, height = 100 } = {}) {
  return {
    top,
    bottom: top + height,
    left,
    right: left + width,
    width,
    height,
    x: left,
    y: top,
    toJSON() { return this; }
  };
}

function setViewport(width, height) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

function installMatchMedia() {
  window.matchMedia = vi.fn((query) => {
    const min = query.match(/min-width:\s*(\d+)px/);
    const max = query.match(/max-width:\s*(\d+)px/);
    const width = window.innerWidth;
    const matches = (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
    return { matches, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  });
}

beforeEach(() => {
  document.body.innerHTML = "";
  setViewport(1440, 1000);
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  Object.defineProperty(window, "pageYOffset", { configurable: true, value: 0 });
  installMatchMedia();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("scroll alignment geometry", () => {
  it("aligns an element edge to an exact viewport line", () => {
    const element = document.createElement("div");
    element.getBoundingClientRect = () => rect({ top: 900, height: 200 });

    expect(computeAlignedStart({ trigger: element, anchor: "top", viewport: 0.72 })).toBe(180);
    expect(computeAlignedStart({ trigger: element, anchor: "center", viewport: 0.72 })).toBe(280);
    expect(computeAlignedStart({ trigger: element, anchor: "bottom", viewport: 0.72 })).toBe(380);
  });

  it("accounts for document scroll and explicit offsets", () => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 500 });
    const element = document.createElement("div");
    element.getBoundingClientRect = () => rect({ top: 400, height: 100 });

    expect(computeAlignedStart({
      trigger: element,
      viewport: 0.5,
      offset: "10vh",
      headerOffset: "60px"
    })).toBe(240);
  });

  it("resolves fixed and measured scroll spans", () => {
    const context = {
      viewportHeight: 1000,
      viewportWidth: 1440,
      element: { height: 320 }
    };

    expect(resolveSpan("70vh", context)).toBe(700);
    expect(resolveSpan("+=600px", context)).toBe(600);
    expect(resolveSpan("element", context)).toBe(320);
    expect(resolveSpan("element*1.5", context)).toBe(480);
  });
});

describe("automatic motion analysis", () => {
  it("detects stage count and motion magnitude from descriptors", () => {
    const facts = analyzeMotion({
      profile: "composition",
      stages: [
        { start: 0, duration: 0.44, scaleXFrom: 1.14, scaleXTo: 1, yFrom: 16, yTo: 0 },
        { start: 0.18, duration: 0.38, yFrom: 72, yTo: 0, blurFrom: 8, blurTo: 0, opacityFrom: 0.18, opacityTo: 1 },
        { start: 0.42, duration: 0.32, yFrom: 28, yTo: 0, opacityFrom: 0.26, opacityTo: 1 },
        { start: 0.7, duration: 0.22, yFrom: 24, yTo: 0, opacityFrom: 0, opacityTo: 1 }
      ]
    });

    expect(facts.stageCount).toBe(4);
    expect(facts.duration).toBeCloseTo(0.92);
    expect(facts.maxTravel).toBe(72);
    expect(facts.maxBlurDelta).toBe(8);
    expect(facts.maxScaleDelta).toBeCloseTo(0.14);
    expect(facts.complexity).toBeGreaterThan(1);
  });

  it("plans longer scroll space for more complex motion", () => {
    const geometry = { viewportHeight: 1000, element: { height: 180 } };
    const simple = planScrollAlignment({
      profile: "reveal",
      geometry,
      stages: [{ start: 0, duration: 0.3, yFrom: 16, yTo: 0, opacityFrom: 0, opacityTo: 1 }]
    });
    const complex = planScrollAlignment({
      profile: "composition",
      geometry,
      stages: [
        { start: 0, duration: 0.44, scaleXFrom: 1.14, scaleXTo: 1, yFrom: 16, yTo: 0 },
        { start: 0.18, duration: 0.38, yFrom: 72, yTo: 0, blurFrom: 8, blurTo: 0 },
        { start: 0.42, duration: 0.32, yFrom: 28, yTo: 0 },
        { start: 0.7, duration: 0.22, yFrom: 24, yTo: 0 }
      ]
    });

    expect(complex.spanPx).toBeGreaterThan(simple.spanPx);
    expect(complex.viewport).toBeLessThan(simple.viewport);
  });

  it("replans for mobile instead of reusing desktop geometry", () => {
    const geometry = { viewportHeight: 900, element: { height: 180 } };
    const desktop = planScrollAlignment({ profile: "composition", breakpoint: "desktop", geometry, stages: [{ duration: 0.5 }] });
    const mobile = planScrollAlignment({ profile: "composition", breakpoint: "mobile", geometry, stages: [{ duration: 0.5 }] });

    expect(mobile.spanPx).toBeLessThan(desktop.spanPx);
    expect(mobile.viewport).toBeGreaterThan(desktop.viewport);
  });
});

describe("scroll alignment breakpoints", () => {
  it.each([
    [1200, "desktop"],
    [900, "tablet"],
    [650, "mobileLandscape"],
    [390, "mobile"]
  ])("resolves %ipx as %s", (width, expected) => {
    setViewport(width, 900);
    installMatchMedia();
    expect(getActiveBreakpoint()).toBe(expected);
  });

  it("merges only the active breakpoint override", () => {
    setViewport(900, 900);
    installMatchMedia();
    const result = resolveBreakpointConfig({
      span: "70vh",
      scrub: 0.85,
      breakpoints: {
        tablet: { span: "50vh", scrub: 0.5 },
        mobile: { span: "30vh" }
      }
    });

    expect(result.breakpoint).toBe("tablet");
    expect(result.config.span).toBe("50vh");
    expect(result.config.scrub).toBe(0.5);
  });
});

describe("scroll alignment legacy mode", () => {
  it("preserves a legacy ScrollTrigger contract and falls back to the root trigger", () => {
    const root = document.createElement("section");
    const gsap = { timeline: vi.fn((config) => config) };
    const alignment = createScrollAlignment({ gsap, ScrollTrigger: {} });

    const built = alignment.build(root, {
      mode: SCROLL_ALIGNMENT_MODES.LEGACY,
      start: "top 88%",
      end: "bottom 42%",
      scrub: 0.85,
      pin: false,
      id: "legacy-test"
    });

    expect(built.mode).toBe("legacy");
    expect(built.trigger).toBe(root);
    expect(built.scrollTrigger).toMatchObject({
      trigger: root,
      start: "top 88%",
      end: "bottom 42%",
      scrub: 0.85,
      pin: false,
      id: "legacy-test"
    });
  });

  it("keeps automatic planning opt-in", () => {
    const root = document.createElement("section");
    root.getBoundingClientRect = () => rect({ top: 800, height: 200 });
    const gsap = { timeline: vi.fn((config) => config) };
    const alignment = createScrollAlignment({ gsap, ScrollTrigger: {} });
    const built = alignment.build(root, {
      mode: SCROLL_ALIGNMENT_MODES.AUTO,
      profile: "composition",
      stages: [{ duration: 0.5, yFrom: 64, yTo: 0 }]
    });

    expect(built.mode).toBe("auto");
    expect(typeof built.plan).toBe("function");
    expect(built.plan().spanPx).toBeGreaterThan(0);
  });
});

describe("shared timeline progress", () => {
  it("normalizes progress windows and maps global progress locally", () => {
    expect(normalizeProgressWindow(0.2, 0.6)).toEqual({ start: 0.2, end: 0.6 });
    expect(progressToLocal(0.2, 0.2, 0.6)).toBe(0);
    expect(progressToLocal(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(progressToLocal(0.8, 0.2, 0.6)).toBe(1);
  });
});

describe("refresh safety", () => {
  it("coalesces repeated refresh requests and removes watchers on destroy", () => {
    const refresh = vi.fn();
    let rafId = 0;
    const rafCallbacks = new Map();
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback) => {
      const id = ++rafId;
      rafCallbacks.set(id, callback);
      return id;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn((id) => rafCallbacks.delete(id)));

    const controller = createAlignmentRefreshController({ ScrollTrigger: { refresh } });
    controller.watch({ fonts: false, resize: true, orientation: true });

    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(2);

    const latestId = rafId;
    rafCallbacks.get(latestId)?.();
    expect(refresh).toHaveBeenCalledTimes(1);

    controller.destroy();
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("orientationchange"));
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  });
});

describe("scroll migration regression checks", () => {
  it("remeasures percentage travel after target resize and combines signed units", () => {
    const target = document.createElement("div");
    let height = 200;
    Object.defineProperty(target, "offsetHeight", { get: () => height });
    const stages = [{ duration: 0.5, target, yPercentFrom: -5, yPercentTo: -20 }];
    expect(analyzeMotion({ stages }).maxTravel).toBe(30);
    height = 400;
    expect(analyzeMotion({ stages }).maxTravel).toBe(60);
    expect(analyzeMotion({ stages: [{ ...stages[0], yFrom: 0, yTo: 60 }] }).maxTravel).toBe(0);
  });

  it("honors numeric scrub, explicit planner override priority, and non-scrub mode", () => {
    const root = document.createElement("div");
    const alignment = createScrollAlignment({ gsap: {}, ScrollTrigger: {} });
    const built = alignment.build(root, { mode: "auto", scrub: 1.5 });
    expect(built.scrollTrigger.scrub).toBe(1.5);
    expect(built.plan().scrub).toBe(1.5);
    expect(alignment.build(root, { mode: "auto", scrub: 1.5, overrides: { scrub: 0.4 } }).scrollTrigger.scrub).toBe(0.4);
    expect(alignment.build(root, { mode: "auto", scrub: false }).scrollTrigger.scrub).toBe(false);
  });

  it("keeps the active scrub tween and diagnostics consistent after resize", () => {
    const root = document.createElement("div");
    const alignment = createScrollAlignment({ gsap: {}, ScrollTrigger: {} });
    const built = alignment.build(root, { mode: "auto", id: "responsive", profile: "composition" });
    const self = { vars: { ...built.scrollTrigger }, scrubDuration: vi.fn() };
    setViewport(390, 800);
    installMatchMedia();
    built.scrollTrigger.onRefresh(self);
    expect(self.scrubDuration).toHaveBeenCalledWith(built.plan().scrub);
    expect(built.diagnostics().scrub).toBe(self.vars.scrub);
  });
});
