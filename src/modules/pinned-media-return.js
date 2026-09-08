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
          gsap.set(media, { clearProps: "clipPath,webkitClipPath" });
          return;
        }

        const win = element.ownerDocument.defaultView;
        if (!win) return;

        const ScrollTrigger = gsap.core.globals().ScrollTrigger;
        const inset = readNumber(element, "motion-crop-inset", 6);
        const inDuration = readNumber(element, "motion-active-duration", 0.2);
        const outDuration = readNumber(element, "motion-release-duration", 0.3);
        const easeIn = readString(element, "motion-crop-ease-in", "power4.out");
        const easeOut = readString(element, "motion-crop-ease-out", "power3.inOut");

        const openClip = "inset(0% 0% 0% 0%)";
        const activeClip = `inset(${inset}% ${inset}% ${inset}% ${inset}%)`;

        media.style.willChange = "clip-path";
        gsap.set(media, {
          clipPath: openClip,
          webkitClipPath: openClip
        });

        let scrolling = false;
        let fallbackRelease = null;

        const cropIn = () => {
          if (scrolling) return;
          scrolling = true;
          gsap.to(media, {
            clipPath: activeClip,
            webkitClipPath: activeClip,
            duration: inDuration,
            ease: easeIn,
            overwrite: true
          });
        };

        const cropOut = () => {
          if (!scrolling) return;
          scrolling = false;
          gsap.to(media, {
            clipPath: openClip,
            webkitClipPath: openClip,
            duration: outDuration,
            ease: easeOut,
            overwrite: true
          });
        };

        if (!ScrollTrigger) {
          fallbackRelease = gsap.delayedCall(0.14, cropOut).pause();
        }

        const onScroll = () => {
          cropIn();
          if (fallbackRelease) fallbackRelease.restart(true);
        };

        win.addEventListener("scroll", onScroll, { passive: true });
        ScrollTrigger?.addEventListener("scrollEnd", cropOut);

        return () => {
          win.removeEventListener("scroll", onScroll);
          ScrollTrigger?.removeEventListener("scrollEnd", cropOut);
          fallbackRelease?.kill();
          gsap.killTweensOf(media);
          gsap.set(media, { clearProps: "clipPath,webkitClipPath" });
          media.style.willChange = "";
        };
      }
    );

    return () => mm.revert();
  }
};
