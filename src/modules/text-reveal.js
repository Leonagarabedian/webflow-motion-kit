import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger
} from "../core/config.js";

export const textReveal = {
  name: "text-reveal",
  category: "primitive",
  selector: '[data-motion~="text-reveal"]',
  mount(element, { gsap, SplitText, reducedMotion }) {
    if (reducedMotion()) {
      gsap.set(element, { autoAlpha: 1 });
      return;
    }

    const unit = readString(element, "motion-split", "words");
    const type = unit === "chars" ? "words,chars" : unit;
    const duration = readNumber(element, "motion-duration", 0.9);
    const stagger = readNumber(element, "motion-stagger", unit === "chars" ? 0.025 : 0.06);
    const once = readBoolean(element, "motion-once", true);
    const split = SplitText.create(element, {
      aria: "auto",
      autoSplit: unit === "lines",
      mask: unit,
      type,
      onSplit(self) {
        const units = unit === "chars" ? self.chars : unit === "lines" ? self.lines : self.words;
        return gsap.fromTo(
          units,
          {
            autoAlpha: readNumber(element, "motion-opacity-from", 0),
            yPercent: readNumber(element, "motion-y", 110)
          },
          {
            autoAlpha: 1,
            duration,
            ease: readString(element, "motion-ease", "power4.out"),
            stagger,
            yPercent: 0,
            scrollTrigger: {
              once,
              start: readString(element, "motion-start", "top 85%"),
              trigger: resolveTrigger(element),
              ...(!once && { toggleActions: "play none none reverse" })
            }
          }
        );
      }
    });

    return () => split.revert();
  }
};
