import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  start: "top 55%",
  end: "top 15%",
  scrub: 1,
  ease: "none",
  scale: true,
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

  mount(element, { Flip, ScrollTrigger, gsap, reducedMotion }) {
    if (reducedMotion()) return;

    const home = element.__mkLayoutHome;
    if (!home?.parent || !home.placeholder) return;

    const start = readString(element, "motion-layout-return-start", DEFAULTS.start);
    const end = readString(element, "motion-layout-return-end", DEFAULTS.end);
    const scrub = readNumber(element, "motion-layout-return-scrub", DEFAULTS.scrub);
    const ease = readString(element, "motion-layout-return-ease", DEFAULTS.ease);
    const scale = readString(element, "motion-layout-return-scale", String(DEFAULTS.scale)) !== "false";
    const triggerSelector = readString(element, "motion-layout-return-trigger", "");
    const syncTriggerId = readString(element, "motion-layout-return-sync-trigger-id", "");
    const progressStart = clamp(
      readNumber(element, "motion-layout-return-progress-start", DEFAULTS.progressStart)
    );
    const progressEnd = clamp(
      readNumber(element, "motion-layout-return-progress-end", DEFAULTS.progressEnd),
      progressStart + 0.0001,
      1
    );

    const currentParent = element.parentElement;
    if (!currentParent) return;

    const currentStyle = element.getAttribute("style");
    const state = Flip.getState(element, { props: "opacity,visibility" });

    restoreToHome(element, home);
    const finalStyle = element.getAttribute("style");
    element.removeAttribute("style");

    const tween = Flip.from(state, {
      absolute: true,
      scale,
      ease,
      paused: true,
      simple: false,
      prune: true
    });

    let scrollTrigger = null;
    let syncTrigger = null;
    let syncRaf = null;
    let destroyed = false;
    let placeholderHidden = false;

    const setPlaceholderHidden = (hidden) => {
      if (!home.placeholder?.isConnected || placeholderHidden === hidden) return;
      placeholderHidden = hidden;
      home.placeholder.style.display = hidden ? "none" : "";
    };

    if (syncTriggerId) {
      const updateFromSync = () => {
        if (destroyed) return;
        syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);
        if (syncTrigger) {
          const progress = clamp((syncTrigger.progress - progressStart) / (progressEnd - progressStart));
          setPlaceholderHidden(progress >= 0.9999);
          tween.progress(progress);
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
        animation: tween,
        invalidateOnRefresh: true,
        onUpdate(self) {
          setPlaceholderHidden(self.progress >= 0.9999);
        }
      });
    }

    return () => {
      destroyed = true;
      scrollTrigger?.kill();
      if (syncRaf != null) cancelAnimationFrame(syncRaf);
      tween.kill();

      if (element.__mkLayoutHome) {
        restoreToHome(element, home);
        home.placeholder?.remove();
        delete element.__mkLayoutHome;
      }

      if (finalStyle == null) element.removeAttribute("style");
      else element.setAttribute("style", finalStyle);
      gsap.set(element, { clearProps: "transform,width,height,left,top,position" });
    };
  }
};
