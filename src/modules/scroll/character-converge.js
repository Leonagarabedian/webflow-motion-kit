import { scrollMode } from "../../core/scroll-alignment/contract.js";
import { readNumber, readString, resolveTrigger } from "../../core/config.js";

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

function buildStages(count, { baseX, stepX, y, opacityFrom, stagger, duration }) {
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const start = index * stagger;
    return {
      name: `character-converge-${index + 1}`,
      start,
      end: start + duration,
      duration,
      xFrom: baseX + stepX * index,
      xTo: 0,
      yFrom: y,
      yTo: 0,
      opacityFrom,
      opacityTo: 1
    };
  });
}

export const characterConverge = {
  name: "character-converge",
  category: "primitive",
  selector: '[data-motion~="character-converge"]',

  mount(element, { gsap, SplitText, reducedMotion, scrollAlignment }) {
    forceVisible(element);

    if (reducedMotion()) {
      gsap.set(element, { autoAlpha: 1 });
      return () => clearVisibleOverrides(element);
    }

    const trigger = resolveTrigger(element);
    const start = readString(element, "motion-start", "top 85%");
    const end = readString(element, "motion-end", "top 35%");
    const duration = readNumber(element, "motion-duration", 0.5);
    const scrub = readNumber(element, "motion-scrub", 1);
    const baseX = readNumber(element, "motion-x", 28);
    const stepX = readNumber(element, "motion-x-step", 18);
    const y = readNumber(element, "motion-y", 0);
    const opacityFrom = readNumber(element, "motion-opacity-from", 1);
    const ease = readString(element, "motion-ease", "none");
    const order = readString(element, "motion-order", "reverse");
    const stagger = readNumber(element, "motion-stagger", 0.06);
    const mode = scrollMode(element);

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

    const scrollTrigger = mode === "auto"
      ? scrollAlignment.build(element, {
          mode: "auto",
          id: readString(element, "motion-alignment-id", "character-converge"),
          trigger,
          profile: "editorial",
          stages: buildStages(ordered.length, { baseX, stepX, y, opacityFrom, stagger, duration }),
          scrub: element.hasAttribute("data-motion-scrub") ? scrub : true,
          invalidateOnRefresh: true
        }).scrollTrigger
      : {
          trigger,
          start,
          end,
          scrub,
          invalidateOnRefresh: true
        };

    const tween = gsap.to(ordered, {
      duration,
      x: 0,
      y: 0,
      autoAlpha: 1,
      ease,
      stagger: {
        each: stagger,
        from: "start"
      },
      scrollTrigger
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(chars, { clearProps: "transform,opacity,visibility,willChange" });
      split.revert();
      element.style.willChange = "";
      clearVisibleOverrides(element);
    };
  }
};
