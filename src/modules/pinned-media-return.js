import {
  readBoolean,
  readNumber,
  readString,
  selectTarget
} from "../core/config.js";

export const pinnedMediaReturn = {
  name: "pinned-media-return",
  category: "component",
  selector: '[data-motion~="pinned-media-return"]',
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

        const scaleFrom = readNumber(element, "motion-scale-from", 1);
        const scaleMid = readNumber(element, "motion-scale-mid", 0.8);
        const scaleTo = readNumber(element, "motion-scale-to", 1);

        gsap.set(media, { scale: scaleFrom });

        const timeline = gsap.timeline({
          scrollTrigger: {
            end: readString(element, "motion-end", "bottom bottom"),
            pin: readBoolean(element, "motion-pin", false) ? sticky : false,
            scrub: readNumber(element, "motion-scrub", 1),
            start: readString(element, "motion-start", "top top"),
            trigger: element,
            invalidateOnRefresh: true
          }
        });

        timeline
          .to(media, {
            ease: "none",
            scale: scaleMid,
            duration: 0.5
          })
          .to(media, {
            ease: "none",
            scale: scaleTo,
            duration: 0.5
          });

        return () => {
          timeline.scrollTrigger?.kill();
          timeline.kill();
          gsap.set(media, { clearProps: "transform" });
          media.style.willChange = "";
        };
      }
    );

    return () => mm.revert();
  }
};
