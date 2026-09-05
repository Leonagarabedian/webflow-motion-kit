import { readNumber, readString } from "../core/config.js";

function restoreStyle(element, style) {
  if (style == null) element.removeAttribute("style");
  else element.setAttribute("style", style);
}

export const stackedCards = {
  name: "stacked-cards",
  category: "component",
  selector: '[data-motion~="stacked-cards"]',
  mount(element, { gsap }) {
    const cards = [...element.querySelectorAll("[data-motion-stack-card]")];
    if (cards.length < 2) return;

    const minWidth = readNumber(element, "motion-min-width", 992);
    const top = readString(element, "motion-stack-top", "8vh");
    const offset = readNumber(element, "motion-stack-offset", 12);
    const overlap = Math.min(
      80,
      Math.max(0, readNumber(element, "motion-stack-overlap", 10))
    );
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
          position: "relative",
          rowGap: 0
        });
        cards.forEach((card, index) => {
          gsap.set(card, {
            alignSelf: "start",
            position: "sticky",
            top: index ? `calc(${top} + ${offset * index}px)` : top,
            zIndex: index + 1
          });
        });

        const applyOverlap = () => {
          cards.forEach((card, index) => {
            if (!index) return;
            const previousHeight = cards[index - 1].getBoundingClientRect().height;
            gsap.set(card, {
              marginTop: `${-(previousHeight * overlap) / 100}px`
            });
          });
        };
        const resizeObserver =
          typeof ResizeObserver === "undefined"
            ? null
            : new ResizeObserver(applyOverlap);
        cards.forEach((card) => resizeObserver?.observe(card));
        applyOverlap();

        return () => {
          resizeObserver?.disconnect();
          restoreStyle(element, rootStyle);
          cards.forEach((card, index) => restoreStyle(card, cardStyles[index]));
        };
      }
    );

    return () => mm.revert();
  }
};
