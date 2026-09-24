// Standalone scroll-driven marquee extracted from the Codrops rotating-gallery composition.
// Source behavior: https://github.com/codrops/RotatingOnScrollAnimations
// MIT License.

import { readBoolean, readNumber, readString } from "../../core/config.js";
import { scrollMode } from "../../core/scroll-alignment/contract.js";
import { computeAlignedStart } from "../../core/scroll-alignment/geometry.js";

const DEFAULTS = Object.freeze({
  start: "top bottom",
  end: "bottom top",
  fromX: "100vw",
  toX: "-100%",
  minWidth: 0,
  hideOutside: true
});

function restoreStyle(element, value) {
  if (!element) return;
  if (value == null) element.removeAttribute("style");
  else element.setAttribute("style", value);
}

function scrubValue(element) {
  const raw = element.getAttribute("data-motion-scrub");
  if (raw == null || raw === "" || raw === "true") return true;
  if (raw === "false") return false;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : true;
}

function autoRange(root) {
  return {
    start: () =>
      computeAlignedStart({
        trigger: root,
        anchor: "top",
        viewport: 1
      }),
    end: () =>
      computeAlignedStart({
        trigger: root,
        anchor: "bottom",
        viewport: 0
      }),
    invalidateOnRefresh: true
  };
}

export const scrollMarquee = {
  name: "scroll-marquee",
  category: "primitive",
  selector: '[data-motion~="scroll-marquee"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion, logger }) {
    if (!ScrollTrigger) {
      logger?.warn?.("[MotionKit] scroll-marquee requires ScrollTrigger.");
      return;
    }

    const fixed = root.querySelector(
      '[data-motion-target="scroll-marquee-fixed"]'
    );
    const track = fixed?.querySelector(
      '[data-motion-target="scroll-marquee-track"]'
    );

    if (!fixed || !track) {
      logger?.warn?.(
        "[MotionKit] scroll-marquee requires scroll-marquee-fixed containing scroll-marquee-track."
      );
      return;
    }

    const minWidth = Math.max(
      0,
      readNumber(root, "motion-min-width", DEFAULTS.minWidth)
    );
    const fromX = readString(root, "motion-from-x", DEFAULTS.fromX);
    const toX = readString(root, "motion-to-x", DEFAULTS.toX);
    const hideOutside = readBoolean(
      root,
      "motion-hide-outside",
      DEFAULTS.hideOutside
    );
    const scrub = scrubValue(root);

    const fixedStyle = fixed.getAttribute("style");
    const trackStyle = track.getAttribute("style");
    const mm = gsap.matchMedia();

    mm.add(
      {
        width: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.width) return;

        const range =
          scrollMode(root) === "auto"
            ? autoRange(root)
            : {
                start: readString(root, "motion-start", DEFAULTS.start),
                end: readString(root, "motion-end", DEFAULTS.end),
                invalidateOnRefresh: true
              };

        let visibilityTrigger = null;
        let tween = null;

        if (hideOutside) {
          gsap.set(fixed, { autoAlpha: 0 });

          visibilityTrigger = ScrollTrigger.create({
            trigger: root,
            ...range,
            onEnter: () => gsap.set(fixed, { autoAlpha: 1 }),
            onEnterBack: () => gsap.set(fixed, { autoAlpha: 1 }),
            onLeave: () => gsap.set(fixed, { autoAlpha: 0 }),
            onLeaveBack: () => gsap.set(fixed, { autoAlpha: 0 })
          });
        } else {
          gsap.set(fixed, { autoAlpha: 1 });
        }

        if (conditions.reduceMotion || reducedMotion()) {
          gsap.set(track, { x: 0 });

          return () => {
            visibilityTrigger?.kill?.();
            restoreStyle(fixed, fixedStyle);
            restoreStyle(track, trackStyle);
          };
        }

        tween = gsap.fromTo(
          track,
          { x: fromX },
          {
            x: toX,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              ...range,
              scrub
            }
          }
        );

        return () => {
          visibilityTrigger?.kill?.();
          tween?.scrollTrigger?.kill?.();
          tween?.kill?.();
          restoreStyle(fixed, fixedStyle);
          restoreStyle(track, trackStyle);
        };
      }
    );

    return () => {
      mm.revert();
      restoreStyle(fixed, fixedStyle);
      restoreStyle(track, trackStyle);
    };
  }
};
