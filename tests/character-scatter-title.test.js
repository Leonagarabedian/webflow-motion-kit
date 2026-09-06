import { describe, expect, it, vi } from "vitest";
import { characterScatterTitle } from "../src/modules/character-scatter-title.js";

describe("character scatter title", () => {
  it("matches the Nothin source trigger and character-fall choreography", () => {
    document.body.innerHTML = `
      <section data-motion="character-scatter-title"
               data-motion-field-selector=".field"
               data-motion-chip-selector=".chip"
               data-motion-title-selector=".title">
        <div class="title">CENTER TITLE</div>
        <div class="field">
          <div class="chip">Alpha</div>
          <div class="chip">Beta</div>
        </div>
      </section>
    `;

    const velocityTriggers = [];
    const timelineConfigs = [];
    const tweenCalls = [];

    const timeline = {
      scrollTrigger: { progress: 0 },
      to: vi.fn((target, vars, position) => {
        tweenCalls.push({ target, vars, position });
        return timeline;
      }),
      kill: vi.fn()
    };

    const gsap = {
      set: vi.fn(),
      timeline: vi.fn((config) => {
        timelineConfigs.push(config);
        return timeline;
      }),
      utils: {
        random: vi.fn((min, max) => (min + max) / 2)
      }
    };

    const ScrollTrigger = {
      create: vi.fn((config) => {
        velocityTriggers.push(config);
        return { kill: vi.fn() };
      }),
      refresh: vi.fn()
    };

    const root = document.querySelector('[data-motion="character-scatter-title"]');
    const cleanup = characterScatterTitle.mount(root, {
      gsap,
      ScrollTrigger,
      reducedMotion: () => false
    });

    expect(velocityTriggers).toHaveLength(1);
    expect(velocityTriggers[0].start).toBe("top bottom");
    expect(velocityTriggers[0].end).toBe("bottom top");
    expect(velocityTriggers[0].onEnter).toEqual(expect.any(Function));
    expect(velocityTriggers[0].onEnterBack).toEqual(expect.any(Function));
    expect(velocityTriggers[0].onLeave).toEqual(expect.any(Function));
    expect(velocityTriggers[0].onLeaveBack).toEqual(expect.any(Function));
    expect(velocityTriggers[0].onUpdate).toEqual(expect.any(Function));

    expect(timelineConfigs).toHaveLength(1);
    expect(timelineConfigs[0].scrollTrigger.start).toBe("top top");
    expect(timelineConfigs[0].scrollTrigger.end).toBe("center 30%");
    expect(timelineConfigs[0].scrollTrigger.scrub).toBe(2);

    expect(tweenCalls).toHaveLength(9);
    tweenCalls.forEach(({ vars }) => {
      expect(vars.y).toBe(100);
      expect(vars.x).toBe(0);
      expect(vars.rotation).toBe(0);
      expect(vars.opacity).toBe(0);
      expect(vars.ease).toBe("power2.in");
      expect(vars.duration).toBe(0.475);
    });

    expect(tweenCalls.slice(0, 5).every(({ position }) => position === 0.3)).toBe(true);
    expect(tweenCalls.slice(5).every(({ position }) => position === 0.36)).toBe(true);

    const titleCharacters = [...root.querySelectorAll(".title [data-mk-character-scatter-title-char]")];
    expect(titleCharacters.length).toBeGreaterThan(0);
    expect(titleCharacters.every((char) => char.style.opacity === "0")).toBe(true);

    cleanup();
  });
});
