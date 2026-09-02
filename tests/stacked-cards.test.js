import { describe, expect, it } from "vitest";
import { stackedCards } from "../src/modules/stacked-cards.js";

function setStyle(targets, values) {
  const elements = Array.isArray(targets) ? targets : [targets];
  elements.forEach((element) => {
    Object.entries(values).forEach(([property, value]) => {
      element.style[property] = String(value);
    });
  });
}

describe("stacked cards", () => {
  it("creates a desktop sticky stack and restores authored styles", () => {
    document.body.innerHTML = `
      <div data-motion="stacked-cards" data-motion-stack-top="10vh" data-motion-stack-offset="8">
        <article data-motion-stack-card style="color: red"></article>
        <article data-motion-stack-card></article>
      </div>
    `;
    let mediaCleanup;
    const gsap = {
      matchMedia: () => ({
        add: (_conditions, callback) => {
          mediaCleanup = callback({ conditions: { desktop: true, reduceMotion: false } });
        },
        revert: () => mediaCleanup?.()
      }),
      set: setStyle
    };
    const root = document.querySelector('[data-motion="stacked-cards"]');
    const cards = [...root.querySelectorAll("[data-motion-stack-card]")];
    const cleanup = stackedCards.mount(root, { gsap });

    expect(cards[0].style.position).toBe("sticky");
    expect(cards[0].style.top).toBe("10vh");
    expect(cards[1].style.top).toBe("calc(8px + 10vh)");
    expect(cards[1].style.zIndex).toBe("2");

    cleanup();
    expect(cards[0].getAttribute("style")).toBe("color: red");
    expect(cards[1].hasAttribute("style")).toBe(false);
  });
});
