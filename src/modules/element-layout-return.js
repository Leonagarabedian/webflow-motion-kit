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
      gsap.set(element, {
        clearProps: "x,y,left,top,position,margin,pointerEvents,willChange,zIndex,width,height,filter,transform"
      });
      atHome = true;
    };

    const getStableDelta = () => {
      const stageRect = home.stage.getBoundingClientRect();
      const homeRect = home.placeholder.getBoundingClientRect();
      const stagedWidth = home.lockedWidth || homeRect.width;
      const stagedHeight = home.lockedHeight || homeRect.height;
      const stageLeft = home.stageLeft ?? stageRect.width / 2 - stagedWidth / 2;
      const stageTop = home.stageTop ?? stageRect.height / 2 - stagedHeight / 2;
      const stagedCenterX = stageRect.left + stageLeft + stagedWidth / 2;
      const stagedCenterY = stageRect.top + stageTop + stagedHeight / 2;
      const homeCenterX = homeRect.left + homeRect.width / 2;
      const homeCenterY = homeRect.top + homeRect.height / 2;

      return {
        x: homeCenterX - stagedCenterX,
        y: homeCenterY - stagedCenterY
      };
    };

    const applyStageProgress = (progress) => {
      if (destroyed || !element.isConnected || !home.placeholder?.isConnected) return;

      const p = clamp(progress);
      if (atHome || element.parentElement !== home.stage) ensureStage();

      const delta = getStableDelta();
      const next = { ease };

      if (axis === "x" || axis === "both") next.x = delta.x * p;
      else next.x = 0;

      if (axis === "y" || axis === "both") next.y = delta.y * p;
      else next.y = 0;

      gsap.set(element, next);
    };

    if (syncTriggerId) {
      const updateFromSync = () => {
        if (destroyed) return;
        syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);

        if (syncTrigger) {
          const p = clamp((syncTrigger.progress - progressStart) / (progressEnd - progressStart));

          // Keep the real element visually inside the pinned Works stage through
          // the end of the pin. Moving it home at progressEnd makes it disappear
          // before the next section actually takes over the viewport.
          if (syncTrigger.progress >= 0.9999 && !syncTrigger.isActive) {
            ensureHome();
          } else {
            applyStageProgress(p);
          }
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
          if (self.progress >= 0.9999) ensureHome();
          else applyStageProgress(self.progress);
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
