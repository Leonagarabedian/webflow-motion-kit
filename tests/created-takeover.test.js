/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { mountCreatedTakeover } from "../src/modules/scroll/created-takeover.js";

function fixture() {
  document.body.innerHTML = '<section data-motion-reparent="false" data-motion-portrait-mode="slide-away" data-motion-start="top 90%" data-motion-end="bottom 75%"><div data-motion-target="takeover-bounds"><div data-motion-target="takeover-field" style="color:red">Panel</div><div data-motion-target="takeover-boundary"><img></div></div></section>';
  const root = document.querySelector("section");
  const frame = root.querySelector('[data-motion-target="takeover-bounds"]');
  const panel = root.querySelector('[data-motion-target="takeover-field"]');
  const portrait = root.querySelector('[data-motion-target="takeover-boundary"]');
  let width = 1000;
  Object.defineProperty(frame, "clientWidth", { get: () => width });
  Object.defineProperty(frame, "clientHeight", { get: () => 600 });
  frame.getBoundingClientRect = () => ({ left: 20, top: 200, width, height: 600 });
  panel.getBoundingClientRect = () => ({ left: 20, top: 300, width: width / 2, height: 500 });
  portrait.getBoundingClientRect = () => ({ left: 20 + width / 2, top: 200, width: width / 2, height: 600 });

  let mediaCleanup;
  let timelineVars;
  let progress;
  const steps = [];
  const timeline = {
    kill: vi.fn(),
    scrollTrigger: { kill: vi.fn() },
    to: vi.fn((target, vars, at) => {
      progress = target;
      steps.push({ vars, at });
      return timeline;
    })
  };
  const gsap = {
    matchMedia: vi.fn(() => ({
      add: (_query, callback) => { mediaCleanup = callback(); },
      revert: () => mediaCleanup?.()
    })),
    set: vi.fn(),
    timeline: vi.fn((vars) => {
      timelineVars = vars;
      return timeline;
    })
  };
  const ScrollTrigger = { refresh: vi.fn() };
  const stop = mountCreatedTakeover(root, { gsap, ScrollTrigger });
  return {
    root, frame, panel, portrait, gsap, timeline, ScrollTrigger, steps, stop,
    resize: (value) => { width = value; },
    get progress() { return progress; },
    get timelineVars() { return timelineVars; }
  };
}

function lastSet(gsap, element) {
  return gsap.set.mock.calls.filter(([target]) => target === element).at(-1)?.[1];
}

describe("Created bounded takeover", () => {
  it("requires the bounds to be the actual shared parent and never reparents", () => {
    document.body.innerHTML = '<section data-motion-reparent="true"><div data-motion-target="takeover-bounds"><div data-motion-target="takeover-field"></div><div data-motion-target="takeover-boundary"></div></div></section>';
    const gsap = { matchMedia: vi.fn() };
    const root = document.querySelector("section");
    mountCreatedTakeover(root, { gsap });
    expect(gsap.matchMedia).not.toHaveBeenCalled();

    root.setAttribute("data-motion-reparent", "false");
    root.querySelector('[data-motion-target="takeover-field"]').remove();
    mountCreatedTakeover(root, { gsap });
    expect(gsap.matchMedia).not.toHaveBeenCalled();
  });

  it("moves the outer portrait wrapper away while the panel fills its stationary frame", () => {
    const c = fixture();
    expect(c.timelineVars.scrollTrigger).toEqual(expect.objectContaining({
      trigger: c.root,
      start: "top 90%",
      end: "bottom 75%",
      pin: undefined
    }));
    expect(c.steps).toEqual([
      { vars: { portrait: 1, duration: 0.8 }, at: 0.05 },
      { vars: { panel: 1, duration: 0.75 }, at: 0.25 }
    ]);

    c.progress.panel = 0;
    c.progress.portrait = 0;
    c.timelineVars.onUpdate();
    expect(lastSet(c.gsap, c.panel)).toEqual(expect.objectContaining({
      left: 0, top: 100, width: 500, height: 500
    }));
    expect(lastSet(c.gsap, c.portrait)).toEqual({ x: 0 });

    c.progress.panel = 0.5;
    c.progress.portrait = 0.5;
    c.timelineVars.onUpdate();
    expect(lastSet(c.gsap, c.panel)).toEqual(expect.objectContaining({
      left: 0, top: 50, width: 750, height: 550
    }));
    expect(lastSet(c.gsap, c.portrait)).toEqual({ x: 250 });

    c.progress.panel = 1;
    c.progress.portrait = 1;
    c.timelineVars.onUpdate();
    expect(lastSet(c.gsap, c.panel)).toEqual(expect.objectContaining({
      left: 0, top: 0, width: 1000, height: 600
    }));
    expect(lastSet(c.gsap, c.portrait)).toEqual({ x: 500 });
    expect(c.panel.parentElement).toBe(c.frame);
    expect(c.portrait.parentElement).toBe(c.frame);
    expect(c.frame.querySelector("[data-created-placeholder]")).not.toBeNull();
    c.stop();
  });

  it("remeasures on refresh and restores Webflow styles on cleanup", () => {
    const c = fixture();
    c.resize(1200);
    c.timelineVars.scrollTrigger.onRefreshInit();
    c.progress.panel = 1;
    c.progress.portrait = 1;
    c.timelineVars.onUpdate();
    expect(lastSet(c.gsap, c.panel)).toEqual(expect.objectContaining({
      top: 0, width: 1200, height: 600
    }));
    expect(lastSet(c.gsap, c.portrait)).toEqual({ x: 600 });

    c.stop();
    expect(c.panel.getAttribute("style")).toBe("color:red");
    expect(c.frame.querySelector("[data-created-placeholder]")).toBeNull();
    expect(c.timeline.kill).toHaveBeenCalled();
    expect(c.timeline.scrollTrigger.kill).toHaveBeenCalled();
  });
});
