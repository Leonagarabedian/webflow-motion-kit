/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  computeAlignedStart,
  createScrollAlignment,
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
