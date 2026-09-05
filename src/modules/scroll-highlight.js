import { readNumber, readString, resolveTrigger } from "../core/config.js";

export const scrollHighlight = {
  name: "scroll-highlight",
  category: "primitive",
  selector: '[data-motion~="scroll-highlight"]',
  mount(element, { gsap, SplitText, reducedMotion }) {
    const unit = readString(element, "motion-split", "words");
    const type = unit === "chars" ? "words,chars" : unit;
    const split = SplitText.create(element, { aria: "auto", type });
    const units =
      unit === "chars" ? split.chars : unit === "lines" ? split.lines : split.words;

    if (reducedMotion()) {
      gsap.set(units, { opacity: 1 });
      return () => split.revert();
    }

    const from = { opacity: readNumber(element, "motion-opacity-from", 0.22) };
    const to = {
      ease: "none",
      opacity: 1,
      stagger: readNumber(element, "motion-stagger", 0.08),
      scrollTrigger: {
        end: readString(element, "motion-end", "bottom 35%"),
        scrub: readNumber(element, "motion-scrub", 1),
        start: readString(element, "motion-start", "top 75%"),
        trigger: resolveTrigger(element)
      }
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
