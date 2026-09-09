import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  start: "top 55%",
  end: "top 15%",
  scrub: 1,
  ease: "none",
  progressStart: 0,
  progressEnd: 1
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function restoreToHome(element, home) {
  if (!home?.parent) return false;

  if (home.placeholder?.parentNode === home.parent) home.parent.insertBefore(element, home.placeholder);
  else if (home.nextSibling?.parentNode === home.parent) home.parent.insertBefore(element, home.nextSibling);
  else home.parent.appendChild(element);

  return true;
}

export const elementLayoutReturn = {
  name: "element-layout-return",
  category: "primitive",
  selector: '[data-motion~="element-layout-return"]',

  mount(element, { ScrollTrigger, gsap, reducedMotion }) {
    if (reducedMotion()) return;

    const home = element.__mkLayoutHome;
    if (!home?.parent || !home.placeholder) return;

    const syncTriggerId = readString(element, "motion-layout-return-sync-trigger-id", "");
    const triggerSelector = readString(element, "motion-layout-return-trigger", "");
    const start = readString(element, "motion-layout-return-start", DEFAULTS.start);
    const end = readString(element, "motion-layout-return-end", DEFAULTS.end);
    const scrub = readNumber(element, "motion-layout-return-scrub", DEFAULTS.scrub);
    const ease = readString(element, "motion-layout-return-ease", DEFAULTS.ease);
    const progressStart = clamp(
      readNumber(element, "motion-layout-return-progress-start", DEFAULTS.progressStart)
    );
    const progressEnd = clamp(
      readNumber(element, "motion-layout-return-progress-end", DEFAULTS.progressEnd),
      progressStart + 0.0001,
      1
    );

    let completed = false;
    let destroyed = false;
    let syncTrigger = null;
    let syncRaf = null;
    let scrollTrigger = null;

    const move = { progress: 0 };

    const applyProgress = (progress) => {
      if (completed || destroyed || !element.isConnected || !home.placeholder?.isConnected) return;

      const p = clamp(progress);
      const elementRect = element.getBoundingClientRect();
      const homeRect = home.placeholder.getBoundingClientRect();

      const elementCenterX = elementRect.left + elementRect.width / 2;
      const elementCenterY = elementRect.top + elementRect.height / 2;
      const homeCenterX = homeRect.left + homeRect.width / 2;
      const homeCenterY = homeRect.top + homeRect.height / 2;

      const currentX = gsap.getProperty(element, "x") || 0;
      const currentY = gsap.getProperty(element, "y") || 0;

      const remaining = Math.max(0.0001, 1 - p);
      const targetX = Number(currentX) + (homeCenterX - elementCenterX) / remaining;
      const targetY = Number(currentY) + (homeCenterY - elementCenterY) / remaining;

      gsap.set(element, {
        x: Number(currentX) + (targetX - Number(currentX)) * p,
        y: Number(currentY) + (targetY - Number(currentY)) * p
      });

      if (p >= 0.9999) {
        completed = true;
        restoreToHome(element, home);
        home.placeholder.remove();
        delete element.__mkLayoutHome;
        gsap.set(element, { clearProps: "x,y,left,top,position,margin,pointerEvents,willChange,zIndex" });
      }
    };

    if (syncTriggerId) {
      const updateFromSync = () => {
        if (destroyed) return;
        syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);
        if (syncTrigger && !completed) {
          const p = clamp((syncTrigger.progress - progressStart) / (progressEnd - progressStart));
          move.progress = p;
          applyProgress(p);
        }
        syncRaf = requestAnimationFrame(updateFromSync);
      };
      syncRaf = requestAnimationFrame(updateFromSync);
    } else {
      const trigger = triggerSelector
        ? element.closest(triggerSelector) || document.querySelector(triggerSelector) || element
        : element;

      scrollTrigger = ScrollTrigger.create({
        id: `mk-element-layout-return-${Math.random().toString(36).slice(2, 8)}`,
        trigger,
        start,
        end,
        scrub,
        onUpdate(self) {
          move.progress = self.progress;
          applyProgress(self.progress);
        }
      });
    }

    return () => {
      destroyed = true;
      scrollTrigger?.kill();
      if (syncRaf != null) cancelAnimationFrame(syncRaf);

      if (element.__mkLayoutHome) {
        restoreToHome(element, home);
        home.placeholder?.remove();
        delete element.__mkLayoutHome;
      }

      gsap.set(element, { clearProps: "x,y,left,top,position,margin,pointerEvents,willChange,zIndex" });
    };
  }
};
