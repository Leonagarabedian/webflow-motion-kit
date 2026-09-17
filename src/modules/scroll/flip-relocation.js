import { resolveScrollContract, viewportScroll } from "../../core/scroll-alignment/contract.js";
import { readNumber, readString } from "../../core/config.js";

export const flipRelocation = {
  name: "flip-relocation",
  category: "component",
  selector: '[data-motion~="flip-relocation"]',
  mount(element, { Flip, ScrollTrigger, gsap }) {
    const items = [...element.querySelectorAll("[data-flip-item]")];
    const targets = [...element.querySelectorAll("[data-flip-target]")];
    if (!items.length || items.length !== targets.length) return;

    const homes = items.map((item) => ({
      nextSibling: item.nextSibling,
      parent: item.parentElement
    }));
    const minWidth = readNumber(element, "motion-min-width", 992);
    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.desktop || conditions.reduceMotion) return;

        const state = Flip.getState(items);
        const sourceRects = items.map(item => item.getBoundingClientRect());
        const sourceOffsets = sourceRects.map((rect, index) => {
          const parent = homes[index].parent.getBoundingClientRect();
          return { left: rect.left - parent.left, top: rect.top - parent.top };
        });
        items.forEach((item, index) => targets[index].appendChild(item));
        const tween = Flip.from(state, {
          duration: readNumber(element, "motion-duration", 1.4),
          ease: readString(element, "motion-ease", "power4.inOut"),
          paused: true,
          repeat: 1,
          scale: true,
          stagger: {
            each: readNumber(element, "motion-stagger", 0.2),
            from: readString(element, "motion-stagger-from", "end")
          },
          yoyo: true
        });
        const trigger = ScrollTrigger.create(resolveScrollContract(element, {
          animation: tween,
          end: readString(element, "motion-end", "bottom bottom"),
          scrub: readNumber(element, "motion-scrub", 3),
          start: readString(element, "motion-start", "top top"),
          trigger: element
        }, () => (viewportScroll(element, 0, () => Math.max(window.innerHeight * 0.3, ...targets.map((target, index) => { const parent = homes[index].parent.getBoundingClientRect(); const from = sourceOffsets[index]; const to = target.getBoundingClientRect(); return Math.hypot(to.left - parent.left - from.left, to.top - parent.top - from.top); }))))));

        return () => {
          trigger.kill();
          tween.kill();
          items.forEach((item, index) => {
            const home = homes[index];
            home.parent.insertBefore(item, home.nextSibling);
          });
          gsap.set(items, { clearProps: "all" });
        };
      }
    );

    return () => mm.revert();
  }
};
