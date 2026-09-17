import { scrollMode } from "../../core/scroll-alignment/contract.js";
import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger
} from "../../core/config.js";

function buildLineRevealStages(lines, { duration, stagger, yPercent, yPx, useYPx, fade }) {
  return Array.from({ length: lines.length }, (_, index) => {
    const start = index * stagger;
    return {
      name: `line-reveal-${index + 1}`,
      start,
      end: start + duration,
      duration,
      target: lines[index],
      yFrom: useYPx ? yPx : 0,
      yTo: 0,
      yPercentFrom: useYPx ? 0 : yPercent,
      yPercentTo: 0,
      opacityFrom: fade ? 0 : 1,
      opacityTo: 1
    };
  });
}

export const lineReveal = {
  name: "line-reveal",
  category: "primitive",
  selector: '[data-motion~="line-reveal"]',
  mount(element, { gsap, SplitText, reducedMotion, scrollAlignment }) {
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
    const mode = scrollMode(element);

    element.style.willChange = "transform, opacity";

    const split = SplitText.create(element, {
      aria: "auto",
      autoSplit: true,
      mask: "lines",
      type: "lines",
      onSplit(self) {
        const fromState = useYPx ? { y: yPx } : { yPercent };
        if (fade) fromState.autoAlpha = 0;

        const scrollTrigger = mode === "auto"
          ? {
              ...scrollAlignment.build(element, {
                mode: "auto",
                id: readString(element, "motion-alignment-id", "line-reveal"),
                trigger,
                profile: "reveal",
                stages: buildLineRevealStages(self.lines, {
                  duration,
                  stagger,
                  yPercent,
                  yPx,
                  useYPx,
                  fade
                }),
                scrub: false,
                invalidateOnRefresh: true
              }).scrollTrigger,
              once,
              scrub: false,
              ...(!once && { toggleActions: "play none none reverse" })
            }
          : {
              trigger,
              start,
              once,
              ...(!once && { toggleActions: "play none none reverse" })
            };

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
            scrollTrigger
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
