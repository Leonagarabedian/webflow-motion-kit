import { scrollMode } from "../../core/scroll-alignment/contract.js";
import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger
} from "../../core/config.js";

function stages(units, duration, stagger, y, opacity) {
  return Array.from({ length: units.length }, (_, i) => ({
    name: `text-reveal-${i + 1}`,
    start: i * stagger,
    end: i * stagger + duration,
    duration,
    target: units[i],
    yPercentFrom: y,
    yPercentTo: 0,
    opacityFrom: opacity,
    opacityTo: 1
  }));
}

export const textReveal = {
  name: "text-reveal",
  category: "primitive",
  selector: '[data-motion~="text-reveal"]',
  mount(element, { gsap, SplitText, reducedMotion, scrollAlignment }) {
    if (reducedMotion()) {
      gsap.set(element, { autoAlpha: 1 });
      return;
    }

    const unit = readString(element, "motion-split", "words");
    const type = unit === "chars" ? "words,chars" : unit;
    const duration = readNumber(element, "motion-duration", 0.9);
    const stagger = readNumber(element, "motion-stagger", unit === "chars" ? 0.025 : 0.06);
    const once = readBoolean(element, "motion-once", true);
    const y = readNumber(element, "motion-y", 110);
    const opacity = readNumber(element, "motion-opacity-from", 0);
    const mode = scrollMode(element);

    const split = SplitText.create(element, {
      aria: "auto",
      autoSplit: unit === "lines",
      mask: unit,
      type,
      onSplit(self) {
        const units = unit === "chars" ? self.chars : unit === "lines" ? self.lines : self.words;
        const trigger = resolveTrigger(element);
        let scrollTrigger;

        if (mode === "auto") {
          const alignment = scrollAlignment.build(element, {
            mode: "auto",
            id: readString(element, "motion-alignment-id", "text-reveal"),
            trigger,
            profile: "reveal",
            stages: stages(units, duration, stagger, y, opacity),
            scrub: false,
            invalidateOnRefresh: true
          });
          scrollTrigger = {
            ...alignment.scrollTrigger,
            once,
            scrub: false,
            ...(!once && { toggleActions: "play none none reverse" })
          };
        } else {
          scrollTrigger = {
            once,
            start: readString(element, "motion-start", "top 85%"),
            trigger,
            ...(!once && { toggleActions: "play none none reverse" })
          };
        }

        return gsap.fromTo(
          units,
          { autoAlpha: opacity, yPercent: y },
          {
            autoAlpha: 1,
            duration,
            ease: readString(element, "motion-ease", "power4.out"),
            stagger,
            yPercent: 0,
            scrollTrigger
          }
        );
      }
    });

    return () => split.revert();
  }
};
