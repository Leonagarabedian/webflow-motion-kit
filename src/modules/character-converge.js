import { readNumber, readString, resolveTrigger } from "../core/config.js";

const VISIBLE_PROPS = [
  "position",
  "width",
  "height",
  "margin",
  "padding",
  "overflow",
  "clip",
  "white-space",
  "z-index"
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function forceVisible(element) {
  element.style.setProperty("position", "relative", "important");
  element.style.setProperty("width", "auto", "important");
  element.style.setProperty("height", "auto", "important");
  element.style.setProperty("padding", "0", "important");
  element.style.setProperty("overflow", "visible", "important");
  element.style.setProperty("clip", "auto", "important");
  element.style.setProperty("white-space", "normal", "important");
  element.style.setProperty("z-index", "30", "important");
}

function clearVisibleOverrides(element) {
  VISIBLE_PROPS.forEach((prop) => element.style.removeProperty(prop));
}

export const characterConverge = {
  name: "character-converge",
  category: "primitive",
  selector: '[data-motion~="character-converge"]',

  mount(element, { gsap, SplitText, reducedMotion }) {
    forceVisible(element);

    if (reducedMotion()) {
      gsap.set(element, { autoAlpha: 1 });
      return () => clearVisibleOverrides(element);
    }

    const trigger = resolveTrigger(element);
    const start = readString(element, "motion-start", "top 85%");
    const end = readString(element, "motion-end", "top 35%");
    const scrub = readNumber(element, "motion-scrub", 1);
    const baseX = readNumber(element, "motion-x", 28);
    const stepX = readNumber(element, "motion-x-step", 18);
    const y = readNumber(element, "motion-y", 0);
    const opacityFrom = readNumber(element, "motion-opacity-from", 1);
    const ease = readString(element, "motion-ease", "none");
    const order = readString(element, "motion-order", "reverse");

    element.style.willChange = "transform, opacity";

    const split = SplitText.create(element, {
      aria: "auto",
      type: "words,chars"
    });

    const chars = split.chars || [];
    const ordered = order === "forward" ? chars : [...chars].reverse();

    ordered.forEach((char, index) => {
      const distance = baseX + stepX * index;
      gsap.set(char, {
        x: distance,
        y,
        autoAlpha: opacityFrom,
        willChange: "transform, opacity"
      });
    });

    const tween = gsap.to(ordered, {
      x: 0,
      y: 0,
      autoAlpha: 1,
      ease,
      stagger: {
        each: readNumber(element, "motion-stagger", 0.06),
        from: "start"
      },
      scrollTrigger: {
        trigger,
        start,
        end,
        scrub,
        invalidateOnRefresh: true
      }
    });

    const passTriggerSelector = readString(element, "motion-pass-trigger", "");
    let passTimeline = null;

    if (passTriggerSelector) {
      const passTrigger = element.ownerDocument.querySelector(passTriggerSelector);

      if (passTrigger) {
        const passStart = readString(element, "motion-pass-start", "bottom 55%");
        const passEnd = readString(element, "motion-pass-end", "bottom -15%");
        const passPeak = clamp(readNumber(element, "motion-pass-peak", 0.5), 0.05, 0.95);
        const passTarget = clamp(readNumber(element, "motion-pass-center-x", 0.5), 0, 1);
        const passScrub = readNumber(element, "motion-pass-scrub", 1);
        const passEase = readString(element, "motion-pass-ease", "none");

        const centerDelta = () => {
          const rect = element.getBoundingClientRect();
          const currentX = Number(gsap.getProperty(element, "x")) || 0;
          const naturalCenter = rect.left - currentX + rect.width / 2;
          return window.innerWidth * passTarget - naturalCenter;
        };

        passTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: passTrigger,
            start: passStart,
            end: passEnd,
            scrub: passScrub,
            invalidateOnRefresh: true
          }
        });

        passTimeline
          .fromTo(
            element,
            { x: 0 },
            {
              x: centerDelta,
              ease: passEase,
              duration: passPeak
            }
          )
          .to(element, {
            x: 0,
            ease: passEase,
            duration: 1 - passPeak
          });
      }
    }

    return () => {
      passTimeline?.scrollTrigger?.kill();
      passTimeline?.kill();
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(element, { clearProps: "transform" });
      gsap.set(chars, { clearProps: "transform,opacity,visibility,willChange" });
      split.revert();
      element.style.willChange = "";
      clearVisibleOverrides(element);
    };
  }
};
