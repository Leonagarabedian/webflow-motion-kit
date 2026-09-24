/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { infiniteTextDistortion } from "../src/modules/infinite-text-distortion.js";

describe("infinite-text-distortion", () => {
  let rafCallbacks;
  let rafId;

  beforeEach(() => {
    document.body.innerHTML = `
      <section data-motion="infinite-text-distortion"
               data-motion-direction="up"
               data-motion-wave="sin">
        <div data-motion-target="distortion-track">
          <p data-motion-target="distortion-item">First paragraph for testing.</p>
          <p data-motion-target="distortion-item">Second paragraph for testing.</p>
        </div>
      </section>
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

    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      value: undefined
    });

    const root = document.querySelector('[data-motion="infinite-text-distortion"]');
    const track = root.querySelector('[data-motion-target="distortion-track"]');
    const items = [...track.children];

    Object.defineProperty(root, "clientHeight", {
      configurable: true,
      value: 400
    });
    root.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 600,
      bottom: 400,
      width: 600,
      height: 400
    });

    Object.defineProperty(track, "scrollHeight", {
      configurable: true,
      value: 900
    });

    items.forEach((item, index) => {
      Object.defineProperty(item, "offsetTop", {
        configurable: true,
        value: index * 220
      });
      Object.defineProperty(item, "offsetHeight", {
        configurable: true,
        value: 180
      });
      item.getBoundingClientRect = () => ({
        top: index * 220,
        left: 0,
        right: 300,
        bottom: index * 220 + 180,
        width: 300,
        height: 180
      });
    });
  });

  it("splits items into lines and applies organic line transforms", () => {
    const root = document.querySelector('[data-motion="infinite-text-distortion"]');
    const gsap = { set: vi.fn() };
    const createdLines = [];

    class FakeSplitText {
      constructor(element) {
        const line = document.createElement("span");
        line.textContent = "line";
        line.getBoundingClientRect = () => ({
          top: element.getBoundingClientRect().top + 20,
          left: 0,
          right: 200,
          bottom: element.getBoundingClientRect().top + 50,
          width: 200,
          height: 30
        });
        element.appendChild(line);
        this.lines = [line];
        createdLines.push(line);
      }

      revert() {}
    }

    const cleanup = infiniteTextDistortion.mount(root, {
      gsap,
      SplitText: FakeSplitText,
      reducedMotion: () => false,
      logger: console
    });

    expect(createdLines).toHaveLength(2);
    expect(createdLines[0].hasAttribute("data-mk-infinite-distortion-line")).toBe(true);

    const firstFrame = [...rafCallbacks.values()][0];
    firstFrame(1000);

    expect(createdLines[0].style.transform).toContain("translate3d(");
    expect(root.querySelector('[data-motion-target="distortion-item"]').style.transform)
      .toContain("translate3d(0,");

    cleanup();
  });

  it("keeps wheel input passive and reversible without creating another scroller", () => {
    const root = document.querySelector('[data-motion="infinite-text-distortion"]');
    const gsap = { set: vi.fn() };

    class FakeSplitText {
      constructor(element) {
        const line = document.createElement("span");
        line.getBoundingClientRect = () => ({
          top: element.getBoundingClientRect().top,
          left: 0,
          right: 100,
          bottom: element.getBoundingClientRect().top + 20,
          width: 100,
          height: 20
        });
        element.appendChild(line);
        this.lines = [line];
      }

      revert() {}
    }

    const addSpy = vi.spyOn(window, "addEventListener");

    const cleanup = infiniteTextDistortion.mount(root, {
      gsap,
      SplitText: FakeSplitText,
      reducedMotion: () => false,
      logger: console
    });

    expect(
      addSpy.mock.calls.some(
        ([type, , options]) => type === "wheel" && options?.passive === true
      )
    ).toBe(true);

    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 120 }));
    const firstFrame = [...rafCallbacks.values()][0];
    expect(() => firstFrame(16)).not.toThrow();

    cleanup();
    addSpy.mockRestore();
  });

  it("does nothing for reduced-motion visitors", () => {
    const root = document.querySelector('[data-motion="infinite-text-distortion"]');

    const cleanup = infiniteTextDistortion.mount(root, {
      gsap: { set: vi.fn() },
      SplitText: class {},
      reducedMotion: () => true,
      logger: console
    });

    expect(cleanup).toBeUndefined();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
