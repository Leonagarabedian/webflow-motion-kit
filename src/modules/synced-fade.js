import { readNumber, readString } from "../core/config.js";
import { clamp01, syncedProgress } from "../core/scroll-alignment/specialized-geometry.js";

const DEFAULTS = Object.freeze({
  progressStart: 0,
  progressEnd: 1,
  opacityFrom: 1,
  opacityTo: 0,
  yFrom: 0,
  yTo: 0
});

export const syncedFade = {
  name: "synced-fade",
  category: "primitive",
  selector: '[data-motion~="synced-fade"]',

  mount(element, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const syncTriggerId = readString(element, "motion-fade-sync-trigger-id", "");
    if (!syncTriggerId) return;

    const progressStart = clamp01(
      readNumber(element, "motion-fade-progress-start", DEFAULTS.progressStart)
    );
    const progressEnd = Math.max(
      progressStart + 0.0001,
      clamp01(readNumber(element, "motion-fade-progress-end", DEFAULTS.progressEnd))
    );
    const opacityFrom = readNumber(element, "motion-fade-opacity-from", DEFAULTS.opacityFrom);
    const opacityTo = readNumber(element, "motion-fade-opacity-to", DEFAULTS.opacityTo);
    const yFrom = readNumber(element, "motion-fade-y-from", DEFAULTS.yFrom);
    const yTo = readNumber(element, "motion-fade-y-to", DEFAULTS.yTo);

    let destroyed = false;
    let syncTrigger = null;
    let rafId = null;

    const update = () => {
      if (destroyed) return;
      syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);

      if (syncTrigger) {
        const p = syncedProgress(syncTrigger.progress, progressStart, progressEnd);
        gsap.set(element, {
          opacity: opacityFrom + (opacityTo - opacityFrom) * p,
          y: yFrom + (yTo - yFrom) * p
        });
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);

    return () => {
      destroyed = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      gsap.set(element, { clearProps: "opacity,y" });
    };
  }
};
