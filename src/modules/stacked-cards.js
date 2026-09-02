import { readNumber, readString } from "../core/config.js";

function restoreStyle(element, style) {
  if (style == null) element.removeAttribute("style");
  else element.setAttribute("style", style);
}

export const stackedCards = {
  name: "stacked-cards",
  selector: '[data-motion~="stacked-cards"]',
  mount(element, { gsap }) {
    const cards = [...element.querySelectorAll("[data-motion-stack-card]")];
    if (cards.length < 2) return;

    const minWidth = readNumber(element, "motion-min-width", 992);
    const top = readString(element, "motion-stack-top", "8vh");
    const offset = readNumber(element, "motion-stack-offset", 12);
    const rootStyle = element.getAttribute("style");
    const cardStyles = cards.map((card) => card.getAttribute("style"));
    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.desktop || conditions.reduceMotion) return;

        gsap.set(element, {
          alignItems: "start",
          overflow: "visible",
          position: "relative"
        });
        cards.forEach((card, index) => {
          gsap.set(card, {
            alignSelf: "start",
            position: "sticky",
            top: index ? `calc(${top} + ${offset * index}px)` : top,
            zIndex: index + 1
          });
        });

        return () => {
          restoreStyle(element, rootStyle);
          cards.forEach((card, index) => restoreStyle(card, cardStyles[index]));
        };
      }
    );

    return () => mm.revert();
  }
};
