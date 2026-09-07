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
    const yPx = readNumber(element, "motion-y-px", 0);
    const useYPx = element.hasAttribute("data-motion-y-px");
    const fade = readBoolean(element, "motion-opacity", false);
    const start = readString(element, "motion-start", "top 85%");
    const ease = readString(element, "motion-ease", "power4.out");
    const once = readBoolean(element, "motion-once", true);

    element.style.willChange = "transform, opacity";

    const split = SplitText.create(element, {
      aria: "auto",
      autoSplit: true,
      mask: "lines",
      type: "lines",
      onSplit(self) {
        const fromState = useYPx ? { y: yPx } : { yPercent };
        if (fade) fromState.autoAlpha = 0;

        return gsap.fromTo(
          self.lines,
          fromState,
          {
            duration,
            ease,
            stagger,
            y: 0,
            yPercent: 0,
            ...(fade ? { autoAlpha: 1 } : {}),
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
