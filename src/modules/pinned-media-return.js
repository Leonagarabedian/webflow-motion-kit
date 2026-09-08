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

        const inset = readNumber(element, "motion-crop-inset", 6);
        const inDuration = readNumber(element, "motion-active-duration", 0.24);
        const outDuration = readNumber(element, "motion-release-duration", 0.34);
        const stopDelay = readNumber(element, "motion-stop-delay", 120);
        const easeIn = readString(element, "motion-crop-ease-in", "power3.out");
        const easeOut = readString(element, "motion-crop-ease-out", "power3.inOut");

        const openClip = "inset(0% 0% 0% 0%)";
        const activeClip = `inset(${inset}% ${inset}% ${inset}% ${inset}%)`;

        media.style.willChange = "clip-path";
        gsap.set(media, {
          clipPath: openClip,
          webkitClipPath: openClip
        });

        let active = false;
        let rafId = 0;
        let lastY = win.scrollY;
        let lastMoveAt = performance.now();

        const cropIn = () => {
          if (active) return;
          active = true;
          gsap.to(media, {
            clipPath: activeClip,
            webkitClipPath: activeClip,
            duration: inDuration,
            ease: easeIn,
            overwrite: "auto"
          });
        };

        const cropOut = () => {
          if (!active) return;
          active = false;
          gsap.to(media, {
            clipPath: openClip,
            webkitClipPath: openClip,
            duration: outDuration,
            ease: easeOut,
            overwrite: "auto"
          });
        };

        const tick = (now) => {
          const currentY = win.scrollY;
          if (currentY !== lastY) {
            lastY = currentY;
            lastMoveAt = now;
            cropIn();
          } else if (active && now - lastMoveAt >= stopDelay) {
            cropOut();
          }
          rafId = win.requestAnimationFrame(tick);
        };

        rafId = win.requestAnimationFrame(tick);

        return () => {
          win.cancelAnimationFrame(rafId);
          gsap.killTweensOf(media);
          gsap.set(media, { clearProps: "clipPath,webkitClipPath" });
          media.style.willChange = "";
        };
      }
    );

    return () => mm.revert();
  }
};
