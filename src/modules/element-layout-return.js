import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  start: "top 55%",
  end: "top 15%",
  scrub: 1,
  ease: "none",
  progressStart: 0,
  progressEnd: 1,
  axis: "both"
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export const elementLayoutReturn = {
  name: "element-layout-return",
  category: "primitive",
  selector: '[data-motion~="element-layout-return"]',

  mount(element, { ScrollTrigger, gsap, reducedMotion }) {
    if (reducedMotion()) return;

    const home = element.__mkLayoutHome;
    if (!home?.parent || !home.placeholder || !home.stage) return;

    const syncTriggerId = readString(element, "motion-layout-return-sync-trigger-id", "");
    const triggerSelector = readString(element, "motion-layout-return-trigger", "");
    const start = readString(element, "motion-layout-return-start", DEFAULTS.start);
    const end = readString(element, "motion-layout-return-end", DEFAULTS.end);
    const scrub = readNumber(element, "motion-layout-return-scrub", DEFAULTS.scrub);
    const ease = readString(element, "motion-layout-return-ease", DEFAULTS.ease);
    const axis = readString(element, "motion-layout-return-axis", DEFAULTS.axis);
    const progressStart = clamp(
      readNumber(element, "motion-layout-return-progress-start", DEFAULTS.progressStart)
    );
    const progressEnd = clamp(
      readNumber(element, "motion-layout-return-progress-end", DEFAULTS.progressEnd),
      progressStart + 0.0001,
      1
    );

    let destroyed = false;
    let syncTrigger = null;
    let syncRaf = null;
    let scrollTrigger = null;
    let atHome = false;

    const ensureStage = () => {
      if (element.parentElement === home.stage) return;
      home.stage.appendChild(element);
      home.returnToStage?.();
      atHome = false;
    };

    const ensureHome = () => {
      if (element.parentElement === home.parent) return;
      if (home.placeholder?.parentNode === home.parent) home.parent.insertBefore(element, home.placeholder);
      else if (home.nextSibling?.parentNode === home.parent) home.parent.insertBefore(element, home.nextSibling);
      else home.parent.appendChild(element);
      gsap.set(element, { clearProps: "x,y,left,top,position,margin,pointerEvents,willChange,zIndex" });
      atHome = true;
    };

    const applyProgress = (progress) => {
      if (destroyed || !element.isConnected || !home.placeholder?.isConnected) return;

      const p = clamp(progress);

      if (p <= 0.0001) {
        ensureStage();
        gsap.set(element, { x: 0, y: 0 });
        return;
      }

      if (p >= 0.9999) {
        ensureHome();
        return;
      }

      if (atHome || element.parentElement !== home.stage) ensureStage();

      const elementRect = element.getBoundingClientRect();
      const homeRect = home.placeholder.getBoundingClientRect();

      const elementCenterX = elementRect.left + elementRect.width / 2;
      const elementCenterY = elementRect.top + elementRect.height / 2;
      const homeCenterX = homeRect.left + homeRect.width / 2;
      const homeCenterY = homeRect.top + homeRect.height / 2;

      const baseX = Number(gsap.getProperty(element, "x")) || 0;
      const baseY = Number(gsap.getProperty(element, "y")) || 0;
      const deltaX = homeCenterX - elementCenterX;
      const deltaY = homeCenterY - elementCenterY;

      const next = { ease };
      if (axis === "x" || axis === "both") next.x = baseX + deltaX * p;
      if (axis === "y" || axis === "both") next.y = baseY + deltaY * p;
      gsap.set(element, next);
    };

    if (syncTriggerId) {
      const updateFromSync = () => {
        if (destroyed) return;
        syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);
        if (syncTrigger) {
          const p = clamp((syncTrigger.progress - progressStart) / (progressEnd - progressStart));
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
          applyProgress(self.progress);
        }
      });
    }

    return () => {
      destroyed = true;
      scrollTrigger?.kill();
      if (syncRaf != null) cancelAnimationFrame(syncRaf);
      ensureHome();
      home.placeholder?.remove();
      delete element.__mkLayoutHome;
    };
  }
};
