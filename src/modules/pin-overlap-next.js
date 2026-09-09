import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  amount: 1
});

export const pinOverlapNext = {
  name: "pin-overlap-next",
  category: "primitive",
  selector: '[data-motion~="pin-overlap-next"]',

  mount(element, { ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const syncTriggerId = readString(element, "motion-pin-overlap-sync-trigger-id", "");
    if (!syncTriggerId) return;

    const amount = Math.max(0, readNumber(element, "motion-pin-overlap-amount", DEFAULTS.amount));
    const originalMarginTop = element.style.marginTop;
    let rafId = null;
    let destroyed = false;
    let syncTrigger = null;
    let lastDistance = -1;

    const applyOverlap = () => {
      if (destroyed) return;

      syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);
      if (syncTrigger) {
        const distance = Math.max(0, syncTrigger.end - syncTrigger.start) * amount;
        if (Math.abs(distance - lastDistance) > 0.5) {
          lastDistance = distance;
          element.style.marginTop = `${-distance}px`;
        }
      }

      rafId = requestAnimationFrame(applyOverlap);
    };

    rafId = requestAnimationFrame(applyOverlap);

    return () => {
      destroyed = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      element.style.marginTop = originalMarginTop;
    };
  }
};
