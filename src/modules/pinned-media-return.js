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

        const ScrollTrigger = gsap.core.globals().ScrollTrigger;
        const activeScale = readNumber(element, "motion-scale-mid", 0.8);
        const restScale = readNumber(element, "motion-scale-to", 1);
        const inDuration = readNumber(element, "motion-active-duration", 0.2);
        const outDuration = readNumber(element, "motion-release-duration", 0.3);
        const easeIn = readString(element, "motion-scale-ease-in", "power3.inOut");
        const easeOut = readString(element, "motion-scale-ease-out", "power3.inOut");

        media.style.willChange = "transform";
        gsap.set(media, {
          scale: restScale,
          transformOrigin: "50% 50%"
        });

        let scrolling = false;
        let fallbackRelease = null;

        const shrink = () => {
          if (scrolling) return;
          scrolling = true;
          gsap.to(media, {
            scale: activeScale,
            duration: inDuration,
            ease: easeIn,
            overwrite: true
          });
        };

        const release = () => {
          if (!scrolling) return;
          scrolling = false;
          gsap.to(media, {
            scale: restScale,
            duration: outDuration,
            ease: easeOut,
            overwrite: true
          });
        };

        if (!ScrollTrigger) {
          fallbackRelease = gsap.delayedCall(0.14, release).pause();
        }

        const onScroll = () => {
          shrink();
          if (fallbackRelease) fallbackRelease.restart(true);
        };

        win.addEventListener("scroll", onScroll, { passive: true });
        ScrollTrigger?.addEventListener("scrollEnd", release);

        return () => {
          win.removeEventListener("scroll", onScroll);
          ScrollTrigger?.removeEventListener("scrollEnd", release);
          fallbackRelease?.kill();
          gsap.killTweensOf(media);
          gsap.set(media, { clearProps: "transform" });
          media.style.willChange = "";
        };
      }
    );

    return () => mm.revert();
  }
};
