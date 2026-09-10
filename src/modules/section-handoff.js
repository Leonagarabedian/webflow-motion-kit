import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  progressStart: 0.9,
  progressEnd: 1,
  targetY: 0,
  zIndex: 0,
  mode: "position",
  start: "top 100%",
  end: "top 72%",
  bleed: "24vh",
  opacityFrom: 0,
  opacityTo: 1,
  scrub: 1,
  ease: "none"
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function createBackgroundLayer(element, gsap) {
  const computed = window.getComputedStyle(element);
  const layer = document.createElement("div");
  const bleed = readString(element, "motion-section-handoff-bleed", DEFAULTS.bleed);
  const opacityFrom = clamp(
    readNumber(element, "motion-section-handoff-opacity-from", DEFAULTS.opacityFrom)
  );

  layer.setAttribute("aria-hidden", "true");
  layer.dataset.motionSectionHandoffLayer = "";

  Object.assign(layer.style, {
    position: "absolute",
    left: "0",
    right: "0",
    top: `calc(-1 * ${bleed})`,
    bottom: "0",
    pointerEvents: "none",
    zIndex: "-1",
    backgroundColor: computed.backgroundColor,
    backgroundImage: computed.backgroundImage,
    backgroundPosition: computed.backgroundPosition,
    backgroundSize: computed.backgroundSize,
    backgroundRepeat: computed.backgroundRepeat,
    backgroundAttachment: computed.backgroundAttachment,
    opacity: String(opacityFrom),
    willChange: "opacity"
  });

  element.prepend(layer);
  gsap.set(element, {
    position: computed.position === "static" ? "relative" : computed.position,
    isolation: "isolate",
    overflow: "visible"
  });

  element.style.backgroundColor = "transparent";
  element.style.backgroundImage = "none";

  return layer;
}

export const sectionHandoff = {
  name: "section-handoff",
  category: "primitive",
  selector: '[data-motion~="section-handoff"]',

  mount(element, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const mode = readString(element, "motion-section-handoff-mode", DEFAULTS.mode);
    const usePosition = mode === "position" || mode === "both";
    const useBackground = mode === "background" || mode === "both";
    const syncTriggerId = readString(element, "motion-section-handoff-sync-trigger-id", "");
    const originalStyle = element.getAttribute("style");
    let backgroundLayer = null;
    let backgroundTween = null;
    let syncTrigger = null;
    let rafId = null;
    let destroyed = false;
    let currentY = 0;

    if (useBackground) {
      backgroundLayer = createBackgroundLayer(element, gsap);
      const opacityFrom = clamp(
        readNumber(element, "motion-section-handoff-opacity-from", DEFAULTS.opacityFrom)
      );
      const opacityTo = clamp(
        readNumber(element, "motion-section-handoff-opacity-to", DEFAULTS.opacityTo)
      );

      if (!syncTriggerId) {
        backgroundTween = gsap.fromTo(
          backgroundLayer,
          { opacity: opacityFrom },
          {
            opacity: opacityTo,
            ease: readString(element, "motion-section-handoff-ease", DEFAULTS.ease),
            scrollTrigger: {
              trigger: element,
              start: readString(element, "motion-section-handoff-start", DEFAULTS.start),
              end: readString(element, "motion-section-handoff-end", DEFAULTS.end),
              scrub: readNumber(element, "motion-section-handoff-scrub", DEFAULTS.scrub),
              invalidateOnRefresh: true
            }
          }
        );
      }
    }

    if (!usePosition && (!useBackground || !syncTriggerId)) {
      return () => {
        backgroundTween?.scrollTrigger?.kill();
        backgroundTween?.kill();
        backgroundLayer?.remove();
        if (originalStyle == null) element.removeAttribute("style");
        else element.setAttribute("style", originalStyle);
      };
    }

    if ((usePosition || (useBackground && syncTriggerId)) && !syncTriggerId) return;

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
    const opacityFrom = clamp(
      readNumber(element, "motion-section-handoff-opacity-from", DEFAULTS.opacityFrom)
    );
    const opacityTo = clamp(
      readNumber(element, "motion-section-handoff-opacity-to", DEFAULTS.opacityTo)
    );

    if (usePosition) {
      gsap.set(element, {
        position: "relative",
        zIndex,
        willChange: "transform"
      });
    }

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
      const p = clamp((triggerProgress - progressStart) / (progressEnd - progressStart));

      if (useBackground && backgroundLayer) {
        gsap.set(backgroundLayer, {
          opacity: opacityFrom + (opacityTo - opacityFrom) * p
        });
      }

      if (usePosition) {
        const rect = element.getBoundingClientRect();
        const naturalTop = rect.top - currentY;
        const fullLift = Math.min(0, targetY - naturalTop);

        if (triggerProgress < progressStart) {
          setY(0);
        } else if (triggerProgress < progressEnd) {
          setY(fullLift * p);
        } else if (naturalTop > targetY) {
          setY(fullLift);
        } else {
          setY(0);
        }
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);

    return () => {
      destroyed = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      backgroundTween?.scrollTrigger?.kill();
      backgroundTween?.kill();
      backgroundLayer?.remove();
      if (originalStyle == null) element.removeAttribute("style");
      else element.setAttribute("style", originalStyle);
    };
  }
};
