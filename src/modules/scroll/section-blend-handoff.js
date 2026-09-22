import {
  layoutSize,
  resolveScrollContract,
  viewportScroll
} from "../../core/scroll-alignment/contract.js";
import {
  readBoolean,
  readNumber,
  readString
} from "../../core/config.js";

const DEFAULTS = Object.freeze({
  mode: "shared-background-crossfade",
  start: "top 75%",
  end: "top 35%",
  scrub: 1,
  duration: 0.5,
  ease: "none",
  pin: false,
  pinSpacing: false,
  target: "body",
  opacityFrom: 0,
  opacityTo: 1
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function restoreInlineStyle(target, style) {
  if (!target) return;
  if (style == null) target.removeAttribute("style");
  else target.setAttribute("style", style);
}

function resolveElement(root, selector, fallback = null) {
  if (!selector) return fallback;
  try {
    return root.querySelector(selector) || document.querySelector(selector) || fallback;
  } catch (error) {
    console.warn("[motion-kit] Invalid section-blend-handoff selector:", selector, error);
    return fallback;
  }
}

function backgroundColorOf(element) {
  if (!element) return "";
  return window.getComputedStyle(element).backgroundColor || "";
}

function autoScroll(element) {
  return viewportScroll(
    element,
    0.75,
    () => Math.max(window.innerHeight * 0.4, layoutSize(element).height * 0.35)
  );
}

export const sectionBlendHandoff = {
  name: "section-blend-handoff",
  category: "primitive",
  selector: '[data-motion~="section-blend-handoff"]',

  mount(element, { gsap, ScrollTrigger, reducedMotion }) {
    const mode = readString(
      element,
      "motion-section-blend-handoff-mode",
      DEFAULTS.mode
    );

    const outgoingSelector = readString(
      element,
      "motion-section-blend-handoff-from",
      ""
    );
    const targetSelector = readString(
      element,
      "motion-section-blend-handoff-target",
      DEFAULTS.target
    );

    const outgoing = resolveElement(
      element,
      outgoingSelector,
      element.previousElementSibling
    );
    const sharedTarget = resolveElement(
      element,
      targetSelector,
      document.body
    );

    if (!outgoing) return;

    const originalIncomingStyle = element.getAttribute("style");
    const originalOutgoingStyle = outgoing.getAttribute("style");
    const originalTargetStyle = sharedTarget?.getAttribute("style") ?? null;

    const start = readString(
      element,
      "motion-section-blend-handoff-start",
      DEFAULTS.start
    );
    const end = readString(
      element,
      "motion-section-blend-handoff-end",
      DEFAULTS.end
    );
    const scrub = readNumber(
      element,
      "motion-section-blend-handoff-scrub",
      DEFAULTS.scrub
    );
    const duration = Math.max(
      0,
      readNumber(
        element,
        "motion-section-blend-handoff-duration",
        DEFAULTS.duration
      )
    );
    const ease = readString(
      element,
      "motion-section-blend-handoff-ease",
      DEFAULTS.ease
    );
    const pin = readBoolean(
      element,
      "motion-section-blend-handoff-pin",
      DEFAULTS.pin
    );
    const pinSpacing = readBoolean(
      element,
      "motion-section-blend-handoff-pin-spacing",
      DEFAULTS.pinSpacing
    );
    const opacityFrom = clamp(
      readNumber(
        element,
        "motion-section-blend-handoff-opacity-from",
        DEFAULTS.opacityFrom
      )
    );
    const opacityTo = clamp(
      readNumber(
        element,
        "motion-section-blend-handoff-opacity-to",
        DEFAULTS.opacityTo
      )
    );

    const authoredFromColor = readString(
      element,
      "motion-section-blend-handoff-color-from",
      ""
    );
    const authoredToColor = readString(
      element,
      "motion-section-blend-handoff-color-to",
      ""
    );

    const fromColor = authoredFromColor || backgroundColorOf(outgoing);
    const toColor = authoredToColor || backgroundColorOf(element);

    const legacyScroll = {
      trigger: element,
      start,
      end,
      scrub,
      invalidateOnRefresh: true
    };

    const scrollTrigger = resolveScrollContract(
      element,
      legacyScroll,
      () => autoScroll(element)
    );

    if (reducedMotion()) {
      if (
        (mode === "shared-background-crossfade" ||
          mode === "triggered-background-blend") &&
        sharedTarget &&
        toColor
      ) {
        gsap.set(sharedTarget, { backgroundColor: toColor });
      }
      return () => {
        restoreInlineStyle(sharedTarget, originalTargetStyle);
      };
    }

    if (mode === "shared-background-crossfade") {
      if (!sharedTarget || !fromColor || !toColor) return;

      const tween = gsap.fromTo(
        sharedTarget,
        { backgroundColor: fromColor },
        {
          backgroundColor: toColor,
          ease,
          immediateRender: false,
          scrollTrigger
        }
      );

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        restoreInlineStyle(sharedTarget, originalTargetStyle);
      };
    }

    if (mode === "triggered-background-blend") {
      if (!sharedTarget || !fromColor || !toColor) return;

      const triggerConfig = resolveScrollContract(
        element,
        {
          trigger: element,
          start,
          end,
          invalidateOnRefresh: true
        },
        () => autoScroll(element)
      );

      let tween = null;
      const trigger = ScrollTrigger.create({
        ...triggerConfig,
        scrub: false,
        onEnter() {
          tween?.kill();
          tween = gsap.to(sharedTarget, {
            backgroundColor: toColor,
            duration,
            ease,
            overwrite: "auto"
          });
        },
        onLeaveBack() {
          tween?.kill();
          tween = gsap.to(sharedTarget, {
            backgroundColor: fromColor,
            duration,
            ease,
            overwrite: "auto"
          });
        }
      });

      return () => {
        tween?.kill();
        trigger.kill();
        restoreInlineStyle(sharedTarget, originalTargetStyle);
      };
    }

    if (mode === "true-section-crossfade") {
      const timeline = gsap.timeline({
        scrollTrigger: {
          ...scrollTrigger,
          ...(pin
            ? {
                pin: outgoing,
                pinSpacing,
                anticipatePin: 1
              }
            : {})
        }
      });

      timeline
        .to(
          outgoing,
          { autoAlpha: 0, ease },
          0
        )
        .fromTo(
          element,
          { autoAlpha: opacityFrom },
          { autoAlpha: opacityTo, ease, immediateRender: false },
          0
        );

      return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
        restoreInlineStyle(outgoing, originalOutgoingStyle);
        restoreInlineStyle(element, originalIncomingStyle);
      };
    }

    if (mode === "layered-section-fade-in") {
      const incomingPosition = window.getComputedStyle(element).position;
      const outgoingPosition = window.getComputedStyle(outgoing).position;

      gsap.set(outgoing, {
        position: outgoingPosition === "static" ? "relative" : outgoingPosition,
        zIndex: 1
      });
      gsap.set(element, {
        position: incomingPosition === "static" ? "relative" : incomingPosition,
        zIndex: 2
      });

      const tween = gsap.fromTo(
        element,
        { autoAlpha: opacityFrom },
        {
          autoAlpha: opacityTo,
          ease,
          immediateRender: false,
          scrollTrigger: {
            ...scrollTrigger,
            ...(pin
              ? {
                  pin: element,
                  pinSpacing,
                  anticipatePin: 1
                }
              : {})
          }
        }
      );

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        restoreInlineStyle(outgoing, originalOutgoingStyle);
        restoreInlineStyle(element, originalIncomingStyle);
      };
    }

    console.warn("[motion-kit] Unknown section-blend-handoff mode:", mode);

    return () => {
      restoreInlineStyle(outgoing, originalOutgoingStyle);
      restoreInlineStyle(element, originalIncomingStyle);
      restoreInlineStyle(sharedTarget, originalTargetStyle);
    };
  }
};
