import { readNumber, readString } from "../core/config.js";

export const flipRelocation = {
  name: "flip-relocation",
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
        const trigger = ScrollTrigger.create({
          animation: tween,
          end: readString(element, "motion-end", "bottom bottom"),
          scrub: readNumber(element, "motion-scrub", 3),
          start: readString(element, "motion-start", "top top"),
          trigger: element
        });

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
