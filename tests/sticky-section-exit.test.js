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

  return { root, panels, configs, timelines, cleanup, gsap };
}

describe("sticky-section-exit collapse variants", () => {
  it.each([
    "center-collapse",
    "corner-collapse",
    "hinge-collapse",
    "vertical-squash"
  ])("%s uses the Codrops sticky-panel geometry by default", variant => {
    const mounted = mount(`data-motion-sticky-variant="${variant}"`);
    const firstPanel = mounted.panels[0];
    const firstInner = firstPanel.querySelector('[data-motion-target="inner"]');

    expect(mounted.configs[0].trigger).toBe(firstPanel);
    expect(mounted.configs[0].start).toBe("top top");
    expect(mounted.configs[0].scrub).toBe(true);
    expect(mounted.configs[0].end()).toBe("+=1000");

    expect(mounted.gsap.set).toHaveBeenCalledWith(
      firstPanel,
      expect.objectContaining({
        position: "sticky",
        top: "0px",
        height: "calc(100vh - 0px)",
        minHeight: "calc(100vh - 0px)",
        boxSizing: "border-box"
      })
    );

    expect(mounted.gsap.set).toHaveBeenCalledWith(
      firstInner,
      expect.objectContaining({
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box"
      })
    );

    mounted.cleanup?.();
  });

  it("keeps numeric demo alias 3 on the faithful center-collapse behavior", () => {
    const mounted = mount('data-motion-sticky-variant="3"');

    expect(mounted.configs[0].start).toBe("top top");
    expect(mounted.configs[0].scrub).toBe(true);
    expect(mounted.configs[0].end()).toBe("+=1000");

    mounted.cleanup?.();
  });

  it("preserves the previous center collapse as an explicit detached variant", () => {
    const mounted = mount('data-motion-sticky-variant="center-collapse-detached"');
    const firstPanel = mounted.panels[0];

    expect(mounted.configs[0].trigger).toBe(firstPanel);
    expect(mounted.configs[0].start).toBe("top top");
    expect(mounted.configs[0].end).toBe("+=100%");
    expect(mounted.configs[0].scrub).toBe(1);

    expect(mounted.gsap.set).toHaveBeenCalledWith(
      firstPanel,
      expect.objectContaining({
        minHeight: "100svh",
        height: undefined,
        boxSizing: undefined
      })
    );

    mounted.cleanup?.();
  });

  it("keeps the old contact attribute as a backward-compatible faithful override", () => {
    const mounted = mount(
      'data-motion-sticky-variant="center-collapse-detached" data-motion-sticky-contact="true"'
    );

    expect(mounted.configs[0].scrub).toBe(true);
    expect(mounted.configs[0].end()).toBe("+=1000");

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
