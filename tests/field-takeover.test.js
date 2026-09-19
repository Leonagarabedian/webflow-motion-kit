/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fieldTakeover } from "../src/modules/field-takeover.js";

function createContext({ reducedMotion = false } = {}) {
  let mediaCleanup;
  let driverVars;
  const killed = vi.fn();
  const flip = {
    kill: vi.fn(),
    progress: vi.fn().mockReturnThis()
  };
  const contentTween = {
    kill: vi.fn(),
    progress: vi.fn().mockReturnThis()
  };
  const driver = {
    kill: vi.fn(),
    scrollTrigger: { kill: vi.fn() }
  };
  const Flip = {
    from: vi.fn(() => flip),
    getState: vi.fn(() => ({}))
  };
  const gsap = {
    fromTo: vi.fn(() => contentTween),
    getProperty: vi.fn((_target, property) =>
      property === "opacity" ? 1 : 0
    ),
    matchMedia: () => ({
      add: (_conditions, callback) => {
        mediaCleanup = callback({
          conditions: { desktop: true, reduceMotion }
        });
      },
      revert: () => mediaCleanup?.()
    }),
    set: vi.fn(),
    to: vi.fn((target, vars) => {
      driverVars = { target, vars };
      return driver;
    })
  };

  return {
    Flip,
    contentTween,
    driver,
    flip,
    gsap,
    getDriverVars: () => driverVars,
    killed
  };
}

describe("field takeover", () => {
  it("maps one scrubbed driver into authored takeover geometry and content exit", () => {
    document.body.innerHTML = `
      <section data-motion="field-takeover">
        <div data-motion-target="takeover-field">
          <div data-motion-target="takeover-content">Founder copy</div>
        </div>
      </section>
    `;

    const root = document.querySelector('[data-motion="field-takeover"]');
    const field = root.querySelector('[data-motion-target="takeover-field"]');
    const context = createContext();
    const cleanup = fieldTakeover.mount(root, context);

    expect(context.Flip.getState).toHaveBeenCalledTimes(1);
    expect(context.Flip.from).toHaveBeenCalledTimes(1);
    expect(field.classList.contains("is-field-takeover")).toBe(true);

    const { target: progressDriver, vars } = context.getDriverVars();
    expect(vars.scrollTrigger).toEqual(
      expect.objectContaining({
        trigger: root,
        pin: root,
        pinSpacing: true,
        scrub: 1,
        start: "top top"
      })
    );

    progressDriver.value = 0.6;
    vars.onUpdate();

    expect(context.flip.progress).toHaveBeenLastCalledWith(0.6);
    expect(context.contentTween.progress).toHaveBeenLastCalledWith(
      (0.6 - 0.35) / (0.85 - 0.35)
    );

    cleanup();

    expect(context.driver.scrollTrigger.kill).toHaveBeenCalled();
    expect(context.driver.kill).toHaveBeenCalled();
    expect(context.flip.kill).toHaveBeenCalled();
    expect(context.contentTween.kill).toHaveBeenCalled();
    expect(field.classList.contains("is-field-takeover")).toBe(false);
  });

  it("keeps the authored state and creates no motion for reduced motion", () => {
    document.body.innerHTML = `
      <section data-motion="field-takeover">
        <div data-motion-target="takeover-field"></div>
      </section>
    `;

    const root = document.querySelector('[data-motion="field-takeover"]');
    const field = root.querySelector('[data-motion-target="takeover-field"]');
    const context = createContext({ reducedMotion: true });

    const cleanup = fieldTakeover.mount(root, context);

    expect(context.Flip.getState).not.toHaveBeenCalled();
    expect(context.gsap.to).not.toHaveBeenCalled();
    expect(field.classList.contains("is-field-takeover")).toBe(false);

    cleanup();
  });
});
