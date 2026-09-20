import { resolveScrollContract, viewportScroll, layoutSize } from "../../core/scroll-alignment/contract.js";
import { readNumber, readString } from "../../core/config.js";

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
    const usePanel = mode === "panel" || mode === "slide-over";
    const syncTriggerId = readString(element, "motion-section-handoff-sync-trigger-id", "");
    const originalStyle = element.getAttribute("style");
    let backgroundLayer = null;
    let backgroundTween = null;
    let syncTrigger = null;
    let rafId = null;
    let destroyed = false;
    let currentY = 0;

    if (usePanel) {
      const fromSelector = readString(element, "motion-section-handoff-from", "");
      const pinTargetSelector = readString(element, "motion-section-handoff-pin-target", "");
      const distance = readString(element, "motion-section-handoff-distance", "edge");

      let outgoing = null;
      if (fromSelector) {
        try {
          outgoing = document.querySelector(fromSelector);
        } catch (error) {
          console.warn("[motion-kit] Invalid section-handoff from selector:", fromSelector, error);
        }
      }

      outgoing ||= element.previousElementSibling;
      if (!outgoing) return;

      let pinTarget = outgoing;
      if (pinTargetSelector) {
        try {
          pinTarget = outgoing.querySelector(pinTargetSelector) || document.querySelector(pinTargetSelector) || outgoing;
        } catch (error) {
          console.warn("[motion-kit] Invalid section-handoff pin target selector:", pinTargetSelector, error);
          pinTarget = outgoing;
        }
      }

      const originalOutgoingStyle = outgoing.getAttribute("style");
      const originalPinTargetStyle =
        pinTarget !== outgoing ? pinTarget.getAttribute("style") : null;
      const panelZ = readNumber(element, "motion-section-handoff-z-index", 6);
      const start = readString(
        element,
        "motion-section-handoff-start",
        "top bottom"
      );
      const authoredEnd = readString(
        element,
        "motion-section-handoff-end",
        "top top"
      );

      const resolveEnd = () => {
        if (distance === "viewport") {
          return `+=${Math.max(1, window.innerHeight)}`;
        }

        if (/^-?\\d*\\.?\\d+vh$/.test(distance)) {
          const vh = parseFloat(distance);
          return `+=${Math.max(1, window.innerHeight * (vh / 100))}`;
        }

        if (/^\\d+(?:\\.\\d+)?px$/.test(distance)) {
          return `+=${Math.max(1, parseFloat(distance))}`;
        }

        if (distance !== "edge" && distance !== "auto") {
          return distance;
        }

        return authoredEnd;
      };

      gsap.set(outgoing, {
        zIndex: Math.max(0, panelZ - 1)
      });

      gsap.set(element, {
        position: "relative",
        zIndex: panelZ,
        isolation: "isolate"
      });

      const scrub = readNumber(
        element,
        "motion-section-handoff-scrub",
        1
      );

      const outgoingPin = ScrollTrigger.create({
        trigger: element,
        start,
        end: resolveEnd,
        pin: pinTarget,
        pinSpacing: false,
        pinReparent: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      });

      const slideFrom = readString(
        element,
        "motion-section-handoff-slide-from",
        "18vh"
      );

      const resolveSlideFrom = () => {
        if (/^-?\\d*\\.?\\d+vh$/.test(slideFrom)) {
          return window.innerHeight * (parseFloat(slideFrom) / 100);
        }

        if (/^-?\\d+(?:\\.\\d+)?px$/.test(slideFrom)) {
          return parseFloat(slideFrom);
        }

        const numeric = Number(slideFrom);
        return Number.isFinite(numeric) ? numeric : window.innerHeight * 0.18;
      };

      const panelTween = gsap.fromTo(
        element,
        { y: resolveSlideFrom },
        {
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: element,
            start,
            end: resolveEnd,
            scrub,
            invalidateOnRefresh: true
          }
        }
      );

      return () => {
        outgoingPin.kill(true);
        panelTween.scrollTrigger?.kill(true);
        panelTween.kill();

        if (originalOutgoingStyle == null) outgoing.removeAttribute("style");
        else outgoing.setAttribute("style", originalOutgoingStyle);

        if (pinTarget !== outgoing) {
          if (originalPinTargetStyle == null) pinTarget.removeAttribute("style");
          else pinTarget.setAttribute("style", originalPinTargetStyle);
        }

        if (originalStyle == null) element.removeAttribute("style");
        else element.setAttribute("style", originalStyle);
      };
    }

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
            scrollTrigger: resolveScrollContract(element, {
              trigger: element,
              start: readString(element, "motion-section-handoff-start", DEFAULTS.start),
              end: readString(element, "motion-section-handoff-end", DEFAULTS.end),
              scrub: readNumber(element, "motion-section-handoff-scrub", DEFAULTS.scrub),
              invalidateOnRefresh: true
            }, () => (viewportScroll(element, 1, () => Math.max(window.innerHeight * 0.12, layoutSize(backgroundLayer).height - layoutSize(element).height))))
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

      syncTrigger = ScrollTrigger.getById(syncTriggerId) || null;
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
