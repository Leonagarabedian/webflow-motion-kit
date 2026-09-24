// Adapted from Codrops "Rotating On-Scroll Animations" — Variation 2.
// Original source: https://github.com/codrops/RotatingOnScrollAnimations
// MIT License.

import { readNumber, readString } from "../../core/config.js";
import { scrollMode } from "../../core/scroll-alignment/contract.js";
import { computeAlignedStart } from "../../core/scroll-alignment/geometry.js";

const DEFAULTS = Object.freeze({
  amplitude: 0.2,
  angleStep: 0.45,
  perspective: 900,
  rotationXMin: 240,
  rotationXMax: 290,
  rotationYMin: -20,
  rotationYMax: 20,
  rotationZMin: -50,
  rotationZMax: 50,
  depth: -300,
  depthPower: 4,
  start: "top bottom+=20%",
  end: "bottom top-=20%",
  marqueeStart: "top bottom",
  marqueeEnd: "bottom top"
});

function restoreStyle(element, value) {
  if (!element) return;
  if (value == null) element.removeAttribute("style");
  else element.setAttribute("style", value);
}

function randomBetween(gsap, min, max) {
  return gsap.utils.random(min, max);
}

function autoItemRange(item) {
  return {
    start: () =>
      computeAlignedStart({
        trigger: item,
        anchor: "top",
        viewport: 120
      }),
    end: () =>
      computeAlignedStart({
        trigger: item,
        anchor: "bottom",
        viewport: -0.2
      }),
    invalidateOnRefresh: true
  };
}

function autoMarqueeRange(gallery) {
  return {
    start: () =>
      computeAlignedStart({
        trigger: gallery,
        anchor: "top",
        viewport: 1
      }),
    end: () =>
      computeAlignedStart({
        trigger: gallery,
        anchor: "bottom",
        viewport: 0
      }),
    invalidateOnRefresh: true
  };
}

