import {
  readNumber,
  readString,
  selectTarget
} from "../core/config.js";

export const pinnedMediaReturn = {
  name: "pinned-media-return",
  category: "component",
  selector: '[data-motion~="pinned-media-return"]',
  mount(element, { gsap }) {
    const media = selectTarget(element, "media", element);
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

        const win = element.ownerDocument.defaultView;
        if (!win) return;

        const activeScale = readNumber(element, "motion-scale-mid", 0.8);
        const restScale = readNumber(element, "motion-scale-to", 1);
        const inDuration = readNumber(element, "motion-active-duration", 0.18);
        const outDuration = readNumber(element, "motion-release-duration", 0.28);
        const stopDelay = readNumber(element, "motion-stop-delay", 110);
        const easeIn = readString(element, "motion-scale-ease-in", "power4.out");
        const easeOut = readString(element, "motion-scale-ease-out", "power4.out");

        media.style.willChange = "transform";
        gsap.set(media, { scale: restScale });

        let stopTimer = 0;
        let scrolling = false;

        const shrink = () => {
          if (scrolling) return;
          scrolling = true;
          gsap.to(media, {
            scale: activeScale,
            duration: inDuration,
            ease: easeIn,
            overwrite: "auto"
          });
        };

        const release = () => {
          scrolling = false;
          gsap.to(media, {
            scale: restScale,
            duration: outDuration,
            ease: easeOut,
            overwrite: "auto"
          });
        };

        const onScroll = () => {
          shrink();
          win.clearTimeout(stopTimer);
          stopTimer = win.setTimeout(release, stopDelay);
        };

        win.addEventListener("scroll", onScroll, { passive: true });

        return () => {
          win.removeEventListener("scroll", onScroll);
          win.clearTimeout(stopTimer);
          gsap.killTweensOf(media);
          gsap.set(media, { clearProps: "transform" });
          media.style.willChange = "";
        };
      }
    );

    return () => mm.revert();
  }
};
