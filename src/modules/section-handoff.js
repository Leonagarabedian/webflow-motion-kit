import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  progressStart: 0.9,
  progressEnd: 1,
  targetY: 0,
  zIndex: 0
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export const sectionHandoff = {
  name: "section-handoff",
  category: "primitive",
  selector: '[data-motion~="section-handoff"]',

  mount(element, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const syncTriggerId = readString(element, "motion-section-handoff-sync-trigger-id", "");
    if (!syncTriggerId) return;

    const progressStart = clamp(
      readNumber(element, "motion-section-handoff-progress-start", DEFAULTS.progressStart)
    );
    const progressEnd = clamp(
      readNumber(element, "motion-section-handoff-progress-end", DEFAULTS.progressEnd),
      progressStart + 0.0001,
      1
    );
    const targetY = readNumber(element, "motion-section-handoff-target-y", DEFAULTS.targetY);
    const zIndex = readNumber(element, "motion-section-handoff-z-index", DEFAULTS.zIndex);

    const originalStyle = element.getAttribute("style");
    let syncTrigger = null;
    let rafId = null;
    let destroyed = false;
    let currentY = 0;

    gsap.set(element, {
      position: "relative",
      zIndex,
      willChange: "transform"
    });

    const setY = (value) => {
      currentY = value;
      gsap.set(element, { y: value });
    };

    const update = () => {
      if (destroyed) return;

      syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);
      if (!syncTrigger) {
        rafId = requestAnimationFrame(update);
        return;
      }

      const triggerProgress = syncTrigger.progress;
      const rect = element.getBoundingClientRect();
      const naturalTop = rect.top - currentY;
      const fullLift = Math.min(0, targetY - naturalTop);

      if (triggerProgress < progressStart) {
        setY(0);
      } else if (triggerProgress < progressEnd) {
        const p = clamp((triggerProgress - progressStart) / (progressEnd - progressStart));
        setY(fullLift * p);
      } else if (naturalTop > targetY) {
        // After the source pin releases, keep the incoming section visually
        // seated at targetY while normal document scrolling catches up.
        setY(fullLift);
      } else {
        // Once the section reaches its natural place, release the temporary lift.
        setY(0);
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);

    return () => {
      destroyed = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      if (originalStyle == null) element.removeAttribute("style");
      else element.setAttribute("style", originalStyle);
    };
  }
};
