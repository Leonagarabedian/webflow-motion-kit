import {
  readBoolean,
  readNumber,
  readString,
  selectTarget
} from "../core/config.js";

export const pinnedMedia = {
  name: "pinned-media",
  category: "component",
  selector: '[data-motion~="pinned-media"]',
  mount(element, { gsap }) {
    const sticky = selectTarget(element, "sticky", element);
    const media = selectTarget(element, "media", sticky);
    const minWidth = readNumber(element, "motion-min-width", 992);
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.desktop || conditions.reduceMotion) {
          gsap.set(media, { clearProps: "transform" });
          return;
        }
        media.style.willChange = "transform";
        const tween = gsap.fromTo(
          media,
          { scale: readNumber(element, "motion-scale-from", 0.8) },
          {
            ease: "none",
            scale: readNumber(element, "motion-scale-to", 1),
            scrollTrigger: {
              end: readString(element, "motion-end", "bottom bottom"),
              pin: readBoolean(element, "motion-pin", false) ? sticky : false,
              scrub: readNumber(element, "motion-scrub", 1),
              start: readString(element, "motion-start", "top top"),
              trigger: element
            }
          }
        );
        return () => {
          tween.kill();
          gsap.set(media, { clearProps: "transform" });
          media.style.willChange = "";
        };
      }
    );
    return () => mm.revert();
  }
};
