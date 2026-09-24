/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { stickySectionExit } from "../src/modules/scroll/sticky-section-exit.js";

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
});

function mount(attributes = "") {
  document.body.innerHTML = `
    <div data-motion="sticky-section-exit" ${attributes}>
      <section data-motion-sticky-section><div data-motion-target="inner"><div data-motion-target="media"></div></div></section>
      <section data-motion-sticky-section><div data-motion-target="inner"><div data-motion-target="media"></div></div></section>
      <section data-motion-sticky-section><div data-motion-target="inner"><div data-motion-target="media"></div></div></section>
    </div>
  `;

  const root = document.body.firstElementChild;
  const panels = [...root.querySelectorAll("[data-motion-sticky-section]")];
  const configs = [];
  const timelines = [];

  const gsap = {
    set: vi.fn(),
    timeline: vi.fn(({ scrollTrigger } = {}) => {
      configs.push(scrollTrigger);
      const timeline = {
        to: vi.fn().mockReturnThis(),
        fromTo: vi.fn().mockReturnThis(),
        kill: vi.fn(),
        scrollTrigger: { kill: vi.fn() }
      };
      timelines.push(timeline);
      return timeline;
    }),
    fromTo: vi.fn(() => ({
      kill: vi.fn(),
      scrollTrigger: { kill: vi.fn() }
    }))
  };

  const cleanup = stickySectionExit.mount(root, {
    gsap,
    reducedMotion: () => false
  });

  return { root, panels, configs, timelines, cleanup };
}

describe("sticky-section-exit refinements", () => {
  it.each(["center-collapse", "corner-collapse", "hinge-collapse", "vertical-squash"])(
    "%s can synchronize collapse to the incoming panel",
    variant => {
      const mounted = mount(
        `data-motion-sticky-variant="${variant}" data-motion-sticky-contact="true"`
      );

      expect(mounted.configs[0].trigger).toBe(mounted.panels[1]);
      expect(mounted.configs[0].start).toBe("top bottom");
      expect(mounted.configs[0].end).toBe("top top");

      expect(mounted.configs[1].trigger).toBe(mounted.panels[2]);
      expect(mounted.configs[1].start).toBe("top bottom");
      expect(mounted.configs[1].end).toBe("top top");

      mounted.cleanup?.();
    }
  );

  it("preserves the original independent collapse when contact is not enabled", () => {
    const mounted = mount('data-motion-sticky-variant="center-collapse"');

    expect(mounted.configs[0].trigger).toBe(mounted.panels[0]);
    expect(mounted.configs[0].start).toBe("top top");
    expect(mounted.configs[0].end).toBe("+=100%");

    mounted.cleanup?.();
  });

  it("gives side-throw a dedicated final fade phase", () => {
    const mounted = mount('data-motion-sticky-variant="side-throw"');
    const firstTimeline = mounted.timelines[0];

    expect(firstTimeline.to).toHaveBeenCalledWith(
      mounted.panels[0],
      expect.objectContaining({ opacity: 0, duration: 0.18 }),
      0.82
    );

    mounted.cleanup?.();
  });
});
