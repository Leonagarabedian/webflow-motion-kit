import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  progressStart: 0.92,
  progressEnd: 1,
  blurFrom: 14,
  blurTo: 0,
  opacityFrom: 0,
  opacityTo: 1,
  yFrom: 18,
  yTo: 0
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export const elementBlurReveal = {
  name: "element-blur-reveal",
  category: "primitive",
  selector: '[data-motion~="element-blur-reveal"]',

  mount(element, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const syncTriggerId = readString(element, "motion-element-blur-sync-trigger-id", "");
    if (!syncTriggerId) return;

    const index = Math.max(0, readNumber(element, "motion-element-blur-index", 0));
    const stagger = Math.max(0, readNumber(element, "motion-element-blur-stagger", 0.012));
    const baseStart = clamp(
      readNumber(element, "motion-element-blur-progress-start", DEFAULTS.progressStart)
    );
    const baseEnd = clamp(
      readNumber(element, "motion-element-blur-progress-end", DEFAULTS.progressEnd),
      baseStart + 0.0001,
      1
    );
    const start = clamp(baseStart + index * stagger);
    const end = clamp(baseEnd + index * stagger, start + 0.0001, 1);
    const blurFrom = Math.max(0, readNumber(element, "motion-element-blur-from", DEFAULTS.blurFrom));
    const blurTo = Math.max(0, readNumber(element, "motion-element-blur-to", DEFAULTS.blurTo));
    const opacityFrom = readNumber(element, "motion-element-blur-opacity-from", DEFAULTS.opacityFrom);
    const opacityTo = readNumber(element, "motion-element-blur-opacity-to", DEFAULTS.opacityTo);
    const yFrom = readNumber(element, "motion-element-blur-y-from", DEFAULTS.yFrom);
    const yTo = readNumber(element, "motion-element-blur-y-to", DEFAULTS.yTo);

    const tween = gsap.fromTo(
      element,
      {
        filter: `blur(${blurFrom}px)`,
        autoAlpha: opacityFrom,
        y: yFrom
      },
      {
        filter: `blur(${blurTo}px)`,
        autoAlpha: opacityTo,
        y: yTo,
        ease: "none",
        paused: true
      }
    );

    let syncTrigger = null;
    let rafId = null;
    let destroyed = false;

    const update = () => {
      if (destroyed) return;
      syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);
      if (syncTrigger) {
        const p = clamp((syncTrigger.progress - start) / (end - start));
        tween.progress(p);
      }
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);

    return () => {
      destroyed = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      tween.kill();
      gsap.set(element, { clearProps: "filter,opacity,visibility,y,transform" });
    };
  }
};
