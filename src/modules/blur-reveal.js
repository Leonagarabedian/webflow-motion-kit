import { readNumber, readString, resolveTrigger } from "../core/config.js";

export const blurReveal = {
  name: "blur-reveal",
  category: "primitive",
  selector: '[data-motion~="blur-reveal"]',
  mount(element, { gsap, SplitText, reducedMotion }) {
    if (reducedMotion()) {
      gsap.set(element, { autoAlpha: 1, filter: "none" });
      return;
    }

    const unit = readString(element, "motion-split", "lines");
    const type = unit === "chars" ? "words,chars" : unit;
    const split = SplitText.create(element, {
      aria: "auto",
      autoSplit: unit === "lines",
      type,
      onSplit(self) {
        const units = unit === "chars" ? self.chars : unit === "words" ? self.words : self.lines;
        return gsap.fromTo(
          units,
          {
            autoAlpha: 0,
            filter: `blur(${readNumber(element, "motion-blur", 12)}px)`,
            yPercent: readNumber(element, "motion-y", 35)
          },
          {
            autoAlpha: 1,
            duration: readNumber(element, "motion-duration", 1),
            ease: readString(element, "motion-ease", "power3.out"),
            filter: "blur(0px)",
            stagger: readNumber(element, "motion-stagger", 0.06),
            yPercent: 0,
            scrollTrigger: {
              once: true,
              start: readString(element, "motion-start", "top 85%"),
              trigger: resolveTrigger(element)
            }
          }
        );
      }
    });

    return () => split.revert();
  }
};
