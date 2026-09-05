import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger
} from "../core/config.js";

export const lineReveal = {
  name: "line-reveal",
  category: "primitive",
  selector: '[data-motion~="line-reveal"]',
  mount(element, { gsap, SplitText, reducedMotion }) {
    if (reducedMotion()) {
      gsap.set(element, { autoAlpha: 1 });
      return;
    }

    const trigger = resolveTrigger(element);
    const duration = readNumber(element, "motion-duration", 1);
    const stagger = readNumber(element, "motion-stagger", 0.08);
    const yPercent = readNumber(element, "motion-y", 110);
    const start = readString(element, "motion-start", "top 85%");
    const ease = readString(element, "motion-ease", "power4.out");
    const once = readBoolean(element, "motion-once", true);

    element.style.willChange = "transform";

    const split = SplitText.create(element, {
      aria: "auto",
      autoSplit: true,
      mask: "lines",
      type: "lines",
      onSplit(self) {
        return gsap.fromTo(
          self.lines,
          { yPercent },
          {
            duration,
            ease,
            stagger,
            yPercent: 0,
            scrollTrigger: {
              trigger,
              start,
              once,
              ...(!once && { toggleActions: "play none none reverse" })
            }
          }
        );
      }
    });

    return () => {
      split.revert();
      element.style.willChange = "";
    };
  }
};
