import { readNumber, readString, resolveTrigger } from "../core/config.js";

function buildHighlightStages(count, stagger, opacityFrom, duration) {
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const start = index * stagger;
    return {
      name: `scroll-highlight-${index + 1}`,
      start,
      end: start + duration,
      duration,
      opacityFrom,
      opacityTo: 1
    };
  });
}

export const scrollHighlight = {
  name: "scroll-highlight",
  category: "primitive",
  selector: '[data-motion~="scroll-highlight"]',
  mount(element, { gsap, SplitText, reducedMotion, scrollAlignment }) {
    const unit = readString(element, "motion-split", "words");
    const type = unit === "chars" ? "words,chars" : unit;
    const split = SplitText.create(element, { aria: "auto", type });
    const units =
      unit === "chars" ? split.chars : unit === "lines" ? split.lines : split.words;

    if (reducedMotion()) {
      gsap.set(units, { opacity: 1 });
      return () => split.revert();
    }

    const opacityFrom = readNumber(element, "motion-opacity-from", 0.22);
    const stagger = readNumber(element, "motion-stagger", 0.08);
    const duration = readNumber(element, "motion-duration", 0.5);
    const scrub = readNumber(element, "motion-scrub", 1);
    const mode = readString(element, "motion-alignment", "legacy");
    const trigger = resolveTrigger(element);

    const from = { opacity: opacityFrom };
    const scrollTrigger = mode === "auto"
      ? scrollAlignment.build(element, {
          mode: "auto",
          id: readString(element, "motion-alignment-id", "scroll-highlight"),
          trigger,
          profile: "editorial",
          stages: buildHighlightStages(units.length, stagger, opacityFrom, duration),
          scrub: element.hasAttribute("data-motion-scrub") ? scrub : true,
          invalidateOnRefresh: true
        }).scrollTrigger
      : {
          end: readString(element, "motion-end", "bottom 35%"),
          scrub,
          start: readString(element, "motion-start", "top 75%"),
          trigger
        };

    const to = {
      duration,
      ease: "none",
      opacity: 1,
      stagger,
      scrollTrigger
    };
    const inactiveColor = readString(element, "motion-inactive-color", null);
    const activeColor = readString(element, "motion-active-color", null);
    if (inactiveColor && activeColor) {
      from.color = inactiveColor;
      to.color = activeColor;
    }
    const tween = gsap.fromTo(units, from, to);

    return () => {
      tween.kill();
      split.revert();
    };
  }
};
