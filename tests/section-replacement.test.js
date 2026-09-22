/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sectionReplacement } from "../src/modules/section-replacement.js";

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
});

function mount(attributes = "") {
  document.body.innerHTML = `
    <section class="mission"></section>
    <section ${attributes}>
      <div class="team-hero"></div>
      <div class="team-media" data-motion="media-room"></div>
    </section>
  `;

  const outgoing = document.querySelector(".mission");
  const root = outgoing.nextElementSibling;
  const hero = root.querySelector(".team-hero");
  const media = root.querySelector(".team-media");

  root.setAttribute("data-motion-replacement-from", ".mission");
  root.setAttribute("data-motion-replacement-target", ".team-hero");

  root.getBoundingClientRect = () => ({
    left: 0,
    top: 1000,
    right: 1440,
    bottom: 2000,
    width: 1440,
    height: 1000
  });

  hero.getBoundingClientRect = () => ({
    left: 120,
    top: 1000,
    right: 1320,
    bottom: 1700,
    width: 1200,
    height: 700
  });

  let config;
  const tween = {
    kill: vi.fn(),
    scrollTrigger: { kill: vi.fn() }
  };
  const gsap = {
    fromTo: vi.fn((_target, from, to) => {
      config = to.scrollTrigger;
      return tween;
    })
  };

  const cleanup = sectionReplacement.mount(root, {
    gsap,
    reducedMotion: () => false
  });

  return { cleanup, config, gsap, hero, media, outgoing, root, tween };
}

describe("section replacement", () => {
  it("pins the outgoing panel while revealing only the authored incoming target", () => {
    const result = mount();

    expect(result.config.pin).toBe(result.outgoing);
    expect(result.config.pinSpacing).toBe(false);
    expect(result.config.start).toBe("top bottom");
    expect(result.config.end).toBe("top top");

    const overlay = document.querySelector("[data-motion-section-replacement-overlay]");
    expect(overlay).toBeTruthy();
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(overlay.querySelector(".team-hero")).toBeTruthy();
    expect(overlay.querySelector(".team-media")).toBeNull();

    result.config.onEnter();
    expect(result.hero.style.visibility).toBe("hidden");
    expect(overlay.style.visibility).toBe("visible");

    result.config.onLeave();
    expect(result.hero.style.visibility).toBe("");
    expect(overlay.style.visibility).toBe("hidden");
    expect(result.media.getAttribute("style")).toBeNull();

    result.cleanup();
    expect(document.querySelector("[data-motion-section-replacement-overlay]")).toBeNull();
  });

  it("uses one viewport of measured runway in auto alignment mode", () => {
    const result = mount('data-motion-alignment="auto"');

    expect(typeof result.config.start).toBe("function");
    expect(typeof result.config.end).toBe("function");
    expect(result.config.start()).toBe(0);
    expect(result.config.end()).toBe(1000);
    expect(result.config.end() - result.config.start()).toBe(1000);
    expect(result.config.pin).toBe(result.outgoing);

    result.cleanup();
  });

  it("preserves authored manual range overrides", () => {
    const result = mount(
      'data-motion-start="top 90%" data-motion-scroll-vh="140" data-motion-scrub="0.7"'
    );

    expect(result.config.start).toBe("top 90%");
    expect(result.config.end()).toBe("+=1400");
    expect(result.config.scrub).toBe(0.7);

    result.cleanup();
  });
});
