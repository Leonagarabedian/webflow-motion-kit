/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { sectionField } from "../src/modules/scroll/section-field.js";

function rect({ left, top, width, height }) {
  return {
    left, top, width, height,
    right: left + width,
    bottom: top + height
  };
}

describe("section field", () => {
  it("expands the visual field from source geometry without moving content", () => {
    document.body.innerHTML = `
      <section data-motion="section-field"
        data-motion-field-progress-end="0.5"
        data-motion-scroll-vh="100">
        <div data-motion-target="section-field"></div>
        <div data-motion-target="section-field-source">Founder copy</div>
      </section>
    `;

    const root = document.querySelector('[data-motion="section-field"]');
    const field = root.querySelector('[data-motion-target="section-field"]');
    const source = root.querySelector('[data-motion-target="section-field-source"]');

    Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
    field.getBoundingClientRect = () => rect({ left: 0, top: 0, width: 1440, height: 900 });
    source.getBoundingClientRect = () => rect({ left: 0, top: 450, width: 720, height: 450 });

    let vars;
    const tween = { kill: vi.fn(), scrollTrigger: { kill: vi.fn() } };
    const gsap = {
      to: vi.fn((target, config) => {
        vars = { target, config };
        return tween;
      })
    };

    const cleanup = sectionField.mount(root, {
      gsap,
      reducedMotion: () => false
    });

    expect(field.style.clipPath).toBe("inset(50.0000% 50.0000% 0.0000% 0.0000%)");

    vars.target.value = 0.25;
    vars.config.onUpdate();
    expect(field.style.clipPath).toBe("inset(25.0000% 25.0000% 0.0000% 0.0000%)");

    vars.target.value = 0.5;
    vars.config.onUpdate();
    expect(field.style.clipPath).toBe("inset(0.0000% 0.0000% 0.0000% 0.0000%)");

    expect(source.getAttribute("style")).toBe(null);

    cleanup();
    expect(tween.scrollTrigger.kill).toHaveBeenCalled();
    expect(tween.kill).toHaveBeenCalled();
    expect(field.getAttribute("style")).toBe(null);
  });

  it("supports compression as the inverse geometry", () => {
    document.body.innerHTML = `
      <section data-motion="section-field" data-motion-field-mode="compress">
        <div data-motion-target="section-field"></div>
        <div data-motion-target="section-field-source"></div>
      </section>
    `;

    const root = document.querySelector('[data-motion="section-field"]');
    const field = root.querySelector('[data-motion-target="section-field"]');
    const source = root.querySelector('[data-motion-target="section-field-source"]');

    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    field.getBoundingClientRect = () => rect({ left: 0, top: 0, width: 1200, height: 800 });
    source.getBoundingClientRect = () => rect({ left: 300, top: 200, width: 600, height: 400 });

    const gsap = { to: vi.fn(() => ({ kill: vi.fn(), scrollTrigger: { kill: vi.fn() } })) };

    const cleanup = sectionField.mount(root, {
      gsap,
      reducedMotion: () => false
    });

    expect(field.style.clipPath).toBe("inset(0.0000% 0.0000% 0.0000% 0.0000%)");
    cleanup();
  });
});
