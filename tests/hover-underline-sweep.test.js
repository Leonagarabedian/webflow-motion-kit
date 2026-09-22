import { describe, expect, it, vi } from "vitest";
import { hoverUnderlineSweep } from "../src/modules/hover-underline-sweep.js";

function createGsapMock() {
  const timeline = {
    kill: vi.fn(),
    play: vi.fn(),
    reverse: vi.fn(),
    to: vi.fn()
  };
  timeline.to.mockReturnValue(timeline);

  return {
    gsap: {
      timeline: vi.fn(() => timeline)
    },
    timeline
  };
}

describe("hover-underline-sweep", () => {
  it("configures the underline from attributes and restores inline state on cleanup", () => {
    const link = document.createElement("a");
    link.setAttribute("data-motion", "hover-underline-sweep");
    link.setAttribute("data-motion-duration", "0.4");
    link.setAttribute("data-motion-underline-height", "2");
    link.setAttribute("data-motion-underline-offset", "5");
    link.setAttribute("data-motion-underline-origin", "right");
    link.setAttribute("data-motion-underline-color", "currentColor");
    document.body.appendChild(link);

    const { gsap, timeline } = createGsapMock();
    const cleanup = hoverUnderlineSweep.mount(link, {
      gsap,
      reducedMotion: () => false,
      supportsHover: () => true
    });

    expect(link.style.getPropertyValue("--mk-underline-height")).toBe("2px");
    expect(link.style.getPropertyValue("--mk-underline-offset")).toBe("5px");
    expect(link.style.getPropertyValue("--mk-underline-origin")).toBe("right center");
    expect(link.style.getPropertyValue("--mk-underline-color")).toBe("currentColor");
    expect(document.getElementById("motion-kit-hover-underline-sweep-v1-styles")).toBeTruthy();
    expect(gsap.timeline).toHaveBeenCalledWith(
      expect.objectContaining({
        defaults: expect.objectContaining({ duration: 0.4, ease: "power3.out" }),
        paused: true
      })
    );

    cleanup();

    expect(timeline.kill).toHaveBeenCalled();
    expect(link.style.getPropertyValue("--mk-underline-height")).toBe("");
    expect(link.style.getPropertyValue("--mk-underline-offset")).toBe("");
    expect(link.style.getPropertyValue("--mk-underline-origin")).toBe("");
    expect(link.style.getPropertyValue("--mk-underline-color")).toBe("");
    link.remove();
  });
});
