/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { infiniteMediaColumn } from "../src/modules/infinite-media-column.js";

describe("infinite-media-column", () => {
  let rafCallbacks;
  let rafId;

  beforeEach(() => {
    document.body.innerHTML = `
      <div data-motion="infinite-media-column"
           data-motion-direction="down">
        <div data-motion-target="media-track">
          <div data-motion-target="media-item"></div>
          <div data-motion-target="media-item"></div>
          <div data-motion-target="media-item"></div>
        </div>
      </div>
    `;

    rafCallbacks = new Map();
    rafId = 0;

    vi.stubGlobal("requestAnimationFrame", vi.fn((callback) => {
      rafId += 1;
      rafCallbacks.set(rafId, callback);
      return rafId;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn((id) => {
      rafCallbacks.delete(id);
    }));

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1440
    });
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      value: undefined
    });

    const root = document.querySelector('[data-motion="infinite-media-column"]');
    const track = root.querySelector('[data-motion-target="media-track"]');
    const items = [...track.children];

    Object.defineProperty(root, "clientHeight", {
      configurable: true,
      value: 500
    });
    root.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 300,
      bottom: 500,
      width: 300,
      height: 500
    });

    Object.defineProperty(track, "scrollHeight", {
      configurable: true,
      value: 900
    });

    items.forEach((item, index) => {
      Object.defineProperty(item, "offsetTop", {
        configurable: true,
        value: index * 300
      });
      Object.defineProperty(item, "offsetHeight", {
        configurable: true,
        value: 280
      });
      item.getBoundingClientRect = () => ({
        top: index * 300,
        left: 0,
        right: 280,
        bottom: index * 300 + 280,
        width: 280,
        height: 280
      });
    });
  });

  it("moves authored media items continuously without creating another scroller", () => {
    const root = document.querySelector('[data-motion="infinite-media-column"]');
    const gsap = { set: vi.fn() };

    const cleanup = infiniteMediaColumn.mount(root, {
      gsap,
      reducedMotion: () => false,
      logger: console
    });

    const firstItem = root.querySelector('[data-motion-target="media-item"]');
    const firstFrame = [...rafCallbacks.values()][0];
    firstFrame();

    expect(firstItem.style.transform).toContain("translate3d(0,");
    expect(gsap.set).toHaveBeenCalledWith(
      root,
      expect.objectContaining({ overflow: "hidden" })
    );

    cleanup();
  });

  it("uses source-style media defaults for speed and wheel strength", () => {
    const root = document.querySelector('[data-motion="infinite-media-column"]');
    const gsap = { set: vi.fn() };
    const addSpy = vi.spyOn(window, "addEventListener");

    const cleanup = infiniteMediaColumn.mount(root, {
      gsap,
      reducedMotion: () => false,
      logger: console
    });

    expect(
      addSpy.mock.calls.some(
        ([type, , options]) => type === "wheel" && options?.passive === true
      )
    ).toBe(true);

    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }));
    const firstFrame = [...rafCallbacks.values()][0];
    expect(() => firstFrame()).not.toThrow();

    cleanup();
    addSpy.mockRestore();
  });

  it("respects motion-min-width", () => {
    const root = document.querySelector('[data-motion="infinite-media-column"]');
    root.setAttribute("data-motion-min-width", "1600");

    const cleanup = infiniteMediaColumn.mount(root, {
      gsap: { set: vi.fn() },
      reducedMotion: () => false,
      logger: console
    });

    expect(cleanup).toBeUndefined();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("does nothing for reduced-motion visitors", () => {
    const root = document.querySelector('[data-motion="infinite-media-column"]');

    const cleanup = infiniteMediaColumn.mount(root, {
      gsap: { set: vi.fn() },
      reducedMotion: () => true,
      logger: console
    });

    expect(cleanup).toBeUndefined();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
