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
  mount(element, { gsap, scrollAlignment }) {
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

        const scaleFrom = readNumber(element, "motion-scale-from", 0.8);
        const scaleTo = readNumber(element, "motion-scale-to", 1);
        const scrub = readNumber(element, "motion-scrub", 1);
        const pinEnabled = readBoolean(element, "motion-pin", false);
        const mode = readString(element, "motion-alignment", "legacy");

        media.style.willChange = "transform";

        const scrollTrigger = mode === "auto"
          ? scrollAlignment.build(element, {
              mode: "auto",
              id: readString(element, "motion-alignment-id", "pinned-media"),
              trigger: element,
              profile: pinEnabled ? "spatial" : "composition",
              stages: [{
                name: "media-scale",
                start: 0,
                end: 1,
                duration: 1,
                scaleFrom,
                scaleTo
              }],
              scrub,
              pin: pinEnabled ? { enabled: true, target: sticky } : false,
              invalidateOnRefresh: true
            }).scrollTrigger
          : {
              end: readString(element, "motion-end", "bottom bottom"),
              pin: pinEnabled ? sticky : false,
              scrub,
              start: readString(element, "motion-start", "top top"),
              trigger: element
            };

        const tween = gsap.fromTo(
          media,
          { scale: scaleFrom },
          {
            ease: "none",
            scale: scaleTo,
            scrollTrigger
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
