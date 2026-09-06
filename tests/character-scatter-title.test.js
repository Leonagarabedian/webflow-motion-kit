import { describe, expect, it, vi } from "vitest";
import { characterScatterTitle } from "../src/modules/character-scatter-title.js";

describe("character scatter title", () => {
  it("keeps source characters visible while the title begins revealing", () => {
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

    let triggerConfig;
    const setCalls = [];
    const gsap = {
      set: vi.fn((targets, vars) => {
        setCalls.push({ targets: Array.isArray(targets) ? targets : [targets], vars });
      })
    };
    const ScrollTrigger = {
      create: vi.fn((config) => {
        triggerConfig = config;
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

    expect(triggerConfig.start).toBe("top top");
    expect(triggerConfig.end).toBe("bottom bottom");
    expect(triggerConfig.scrub).toBe(1);

    setCalls.length = 0;
    triggerConfig.onUpdate({ progress: 0.2 });

    const sourceCall = setCalls[0];
    const titleCall = setCalls[1];

    expect(sourceCall.vars.autoAlpha(0)).toBeGreaterThan(0.9);
    expect(titleCall.vars.autoAlpha(0)).toBeGreaterThan(0);

    setCalls.length = 0;
    triggerConfig.onUpdate({ progress: 0.7 });

    const laterSource = setCalls[0];
    const laterTitle = setCalls[1];

    expect(laterTitle.vars.autoAlpha(0)).toBe(1);
    expect(laterSource.vars.autoAlpha(0)).toBeGreaterThan(0);
    expect(Math.abs(laterSource.vars.x(0)) + Math.abs(laterSource.vars.y(0))).toBeGreaterThan(0);

    setCalls.length = 0;
    triggerConfig.onUpdate({ progress: 1 });
    expect(setCalls[0].vars.autoAlpha(0)).toBe(0);
    expect(setCalls[1].vars.autoAlpha(0)).toBe(1);

    cleanup();
  });
});
