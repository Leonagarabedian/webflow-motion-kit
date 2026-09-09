import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  scaleFrom: 0.68,
  scaleTo: 1,
  opacityFrom: 0,
  opacityTo: 1,
  centerX: 0.5,
  centerY: 0.5,
  zIndex: 0,
  start: "top 75%",
  end: "bottom 25%",
  scrub: 1,
  progressStart: 0,
  progressEnd: 1
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function resolveExternal(root, attribute, fallback = null) {
  const selector = readString(root, attribute, "");
  if (!selector) return fallback;
  return root.closest(selector) || document.querySelector(selector) || fallback;
}

export const depthEmerge = {
  name: "depth-emerge",
  category: "primitive",
  selector: '[data-motion~="depth-emerge"]',

  mount(element, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const stage = resolveExternal(element, "motion-stage", null);
    const trigger = resolveExternal(element, "motion-trigger", stage || element);
    if (!stage || !trigger) return;

    const originalParent = element.parentElement;
    const originalNextSibling = element.nextSibling;
    const originalStyle = element.getAttribute("style");

    const placeholder = document.createElement("div");
    placeholder.setAttribute("data-depth-emerge-placeholder", "");

    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    placeholder.style.display = computed.display === "inline" ? "inline-block" : computed.display;
    placeholder.style.visibility = "hidden";
    placeholder.style.pointerEvents = "none";

    originalParent.insertBefore(placeholder, element);

    element.__mkLayoutHome = {
      parent: originalParent,
      nextSibling: originalNextSibling,
      placeholder,
      originalStyle
    };

    stage.appendChild(element);

    const previousStagePosition = stage.style.position;
    if (window.getComputedStyle(stage).position === "static") {
      stage.style.position = "relative";
    }

    const scaleFrom = readNumber(element, "motion-scale-from", DEFAULTS.scaleFrom);
    const scaleTo = readNumber(element, "motion-scale-to", DEFAULTS.scaleTo);
    const opacityFrom = readNumber(element, "motion-opacity-from", DEFAULTS.opacityFrom);
    const opacityTo = readNumber(element, "motion-opacity-to", DEFAULTS.opacityTo);
    const centerX = readNumber(element, "motion-center-x", DEFAULTS.centerX);
    const centerY = readNumber(element, "motion-center-y", DEFAULTS.centerY);
    const zIndex = readNumber(element, "motion-z-index", DEFAULTS.zIndex);
    const start = readString(element, "motion-start", DEFAULTS.start);
    const end = readString(element, "motion-end", DEFAULTS.end);
    const scrub = readNumber(element, "motion-scrub", DEFAULTS.scrub);
    const syncTriggerId = readString(element, "motion-sync-trigger-id", "");
    const progressStart = clamp(readNumber(element, "motion-progress-start", DEFAULTS.progressStart));
    const progressEnd = clamp(
      readNumber(element, "motion-progress-end", DEFAULTS.progressEnd),
      progressStart + 0.0001,
      1
    );

    const setCenteredPosition = () => {
      const stageRect = stage.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const left = stageRect.width * centerX - elementRect.width / 2;
      const top = stageRect.height * centerY - elementRect.height / 2;

      gsap.set(element, {
        position: "absolute",
        left,
        top,
        margin: 0,
        zIndex,
        transformOrigin: "center center",
        pointerEvents: "none",
        willChange: "transform, opacity"
      });
    };

    setCenteredPosition();

    const tween = gsap.fromTo(
      element,
      { scale: scaleFrom, autoAlpha: opacityFrom },
      { scale: scaleTo, autoAlpha: opacityTo, ease: "none", paused: true }
    );

    let scrollTrigger = null;
    let syncTrigger = null;
    let syncRaf = null;
    let destroyed = false;

    if (syncTriggerId) {
      const updateFromSync = () => {
        if (destroyed) return;
        syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);
        if (syncTrigger) {
          const progress = clamp((syncTrigger.progress - progressStart) / (progressEnd - progressStart));
          tween.progress(progress);
        }
        syncRaf = requestAnimationFrame(updateFromSync);
      };
      syncRaf = requestAnimationFrame(updateFromSync);
      window.addEventListener("resize", setCenteredPosition, { passive: true });
    } else {
      scrollTrigger = ScrollTrigger.create({
        id: `mk-depth-emerge-${Math.random().toString(36).slice(2, 8)}`,
        trigger,
        start,
        end,
        scrub,
        animation: tween,
        invalidateOnRefresh: true,
        onRefresh: setCenteredPosition
      });
    }

    const restore = () => {
      if (!element.isConnected) return;
      const home = element.__mkLayoutHome;
      const homePlaceholder = home?.placeholder;
      const homeParent = home?.parent || originalParent;
      const homeNextSibling = home?.nextSibling || originalNextSibling;

      if (element.parentElement !== homeParent) {
        if (homePlaceholder?.parentNode === homeParent) homeParent.insertBefore(element, homePlaceholder);
        else if (homeNextSibling?.parentNode === homeParent) homeParent.insertBefore(element, homeNextSibling);
        else homeParent.appendChild(element);
      }

      homePlaceholder?.remove();
      if (originalStyle == null) element.removeAttribute("style");
      else element.setAttribute("style", originalStyle);
      stage.style.position = previousStagePosition;
      delete element.__mkLayoutHome;
    };

    return () => {
      destroyed = true;
      scrollTrigger?.kill();
      if (syncRaf != null) cancelAnimationFrame(syncRaf);
      window.removeEventListener("resize", setCenteredPosition);
      tween.kill();
      restore();
    };
  }
};
