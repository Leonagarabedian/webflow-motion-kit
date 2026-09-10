import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  scaleFrom: 0.68,
  scaleTo: 1,
  opacityFrom: 0,
  opacityTo: 1,
  blurFrom: 0,
  blurTo: 0,
  centerX: 0.5,
  centerY: 0.5,
  safeTop: 24,
  safeBottom: 24,
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
    const originalRect = element.getBoundingClientRect();

    let lockedWidth = originalRect.width;
    let lockedHeight = originalRect.height;
    let resizeRaf = null;

    const placeholder = document.createElement("div");
    placeholder.setAttribute("data-depth-emerge-placeholder", "");

    const computed = window.getComputedStyle(element);
    // Keep the placeholder fluid so its grid cell follows responsive column changes.
    placeholder.style.width = "100%";
    placeholder.style.height = `${lockedHeight}px`;
    placeholder.style.minWidth = "0";
    placeholder.style.display = computed.display === "inline" ? "inline-block" : computed.display;
    placeholder.style.visibility = "hidden";
    placeholder.style.pointerEvents = "none";

    originalParent.insertBefore(placeholder, element);
    stage.appendChild(element);

    const previousStagePosition = stage.style.position;
    if (window.getComputedStyle(stage).position === "static") stage.style.position = "relative";

    const scaleFrom = readNumber(element, "motion-scale-from", DEFAULTS.scaleFrom);
    const scaleTo = readNumber(element, "motion-scale-to", DEFAULTS.scaleTo);
    const opacityFrom = readNumber(element, "motion-opacity-from", DEFAULTS.opacityFrom);
    const opacityTo = readNumber(element, "motion-opacity-to", DEFAULTS.opacityTo);
    const blurFrom = Math.max(0, readNumber(element, "motion-blur-from", DEFAULTS.blurFrom));
    const blurTo = Math.max(0, readNumber(element, "motion-blur-to", DEFAULTS.blurTo));
    const centerX = readNumber(element, "motion-center-x", DEFAULTS.centerX);
    const centerY = readNumber(element, "motion-center-y", DEFAULTS.centerY);
    const safeTop = Math.max(0, readNumber(element, "motion-safe-top", DEFAULTS.safeTop));
    const safeBottom = Math.max(0, readNumber(element, "motion-safe-bottom", DEFAULTS.safeBottom));
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

    const syncHomeMetrics = () => {
      if (!placeholder.isConnected || !element.isConnected) return;

      const homeRect = placeholder.getBoundingClientRect();
      const nextWidth = homeRect.width || lockedWidth || originalRect.width;

      // Measure the staged element at the width its real responsive grid cell now has.
      if (element.parentElement === stage) {
        gsap.set(element, {
          width: `${nextWidth}px`,
          height: "auto"
        });
      }

      const nextHeight = element.offsetHeight || element.scrollHeight || lockedHeight || originalRect.height;
      lockedWidth = nextWidth;
      lockedHeight = nextHeight;
      placeholder.style.height = `${lockedHeight}px`;

      if (element.__mkLayoutHome) {
        element.__mkLayoutHome.lockedWidth = lockedWidth;
        element.__mkLayoutHome.lockedHeight = lockedHeight;
      }
    };

    const setStagePosition = () => {
      if (element.parentElement !== stage) return;

      syncHomeMetrics();

      const stageRect = stage.getBoundingClientRect();
      const left = stageRect.width * centerX - lockedWidth / 2;
      const desiredTop = stageRect.height * centerY - lockedHeight / 2;
      const maxTop = Math.max(safeTop, stageRect.height - lockedHeight - safeBottom);
      const top = clamp(desiredTop, safeTop, maxTop);

      gsap.set(element, {
        position: "absolute",
        width: `${lockedWidth}px`,
        height: "auto",
        left,
        top,
        x: 0,
        y: 0,
        margin: 0,
        zIndex,
        transformOrigin: "center center",
        pointerEvents: "none",
        willChange: "transform, opacity, filter"
      });

      if (element.__mkLayoutHome) {
        element.__mkLayoutHome.stageLeft = left;
        element.__mkLayoutHome.stageTop = top;
        element.__mkLayoutHome.lockedWidth = lockedWidth;
        element.__mkLayoutHome.lockedHeight = lockedHeight;
      }
    };

    const returnToStage = () => {
      if (element.parentElement !== stage) stage.appendChild(element);
      setStagePosition();
    };

    element.__mkLayoutHome = {
      parent: originalParent,
      nextSibling: originalNextSibling,
      placeholder,
      originalStyle,
      stage,
      returnToStage,
      lockedWidth,
      lockedHeight,
      stageLeft: 0,
      stageTop: 0
    };

    returnToStage();

    const tween = gsap.fromTo(
      element,
      {
        scale: scaleFrom,
        autoAlpha: opacityFrom,
        filter: `blur(${blurFrom}px)`
      },
      {
        scale: scaleTo,
        autoAlpha: opacityTo,
        filter: `blur(${blurTo}px)`,
        ease: "power2.in",
        paused: true
      }
    );

    gsap.set(element, { autoAlpha: 0 });

    let scrollTrigger = null;
    let syncTrigger = null;
    let syncRaf = null;
    let destroyed = false;

    const applySyncedProgress = (rawProgress) => {
      if (rawProgress < progressStart) {
        tween.progress(0);
        gsap.set(element, { autoAlpha: 0 });
        return;
      }

      const p = clamp((rawProgress - progressStart) / (progressEnd - progressStart));
      tween.progress(p);
    };

    const handleResize = () => {
      if (destroyed) return;
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        if (destroyed) return;
        setStagePosition();
        ScrollTrigger.refresh?.();
      });
    };

    if (syncTriggerId) {
      const updateFromSync = () => {
        if (destroyed) return;
        syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);
        if (syncTrigger) applySyncedProgress(syncTrigger.progress);
        syncRaf = requestAnimationFrame(updateFromSync);
      };
      syncRaf = requestAnimationFrame(updateFromSync);
      window.addEventListener("resize", handleResize, { passive: true });
    } else {
      scrollTrigger = ScrollTrigger.create({
        id: `mk-depth-emerge-${Math.random().toString(36).slice(2, 8)}`,
        trigger,
        start,
        end,
        scrub,
        animation: tween,
        invalidateOnRefresh: true,
        onRefresh: setStagePosition
      });
      window.addEventListener("resize", handleResize, { passive: true });
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
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", handleResize);
      tween.kill();
      restore();
    };
  }
};
