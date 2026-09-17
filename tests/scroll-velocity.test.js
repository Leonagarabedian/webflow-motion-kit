/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pinnedMediaReturn } from "../src/modules/scroll/pinned-media-return.js";
import { pinnedMediaReturn as legacyReference } from "./fixtures/legacy-pinned-media-return.js";

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
  vi.spyOn(performance, "now").mockReturnValue(0);
});
afterEach(() => vi.restoreAllMocks());

function capture(module, mode, authoredThreshold = "") {
  document.body.innerHTML = '<section data-motion-alignment="' + mode + '" data-motion-crop-response-duration="1" data-motion-crop-velocity-smoothing="1" ' + authoredThreshold + '><div data-motion-target="media"></div></section>';
  const root = document.body.firstElementChild;
  let height = 200;
  Object.defineProperty(root.firstElementChild, "offsetHeight", { get: () => height });
  let frame;
  let mediaCleanup;
  const moveInset = vi.fn();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frame = callback; return 1; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const gsap = {
    set: vi.fn(),
    quickTo: vi.fn(() => moveInset),
    killTweensOf: vi.fn(),
    matchMedia: () => ({ add: (_queries, callback) => { mediaCleanup = callback({ conditions: { desktop: true, reduceMotion: false } }); }, revert: () => mediaCleanup?.() })
  };
  const cleanup = module.mount(root, { gsap });
  window.scrollY = 100;
  frame(1000);
  height = 400;
  window.scrollY = 200;
  frame(2000);
  const values = moveInset.mock.calls.map(([value]) => value);
  cleanup();
  return { values, quickOptions: gsap.quickTo.mock.calls[0][2] };
}

it("preserves legacy crop response against the GitHub executable reference", () => {
  const reference = capture(legacyReference, "legacy");
  const legacy = capture(pinnedMediaReturn, "legacy");
  expect(legacy.values).toEqual(reference.values);
  expect(legacy.quickOptions.duration).toBe(reference.quickOptions.duration);
  expect(legacy.quickOptions.ease).toBe(reference.quickOptions.ease);
});

it("measures the auto velocity threshold again when the media resizes", () => {
  const auto = capture(pinnedMediaReturn, "auto", 'data-motion-crop-velocity-max="400"');
  expect(auto.values[0]).toBeCloseTo(4.5);
  expect(auto.values[1]).toBeCloseTo(2.625);
  window.scrollY = 0;
  const manual = capture(pinnedMediaReturn, "manual", 'data-motion-crop-velocity-max="400"');
  expect(manual.values).toEqual([2.625, 2.625]);
});