export const rotating3dScrollGallery = {
  name: "rotating-3d-scroll-gallery",
  category: "composition",
  selector: '[data-motion~="rotating-3d-scroll-gallery"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion, logger }) {
    if (!ScrollTrigger) {
      logger?.warn?.(
        "[MotionKit] rotating-3d-scroll-gallery requires ScrollTrigger."
      );
      return;
    }

    const wraps = [...root.querySelectorAll('[data-motion-target="rotate-wrap"]')];
    if (!wraps.length) {
      logger?.warn?.(
        "[MotionKit] rotating-3d-scroll-gallery requires rotate-wrap targets."
      );
      return;
    }

    const pairs = wraps
      .map((wrap) => ({
        wrap,
        item: wrap.querySelector('[data-motion-target="rotate-item"]')
      }))
      .filter(({ item }) => item);

    if (!pairs.length) {
      logger?.warn?.(
        "[MotionKit] rotating-3d-scroll-gallery requires rotate-item targets inside rotate-wrap targets."
      );
      return;
    }

    const marquee = root.querySelector('[data-motion-target="gallery-marquee"]');
    const marqueeTrack = marquee?.querySelector(
      '[data-motion-target="gallery-marquee-track"]'
    ) || null;

    const minWidth = Math.max(
      0,
      readNumber(root, "motion-min-width", 0)
    );

    const amplitude = Math.max(
      0,
      readNumber(root, "motion-amplitude", DEFAULTS.amplitude)
    );
    const angleStep = readNumber(
      root,
      "motion-angle-step",
      DEFAULTS.angleStep
    );
    const perspective = Math.max(
      1,
      readNumber(root, "motion-perspective", DEFAULTS.perspective)
    );

    const rotationXMin = readNumber(
      root,
      "motion-rotation-x-min",
      DEFAULTS.rotationXMin
    );
    const rotationXMax = readNumber(
      root,
      "motion-rotation-x-max",
      DEFAULTS.rotationXMax
    );
    const rotationYMin = readNumber(
      root,
      "motion-rotation-y-min",
      DEFAULTS.rotationYMin
    );
    const rotationYMax = readNumber(
      root,
      "motion-rotation-y-max",
      DEFAULTS.rotationYMax
    );
    const rotationZMin = readNumber(
      root,
      "motion-rotation-z-min",
      DEFAULTS.rotationZMin
    );
    const rotationZMax = readNumber(
      root,
      "motion-rotation-z-max",
      DEFAULTS.rotationZMax
    );

    const depth = readNumber(root, "motion-depth", DEFAULTS.depth);
    const depthPower = Math.max(
      0.1,
      readNumber(root, "motion-depth-power", DEFAULTS.depthPower)
    );

    const rootStyle = root.getAttribute("style");
    const trackedStyles = new Map();
    const remember = (element) => {
      if (element && !trackedStyles.has(element)) {
        trackedStyles.set(element, element.getAttribute("style"));
      }
    };

    pairs.forEach(({ wrap, item }) => {
      remember(wrap);
      remember(item);
    });
    remember(marquee);
    remember(marqueeTrack);

    const mm = gsap.matchMedia();

    mm.add(
      {
        width: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.width) return;

        const reduced = conditions.reduceMotion || reducedMotion();
        const tweens = [];
        let marqueeTween = null;
        let resizeRaf = null;

        const positionWraps = () => {
          const px = window.innerWidth * amplitude;
          pairs.forEach(({ wrap }, index) => {
            gsap.set(wrap, {
              x: Math.sin(index * angleStep) * px,
              perspective
            });
          });
        };

        positionWraps();

        if (reduced) {
          pairs.forEach(({ item }) => {
            gsap.set(item, {
              rotationX: 0,
              rotationY: 0,
              rotationZ: 0,
              z: 0
            });
          });
          return () => {
            trackedStyles.forEach((style, element) => restoreStyle(element, style));
          };
        }

        const mode = scrollMode(root);

        pairs.forEach(({ item }) => {
          const rotationX = randomBetween(
            gsap,
            Math.min(rotationXMin, rotationXMax),
            Math.max(rotationXMin, rotationXMax)
          );
          const rotationY = randomBetween(
            gsap,
            Math.min(rotationYMin, rotationYMax),
            Math.max(rotationYMin, rotationYMax)
          );
          const rotationZ = randomBetween(
            gsap,
            Math.min(rotationZMin, rotationZMax),
            Math.max(rotationZMin, rotationZMax)
          );

          const setZ = gsap.quickSetter(item, "z", "px");

          const scrollTrigger =
            mode === "auto"
              ? {
                  trigger: item,
                  ...autoItemRange(item),
                  scrub: true
                }
              : {
                  trigger: item,
                  start: readString(root, "motion-start", DEFAULTS.start),
                  end: readString(root, "motion-end", DEFAULTS.end),
                  scrub: true,
                  invalidateOnRefresh: true
                };

          const tween = gsap.fromTo(
            item,
            {
              rotationX,
              rotationY,
              rotationZ,
              transformStyle: "preserve-3d"
            },
            {
              rotationX: -rotationX,
              rotationY: -rotationY,
              rotationZ: -rotationZ,
              ease: "none",
              scrollTrigger: {
                ...scrollTrigger,
                onUpdate(self) {
                  const depthProgress = Math.sin(self.progress * Math.PI);
                  setZ(Math.pow(Math.max(0, depthProgress), depthPower) * depth);
                }
              }
            }
          );

          tweens.push(tween);
        });

        if (marqueeTrack) {
          const marqueeTrigger =
            mode === "auto"
              ? {
                  trigger: root,
                  ...autoMarqueeRange(root),
                  scrub: true
                }
              : {
                  trigger: root,
                  start: readString(
                    root,
                    "motion-marquee-start",
                    DEFAULTS.marqueeStart
                  ),
                  end: readString(
                    root,
                    "motion-marquee-end",
                    DEFAULTS.marqueeEnd
                  ),
                  scrub: true,
                  invalidateOnRefresh: true
                };

          marqueeTween = gsap.fromTo(
            marqueeTrack,
            {
              x: () => window.innerWidth
            },
            {
              x: () => -marqueeTrack.offsetWidth,
              ease: "none",
              scrollTrigger: marqueeTrigger
            }
          );
        }

        const onResize = () => {
          if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
          resizeRaf = requestAnimationFrame(() => {
            resizeRaf = null;
            positionWraps();
            ScrollTrigger.refresh();
          });
        };

        window.addEventListener("resize", onResize);

        return () => {
          window.removeEventListener("resize", onResize);
          if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
          marqueeTween?.scrollTrigger?.kill?.();
          marqueeTween?.kill?.();
          tweens.forEach((tween) => {
            tween.scrollTrigger?.kill?.();
            tween.kill?.();
          });
          trackedStyles.forEach((style, element) => restoreStyle(element, style));
        };
      }
    );

    return () => {
      mm.revert();
      restoreStyle(root, rootStyle);
      trackedStyles.forEach((style, element) => restoreStyle(element, style));
    };
  }
};
